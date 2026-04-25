#!/usr/bin/env python3
"""
Scraper de deliberações do CAU/PR — 3 fases:

  Fase 1 — PDF: deliberações com url_pdf → baixa e extrai texto com pdfplumber
  Fase 2 — Descoberta: raspa a listagem do site para encontrar url_original
            das deliberações HTML-only (sem PDF cadastrado)
  Fase 3 — HTML: deliberações com url_original descoberto → extrai texto da página

Uso:
    cd backend
    python scripts/scrape_deliberacoes_local.py               # todas as fases
    python scripts/scrape_deliberacoes_local.py --fase 1      # só PDFs
    python scripts/scrape_deliberacoes_local.py --fase 2      # só descoberta
    python scripts/scrape_deliberacoes_local.py --fase 2 --preview  # mostra sem salvar
    python scripts/scrape_deliberacoes_local.py --fase 3      # só HTML
    python scripts/scrape_deliberacoes_local.py --fase 1,3    # PDF + HTML

Requer: pip install beautifulsoup4 lxml
"""
import argparse
import asyncio
import io
import os
import re
import sys
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding for UTF-8 box-drawing characters
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import asyncpg
import ftfy
import httpx
import pdfplumber

try:
    from bs4 import BeautifulSoup
    BS4_OK = True
except ImportError:
    BS4_OK = False

# ── Constantes ────────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado no .env")
ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

TENANT_ID   = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"
WP_API_URL  = "https://www.caupr.gov.br/wp-json/wp/v2/pages/17916"
RATE_LIMIT  = 2.0
MAX_PDF_BYTES = 50 * 1024 * 1024

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.caupr.gov.br/",
    "Accept": "text/html,application/xhtml+xml,application/pdf,*/*",
    "Accept-Language": "pt-BR,pt;q=0.9",
}


# ── Helpers ───────────────────────────────────────────────────────────────────
def normalizar(texto: str) -> str:
    texto = ftfy.fix_text(texto)
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()


def extrair_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        paginas = len(pdf.pages)
        partes = [p.extract_text() or "" for p in pdf.pages]
    return normalizar("\n\n".join(partes)), paginas


def extrair_html(html: str) -> str:
    if not BS4_OK:
        return ""
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form"]):
        tag.decompose()
    conteudo = (
        soup.select_one(".entry-content")
        or soup.select_one(".post-content")
        or soup.select_one("article")
        or soup.select_one("main")
        or soup.select_one("#content")
        or soup.select_one(".content")
        or soup.body
    )
    texto = conteudo.get_text(separator="\n") if conteudo else soup.get_text(separator="\n")
    return normalizar(texto)


def normalizar_numero(texto: str) -> list[str]:
    """Extrai candidatos de número de deliberação de um texto."""
    candidatos = []
    # Formato DPOPR: 0102-11/2019 ou 0015-06/2026
    for m in re.finditer(r"\b(\d{2,4}-\d{2}/\d{4})\b", texto):
        candidatos.append(m.group(1))
    # Formato simples: 15/2026
    for m in re.finditer(r"\b(\d{1,4}/\d{4})\b", texto):
        candidatos.append(m.group(1))
    return candidatos


# ── Fase 1: PDF ───────────────────────────────────────────────────────────────
async def fase_pdf(conn: asyncpg.Connection, http: httpx.AsyncClient) -> None:
    rows = await conn.fetch(
        """
        SELECT a.id, a.numero, a.url_pdf
        FROM atos a
        LEFT JOIN conteudo_ato c ON c.ato_id = a.id
        WHERE a.tenant_id = $1
          AND a.tipo = 'deliberacao'
          AND a.url_pdf IS NOT NULL
          AND c.ato_id IS NULL
        ORDER BY a.data_publicacao DESC NULLS LAST
        """,
        TENANT_ID,
    )
    total = len(rows)
    print(f"\n─── FASE 1: PDF ({total} deliberações com url_pdf sem texto) ───")
    if total == 0:
        print("  Nenhuma pendente.\n")
        return

    ok = erro = pulados = 0
    for i, row in enumerate(rows, 1):
        print(f"[{i:4d}/{total}] {row['numero']:25s}", end="  ", flush=True)
        try:
            resp = await http.get(row["url_pdf"])
            if resp.status_code == 403:
                print("⛔ 403")
                await conn.execute(
                    "UPDATE atos SET erro_download='403_forbidden' WHERE id=$1", row["id"]
                )
                pulados += 1
                continue
            resp.raise_for_status()
            pdf_bytes = resp.content

            if len(pdf_bytes) > MAX_PDF_BYTES:
                print(f"⛔ grande ({len(pdf_bytes)//1024}KB)")
                pulados += 1
                continue

            texto, paginas = extrair_pdf(pdf_bytes)
            if len(texto) < 20:
                print("⚠ vazio")
                await conn.execute(
                    "UPDATE atos SET erro_download='texto_vazio' WHERE id=$1", row["id"]
                )
                pulados += 1
                continue

            await conn.execute(
                """
                INSERT INTO conteudo_ato
                    (ato_id, texto_completo, metodo_extracao, qualidade,
                     tokens_estimados, criado_em)
                VALUES ($1, $2, 'pdfplumber', $3, $4, NOW())
                ON CONFLICT (ato_id) DO NOTHING
                """,
                row["id"], texto,
                "boa" if len(texto) > 200 else "parcial",
                len(texto) // 4,
            )
            await conn.execute(
                "UPDATE atos SET pdf_baixado=true, pdf_paginas=$1, pdf_tamanho_bytes=$2 WHERE id=$3",
                paginas, len(pdf_bytes), row["id"],
            )
            print(f"✓ {len(texto):6d} chars  {paginas}p")
            ok += 1

        except KeyboardInterrupt:
            print("\nInterrompido.")
            break
        except Exception as e:
            print(f"✗ {e}")
            erro += 1

        if i < total:
            await asyncio.sleep(RATE_LIMIT)

    print(f"\n  Fase 1 — OK:{ok}  Erro:{erro}  Pulados:{pulados}\n")


