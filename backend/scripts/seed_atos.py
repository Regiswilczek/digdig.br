#!/usr/bin/env python3
"""
Seed: imports all acts from local JSON files into the database.
Run this locally (where the JSON files exist) to bootstrap the DB.
Railway doesn't have access to extracted/ — this is a one-time local setup.

Usage (from backend/ directory):
    source .venv/Scripts/activate   (Windows)
    python scripts/seed_atos.py
"""
import asyncio
import json
import sys
import os
import uuid
from datetime import datetime, date
from pathlib import Path
from typing import Optional

import asyncpg

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ── Load .env ─────────────────────────────────────────────────────────────────
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL not set in backend/.env")
ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PORTARIAS_JSON = PROJECT_ROOT / "extracted" / "agente_auditoria_caupr" / "portarias_completo.json"
DELIBERACOES_JSON = PROJECT_ROOT / "extracted" / "agente_auditoria_caupr" / "deliberacoes_completo.json"


def parse_data(data_str: Optional[str]) -> Optional[date]:
    if not data_str:
        return None
    try:
        return datetime.strptime(data_str.strip(), "%d/%m/%Y").date()
    except (ValueError, AttributeError):
        return None


async def main() -> None:
    print(f"📂 Portarias JSON: {PORTARIAS_JSON} (exists={PORTARIAS_JSON.exists()})")
    print(f"📂 Deliberações JSON: {DELIBERACOES_JSON} (exists={DELIBERACOES_JSON.exists()})")

    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    try:
        tenant_id = await conn.fetchval("SELECT id FROM tenants WHERE slug = 'cau-pr'")
        if not tenant_id:
            sys.exit("ERROR: tenant 'cau-pr' not found — run seed.sql first")

        total_inseridos = 0
        total_existentes = 0

        fontes = [
            (PORTARIAS_JSON, "portaria"),
            (DELIBERACOES_JSON, "deliberacao"),
        ]

        for json_path, tipo in fontes:
            if not json_path.exists():
                print(f"⚠  {json_path.name} not found, skipping")
                continue

            with open(json_path, encoding="utf-8") as f:
                atos = json.load(f)

            print(f"\n📋 Importando {len(atos)} {tipo}s...")
            inseridos = 0
            existentes = 0
            erros = 0

            for item in atos:
                numero = str(item.get("numero", "")).strip()
                if not numero:
                    continue

                try:
                    existing = await conn.fetchval(
                        "SELECT id FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo=$3",
                        tenant_id, numero, tipo,
                    )
                    if existing:
                        existentes += 1
                        continue

                    links_pdf = item.get("links_pdf") or []
                    url_pdf = links_pdf[0] if links_pdf else None

                    await conn.execute(
                        """
                        INSERT INTO atos
                            (id, tenant_id, numero, tipo, subtipo, titulo,
                             data_publicacao, ementa, url_pdf,
                             pdf_baixado, processado, criado_em, atualizado_em)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,false,NOW(),NOW())
                        """,
                        uuid.uuid4(), tenant_id, numero, tipo,
                        item.get("tipo"),
                        item.get("titulo"),
                        parse_data(item.get("data")),
                        item.get("ementa"),
                        url_pdf,
                    )
                    inseridos += 1

                except Exception as exc:
                    erros += 1
                    print(f"  ⚠  {tipo} {numero}: {exc}")
                    continue

            print(f"   inseridos={inseridos}  existentes={existentes}  erros={erros}")
            total_inseridos += inseridos
            total_existentes += existentes

        print(f"\n✅ Seed concluído: {total_inseridos} novos atos, {total_existentes} já existiam")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
