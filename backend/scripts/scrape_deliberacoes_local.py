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
PAGE_URL    = "https://www.caupr.gov.br/?page_id=17916"
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
def _num_key(numero: str) -> tuple[int, ...] | None:
    """Normaliza número de deliberação para tupla de ints (ignora zeros à esquerda).
    Ex: '0176-15/2024' → (176, 15, 2024); '15/2026' → (15, 2026); '007' → (7,)
    """
    parts = [p for p in re.split(r'[-./]', numero.strip()) if p.isdigit()]
    return tuple(int(p) for p in parts) if parts else None


def _extrair_keys_da_url(url: str) -> list[tuple[int, ...]]:
    """Extrai chaves numéricas de número de deliberação a partir do nome do arquivo PDF."""
    keys: list[tuple[int, ...]] = []
    filename = re.sub(r'\.PDF$', '', url.split("/")[-1].upper())

    # DPOPR-176-15/2024 → (176, 15, 2024) e também (15, 2024)
    # O fallback 2-componentes casa com números como "022/2021" quando o PDF
    # usa o formato DPOPR completo (sessão-item.ano) mas o banco guarda só item/ano.
    for m in re.finditer(r'DPOPR[-_](\d{2,4})[-_.](\d{1,2})[-_.](\d{4})', filename):
        keys.append((int(m.group(1)), int(m.group(2)), int(m.group(3))))
        keys.append((int(m.group(2)), int(m.group(3))))

    # AD-REFERENDUM-15.2026 → (15, 2026)  [sequência antes do ano]
    for m in re.finditer(r'REFERENDUM[-_.](\d{1,3})[-_.](\d{4})', filename):
        keys.append((int(m.group(1)), int(m.group(2))))

    # AdReferendum2026.14 ou AdReferendum_2026.14 → (14, 2026)  [ano antes da sequência]
    for m in re.finditer(r'REFERENDUM[-_]?(\d{4})[-_.](\d{1,3})', filename):
        keys.append((int(m.group(2)), int(m.group(1))))

    return keys


async def _get_combined_html(http: httpx.AsyncClient) -> str:
    """Busca HTML da página completa + WP API e combina o conteúdo."""
    parts = []

    # 1. Página HTML direta — extrai só a área de conteúdo
    try:
        resp = await http.get(PAGE_URL, timeout=30)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "lxml")
            content = (
                soup.select_one(".entry-content")
                or soup.select_one(".post-content")
                or soup.select_one("article")
                or soup.select_one("#content")
                or soup.select_one("main")
            )
            if content:
                parts.append(str(content))
                print(f"  Página HTML: {len(str(content))} chars carregados")
    except Exception as e:
        print(f"  Aviso PAGE_URL: {e}")

    # 2. WP REST API — conteúdo renderizado
    try:
        resp = await http.get(WP_API_URL, timeout=30)
        if resp.status_code == 200:
            html = resp.json().get("content", {}).get("rendered", "")
            if html:
                parts.append(html)
                print(f"  WP API: {len(html)} chars carregados")
    except Exception as e:
        print(f"  Aviso WP_API: {e}")

    return "\n".join(parts)


async def _get_page_soup(http: httpx.AsyncClient) -> BeautifulSoup | None:
    html = await _get_combined_html(http)
    if not html:
        return None
    return BeautifulSoup(html, "lxml")


def _extrair_numero_da_url(url: str) -> list[str]:
    """Extrai candidatos de número de deliberação a partir do nome do arquivo PDF."""
    candidatos = []
    filename = url.split("/")[-1].upper()
    # DPOPR-176-15.2024 → 176-15/2024
    for m in re.finditer(r"DPOPR[-_](\d{2,4})[-_.](\d{2})[-_.](\d{4})", filename):
        candidatos.append(f"{m.group(1)}-{m.group(2)}/{m.group(3)}")
        candidatos.append(f"0{m.group(1)}-{m.group(2)}/{m.group(3)}")
    # AdReferendum2026.11 → 11/2026
    for m in re.finditer(r"ADREF(?:ERENDUM)?(\d{4})[-_.](\d{1,3})", filename):
        candidatos.append(f"{m.group(2)}/{m.group(1)}")
    # Fallback: padrões genéricos no nome do arquivo
    for m in re.finditer(r"\b(\d{2,4})[-_](\d{2})[-_.](\d{4})\b", filename):
        candidatos.append(f"{m.group(1)}-{m.group(2)}/{m.group(3)}")
    return candidatos


async def fase_descoberta(
    conn: asyncpg.Connection, http: httpx.AsyncClient, preview: bool
) -> None:
    if not BS4_OK:
        print("\n─── FASE 2: DESCOBERTA — beautifulsoup4 não instalado. Pule. ───\n")
        return

    print(f"\n─── FASE 2: DESCOBERTA via página HTML {'(preview)' if preview else ''} ───")
    print(f"  URL: {PAGE_URL}\n")

    # Carrega todos os pendentes em UMA query → lookup em memória (evita N round-trips)
    pending_rows = await conn.fetch(
        """SELECT id, numero FROM atos
           WHERE tenant_id = $1 AND tipo = 'deliberacao' AND url_pdf IS NULL""",
        TENANT_ID,
    )
    lookup: dict[tuple, tuple] = {}
    for row in pending_rows:
        key = _num_key(row["numero"])
        if key and key not in lookup:
            lookup[key] = (str(row["id"]), row["numero"])
    print(f"  Deliberações sem URL no banco: {len(pending_rows)}  |  chaves no índice: {len(lookup)}")

    soup = await _get_page_soup(http)
    if not soup:
        print("  Erro: não foi possível carregar a página.")
        return

    all_pdf_links = [a["href"] for a in soup.find_all("a", href=True)
                     if ".pdf" in a["href"].lower()]
    print(f"  Links PDF na página: {len(all_pdf_links)}\n")

    matched: dict[str, tuple] = {}  # ato_id → (numero, pdf_url)
    vistos_urls: set[str] = set()

    for pdf_url in all_pdf_links:
        if pdf_url in vistos_urls:
            continue
        vistos_urls.add(pdf_url)

        keys = _extrair_keys_da_url(pdf_url)
        for key in keys:
            if key in lookup:
                ato_id, numero = lookup[key]
                if ato_id not in matched:
                    matched[ato_id] = (numero, pdf_url)
                    print(f"  {'[preview] ' if preview else ''}nº {numero} → {pdf_url[:80]}")
                break

    print(f"\n  Encontrados: {len(matched)} de {len(pending_rows)} pendentes")

    if not preview and matched:
        for ato_id, (numero, pdf_url) in matched.items():
            await conn.execute(
                "UPDATE atos SET url_pdf=$1 WHERE id=$2", pdf_url, ato_id,
            )
        print(f"  Banco atualizado: {len(matched)} registros")

    print(f"\n  Fase 2 — PDFs descobertos: {len(matched)}\n")


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