# ── Fase 2: Descoberta de url_pdf via WP REST API ─────────────────────────────
async def _match_numero(conn: asyncpg.Connection, candidatos: list[str]) -> asyncpg.Record | None:
    """Tenta casar número com e sem zero à esquerda no campo plenária (0191 vs 191)."""
    for numero in candidatos:
        row = await conn.fetchrow(
            """
            SELECT id FROM atos
            WHERE tenant_id = $1
              AND tipo = 'deliberacao'
              AND numero = $2
              AND url_pdf IS NULL
            """,
            TENANT_ID, numero,
        )
        if row:
            return row
        # Tenta com zero-padding no prefixo (ex: "191-20/2025" → "0191-20/2025")
        if re.match(r"^\d{2,3}-\d{2}/\d{4}$", numero):
            padded = numero.zfill(len(numero) + 1) if not numero.startswith("0") else numero
            # ex: "191-20/2025" → add leading zero: "0191-20/2025"
            parts = numero.split("-", 1)
            padded = parts[0].zfill(4) + "-" + parts[1]
            row = await conn.fetchrow(
                """
                SELECT id FROM atos
                WHERE tenant_id = $1
                  AND tipo = 'deliberacao'
                  AND numero = $2
                  AND url_pdf IS NULL
                """,
                TENANT_ID, padded,
            )
            if row:
                return row
    return None


async def fase_descoberta(
    conn: asyncpg.Connection, http: httpx.AsyncClient, preview: bool
) -> None:
    if not BS4_OK:
        print("\n─── FASE 2: DESCOBERTA — beautifulsoup4 não instalado. Pule. ───\n")
        return

    print(f"\n─── FASE 2: DESCOBERTA via WP REST API {'(preview)' if preview else ''} ───")
    print(f"  API: {WP_API_URL}\n")

    resp = await http.get(WP_API_URL)
    if resp.status_code != 200:
        print(f"  Erro HTTP {resp.status_code} ao acessar WP API.")
        return

    content_html = resp.json().get("content", {}).get("rendered", "")
    soup = BeautifulSoup(content_html, "lxml")
    paragraphs = soup.find_all("p")

    descobertos = 0
    sem_pdf = 0

    for i, p in enumerate(paragraphs):
        # Título: parágrafo com <strong> que contenha número de deliberação
        if not p.find("strong"):
            continue
        texto = p.get_text(" ", strip=True)
        candidatos = normalizar_numero(texto)
        if not candidatos:
            continue

        # Procura o link PDF nos próximos 4 parágrafos (inclusive este)
        pdf_url = None
        for j in range(i, min(i + 4, len(paragraphs))):
            for a in paragraphs[j].find_all("a", href=True):
                href = a["href"]
                if href.lower().endswith(".pdf"):
                    pdf_url = href
                    break
            if pdf_url:
                break

        if not pdf_url:
            sem_pdf += 1
            continue

        row_db = await _match_numero(conn, candidatos)
        if row_db:
            if not preview:
                await conn.execute(
                    "UPDATE atos SET url_pdf=$1 WHERE id=$2",
                    pdf_url, row_db["id"],
                )
            num_display = candidatos[0]
            print(f"  {'[preview] ' if preview else ''}nº {num_display} → {pdf_url[:70]}")
            descobertos += 1

    print(f"\n  Fase 2 — PDFs descobertos:{descobertos}  sem link PDF:{sem_pdf}\n")


