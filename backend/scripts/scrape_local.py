#!/usr/bin/env python3
"""
Scraper local: baixa PDFs do CAU/PR, extrai texto com pdfplumber
e insere em conteudo_ato. Roda na sua máquina (IP BR = sem 403).

Usage (from backend/ directory):
    source .venv/Scripts/activate
    python scripts/scrape_local.py

Opções:
    --limit N     processa no máximo N atos (padrão: todos)
    --offset N    pula os primeiros N atos (para retomar)
"""
import asyncio
import io
import os
import re
import sys
import uuid
import argparse
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import asyncpg
import httpx
import pdfplumber
import ftfy

# ── Config ────────────────────────────────────────────────────────────────────
RATE_LIMIT_SECONDS = 1.5   # intervalo entre downloads
MAX_PDF_BYTES = 50 * 1024 * 1024

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.caupr.gov.br/",
    "Accept": "application/pdf,*/*",
}

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


# ── PDF helpers ───────────────────────────────────────────────────────────────
def extract_text(pdf_bytes: bytes) -> tuple[str, int]:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
        n_pages = len(pdf.pages)
    text = "\n\n".join(pages)
    text = ftfy.fix_text(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip(), n_pages


# ── Main ──────────────────────────────────────────────────────────────────────
async def main(limit: Optional[int], offset: int) -> None:
    conn = await asyncpg.connect(ASYNCPG_URL)

    try:
        # Fetch pending atos
        rows = await conn.fetch(
            """
            SELECT a.id, a.numero, a.tipo, a.url_pdf
            FROM atos a
            LEFT JOIN conteudo_ato c ON c.ato_id = a.id
            WHERE a.pdf_baixado = false
              AND a.url_pdf IS NOT NULL
              AND c.ato_id IS NULL
            ORDER BY a.data_publicacao DESC NULLS LAST
            OFFSET $1
            """,
            offset,
        )

        if limit:
            rows = rows[:limit]

        total = len(rows)
        if total == 0:
            print("✅ Nenhum ato pendente. Tudo já foi baixado.")
            return

        print(f"📋 {total} atos para baixar (offset={offset})")
        print(f"   Rate limit: {RATE_LIMIT_SECONDS}s entre downloads\n")

        ok = erro = 0

        async with httpx.AsyncClient(
            headers=HEADERS, follow_redirects=True, timeout=30
        ) as client:
            for i, row in enumerate(rows, 1):
                ato_id = row["id"]
                numero = row["numero"]
                tipo = row["tipo"]
                url = row["url_pdf"]

                prefix = f"[{i}/{total}] {tipo} {numero}"

                try:
                    resp = await client.get(url)
                    if resp.status_code == 403:
                        print(f"  ⛔ {prefix}: 403 Forbidden — {url}")
                        await conn.execute(
                            "UPDATE atos SET erro_download=$1 WHERE id=$2",
                            "403_forbidden", ato_id,
                        )
                        erro += 1
                        continue

                    resp.raise_for_status()
                    pdf_bytes = resp.content

                    if len(pdf_bytes) > MAX_PDF_BYTES:
                        raise ValueError(f"PDF muito grande: {len(pdf_bytes)} bytes")

                    text, n_pages = extract_text(pdf_bytes)

                    if not text or len(text) < 20:
                        await conn.execute(
                            "UPDATE atos SET erro_download=$1 WHERE id=$2",
                            "texto_vazio", ato_id,
                        )
                        print(f"  ⚠  {prefix}: texto vazio")
                        erro += 1
                        continue

                    tokens = len(text) // 4

                    await conn.execute(
                        """
                        INSERT INTO conteudo_ato
                            (ato_id, texto_completo, metodo_extracao,
                             qualidade, tokens_estimados, criado_em)
                        VALUES ($1, $2, 'pdfplumber', 'boa', $3, NOW())
                        ON CONFLICT (ato_id) DO NOTHING
                        """,
                        ato_id, text, tokens,
                    )
                    await conn.execute(
                        """
                        UPDATE atos SET
                            pdf_baixado = true,
                            pdf_paginas = $1,
                            pdf_tamanho_bytes = $2
                        WHERE id = $3
                        """,
                        n_pages, len(pdf_bytes), ato_id,
                    )
                    ok += 1
                    print(f"  ✓  {prefix}: {n_pages}p, {tokens} tokens")

                except Exception as exc:
                    await conn.execute(
                        "UPDATE atos SET erro_download=$1 WHERE id=$2",
                        str(exc)[:200], ato_id,
                    )
                    print(f"  ✗  {prefix}: {exc}")
                    erro += 1

                if i < total:
                    await asyncio.sleep(RATE_LIMIT_SECONDS)

    finally:
        await conn.close()

    print(f"\n✅ Concluído: {ok} baixados, {erro} erros")
    print(f"   Próximo offset para retomar: {offset + ok + erro}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--offset", type=int, default=0)
    args = parser.parse_args()
    asyncio.run(main(args.limit, args.offset))
