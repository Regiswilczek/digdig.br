#!/usr/bin/env python3
"""
Re-roda o Haiku nos atos onde resultado_haiku.parse_error = true.

Esses atos tiveram a resposta truncada pelo limite antigo de max_tokens=1500.
Agora com max_tokens=8192 devem produzir JSON completo.

Uso:
    cd backend
    python scripts/rerun_haiku_parse_errors.py

Segurança:
    - Só processa analises com parse_error=true no resultado_haiku
    - Limpa Irregularidades duplicadas antes de re-rodar
    - Para automaticamente se custo acumulado > $5
    - Custo estimado: ~$2.40 para 198 atos
"""
import asyncio
import sys
import os
from pathlib import Path
from decimal import Decimal
from datetime import datetime

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import uuid
from sqlalchemy import select, update, delete, func, cast, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from app.database import async_session_factory
from app.models.ato import Ato, RodadaAnalise
from app.models.analise import Analise, Irregularidade
from app.services.haiku_service import montar_system_prompt, analisar_ato_haiku

RODADA_ID = uuid.UUID("9063d83c-f510-40b4-93c3-b7469e665aae")
TENANT_ID = uuid.UUID("f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4")
CUSTO_LIMITE = Decimal("5.00")
RATE_LIMIT_SECONDS = 0.5


async def main():
    async with async_session_factory() as db:

        # 1. Buscar analises com parse_error = true
        analises_r = await db.execute(
            select(Analise).where(
                Analise.tenant_id == TENANT_ID,
                Analise.resultado_haiku["parse_error"].as_boolean() == True,
            ).order_by(Analise.score_risco.desc())
        )
        analises = analises_r.scalars().all()
        total = len(analises)

        print(f"\n{'='*60}")
        print(f"  RE-RUN HAIKU — parse_error=true")
        print(f"  Total a re-processar: {total}")
        print(f"  Custo estimado: ~${total * 0.012:.2f}")
        print(f"{'='*60}\n")

        if total == 0:
            print("Nenhum ato com parse_error encontrado.")
            return

        # Mostra distribuição por nivel_alerta
        dist: dict[str, int] = {}
        for a in analises:
            dist[a.nivel_alerta] = dist.get(a.nivel_alerta, 0) + 1
        for nivel, count in sorted(dist.items()):
            print(f"  {nivel}: {count}")
        print()

        input("Pressione ENTER para iniciar ou Ctrl+C para cancelar... ")

        # 2. Montar system prompt
        print("\nCarregando regimento interno...")
        system_prompt = await montar_system_prompt(db, TENANT_ID)
        print("Regimento carregado.\n")

        # 3. Processar
        # Pre-captura IDs antes do loop — db.commit() expira os objetos SQLAlchemy
        # e acessar atributos de objetos expirados em async causa MissingGreenlet
        casos = [(a.id, a.ato_id) for a in analises]
        custo_sessao = Decimal("0")
        ok = erro = 0
        inicio = datetime.now()

        for i, (analise_id, ato_id) in enumerate(casos, 1):
            ato_r = await db.execute(select(Ato).where(Ato.id == ato_id))
            ato = ato_r.scalar_one()

            print(
                f"[{i:3d}/{total}] {ato.tipo} {ato.numero or '?':10s} "
                f"{str(ato.data_publicacao or '')[:10]}",
                end="  ",
            )

            try:
                # Limpa Irregularidades antigas para evitar duplicação
                await db.execute(
                    delete(Irregularidade).where(
                        Irregularidade.ato_id == ato_id,
                        Irregularidade.analise_id == analise_id,
                    )
                )

                # Reseta flag para bypass da idempotência
                ato.processado = False
                await db.flush()

                # Re-analisa (analisar_ato_haiku faz upsert no Analise existente)
                analise_nova = await analisar_ato_haiku(
                    db, ato.id, RODADA_ID, system_prompt
                )

                custo_ato = analise_nova.custo_usd or Decimal("0")
                custo_sessao += custo_ato

                # Atualiza custo na rodada
                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == RODADA_ID)
                    .values(
                        custo_total_usd=func.coalesce(RodadaAnalise.custo_total_usd, 0) + custo_ato,
                    )
                )
                await db.commit()

                parse_ok = not analise_nova.resultado_haiku.get("parse_error", False)
                nivel = analise_nova.nivel_alerta
                nivel_emoji = {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}.get(nivel, "⚪")
                status_str = "✓" if parse_ok else "⚠ parse_error"
                print(
                    f"{nivel_emoji} {nivel:8s}  score={analise_nova.score_risco:3d}  "
                    f"${float(custo_ato):.4f}  acum=${float(custo_sessao):.3f}  {status_str}"
                )
                ok += 1

                if custo_sessao > CUSTO_LIMITE:
                    print(f"\n⛔ Limite de ${CUSTO_LIMITE} atingido. Pausando.")
                    break

            except KeyboardInterrupt:
                print("\n\nInterrompido pelo usuário.")
                break
            except Exception as e:
                print(f"✗ erro: {e}")
                erro += 1
                await db.rollback()
                continue

            if i < total:
                await asyncio.sleep(RATE_LIMIT_SECONDS)

        # 4. Resumo
        duracao = (datetime.now() - inicio).seconds
        print(f"\n{'='*60}")
        print(f"  OK:    {ok}")
        print(f"  Erro:  {erro}")
        print(f"  Custo da sessão: ${float(custo_sessao):.4f}")
        print(f"  Duração: {duracao//60}m {duracao%60}s")
        print(f"{'='*60}\n")

        # 5. Alerta de atos que ainda ficaram truncados mesmo com 8192 tokens
        truncados_r = await db.execute(
            select(Analise).where(
                Analise.tenant_id == TENANT_ID,
                Analise.resultado_haiku["tokens_truncado"].as_boolean() == True,
            )
        )
        truncados = truncados_r.scalars().all()
        if truncados:
            print(f"⚠️  ALERTA — {len(truncados)} atos ainda truncados mesmo com max_tokens=8192:")
            for a in truncados:
                ato_r = await db.execute(select(Ato).where(Ato.id == a.ato_id))
                ato = ato_r.scalar_one()
                indicios_ok = len(a.resultado_haiku.get("indicios", []))
                pessoas_ok = len(a.resultado_haiku.get("pessoas_extraidas", []))
                print(
                    f"   • {ato.tipo} {ato.numero or '?':10s}  "
                    f"nivel={a.nivel_alerta}  score={a.score_risco}  "
                    f"indicios={indicios_ok}  pessoas={pessoas_ok}  "
                    f"(parcial salvo)"
                )
            print()
            print("   Esses atos têm texto excepcionalmente longo.")
            print("   Sugestão: truncar texto de entrada em 6000 chars e re-rodar.")
        else:
            print("✅ Nenhum ato truncado — todos os JSONs foram gerados completos.")

        if ok == total:
            print("\n✅ Re-run completo! Próximo passo: rodar sonnet_local.py nos vermelhos + laranjas.")
        else:
            restantes = total - ok
            print(f"\n⏸  Restam {restantes} atos. Rode novamente para continuar.")


if __name__ == "__main__":
    asyncio.run(main())
