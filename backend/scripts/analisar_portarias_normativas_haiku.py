#!/usr/bin/env python3
"""
Análise Haiku local das Portarias Normativas do CAU/PR.
Roda direto contra o Supabase — sem Celery, sem Railway, sem rodada.

Uso (cd backend/):
    python scripts/analisar_portarias_normativas_haiku.py --dry-run
    python scripts/analisar_portarias_normativas_haiku.py
"""
import asyncio
import sys
import os
import argparse
from pathlib import Path
from decimal import Decimal
from datetime import datetime

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

from sqlalchemy import select, func
from app.database import async_session_factory
from app.models.ato import Ato
from app.models.analise import Analise
from app.services.haiku_service import analisar_ato_haiku, montar_system_prompt
import uuid

TENANT_ID   = uuid.UUID("f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4")
TIPO        = "portaria_normativa"
CUSTO_LIMITE = Decimal("5.00")
RATE_LIMIT   = 1.5  # segundos entre chamadas


async def main(dry_run: bool) -> None:
    print(f"\n{'='*60}")
    print("Análise Haiku — Portarias Normativas CAU/PR")
    print(f"{'='*60}\n")

    async with async_session_factory() as db:
        # Atos com PDF baixado, não processados, tipo portaria_normativa
        atos_r = await db.execute(
            select(Ato)
            .where(
                Ato.tenant_id == TENANT_ID,
                Ato.tipo == TIPO,
                Ato.pdf_baixado == True,
                Ato.processado == False,
            )
            .order_by(Ato.data_publicacao.asc().nulls_last())
        )
        atos = atos_r.scalars().all()
        total = len(atos)

        print(f"Portarias normativas pendentes: {total}")
        custo_est = total * 0.008
        print(f"Custo estimado: ~${custo_est:.2f}\n")

        if total == 0:
            print("Nada a analisar.")
            return

        if dry_run:
            print("─── DRY RUN ───\n")
            for a in atos:
                print(f"  {a.numero:>8s}  [{a.data_publicacao}]  {(a.ementa or '')[:60]}")
            return

        print("Carregando regimento interno (prompt cache)...")
        system_prompt = await montar_system_prompt(db, TENANT_ID)
        print("Regimento carregado.\n")

        input("Pressione ENTER para iniciar ou Ctrl+C para cancelar... ")

        ok = erro = 0
        custo_sessao = Decimal("0")
        inicio = datetime.now()

        for i, ato in enumerate(atos, 1):
            print(
                f"[{i:2d}/{total}] PN {ato.numero or '?':>8s}  "
                f"[{str(ato.data_publicacao or '')[:10]}]",
                end="  "
            )
            try:
                analise = await analisar_ato_haiku(db, ato.id, None, system_prompt)
                custo_ato = analise.custo_usd or Decimal("0")
                custo_sessao += custo_ato
                await db.commit()

                emoji = {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}.get(
                    analise.nivel_alerta, "⚪"
                )
                print(f"{emoji} {analise.nivel_alerta:8s}  ${float(custo_ato):.4f}")
                ok += 1

                if custo_sessao > CUSTO_LIMITE:
                    print(f"\n⛔ Limite de ${CUSTO_LIMITE} atingido. Pausando.")
                    break

            except KeyboardInterrupt:
                print("\nInterrompido.")
                break
            except Exception as e:
                print(f"✗ erro: {e}")
                erro += 1
                continue

            if i < total:
                await asyncio.sleep(RATE_LIMIT)

        duracao = (datetime.now() - inicio).seconds
        print(f"\n{'='*60}")
        print(f"Concluído: {ok} analisadas | {erro} erros")
        print(f"Custo da sessão: ${float(custo_sessao):.4f}")
        print(f"Duração: {duracao//60}m {duracao%60}s")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run))
