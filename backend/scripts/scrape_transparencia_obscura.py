#!/usr/bin/env python3
"""
Scraper das seções JS-rendered do Portal da Transparência do CAU/PR.

Usa Obscura (headless browser com stealth) para renderizar as páginas que
não expõem conteúdo via WordPress REST API.

Seções cobertas:
  - Atas de Reuniões de Comissões       (JS-rendered)
  - Atas Plenárias Extraordinárias      (JS-rendered)

Uso (cd backend/):
    python scripts/scrape_transparencia_obscura.py --dry-run
    python scripts/scrape_transparencia_obscura.py
    python scripts/scrape_transparencia_obscura.py --secao ata_comissao
    python scripts/scrape_transparencia_obscura.py --limit 10
"""
import argparse
import asyncio
import html as hlib
import io
import os
import re
import subprocess
import sys
import uuid
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
import pdfplumber

# ── Config ────────────────────────────────────────────────────────────────────
TENANT_ID          = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"
OBSCURA            = r"c:\Users\Regis\Desktop\obscura-eval\obscura.exe"
RATE_LIMIT_SECONDS = 3.0
MAX_PDF_BYTES      = 100 * 1024 * 1024  # 100 MB (atas com anexos)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer":  "https://transparencia.caupr.gov.br/",
    "Accept":   "*/*",
}

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado no backend/.env")
ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

# ── Seções JS-rendered ────────────────────────────────────────────────────────
SECOES: list[tuple[str, str, str]] = [
    (
        "Atas de Reuniões de Comissões",
        "ata_comissao",
        "https://transparencia.caupr.gov.br/atas-de-reunioes-de-comissoes/",
    ),
    (
        "Atas Plenárias Extraordinárias",
        "ata_plenaria_extraordinaria",
        "https://transparencia.caupr.gov.br/atas-de-reunioes-plenarias-extraordinarias/",
    ),
]

DOC_RE = re.compile(r'\.(pdf|xls|xlsx|doc|docx|zip)(\?[^"\']*)?$', re.IGNORECASE)
PDF_RE = re.compile(r'\.pdf(\?[^"\']*)?$', re.IGNORECASE)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _obscura_fetch(url: str) -> str:
    r = subprocess.run(
        [OBSCURA, "fetch", url, "--dump=html", "--stealth", "--quiet"],
        capture_output=True, text=True, timeout=60,
        encoding="utf-8", errors="replace",
    )
    if r.returncode != 0:
        raise RuntimeError(f"Obscura saiu com código {r.returncode}: {r.stderr[:200]}")
    return r.stdout


def _extrair_links(html: str) -> list[tuple[str, str]]:
    vistos: set[str] = set()
    out: list[tuple[str, str]] = []
    for m in re.finditer(r'href="([^"]+)"[^>]*>([^<]*)<', html, re.IGNORECASE):
        href = m.group(1).strip()
        texto = hlib.unescape(m.group(2)).strip()
        if DOC_RE.search(href) and href not in vistos and href.startswith("http"):
            out.append((texto or href.split('/')[-1], href))
            vistos.add(href)
    return out


def _numero_de_url(href: str) -> str:
    path = href.split('?')[0].rstrip('/')
    filename = path.split('/')[-1]
    name = re.sub(r'\.(pdf|xls|xlsx|doc|docx|zip)$', '', filename, flags=re.IGNORECASE)
    name = re.sub(r'[%+\s]', '-', name)
    name = re.sub(r'-{2,}', '-', name).strip('-')
    return name[:120] or filename[:120]


def _extrair_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        n_pages = len(pdf.pages)
        parts = [p.extract_text() or "" for p in pdf.pages]
    texto = ftfy.fix_text("\n\n".join(parts))
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip(), n_pages


# ── Core ──────────────────────────────────────────────────────────────────────

