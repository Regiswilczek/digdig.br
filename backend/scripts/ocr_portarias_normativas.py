#!/usr/bin/env python3
"""
OCR das Portarias Normativas escaneadas do CAU/PR.

Usa PyMuPDF para renderizar páginas e Claude vision para extrair texto.
Não requer Tesseract nem Poppler.

Uso (cd backend/):
    python scripts/ocr_portarias_normativas.py --dry-run
    python scripts/ocr_portarias_normativas.py
"""
import asyncio
import base64
import io
import os
import re
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import asyncpg
import ftfy
import httpx
import fitz  # PyMuPDF
from anthropic import AsyncAnthropic

TENANT_ID  = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"
TIPO       = "portaria_normativa"
RATE_LIMIT = 1.5

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado no backend/.env")
ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_API_KEY:
    sys.exit("ERROR: ANTHROPIC_API_KEY não encontrado no backend/.env")


def _normalizar(texto: str) -> str:
    texto = ftfy.fix_text(texto)
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()


async def _ocr_claude(pdf_bytes: bytes, client: AsyncAnthropic) -> tuple[str, int]:
    """Renderiza PDF via PyMuPDF e extrai texto via Claude vision."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    n_pages = len(doc)
    parts = []

    for i, page in enumerate(doc):
        mat = fitz.Matrix(200 / 72, 200 / 72)  # 200 DPI
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        img_b64 = base64.standard_b64encode(img_bytes).decode()

        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": img_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "Extraia todo o texto desta página de documento oficial brasileiro, "
                            "exatamente como aparece. Preserve parágrafos e estrutura. "
                            "Retorne somente o texto, sem comentários ou formatação extra."
                        ),
                    },
                ],
            }],
        )
        parts.append(response.content[0].text)
        print(f"    pág {i+1}/{n_pages}", end=" ", flush=True)

    doc.close()
    return _normalizar("\n\n".join(parts)), n_pages


async def main(dry_run: bool) -> None:
    print(f"\n{'='*60}")
    print("OCR Portarias Normativas (Claude vision) — CAU/PR")
    print(f"{'='*60}\n")

    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    try:
        rows = await conn.fetch(
            """
            SELECT a.id, a.numero, a.url_pdf, c.tokens_estimados
            FROM atos a
            JOIN conteudo_ato c ON c.ato_id = a.id
            WHERE a.tenant_id = $1
              AND a.tipo = $2
              AND c.qualidade = 'ruim'
            ORDER BY a.numero
            """,
            TENANT_ID, TIPO,
        )

        print(f"Portarias normativas escaneadas: {len(rows)}\n")
        for r in rows:
            print(f"  {r['numero']:10s}  {r['url_pdf']}")
        print()

        if not rows:
            print("Nenhuma para processar.")
            return

        if dry_run:
            print("─── DRY RUN — nada alterado ───")
            return

        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        ok = erro = 0

        with httpx.Client(headers=HEADERS, timeout=60, follow_redirects=True) as http:
            for r in rows:
                numero = r["numero"]
                ato_id = r["id"]
                url = r["url_pdf"]

                print(f"[OCR] PN {numero}", end="  ", flush=True)

                if not url:
                    print("✗ sem URL")
                    erro += 1
                    continue

                try:
                    resp = http.get(url)
                    resp.raise_for_status()
                    pdf_bytes = resp.content
                except Exception as e:
                    print(f"✗ download: {e}")
                    erro += 1
                    continue

                try:
                    texto, n_pages = await _ocr_claude(pdf_bytes, client)
                except Exception as e:
                    print(f"\n  ✗ OCR: {e}")
                    erro += 1
                    continue

                qualidade = "boa" if len(texto) > 100 else "ruim"
                tokens = len(texto) // 4

                await conn.execute(
                    """
                    UPDATE conteudo_ato
                    SET texto_completo    = $1,
                        metodo_extracao  = 'claude_vision',
                        qualidade        = $2,
                        tokens_estimados = $3
                    WHERE ato_id = $4
                    """,
                    texto, qualidade, tokens, ato_id,
                )
                # Reset para re-análise
                await conn.execute(
                    "UPDATE atos SET processado = false WHERE id = $1",
                    ato_id,
                )
                # Remove análise anterior (feita com texto ruim)
                await conn.execute(
                    "DELETE FROM analises WHERE ato_id = $1",
                    ato_id,
                )

                status = "✓" if qualidade == "boa" else "⚠ texto curto"
                print(f"  {status}  {n_pages}p  {tokens:,} tokens")
                ok += 1

                await asyncio.sleep(RATE_LIMIT)

    finally:
        await conn.close()

    print(f"\n{'='*60}")
    print(f"Concluído: {ok} com OCR | {erro} erros")
    if ok:
        print("\nPróximo passo:")
        print("  python scripts/analisar_atos_piper_local.py --tipo portaria_normativa")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="OCR portarias normativas escaneadas")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run))
