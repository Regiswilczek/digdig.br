#!/usr/bin/env python3
"""
atlas_backfill_tipo.py — popula atos.tipo_atlas com a categoria ATLAS.

Idempotente: roda quantas vezes quiser (UPDATE FROM faz upsert lógico).
Usar depois de rodar atlas_classificar.py (em batch ou em mop-up).

Uso:
    cd backend
    python scripts/atlas_backfill_tipo.py
    python scripts/atlas_backfill_tipo.py --tenant cau-pr
"""
import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from sqlalchemy import text
from app.database import async_session_factory


async def main(tenant_slug: str | None):
    async with async_session_factory() as db:
        params = {}
        sql = """
            UPDATE atos a
            SET tipo_atlas = ca.categoria
            FROM classificacao_atlas ca
            WHERE ca.ato_id = a.id
              AND (a.tipo_atlas IS DISTINCT FROM ca.categoria)
        """
        if tenant_slug:
            sql += " AND a.tenant_id = (SELECT id FROM tenants WHERE slug = :slug)"
            params["slug"] = tenant_slug

        result = await db.execute(text(sql), params)
        await db.commit()
        print(f"Linhas atualizadas: {result.rowcount}")

        # Mostra distribuição final
        where_extra = ""
        if tenant_slug:
            where_extra = " AND a.tenant_id = (SELECT id FROM tenants WHERE slug = :slug)"
        rows = (await db.execute(
            text(f"""
                SELECT tipo_atlas, COUNT(*) qtd
                FROM atos a
                WHERE tipo_atlas IS NOT NULL
                {where_extra}
                GROUP BY tipo_atlas
                ORDER BY qtd DESC
            """),
            params,
        )).all()
        print(f"\nDistribuição tipo_atlas ({tenant_slug or 'todos os tenants'}):")
        for t, q in rows:
            print(f"  {t:<28s} {q:>5d}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant", default=None,
                        help="Filtra por tenant slug (ex: cau-pr). Default: todos.")
    args = parser.parse_args()
    asyncio.run(main(args.tenant))
