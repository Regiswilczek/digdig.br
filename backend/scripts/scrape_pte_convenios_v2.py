#!/usr/bin/env python3
"""
scrape_pte_convenios_v2.py — versão paginada via Obscura CDP + Playwright.

Diferença pro v1: itera por ano e pagina dentro de cada ano usando o
formulário de busca real do PrimeFaces, não os 30 padrão da tela.

Pré-requisitos:
  1. Obscura serve rodando em background:
        ./tools/obscura/obscura serve --port 9222 --stealth --workers 2
  2. Playwright instalado: .venv/bin/pip install playwright

Uso:
    python scripts/scrape_pte_convenios_v2.py --ano 2024
    python scripts/scrape_pte_convenios_v2.py --ano 2024 --max-paginas 3
    python scripts/scrape_pte_convenios_v2.py --anos 2020-2024  # range
    python scripts/scrape_pte_convenios_v2.py --probe           # só conta total/ano sem persistir
"""
import argparse
import asyncio
import io
import os
import re
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import asyncpg
import httpx
import pdfplumber
import ftfy
from playwright.async_api import async_playwright, Page

PTE_CONVENIOS_URL = "https://www.transparencia.pr.gov.br/pte/assunto/4/127"
TENANT_SLUG = "gov-pr"
CDP_URL = "http://localhost:9222"
RATE_LIMIT_PDF = 1.0
RATE_LIMIT_PAGINA = 2.0
MAX_PDF_BYTES = 100 * 1024 * 1024

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não em .env")
ASYNCPG_URL = (
    DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace(":5432/", ":6543/")
)

HEADERS_PDF = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0",
    "Accept": "application/pdf,*/*",
}


# ── Parser HTML ─────────────────────────────────────────────────────────────

