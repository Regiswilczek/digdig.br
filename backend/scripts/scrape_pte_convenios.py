#!/usr/bin/env python3
"""
scrape_pte_convenios.py — coleta convênios do GOV-PR via PTE
                          (Portal Transparência do PR, categoria 4/127).

Fluxo:
  1. Obscura `fetch --dump html` carrega a página JSF pós-render
  2. Parser HTML extrai a tabela de convênios (concedente, número, objeto,
     convenente, datas, valor, URL do PDF no TCE-PR)
  3. Cada convênio vira um ato com tipo='convenio_estadual',
     fonte_sistema='pte_convenios', tenant=gov-pr
  4. PDF é baixado direto do TCE-PR e tem texto extraído via pdfplumber

Idempotente — UNIQUE (tenant_id, numero, tipo) protege contra duplicatas.

Uso (cd backend/):
    python scripts/scrape_pte_convenios.py --dry-run     # só lista
    python scripts/scrape_pte_convenios.py --limit 10    # smoke test
    python scripts/scrape_pte_convenios.py               # 1ª página completa

Pré-requisito: Obscura instalado em ../tools/obscura/obscura
    bash tools/obscura/install.sh
"""
import argparse
import asyncio
import io
import os
import re
import subprocess
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

OBSCURA_BIN = ROOT.parent / "tools" / "obscura" / "obscura"
PTE_CONVENIOS_URL = "https://www.transparencia.pr.gov.br/pte/assunto/4/127"
TENANT_SLUG = "gov-pr"
RATE_LIMIT_SECONDS = 1.5
MAX_PDF_BYTES = 100 * 1024 * 1024  # 100 MB

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado em .env")
ASYNCPG_URL = (
    DATABASE_URL
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace(":5432/", ":6543/")
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/pdf,*/*",
    "Accept-Language": "pt-BR,pt;q=0.9",
}


# ── 1. Fetch da página via Obscura ───────────────────────────────────────────

def fetch_page_html(url: str) -> str:
    """Roda obscura fetch one-shot e retorna o HTML pós-JS."""
    if not OBSCURA_BIN.exists():
        sys.exit(
            f"ERROR: Obscura não encontrado em {OBSCURA_BIN}\n"
            f"  Rode: bash tools/obscura/install.sh"
        )
    print(f"  ▸ Obscura fetch (esperando JS render)...", flush=True)
    result = subprocess.run(
        [
            str(OBSCURA_BIN),
            "fetch",
            "--stealth",
            "--wait", "5",
            "--wait-until", "networkidle",
            "--dump", "html",
            url,
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        print(f"  ✗ Obscura falhou (rc={result.returncode})", file=sys.stderr)
        print(f"    stderr: {result.stderr[:500]}", file=sys.stderr)
        sys.exit(1)
    return result.stdout


# ── 2. Parser da tabela ──────────────────────────────────────────────────────

# Colunas (na ordem):
COLUNAS = [
    "concedente", "numero", "objeto", "convenente",
    "dt_inicio", "dt_final", "situacao", "valor_repasses", "doc_pdf",
]

def _strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&nbsp;", " ", s)
    s = re.sub(r"&[a-z]+;", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _parse_data(s: str) -> Optional[datetime.date]:
    s = s.strip()
    if not s:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _parse_valor_brl(s: str) -> Optional[float]:
    s = re.sub(r"[^\d,.]", "", s)
    if not s:
        return None
    # BR: 1.234.567,89 → 1234567.89
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def parse_convenios(html: str) -> list[dict]:
    """Extrai lista de convênios do HTML pós-JS."""
    convenios = []
    # Pega cada linha <tr role="row"> da tabela ui-datatable
    trs = re.findall(r'<tr[^>]*role="row"[^>]*>(.*?)</tr>', html, re.DOTALL)
    for tr in trs:
        # Captura URL do PDF (TCE-PR)
        pdf_match = re.search(
            r'href="(https://servicos\.tce\.pr\.gov\.br[^"]+\.pdf[^"]*)"',
            tr,
            re.IGNORECASE,
        )
        if not pdf_match:
            continue
        pdf_url = pdf_match.group(1)

        # Pega TDs
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
        if len(tds) < 8:
            continue
        textos = [_strip_html(t) for t in tds[:8]]

        # Algumas TDs têm "show details" wrapper extra; primeira pode estar vazia
        # — tenta deslocar até achar texto não vazio
        while textos and not textos[0]:
            textos = textos[1:]
        if len(textos) < 8:
            continue

        c = {
            "concedente": textos[0],
            "numero": textos[1],
            "objeto": textos[2],
            "convenente": textos[3],
            "dt_inicio": _parse_data(textos[4]),
            "dt_final": _parse_data(textos[5]),
            "situacao": textos[6],
            "valor_repasses": _parse_valor_brl(textos[7]),
            "pdf_url": pdf_url,
        }
        convenios.append(c)
    return convenios


# ── 3. Persistência ──────────────────────────────────────────────────────────

async def get_tenant_id(conn: asyncpg.Connection) -> str:
    row = await conn.fetchrow(
        "SELECT id FROM tenants WHERE slug = $1", TENANT_SLUG,
    )
    if not row:
        sys.exit(f"Tenant '{TENANT_SLUG}' não cadastrado. Rode seed_gov_pr.py primeiro.")
    return str(row["id"])


def _extract_text_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        n = len(pdf.pages)
        parts = [p.extract_text() or "" for p in pdf.pages]
    texto = ftfy.fix_text("\n\n".join(parts))
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip(), n


def _gerar_numero_unico(c: dict, idx: int) -> str:
    """O 'número' do convênio repete entre concedentes diferentes (ex: '001').
    Combina com concedente + ano da vigência pra unicidade."""
    concedente_curto = re.sub(r'[^A-Z0-9]', '', c["concedente"].upper()[:30])[:20]
    ano = c["dt_inicio"].year if c["dt_inicio"] else "????"
    return f"{c['numero']}/{ano}-{concedente_curto}"


async def upsert_convenio(
    conn: asyncpg.Connection,
    tenant_id: str,
    c: dict,
    http: httpx.AsyncClient,
    idx: int,
    dry_run: bool = False,
) -> str:
    numero = _gerar_numero_unico(c, idx)
    ementa = c["objeto"][:500]
    titulo = f"{c['concedente']} × {c['convenente']} (Conv. {c['numero']})"[:1000]

    if dry_run:
        return f"DRY  {numero[:50]}  {c['concedente'][:30]}  {(c['valor_repasses'] or 0):>14.2f}"

    # Verifica se já existe (UNIQUE tenant_id, numero, tipo)
    existing = await conn.fetchrow(
        "SELECT id, pdf_baixado FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo=$3",
        tenant_id, numero, "convenio_estadual",
    )
    if existing and existing["pdf_baixado"]:
        return f"SKIP {numero[:50]}  já no banco"

    # INSERT atos (ou pega o id existente)
    if existing:
        ato_id = existing["id"]
    else:
        ato_id = uuid.uuid4()
        await conn.execute(
            """
            INSERT INTO atos
                (id, tenant_id, numero, tipo, subtipo, titulo, ementa,
                 data_publicacao, url_pdf, pdf_baixado, processado, fonte_sistema)
            VALUES ($1, $2, $3, 'convenio_estadual', NULL, $4, $5, $6, $7, FALSE, FALSE, 'pte_convenios')
            """,
            ato_id, tenant_id, numero, titulo, ementa,
            c["dt_inicio"], c["pdf_url"],
        )

    # Download PDF + extração
    try:
        resp = await http.get(c["pdf_url"], timeout=60)
        resp.raise_for_status()
        raw = resp.content
        if len(raw) > MAX_PDF_BYTES:
            raise ValueError(f"PDF muito grande: {len(raw):,} bytes")

        texto, n_pages = _extract_text_pdf(raw)
        qualidade = "boa" if len(texto) > 200 else ("ruim" if len(texto) < 50 else "parcial")
        tokens_est = len(texto) // 4

        await conn.execute(
            """
            INSERT INTO conteudo_ato (ato_id, texto_completo, metodo_extracao, qualidade, tokens_estimados)
            VALUES ($1, $2, 'pdfplumber', $3, $4)
            ON CONFLICT (ato_id) DO UPDATE
                SET texto_completo = EXCLUDED.texto_completo,
                    qualidade = EXCLUDED.qualidade,
                    tokens_estimados = EXCLUDED.tokens_estimados
            """,
            ato_id, texto, qualidade, tokens_est,
        )
        await conn.execute(
            """
            UPDATE atos SET pdf_baixado=TRUE, pdf_paginas=$1, pdf_tamanho_bytes=$2
            WHERE id=$3
            """,
            n_pages, len(raw), ato_id,
        )
        return f"OK   {numero[:50]}  {n_pages}p  {tokens_est:,}t  qual={qualidade}"
    except Exception as exc:
        await conn.execute(
            "UPDATE atos SET erro_download=$1 WHERE id=$2",
            str(exc)[:200], ato_id,
        )
        return f"✗ ERR {numero[:50]}  {exc!s}"


# ── 4. Main ──────────────────────────────────────────────────────────────────

async def main(args):
    print(f"\n{'='*72}")
    print(f"  Scraper PTE Convênios — GOV-PR")
    print(f"  URL: {PTE_CONVENIOS_URL}")
    print(f"  Modo: {'DRY-RUN' if args.dry_run else 'COLETA'}")
    print(f"  Limit: {args.limit or 'sem limite'}")
    print(f"{'='*72}\n")

    print("[1/3] Carregando página via Obscura...")
    html = fetch_page_html(PTE_CONVENIOS_URL)
    print(f"      ✓ HTML: {len(html):,} chars")

    print("\n[2/3] Parsing tabela de convênios...")
    convenios = parse_convenios(html)
    print(f"      ✓ encontrados: {len(convenios)}")
    if not convenios:
        print("      ✗ nenhum convênio extraído — verificar parser")
        return

    if args.limit:
        convenios = convenios[:args.limit]

    print(f"\n[3/3] Persistindo {len(convenios)} convênios...")
    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    try:
        tenant_id = await get_tenant_id(conn)
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True) as http:
            ok = err = skip = dry = 0
            for i, c in enumerate(convenios, 1):
                msg = await upsert_convenio(conn, tenant_id, c, http, i, dry_run=args.dry_run)
                tag = msg[:4].strip()
                if   tag == "OK":   ok += 1
                elif tag == "SKIP": skip += 1
                elif tag == "DRY":  dry += 1
                else:               err += 1
                print(f"  [{i:>3}/{len(convenios)}] {msg}", flush=True)
                if i < len(convenios) and not args.dry_run:
                    await asyncio.sleep(RATE_LIMIT_SECONDS)
    finally:
        await conn.close()

    print(f"\n{'='*72}")
    print(f"  Resumo: OK={ok}  SKIP={skip}  ERR={err}  DRY={dry}")
    print(f"{'='*72}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Lista sem baixar nem gravar")
    parser.add_argument("--limit", type=int, default=0, help="Limita quantos convênios processar")
    args = parser.parse_args()
    asyncio.run(main(args))