# ── Fase 3: HTML ──────────────────────────────────────────────────────────────
async def fase_html(conn: asyncpg.Connection, http: httpx.AsyncClient) -> None:
    if not BS4_OK:
        print("\n─── FASE 3: HTML — beautifulsoup4 não instalado. Pule. ───\n")
        return

    rows = await conn.fetch(
        """
        SELECT a.id, a.numero, a.url_original
        FROM atos a
        LEFT JOIN conteudo_ato c ON c.ato_id = a.id
        WHERE a.tenant_id = $1
          AND a.tipo = 'deliberacao'
          AND a.url_original IS NOT NULL
          AND a.url_pdf IS NULL
          AND c.ato_id IS NULL
        ORDER BY a.data_publicacao DESC NULLS LAST
        """,
        TENANT_ID,
    )
    total = len(rows)
    print(f"\n─── FASE 3: HTML ({total} deliberações com url_original sem texto) ───")
    if total == 0:
        print("  Nenhuma pendente.\n")
        return

    ok = erro = 0
    for i, row in enumerate(rows, 1):
        print(f"[{i:4d}/{total}] {row['numero']:25s}", end="  ")
        try:
            resp = await http.get(row["url_original"])
            resp.raise_for_status()

            texto = extrair_html(resp.text)
            if len(texto) < 50:
                print("⚠ texto muito curto")
                await conn.execute(
                    "UPDATE atos SET erro_download='html_vazio' WHERE id=$1", row["id"]
                )
                erro += 1
                continue

            await conn.execute(
                """
                INSERT INTO conteudo_ato
                    (ato_id, texto_completo, metodo_extracao, qualidade,
                     tokens_estimados, criado_em)
                VALUES ($1, $2, 'html_beautifulsoup', $3, $4, NOW())
                ON CONFLICT (ato_id) DO NOTHING
                """,
                row["id"], texto,
                "boa" if len(texto) > 200 else "parcial",
                len(texto) // 4,
            )
            print(f"✓ {len(texto):6d} chars")
            ok += 1

        except KeyboardInterrupt:
            print("\nInterrompido.")
            break
        except Exception as e:
            print(f"✗ {e}")
            erro += 1

        if i < total:
            await asyncio.sleep(RATE_LIMIT)

    print(f"\n  Fase 3 — OK:{ok}  Erro:{erro}\n")


# ── Main ──────────────────────────────────────────────────────────────────────
async def main(fases: set[str], preview: bool) -> None:
    conn = await asyncpg.connect(ASYNCPG_URL)
    try:
        total = await conn.fetchval(
            "SELECT COUNT(*) FROM atos WHERE tenant_id=$1 AND tipo='deliberacao'",
            TENANT_ID,
        )
        com_texto = await conn.fetchval(
            """
            SELECT COUNT(*) FROM conteudo_ato c
            JOIN atos a ON a.id = c.ato_id
            WHERE a.tenant_id=$1 AND a.tipo='deliberacao'
            """,
            TENANT_ID,
        )
        print(f"\n{'='*60}")
        print(f"  SCRAPER DELIBERAÇÕES CAU/PR")
        print(f"  Total no banco: {total}  |  Com texto: {com_texto}  |  Pendentes: {total - com_texto}")
        print(f"  Fases: {', '.join(sorted(fases))}")
        print(f"{'='*60}")

        async with httpx.AsyncClient(
            headers=HEADERS, follow_redirects=True, timeout=45
        ) as http:
            if "1" in fases:
                await fase_pdf(conn, http)
            if "2" in fases:
                await fase_descoberta(conn, http, preview)
            if "3" in fases:
                await fase_html(conn, http)

        # Resumo final
        com_texto_final = await conn.fetchval(
            """
            SELECT COUNT(*) FROM conteudo_ato c
            JOIN atos a ON a.id = c.ato_id
            WHERE a.tenant_id=$1 AND a.tipo='deliberacao'
            """,
            TENANT_ID,
        )
        print(f"{'='*60}")
        print(f"  Deliberações com texto: {com_texto_final}/{total}")
        print(f"{'='*60}\n")

    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--fase", default="1,2,3",
        help="Fases a executar: 1, 2, 3 ou combinações como '1,3' (padrão: 1,2,3)"
    )
    parser.add_argument(
        "--preview", action="store_true",
        help="Fase 2 em modo preview: mostra o que seria salvo sem salvar"
    )
    args = parser.parse_args()

    fases = {f.strip() for f in args.fase.split(",")}
    asyncio.run(main(fases, args.preview))