def _strip(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&nbsp;", " ", s)
    s = re.sub(r"&[a-z]+;", "", s)
    return re.sub(r"\s+", " ", s).strip()


def _parse_data(s: str):
    s = (s or "").strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _parse_brl(s: str) -> Optional[float]:
    s = re.sub(r"[^\d,.]", "", s or "")
    if not s:
        return None
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def parse_convenios(html: str) -> list[dict]:
    out = []
    trs = re.findall(r'<tr[^>]*role="row"[^>]*>(.*?)</tr>', html, re.DOTALL)
    for tr in trs:
        pdf = re.search(r'href="(https://servicos\.tce\.pr\.gov\.br[^"]+\.pdf[^"]*)"', tr, re.I)
        if not pdf:
            continue
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
        textos = [_strip(t) for t in tds]
        # remove eventual TD vazia inicial
        while textos and not textos[0]:
            textos = textos[1:]
        if len(textos) < 8:
            continue
        out.append({
            "concedente": textos[0],
            "numero": textos[1],
            "objeto": textos[2],
            "convenente": textos[3],
            "dt_inicio": _parse_data(textos[4]),
            "dt_final": _parse_data(textos[5]),
            "situacao": textos[6],
            "valor_repasses": _parse_brl(textos[7]),
            "pdf_url": pdf.group(1),
        })
    return out


def _gerar_numero_unico(c: dict) -> str:
    concedente_curto = re.sub(r"[^A-Z0-9]", "", c["concedente"].upper())[:20]
    ano = c["dt_inicio"].year if c["dt_inicio"] else "????"
    return f"{c['numero']}/{ano}-{concedente_curto}"[:100]


# ── Persistência ────────────────────────────────────────────────────────────

async def get_tenant_id(conn) -> str:
    row = await conn.fetchrow("SELECT id FROM tenants WHERE slug=$1", TENANT_SLUG)
    if not row:
        sys.exit(f"Tenant '{TENANT_SLUG}' não encontrado.")
    return str(row["id"])


def _extract_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        n = len(pdf.pages)
        partes = [p.extract_text() or "" for p in pdf.pages]
    txt = ftfy.fix_text("\n\n".join(partes))
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n{3,}", "\n\n", txt)
    return txt.strip(), n


async def upsert_convenio(
    conn, tenant_id: str, c: dict, http: httpx.AsyncClient,
) -> str:
    numero = _gerar_numero_unico(c)
    titulo = f"{c['concedente']} × {c['convenente']} (Conv. {c['numero']})"[:1000]
    ementa = c["objeto"][:500]

    existing = await conn.fetchrow(
        "SELECT id, pdf_baixado FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo=$3",
        tenant_id, numero, "convenio_estadual",
    )
    if existing and existing["pdf_baixado"]:
        return f"SKIP {numero[:50]}"
    if existing:
        ato_id = existing["id"]
    else:
        ato_id = uuid.uuid4()
        await conn.execute(
            """
            INSERT INTO atos
                (id, tenant_id, numero, tipo, titulo, ementa,
                 data_publicacao, url_pdf, pdf_baixado, processado, fonte_sistema)
            VALUES ($1, $2, $3, 'convenio_estadual', $4, $5, $6, $7, FALSE, FALSE, 'pte_convenios')
            """,
            ato_id, tenant_id, numero, titulo, ementa, c["dt_inicio"], c["pdf_url"],
        )
    try:
        r = await http.get(c["pdf_url"], timeout=60)
        r.raise_for_status()
        raw = r.content
        if len(raw) > MAX_PDF_BYTES:
            raise ValueError(f"PDF muito grande: {len(raw):,}b")
        texto, n = _extract_pdf(raw)
        qual = "boa" if len(texto) > 200 else ("ruim" if len(texto) < 50 else "parcial")
        await conn.execute(
            """
            INSERT INTO conteudo_ato (ato_id, texto_completo, metodo_extracao, qualidade, tokens_estimados)
            VALUES ($1, $2, 'pdfplumber', $3, $4)
            ON CONFLICT (ato_id) DO UPDATE
                SET texto_completo=EXCLUDED.texto_completo, qualidade=EXCLUDED.qualidade,
                    tokens_estimados=EXCLUDED.tokens_estimados
            """,
            ato_id, texto, qual, len(texto) // 4,
        )
        await conn.execute(
            "UPDATE atos SET pdf_baixado=TRUE, pdf_paginas=$1, pdf_tamanho_bytes=$2 WHERE id=$3",
            n, len(raw), ato_id,
        )
        return f"OK   {numero[:50]} {n}p qual={qual}"
    except Exception as exc:
        await conn.execute(
            "UPDATE atos SET erro_download=$1 WHERE id=$2", str(exc)[:200], ato_id,
        )
        return f"✗ ERR {numero[:50]} {exc!s}"


# ── Navegação Playwright + PrimeFaces ───────────────────────────────────────

async def filtrar_e_pesquisar(page: Page, ano: int):
    """Seleciona ano no PrimeFaces SelectOneMenu e clica Pesquisar."""
    # PrimeFaces SelectOneMenu: clica no label pra abrir, depois seleciona
    await page.click("#formPesquisa\\:filtroAno", timeout=15000)
    await page.wait_for_selector(
        f'#formPesquisa\\:filtroAno_panel li[data-label="{ano}"]', timeout=10000
    )
    await page.click(f'#formPesquisa\\:filtroAno_panel li[data-label="{ano}"]')
    await asyncio.sleep(0.5)

    # Clica Pesquisar e aguarda AJAX
    await page.click("#formPesquisa\\:btnPesquisar")
    await page.wait_for_load_state("networkidle", timeout=30000)
    await asyncio.sleep(1.5)


async def mudar_pagina(page: Page, pagina: int) -> bool:
    """Navega pra página N do paginator. Retorna False se não existir."""
    # PrimeFaces: clicar na "Próxima" ou usar a página numérica
    next_btn = page.locator("a.ui-paginator-next:not(.ui-state-disabled)").first
    if await next_btn.count() == 0:
        return False
    await next_btn.click()
    await page.wait_for_load_state("networkidle", timeout=30000)
    await asyncio.sleep(1.5)
    return True


async def total_pagina(page: Page) -> dict:
    """Lê o paginator pra ver total de registros / página atual."""
    cur = await page.locator(".ui-paginator-current").first.text_content() or ""
    return {"raw": cur.strip()}


# ── Main ────────────────────────────────────────────────────────────────────

async def main(args):
    ano_ini, ano_fim = _parse_anos(args)

    async with async_playwright() as p:
        try:
            browser = await p.chromium.connect_over_cdp(CDP_URL, timeout=10000)
        except Exception as exc:
            sys.exit(
                f"✗ Não conectou ao Obscura em {CDP_URL}: {exc}\n"
                f"  Suba primeiro: ./tools/obscura/obscura serve --port 9222 --stealth --workers 2"
            )

        ctx = browser.contexts[0] if browser.contexts else await browser.new_context()
        page = await ctx.new_page()
        print(f"\n[setup] abrindo {PTE_CONVENIOS_URL}...")
        await page.goto(PTE_CONVENIOS_URL, wait_until="networkidle", timeout=60000)
        await asyncio.sleep(2)
        print(f"[setup] página carregada")

        if args.probe:
            # Só conta convênios por ano, não persiste
            for ano in range(ano_ini, ano_fim + 1):
                try:
                    await filtrar_e_pesquisar(page, ano)
                    info = await total_pagina(page)
                    html = await page.content()
                    n = len(parse_convenios(html))
                    print(f"  {ano}: {info['raw']:<30s}  conv. na 1ª pág: {n}")
                except Exception as exc:
                    print(f"  {ano}: ERRO {exc!s:.80}")
                await asyncio.sleep(RATE_LIMIT_PAGINA)
            await browser.close()
            return

        # Modo persistência
        conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
        tenant_id = await get_tenant_id(conn)
        try:
            async with httpx.AsyncClient(headers=HEADERS_PDF, follow_redirects=True) as http:
                total_ok = total_err = total_skip = 0
                for ano in range(ano_ini, ano_fim + 1):
                    print(f"\n══ ANO {ano} ══")
                    try:
                        await filtrar_e_pesquisar(page, ano)
                    except Exception as exc:
                        print(f"  ✗ filtro falhou: {exc!s:.100}")
                        continue
                    info = await total_pagina(page)
                    print(f"  paginator: {info['raw']}")

                    pagina_atual = 1
                    while True:
                        if args.max_paginas and pagina_atual > args.max_paginas:
                            print(f"  → atingiu --max-paginas={args.max_paginas}")
                            break
                        html = await page.content()
                        convenios = parse_convenios(html)
                        print(f"  pág {pagina_atual}: {len(convenios)} convênios")
                        for i, c in enumerate(convenios, 1):
                            msg = await upsert_convenio(conn, tenant_id, c, http)
                            tag = msg[:4].strip()
                            if   tag == "OK":   total_ok += 1
                            elif tag == "SKIP": total_skip += 1
                            else:               total_err += 1
                            print(f"    [{i:>2}] {msg}")
                            await asyncio.sleep(RATE_LIMIT_PDF)

                        # Tenta próxima
                        if not await mudar_pagina(page, pagina_atual + 1):
                            print(f"  → fim do ano (sem próxima página)")
                            break
                        pagina_atual += 1

                print(f"\n══ TOTAL: OK={total_ok} SKIP={total_skip} ERR={total_err} ══\n")
        finally:
            await conn.close()
            await browser.close()


def _parse_anos(args) -> tuple[int, int]:
    if args.ano:
        return args.ano, args.ano
    if args.anos:
        m = re.match(r"(\d{4})-(\d{4})", args.anos)
        if not m:
            sys.exit("--anos deve ser AAAA-AAAA")
        return int(m.group(1)), int(m.group(2))
    sys.exit("Use --ano AAAA, --anos AAAA-AAAA, ou --probe (com um deles)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ano", type=int, help="Ano único (ex: 2024)")
    parser.add_argument("--anos", type=str, help="Range AAAA-AAAA")
    parser.add_argument("--max-paginas", type=int, default=0, help="Limita páginas/ano (0=sem limite)")
    parser.add_argument("--probe", action="store_true", help="Só lista total por ano, não persiste")
    args = parser.parse_args()
    asyncio.run(main(args))
