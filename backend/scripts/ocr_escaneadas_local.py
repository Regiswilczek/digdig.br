#!/usr/bin/env python3
"""
OCR dos PDFs escaneados usando PyMuPDF (renderiza páginas) + Claude Haiku (visão).
Extrai o texto de cada página como imagem e salva em conteudo_ato.
Após rodar este script, analise_local.py processa esses atos normalmente.

Requisitos: pymupdf>=1.24.0, anthropic>=0.49.0, httpx (já instalados)

Uso:
    cd backend
    python scripts/ocr_escaneadas_local.py
    python scripts/ocr_escaneadas_local.py --limit 10   # testa com 10 primeiros
    python scripts/ocr_escaneadas_local.py --dry-run    # mostra lista sem processar

Custo estimado: ~$0.003–0.008 por PDF (Haiku vision, ~3 páginas médias)
"""
import asyncio
import base64
import io
import os
import re
import sys
import argparse
from pathlib import Path
from datetime import datetime

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_env = Path(__file__).parent.parent / ".env"
if _env.exists():
    with open(_env) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado em backend/.env")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_API_KEY:
    sys.exit("ERROR: ANTHROPIC_API_KEY não encontrado em backend/.env")

import asyncpg
import httpx
import fitz  # PyMuPDF
import anthropic

ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.caupr.gov.br/",
}

HAIKU_MODEL = "claude-haiku-4-5-20251001"
MAX_PAGES_PER_DOC = 8   # limita para controlar custo
DPI = 150               # resolução para render das páginas
RATE_LIMIT = 2.0        # segundos entre documentos


OCR_SYSTEM = (
    "Você é um extrator de texto de documentos administrativos brasileiros. "
    "Extraia o texto EXATAMENTE como aparece no documento, incluindo cabeçalhos, "
    "datas, nomes, cargos e todos os detalhes. Não resuma. Não interprete. "
    "Apenas transcreva o texto visível. Se uma seção estiver ilegível, escreva [ILEGÍVEL]."
)


def render_page_as_png(page: fitz.Page, dpi: int = DPI) -> bytes:
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    return pix.tobytes("png")


def png_to_base64(png_bytes: bytes) -> str:
    return base64.standard_b64encode(png_bytes).decode()


async def ocr_pdf_bytes(client: anthropic.Anthropic, pdf_bytes: bytes, numero: str) -> str:
    """Renderiza cada página do PDF e usa Claude Haiku vision para extrair texto."""
    import tempfile

    if len(pdf_bytes) < 100:
        raise ValueError(f"PDF muito pequeno ({len(pdf_bytes)} bytes) — possível página de erro")

    # Escreve em arquivo temporário para evitar problema de GC com stream em asyncio
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name

    try:
        doc = fitz.open(tmp_path)
    except Exception as e:
        os.unlink(tmp_path)
        raise ValueError(f"Não foi possível abrir o PDF: {e}")

    total_pages = len(doc)  # salva antes de fechar
    n_pages = min(total_pages, MAX_PAGES_PER_DOC)
    page_texts = []

    for i in range(n_pages):
        page = doc[i]
        png = render_page_as_png(page)
        b64 = png_to_base64(png)

        msg = client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=2048,
            system=OCR_SYSTEM,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                f"Esta é a página {i+1} de {n_pages} da portaria nº {numero}. "
                                "Transcreva TODO o texto visível nesta página."
                            ),
                        },
                    ],
                }
            ],
        )
        page_texts.append(msg.content[0].text.strip())

    doc.close()
    os.unlink(tmp_path)

    if total_pages > MAX_PAGES_PER_DOC:
        page_texts.append(f"\n[Documento truncado: exibindo {MAX_PAGES_PER_DOC} de {total_pages} páginas]")

    return "\n\n--- Página ---\n\n".join(page_texts)


