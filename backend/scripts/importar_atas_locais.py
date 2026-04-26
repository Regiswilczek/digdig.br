#!/usr/bin/env python3
"""
Importa PDFs de atas baixados manualmente para o banco.

Uso (cd backend/):
    python scripts/importar_atas_locais.py
"""
import asyncio
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
import pdfplumber

TENANT_ID  = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"
PASTA      = ROOT.parent / "DOCUMENTOS QUE CONSEGUI NA MAO" / "atas extraordianarias"

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado no backend/.env")
ASYNCPG_URL = (
    DATABASE_URL
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace(":5432/", ":6543/")
)


def _numero_do_nome(nome: str) -> str | None:
    """Extrai o número da reunião do nome do arquivo."""
    # ATA-29.pdf → 29
    # ATA-nº-85-CAUPR... → 85
    # ATA-no-107-CAUPR... → 107
    m = re.search(r"(?:ATA[-_](?:n[oº°]?[-_]?)?(\d+))", nome, re.IGNORECASE)
    return m.group(1) if m else None


def _normalizar_texto(texto: str) -> str:
    texto = ftfy.fix_text(texto)
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()


def _extrair_pdf(caminho: Path) -> tuple[str, int]:
    with pdfplumber.open(caminho) as pdf:
        n_pages = len(pdf.pages)
        parts = [p.extract_text() or "" for p in pdf.pages]
    return _normalizar_texto("\n\n".join(parts)), n_pages


async def main() -> None:
    if not PASTA.exists():
        sys.exit(f"Pasta não encontrada: {PASTA}")

    pdfs = sorted(PASTA.glob("*.pdf"))
    if not pdfs:
        sys.exit("Nenhum PDF encontrado na pasta.")

    print(f"\nPasta: {PASTA}")
    print(f"PDFs encontrados: {len(pdfs)}\n")

    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    try:
        ok = sem_ato = sem_texto = ja_existe = 0

        for pdf_path in pdfs:
            numero = _numero_do_nome(pdf_path.name)
            if not numero:
                print(f"  ⚠  {pdf_path.name}: não consegui extrair número — pulando")
                continue

            prefix = f"{pdf_path.name:<45s}  (Reunião {numero})"

            # Busca o ato no banco (tenta com e sem zero à esquerda)
            ato = await conn.fetchrow(
                "SELECT id FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo='ata_plenaria'",
                TENANT_ID, numero,
            ) or await conn.fetchrow(
                "SELECT id FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo='ata_plenaria'",
                TENANT_ID, str(int(numero)),
            )
            if not ato:
                print(f"  ✗  {prefix}: ato não encontrado no banco")
                sem_ato += 1
                continue

            ato_id = ato["id"]

            # Verifica se já tem texto
            tem_texto = await conn.fetchval(
                "SELECT 1 FROM conteudo_ato WHERE ato_id=$1", ato_id
            )
            if tem_texto:
                print(f"  ─  {prefix}: já tem texto, pulando")
                ja_existe += 1
                continue

            # Extrai texto do PDF local
            try:
                texto, n_pages = _extrair_pdf(pdf_path)
            except Exception as exc:
                print(f"  ✗  {prefix}: erro ao extrair PDF: {exc}")
                continue

            qualidade = "boa" if len(texto) > 100 else "ruim"
            tokens = len(texto) // 4

            await conn.execute(
                """
                INSERT INTO conteudo_ato
                    (ato_id, texto_completo, metodo_extracao,
                     qualidade, tokens_estimados, criado_em)
                VALUES ($1, $2, 'pdfplumber_local', $3, $4, NOW())
                ON CONFLICT (ato_id) DO NOTHING
                """,
                ato_id, texto, qualidade, tokens,
            )
            await conn.execute(
                """
                UPDATE atos SET
                    pdf_baixado       = true,
                    pdf_paginas       = $1,
                    pdf_tamanho_bytes = $2,
                    erro_download     = NULL
                WHERE id = $3
                """,
                n_pages, pdf_path.stat().st_size, ato_id,
            )

            status = "✓" if qualidade == "boa" else "⚠ (escaneado)"
            print(f"  {status}  {prefix}: {n_pages}p  {tokens:,} tokens")
            ok += 1

    finally:
        await conn.close()

    print(f"\nConcluído: {ok} importados | {ja_existe} já existiam | {sem_ato} sem ato no banco")


if __name__ == "__main__":
    asyncio.run(main())