async def _processar_secao(
    conn: asyncpg.Connection,
    http:  httpx.AsyncClient,
    label: str,
    tipo:  str,
    url:   str,
    dry_run: bool,
    limit:   int | None,
) -> dict:
    stats = {"ok": 0, "ja_existe": 0, "escaneado": 0, "nao_pdf": 0, "erro": 0}

    print(f"  Renderizando via Obscura...")
    try:
        html = await asyncio.to_thread(_obscura_fetch, url)
    except Exception as e:
        print(f"  ✗  Obscura falhou: {e}")
        stats["erro"] += 1
        return stats

    links = _extrair_links(html)
    if not links:
        print(f"  ⚠  Nenhum documento encontrado no HTML renderizado")
        return stats

    if limit:
        links = links[:limit]

    print(f"  {len(links)} documentos encontrados")

    if dry_run:
        for texto, href in links[:12]:
            ext = href.rsplit('.', 1)[-1].split('?')[0].upper()[:4]
            print(f"    [{ext}]  {texto[:55]}  →  ...{href[-50:]}")
        if len(links) > 12:
            print(f"    ... e mais {len(links) - 12}")
        return stats

    for idx, (texto_link, href) in enumerate(links, 1):
        numero = _numero_de_url(href)
        prefix = f"[{idx:3d}/{len(links)}] {numero[:45]}"

        ato_row = await conn.fetchrow(
            """
            INSERT INTO atos
                (id, tenant_id, numero, tipo, subtipo,
                 url_original, url_pdf, pdf_baixado, processado)
            VALUES ($1, $2, $3, $4, NULL, $5, $6, false, false)
            ON CONFLICT (tenant_id, numero, tipo) DO NOTHING
            RETURNING id
            """,
            uuid.uuid4(), TENANT_ID, numero, tipo, url, href,
        )

        if ato_row is None:
            ato_row = await conn.fetchrow(
                "SELECT id FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo=$3",
                TENANT_ID, numero, tipo,
            )
            tem_texto = await conn.fetchval(
                "SELECT 1 FROM conteudo_ato WHERE ato_id=$1", ato_row["id"]
            )
            if tem_texto:
                print(f"  ─  {prefix}: já no banco")
                stats["ja_existe"] += 1
                continue

        ato_id = ato_row["id"]

        if not PDF_RE.search(href):
            ext = href.rsplit('.', 1)[-1].split('?')[0].upper()[:5]
            await conn.execute(
                "UPDATE atos SET erro_download=$1 WHERE id=$2",
                f"formato_{ext.lower()}", ato_id,
            )
            print(f"  ─  {prefix}: [{ext}] registrado sem extração")
            stats["nao_pdf"] += 1
            await asyncio.sleep(0.5)
            continue

        try:
            resp = await http.get(href, timeout=60)
            if resp.status_code == 403:
                await conn.execute(
                    "UPDATE atos SET erro_download='403_forbidden' WHERE id=$1", ato_id
                )
                print(f"  ⛔ {prefix}: 403 Forbidden")
                stats["erro"] += 1
                continue

            resp.raise_for_status()
            pdf_bytes = resp.content

            if len(pdf_bytes) > MAX_PDF_BYTES:
                raise ValueError(f"PDF muito grande: {len(pdf_bytes):,} bytes")

            texto, n_pages = _extrair_pdf(pdf_bytes)
            qualidade = "boa" if len(texto) > 100 else "ruim"
            tokens    = len(texto) // 4

            await conn.execute(
                """
                INSERT INTO conteudo_ato
                    (ato_id, texto_completo, metodo_extracao,
                     qualidade, tokens_estimados, criado_em)
                VALUES ($1, $2, 'pdfplumber', $3, $4, NOW())
                ON CONFLICT (ato_id) DO NOTHING
                """,
                ato_id, texto, qualidade, tokens,
            )
            await conn.execute(
                """
                UPDATE atos SET
                    pdf_baixado       = true,
                    pdf_paginas       = $1,
                    pdf_tamanho_bytes = $2
                WHERE id = $3
                """,
                n_pages, len(pdf_bytes), ato_id,
            )

            if qualidade == "boa":
                print(f"  ✓  {prefix}: {n_pages}p  {tokens:,} tokens")
                stats["ok"] += 1
            else:
                print(f"  ⚠  {prefix}: {n_pages}p — escaneado, sem texto")
                stats["escaneado"] += 1

        except Exception as exc:
            await conn.execute(
                "UPDATE atos SET erro_download=$1 WHERE id=$2",
                str(exc)[:200], ato_id,
            )
            print(f"  ✗  {prefix}: {exc}")
            stats["erro"] += 1

        if idx < len(links):
            await asyncio.sleep(RATE_LIMIT_SECONDS)

    return stats


# ── Main ──────────────────────────────────────────────────────────────────────

async def main(filtro: list[str], dry_run: bool, limit: int | None) -> None:
    if not Path(OBSCURA).exists():
        sys.exit(f"Obscura não encontrado em: {OBSCURA}")

    print(f"\n{'='*65}")
    print("Scraper Obscura — Portal da Transparência CAU/PR")
    print(f"{'='*65}\n")

    secoes = SECOES
    if filtro:
        secoes = [s for s in SECOES if s[1] in filtro]
        if not secoes:
            validos = [s[1] for s in SECOES]
            sys.exit("Tipo não encontrado. Válidos:\n  " + "\n  ".join(validos))

    modo = "DRY RUN" if dry_run else "DOWNLOAD"
    print(f"Modo: {modo} | Seções: {len(secoes)} | Limit: {limit or 'todas'}\n")

    conn = await asyncpg.connect(ASYNCPG_URL)
    totais: dict[str, int] = {"ok": 0, "ja_existe": 0, "escaneado": 0, "nao_pdf": 0, "erro": 0}

    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True) as http:
            for i, (label, tipo, url) in enumerate(secoes, 1):
                print(f"\n{'─'*65}")
                print(f"  [{i}/{len(secoes)}] {label}")
                print(f"  tipo={tipo}")
                print(f"{'─'*65}")

                stats = await _processar_secao(conn, http, label, tipo, url, dry_run, limit)
                for k, v in stats.items():
                    totais[k] += v

                if not dry_run and i < len(secoes):
                    await asyncio.sleep(2.0)

    finally:
        await conn.close()

    print(f"\n{'='*65}")
    print("TOTAIS FINAIS")
    print(f"{'='*65}")
    print(f"  ✓  PDFs com texto:         {totais['ok']}")
    print(f"  ─  Já existiam no banco:   {totais['ja_existe']}")
    print(f"  ─  Formato não-PDF (XLS…): {totais['nao_pdf']}")
    print(f"  ⚠  Escaneados (sem texto): {totais['escaneado']}")
    print(f"  ✗  Erros:                  {totais['erro']}")
    print(f"{'='*65}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Scraper Obscura do Portal da Transparência CAU/PR"
    )
    parser.add_argument(
        "--secao", type=str, default="",
        help="Tipos separados por vírgula. Ex: ata_comissao"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Lista documentos sem download"
    )
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Limite de documentos por seção"
    )
    args = parser.parse_args()

    filtro = [s.strip() for s in args.secao.split(",") if s.strip()] if args.secao else []
    asyncio.run(main(filtro, args.dry_run, args.limit))
