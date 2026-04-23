#!/usr/bin/env python3
"""
Seed: downloads the CAU/PR Regimento Interno PDF, extracts text,
and upserts it into knowledge_base.

Usage (from backend/ directory):
    source .venv/bin/activate   (Windows: .venv/Scripts/activate)
    python scripts/seed_regimento.py
"""
import asyncio
import io
import os
import re
import sys
import uuid
from datetime import date, datetime, timezone

import asyncpg
import httpx
import pdfplumber
import ftfy

PDF_URL = (
    "https://www.caupr.gov.br/wp-content/uploads/2026/03/"
    "Deliberacao-Ad-Referendum-09.2026-v.02-Com-Regimento.pdf"
)
TITULO = (
    "Regimento Interno CAU/PR — 6ª versão "
    "(DPOPR 0191-02/2025 com alterações Deliberação Ad Referendum nº 09/2026)"
)
VERSAO = "6"
VIGENTE_DESDE = date(2026, 3, 1)


def _load_env() -> str:
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    os.environ.setdefault(key.strip(), val.strip())
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        sys.exit("ERROR: DATABASE_URL not set. Check backend/.env")
    return url.replace("postgresql+asyncpg://", "postgresql://")


def _extract_text(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    text = "\n\n".join(pages)
    text = ftfy.fix_text(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


async def main() -> None:
    db_url = _load_env()

    print(f"⬇  Downloading regimento PDF...")
    async with httpx.AsyncClient(follow_redirects=True, timeout=60) as client:
        resp = await client.get(PDF_URL)
        resp.raise_for_status()
        pdf_bytes = resp.content
    print(f"   {len(pdf_bytes):,} bytes downloaded")

    print("📄 Extracting text with pdfplumber...")
    text = _extract_text(pdf_bytes)
    if len(text) < 5_000:
        sys.exit(f"ERROR: extracted text too short ({len(text)} chars) — check the PDF")
    print(f"   {len(text):,} chars  (~{len(text)//4:,} tokens)")

    print("💾 Connecting to database...")
    conn = await asyncpg.connect(db_url)
    try:
        tenant_id = await conn.fetchval(
            "SELECT id FROM tenants WHERE slug = 'cau-pr'"
        )
        if not tenant_id:
            sys.exit("ERROR: tenant 'cau-pr' not found — run seed.sql first")

        await conn.execute(
            "DELETE FROM knowledge_base WHERE tenant_id = $1 AND tipo = 'regimento'",
            tenant_id,
        )

        await conn.execute(
            """
            INSERT INTO knowledge_base
                (id, tenant_id, tipo, titulo, conteudo, versao, vigente_desde, url_original, criado_em)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            uuid.uuid4(),
            tenant_id,
            "regimento",
            TITULO,
            text,
            VERSAO,
            VIGENTE_DESDE,
            PDF_URL,
            datetime.now(timezone.utc),
        )
        print("✅ knowledge_base seeded!")
        print(f"   tenant : cau-pr")
        print(f"   título : {TITULO}")
        print(f"   chars  : {len(text):,}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
