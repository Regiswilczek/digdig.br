"""
Backfill de custo_piper_usd / custo_bud_usd / custo_new_usd nas análises antigas.

Antes da migration c2d3e4f5a6b7, só guardávamos custo_usd (soma dos 3 agentes).
A partir de 30/04/2026 cada agente grava o próprio custo. Para registros
históricos, estima o breakdown a partir dos tokens consumidos por agente
usando uma heurística de mistura input/output.

Heurística:
  Como tokens_<agente> é (input + output) somado, assumimos:
    - 80% dos tokens foram input
    - 20% foram output
  Para o Piper consideramos tokens_piper_cached como input cacheado
  (preço 10× menor) quando disponível.

Idempotente: só atualiza linhas onde custo_<agente>_usd IS NULL e há tokens
do agente > 0. Rodar várias vezes não re-processa nada.

Uso:
    docker compose exec api python -m scripts.backfill_custo_por_agente
    # opcional: --dry-run mostra contagem e total estimado sem gravar
"""
from __future__ import annotations

import asyncio
import sys
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session_factory
from app.models.analise import Analise


PRECO_PIPER = {"input": Decimal("1.25"), "cache_hit": Decimal("0.125"), "output": Decimal("10.00")}
PRECO_BUD = {"input": Decimal("3.00"), "output": Decimal("15.00")}
PRECO_NEW = {"input": Decimal("15.00"), "output": Decimal("75.00")}
MILHAO = Decimal("1000000")

INPUT_FRAC = Decimal("0.8")
OUTPUT_FRAC = Decimal("0.2")


def estimar_custo_piper(tokens_piper: int, tokens_cached: int | None) -> Decimal:
    if tokens_piper <= 0:
        return Decimal("0")
    t = Decimal(tokens_piper)
    cached = Decimal(tokens_cached or 0)
    input_total = t * INPUT_FRAC
    output_total = t * OUTPUT_FRAC
    # cached não pode ser maior que input estimado
    cached_eff = min(cached, input_total)
    input_naocached = max(Decimal("0"), input_total - cached_eff)
    custo = (
        input_naocached * PRECO_PIPER["input"]
        + cached_eff * PRECO_PIPER["cache_hit"]
        + output_total * PRECO_PIPER["output"]
    ) / MILHAO
    return custo.quantize(Decimal("0.000001"))


def estimar_custo_simples(tokens: int, preco_input: Decimal, preco_output: Decimal) -> Decimal:
    if tokens <= 0:
        return Decimal("0")
    t = Decimal(tokens)
    custo = (t * INPUT_FRAC * preco_input + t * OUTPUT_FRAC * preco_output) / MILHAO
    return custo.quantize(Decimal("0.000001"))


async def main(dry_run: bool = False) -> None:
    print(f"[backfill] DB url: {settings.database_url[:40]}...")
    print(f"[backfill] dry_run={dry_run}")

    async with async_session_factory() as db:  # type: AsyncSession
        # Carrega só as linhas que precisam de backfill em pelo menos 1 coluna
        result = await db.execute(
            select(Analise).where(
                (Analise.custo_piper_usd.is_(None) & (Analise.tokens_piper > 0))
                | (Analise.custo_bud_usd.is_(None) & (Analise.tokens_bud > 0))
                | (Analise.custo_new_usd.is_(None) & (Analise.tokens_new > 0))
            )
        )
        analises = result.scalars().all()

        if not analises:
            print("[backfill] nada a fazer — todas as análises já têm custo por agente.")
            return

        print(f"[backfill] {len(analises)} análises com custo por agente faltando")

        total_piper = total_bud = total_new = Decimal("0")
        atualizadas = 0

        for an in analises:
            mudou = False

            if an.custo_piper_usd is None and an.tokens_piper > 0:
                c = estimar_custo_piper(an.tokens_piper, an.tokens_piper_cached)
                if not dry_run:
                    an.custo_piper_usd = c
                total_piper += c
                mudou = True

            if an.custo_bud_usd is None and an.tokens_bud > 0:
                c = estimar_custo_simples(an.tokens_bud, PRECO_BUD["input"], PRECO_BUD["output"])
                if not dry_run:
                    an.custo_bud_usd = c
                total_bud += c
                mudou = True

            if an.custo_new_usd is None and an.tokens_new > 0:
                c = estimar_custo_simples(an.tokens_new, PRECO_NEW["input"], PRECO_NEW["output"])
                if not dry_run:
                    an.custo_new_usd = c
                total_new += c
                mudou = True

            if mudou:
                atualizadas += 1

        print(f"[backfill] análises tocadas:    {atualizadas}")
        print(f"[backfill] custo Piper estimado: ${total_piper:.4f}")
        print(f"[backfill] custo Bud estimado:   ${total_bud:.4f}")
        print(f"[backfill] custo New estimado:   ${total_new:.4f}")
        print(f"[backfill] total estimado:       ${total_piper + total_bud + total_new:.4f}")

        if dry_run:
            print("[backfill] dry_run — nada gravado.")
            return

        await db.commit()
        print("[backfill] commit OK.")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    asyncio.run(main(dry_run=dry_run))
