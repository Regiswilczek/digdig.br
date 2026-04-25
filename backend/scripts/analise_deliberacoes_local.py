#!/usr/bin/env python3
"""
Executa a análise Haiku localmente para as deliberações pendentes.
Roda direto contra o Supabase — sem Celery, sem Railway.

Uso:
    cd backend
    python scripts/analise_deliberacoes_local.py

Segurança:
    - Só processa atos com processado=False (idempotente)
    - Para automaticamente se custo acumulado > $10
    - Usa a rodada de deliberações criada em 2026-04-24
"""
import asyncio
import sys
import os
from pathlib import Path
from decimal import Decimal
from datetime import datetime

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import uuid
from sqlalchemy import select, update, func
from app.database import async_session_factory
from app.models.ato import Ato, RodadaAnalise, ConteudoAto
from app.models.analise import Analise
from app.services.haiku_service import analisar_ato_haiku, montar_system_prompt

RODADA_ID  = uuid.UUID("5b365c0d-43be-4a7e-a22d-159f50fbe3c2")
TENANT_ID  = uuid.UUID("f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4")
CUSTO_LIMITE = Decimal("15.00")
RATE_LIMIT   = 0.3  # segundos entre chamadas


async def main():
    async with async_session_factory() as db:

        # 1. Verificar rodada
        rodada_r = await db.execute(select(RodadaAnalise).where(RodadaAnalise.id == RODADA_ID))
        rodada = rodada_r.scalar_one()

        print(f"\n{'='*60}")
        print(f"  RODADA DELIBERAÇÕES  {str(RODADA_ID)[:8]}...")
        print(f"  status  {rodada.status}")
        print(f"  haiku   {rodada.atos_analisados_haiku}/{rodada.total_atos}")
        print(f"  custo   ${rodada.custo_total_usd or 0:.4f}")
        print(f"{'='*60}\n")

        if rodada.status not in ("em_progresso", "pendente"):
            print(f"AVISO: rodada está '{rodada.status}' — não é possível continuar.")
            return

        # 2. Buscar deliberações pendentes (PDF ou HTML — qualquer que tenha texto extraído)
        atos_r = await db.execute(
            select(Ato)
            .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
            .where(
                Ato.tenant_id == TENANT_ID,
                Ato.tipo == "deliberacao",
                Ato.processado == False,
            )
            .order_by(Ato.data_publicacao.asc().nulls_last())
        )
        atos = atos_r.scalars().all()
        total = len(atos)
        print(f"Deliberações pendentes: {total}")
        custo_est = float(Decimal(str(total)) * Decimal("0.0120"))
        print(f"Custo estimado: ${custo_est:.2f}  (base $0.012/ato)")
        print(f"Custo limite sessão: ${CUSTO_LIMITE}\n")

        if total == 0:
            print("Nenhuma deliberação pendente. Pipeline completo.")
            return

        try:
            input("Pressione ENTER para iniciar ou Ctrl+C para cancelar... ")
        except EOFError:
            pass  # non-interactive (background)

        # 3. Montar system prompt (regimento → cache Anthropic)
        print("\nCarregando regimento interno...")
        system_prompt = await montar_system_prompt(db, TENANT_ID)
        print("Regimento carregado.\n")

        # 4. Pre-captura IDs (evita MissingGreenlet após commit)
        ids = [a.id for a in atos]

        custo_sessao = Decimal("0")
        ok = erro = 0
        inicio = datetime.now()

        for i, ato_id in enumerate(ids, 1):
            ato_r = await db.execute(select(Ato).where(Ato.id == ato_id))
            ato = ato_r.scalar_one()

            print(
                f"[{i:3d}/{total}] {ato.numero or '?':20s} {str(ato.data_publicacao or '')[:10]}",
                end="  ", flush=True,
            )

            try:
                analise = await analisar_ato_haiku(db, ato.id, RODADA_ID, system_prompt)
                custo_ato = analise.custo_usd or Decimal("0")
                custo_sessao += custo_ato

                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == RODADA_ID)
                    .values(
                        atos_analisados_haiku=RodadaAnalise.atos_analisados_haiku + 1,
                        custo_total_usd=func.coalesce(RodadaAnalise.custo_total_usd, 0) + custo_ato,
                    )
                )
                await db.commit()

                emoji = {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}.get(
                    analise.nivel_alerta, "⚪"
                )
                print(f"{emoji} {analise.nivel_alerta:8s}  ${float(custo_ato):.4f}  acum=${float(custo_sessao):.3f}")
                ok += 1

                if custo_sessao > CUSTO_LIMITE:
                    print(f"\n⛔ Limite de ${CUSTO_LIMITE} atingido. Pausando.")
                    break

            except KeyboardInterrupt:
                print("\n\nInterrompido pelo usuário.")
                break
            except Exception as e:
                print(f"✗ {e}")
                erro += 1
                await db.rollback()
                continue

            if i < total:
                await asyncio.sleep(RATE_LIMIT)

        # 5. Resumo
        duracao = (datetime.now() - inicio).seconds
        print(f"\n{'='*60}")
        print(f"  OK:    {ok}")
        print(f"  Erro:  {erro}")
        print(f"  Custo da sessão: ${float(custo_sessao):.4f}")
        print(f"  Duração: {duracao//60}m {duracao%60}s")
        print(f"{'='*60}\n")

        # 6. Verificar conclusão
        pendentes_r = await db.execute(
            select(func.count())
            .select_from(Ato)
            .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
            .where(
                Ato.tenant_id == TENANT_ID,
                Ato.tipo == "deliberacao",
                Ato.processado == False,
            )
        )
        restantes = pendentes_r.scalar()

        if restantes == 0:
            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == RODADA_ID)
                .values(status="haiku_completo")
            )
            await db.commit()
            print("✅ Haiku completo para todas as deliberações!")
            print("   Próximo passo: rodar sonnet_deliberacoes_local.py nos vermelhos + laranjas.")
        else:
            print(f"⏸  Restam {restantes} deliberações. Rode novamente para continuar.")


if __name__ == "__main__":
    asyncio.run(main())
