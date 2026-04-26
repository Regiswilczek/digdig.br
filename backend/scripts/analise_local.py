#!/usr/bin/env python3
"""
Executa a análise Haiku localmente para as portarias pendentes.
Roda direto contra o Supabase — sem Celery, sem Railway.

Uso:
    cd backend
    python scripts/analise_local.py

Segurança:
    - Só processa atos com processado=False (idempotente)
    - Para automaticamente se custo acumulado > $8
    - Usa a rodada em_progresso existente
"""
import asyncio
import sys
import os
from pathlib import Path
from decimal import Decimal
from datetime import datetime

# ── Path setup ────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

# Load .env before importing app modules
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

# ── Imports ───────────────────────────────────────────────────────────────────
import uuid
from sqlalchemy import select, update, func
from app.database import async_session_factory
from app.models.ato import Ato, RodadaAnalise
from app.models.analise import Analise
from app.services.haiku_service import analisar_ato_haiku, montar_system_prompt

# ── Config ────────────────────────────────────────────────────────────────────
RODADA_ID = uuid.UUID("5b365c0d-43be-4a7e-a22d-159f50fbe3c2")
TENANT_ID = uuid.UUID("f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4")
CUSTO_LIMITE = Decimal("8.00")   # para antes de $8 nesta sessão


# ── Main ──────────────────────────────────────────────────────────────────────
async def main():
    async with async_session_factory() as db:

        # 1. Verificar rodada
        rodada_r = await db.execute(
            select(RodadaAnalise).where(RodadaAnalise.id == RODADA_ID)
        )
        rodada = rodada_r.scalar_one()
        print(f"\n{'='*60}")
        print(f"  RODADA  {str(RODADA_ID)[:8]}...")
        print(f"  status  {rodada.status}")
        print(f"  haiku   {rodada.atos_analisados_haiku}/{rodada.total_atos}")
        print(f"{'='*60}\n")

        if rodada.status not in ("em_progresso", "pendente"):
            print(f"AVISO: rodada está '{rodada.status}' — não é possível continuar.")
            return

        # 2. Buscar atos pendentes (processado=False AND pdf_baixado=True)
        atos_r = await db.execute(
            select(Ato)
            .where(
                Ato.tenant_id == TENANT_ID,
                Ato.pdf_baixado == True,
                Ato.processado == False,
            )
            .order_by(Ato.data_publicacao.asc())
        )
        atos = atos_r.scalars().all()
        total = len(atos)
        print(f"Atos pendentes: {total}")
        print(f"Custo estimado: ${float(Decimal(str(total)) * Decimal('0.0120')):.2f} (base $0.0120/ato)\n")

        if total == 0:
            print("Nenhum ato pendente. Pipeline completo.")
            return

        input("Pressione ENTER para iniciar ou Ctrl+C para cancelar... ")

        # 3. Montar system prompt uma vez (regimento vai para cache)
        print("\nCarregando regimento interno...")
        system_prompt = await montar_system_prompt(db, TENANT_ID)
        print("Regimento carregado.\n")

        # 4. Processar
        custo_sessao = Decimal("0")
        ok = erro = 0
        inicio = datetime.now()

        for i, ato in enumerate(atos, 1):
            elapsed = (datetime.now() - inicio).seconds
            print(f"[{i:3d}/{total}] {ato.tipo} {ato.numero or '?':10s} {str(ato.data_publicacao or '')[:10]}", end="  ")

            try:
                analise = await analisar_ato_haiku(db, ato.id, RODADA_ID, system_prompt)
                custo_ato = analise.custo_usd or Decimal("0")
                custo_sessao += custo_ato

                # Acumular custo na rodada (com COALESCE para evitar NULL + valor = NULL)
                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == RODADA_ID)
                    .values(
                        atos_analisados_haiku=RodadaAnalise.atos_analisados_haiku + 1,
                        custo_total_usd=func.coalesce(RodadaAnalise.custo_total_usd, 0) + custo_ato,
                    )
                )
                await db.commit()

                nivel_emoji = {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}.get(
                    analise.nivel_alerta, "⚪"
                )
                print(f"{nivel_emoji} {analise.nivel_alerta:8s}  ${float(custo_ato):.4f}  acum=${float(custo_sessao):.3f}")
                ok += 1

                # Guardar contra gasto excessivo
                if custo_sessao > CUSTO_LIMITE:
                    print(f"\n⛔ Limite de ${CUSTO_LIMITE} atingido. Pausando.")
                    break

            except KeyboardInterrupt:
                print("\n\nInterrompido pelo usuário.")
                break
            except Exception as e:
                print(f"✗ erro: {e}")
                erro += 1
                continue

        # 5. Resumo
        duracao = (datetime.now() - inicio).seconds
        print(f"\n{'='*60}")
        print(f"  OK:    {ok}")
        print(f"  Erro:  {erro}")
        print(f"  Custo da sessão: ${float(custo_sessao):.4f}")
        print(f"  Duração: {duracao//60}m {duracao%60}s")
        print(f"{'='*60}\n")

        # 6. Verificar se todos foram processados
        pendentes_r = await db.execute(
            select(func.count()).where(
                Ato.tenant_id == TENANT_ID,
                Ato.pdf_baixado == True,
                Ato.processado == False,
            )
        )
        restantes = pendentes_r.scalar()

        if restantes == 0:
            print("✅ Pipeline Haiku completo! Todos os atos foram analisados.")
            print("   Próximo passo: rodar a fase Sonnet para os casos vermelhos.")
            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == RODADA_ID)
                .values(status="haiku_completo")
            )
            await db.commit()
        else:
            print(f"⏸  Restam {restantes} atos. Rode novamente para continuar.")


if __name__ == "__main__":
    asyncio.run(main())
