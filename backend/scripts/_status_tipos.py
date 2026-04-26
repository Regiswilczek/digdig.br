#!/usr/bin/env python3
import asyncio, os, sys
from pathlib import Path
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
import asyncpg

DATABASE_URL = os.environ.get("DATABASE_URL", "")
ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace(":5432/", ":6543/")
TENANT_ID = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"

async def main():
    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    rows = await conn.fetch(
        """SELECT tipo,
                  COUNT(*) as total,
                  SUM(CASE WHEN EXISTS(SELECT 1 FROM conteudo_ato WHERE ato_id=a.id) THEN 1 ELSE 0 END) as com_texto,
                  SUM(CASE WHEN EXISTS(SELECT 1 FROM conteudo_ato WHERE ato_id=a.id AND qualidade='boa') THEN 1 ELSE 0 END) as texto_bom,
                  SUM(CASE WHEN EXISTS(SELECT 1 FROM analises WHERE ato_id=a.id) THEN 1 ELSE 0 END) as analisados
           FROM atos a
           WHERE tenant_id = $1
           GROUP BY tipo
           ORDER BY total DESC""",
        TENANT_ID)
    print(f"{'Tipo':<28} {'Total':>6} {'c/texto':>8} {'boa':>6} {'analises':>9}")
    print("-" * 62)
    for r in rows:
        print(f"{r['tipo']:<28} {r['total']:>6} {r['com_texto']:>8} {r['texto_bom']:>6} {r['analisados']:>9}")
    await conn.close()

asyncio.run(main())