async def main(limit: int | None, dry_run: bool) -> None:
    conn = await asyncpg.connect(ASYNCPG_URL)
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    try:
        rows = await conn.fetch("""
            SELECT id, numero, tipo, url_pdf, ementa
            FROM atos
            WHERE erro_download = 'texto_vazio'
              AND url_pdf IS NOT NULL
            ORDER BY data_publicacao DESC NULLS LAST
        """)

        if limit:
            rows = rows[:limit]

        total = len(rows)
        if total == 0:
            print("✅ Nenhum PDF escaneado encontrado. Nada a fazer.")
            return

        print(f"\n{'='*65}")
        print(f"  OCR DE PDFs ESCANEADOS — {total} documentos")
        print(f"  Modelo: {HAIKU_MODEL} (visão)")
        print(f"  Máx páginas/doc: {MAX_PAGES_PER_DOC}  |  DPI: {DPI}")
        custo_est = total * 0.006
        print(f"  Custo estimado: ~${custo_est:.2f}  (~$0.006/doc)")
        print(f"{'='*65}\n")

        if dry_run:
            print("DRY RUN — documentos que seriam processados:")
            for r in rows:
                print(f"  {r['tipo']} #{r['numero']}  {(r['ementa'] or '')[:60]}")
            return

        try:
            input("Pressione ENTER para iniciar ou Ctrl+C para cancelar... ")
        except EOFError:
            pass

        ok = erro = 0
        inicio = datetime.now()

        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=60) as http:
            for i, row in enumerate(rows, 1):
                ato_id = row["id"]
                numero = row["numero"] or "?"
                tipo = row["tipo"]
                url = row["url_pdf"]

                print(f"[{i:3d}/{total}] {tipo} #{numero}", end="  ", flush=True)

                try:
                    resp = await http.get(url)
                    resp.raise_for_status()
                    pdf_bytes = resp.content

                    text = await ocr_pdf_bytes(client, pdf_bytes, numero)

                    # Limpa e valida
                    text = re.sub(r"\n{4,}", "\n\n\n", text).strip()
                    if len(text) < 30:
                        raise ValueError("Texto extraído muito curto — possível PDF ilegível")

                    tokens = len(text) // 4
                    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                    n_pages = len(doc)
                    doc.close()

                    await conn.execute("""
                        INSERT INTO conteudo_ato
                            (ato_id, texto_completo, metodo_extracao,
                             qualidade, tokens_estimados, criado_em)
                        VALUES ($1, $2, 'tesseract_ocr', 'parcial', $3, NOW())
                        ON CONFLICT (ato_id) DO UPDATE
                            SET texto_completo = EXCLUDED.texto_completo,
                                metodo_extracao = EXCLUDED.metodo_extracao,
                                qualidade = EXCLUDED.qualidade,
                                tokens_estimados = EXCLUDED.tokens_estimados
                    """, ato_id, text, tokens)

                    await conn.execute("""
                        UPDATE atos SET
                            pdf_baixado = true,
                            erro_download = NULL,
                            pdf_paginas = $1,
                            pdf_tamanho_bytes = $2
                        WHERE id = $3
                    """, n_pages, len(pdf_bytes), ato_id)

                    print(f"✓  {n_pages}p  {tokens} tokens")
                    ok += 1

                except KeyboardInterrupt:
                    print("\n\nInterrompido.")
                    break
                except Exception as exc:
                    print(f"✗  {exc}")
                    erro += 1

                if i < total:
                    await asyncio.sleep(RATE_LIMIT)

        duracao = (datetime.now() - inicio).seconds
        print(f"\n{'='*65}")
        print(f"  OK:    {ok}")
        print(f"  Erro:  {erro}")
        print(f"  Duração: {duracao//60}m {duracao%60}s")
        print(f"{'='*65}")
        if ok > 0:
            print(f"\n✅ Pronto! Rode agora:")
            print(f"   python scripts/analise_local.py")
            print(f"   (irá analisar os {ok} atos que acabaram de receber texto)\n")

    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Processar no máximo N documentos")
    parser.add_argument("--dry-run", action="store_true", help="Mostra lista sem processar")
    args = parser.parse_args()
    asyncio.run(main(args.limit, args.dry_run))
