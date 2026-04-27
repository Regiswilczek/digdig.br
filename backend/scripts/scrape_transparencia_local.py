#!/usr/bin/env python3
"""
Scraper genérico das seções documentais do Portal da Transparência do CAU/PR.

Acessa cada seção via WordPress REST API, extrai links de documentos (PDF, XLS,
DOCX, ZIP) e insere no banco com idempotência total. PDFs têm texto extraído com
pdfplumber; outros formatos são registrados sem extração.

Uso (cd backend/):
    python scripts/scrape_transparencia_local.py --dry-run
    python scripts/scrape_transparencia_local.py
    python scripts/scrape_transparencia_local.py --secao dispensa_eletronica
    python scripts/scrape_transparencia_local.py --secao dispensa_eletronica,relatorio_tcu
    python scripts/scrape_transparencia_local.py --limit 10
"""
import argparse
import asyncio
import html as hlib
import io
import os
import re
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
WP_BASE            = "https://transparencia.caupr.gov.br/wp-json/wp/v2/pages"
RATE_LIMIT_SECONDS = 2.0
MAX_PDF_BYTES      = 50 * 1024 * 1024  # 50 MB

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer":         "https://transparencia.caupr.gov.br/",
    "Accept":          "*/*",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado no backend/.env")
ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

# ── Seções mapeadas ───────────────────────────────────────────────────────────
# (label, wp_page_id, tipo_no_banco, url_original_da_secao)
SECOES: list[tuple[str, int, str, str]] = [
    ("Dispensa Eletrônica",           19317, "dispensa_eletronica",     "https://transparencia.caupr.gov.br/dispensa-eletronica/"),
    ("Contratações Diretas",          19319, "contratacao_direta",      "https://transparencia.caupr.gov.br/contratacoes-diretas/"),
    ("Atas de Registro de Preço",     19321, "ata_registro_preco",      "https://transparencia.caupr.gov.br/atas-de-registro-de-preco/"),
    ("Relação de Contratos",          17867, "contrato",                "https://transparencia.caupr.gov.br/relacao-de-contratos-do-cau-pr/"),
    ("Relação de Convênios",          17872, "convenio",                "https://transparencia.caupr.gov.br/relacao-de-convenios-do-cau-pr/"),
    ("Relatórios ao TCU",             160,   "relatorio_tcu",           "https://transparencia.caupr.gov.br/relatorios-de-gestao/"),
    ("Relatórios e Pareceres",        17203, "relatorio_parecer",       "https://transparencia.caupr.gov.br/relatorios-e-pareceres/"),
    ("Auditoria Independente",        18731, "auditoria_independente",  "https://transparencia.caupr.gov.br/auditoria-independente/"),
    ("Licitações / Editais",          341,   "licitacao",               "https://transparencia.caupr.gov.br/licitacoes-2/"),
    ("Súmulas Conselho Diretor",      18692, "sumula_conselho_diretor", "https://transparencia.caupr.gov.br/sumulas-e-deliberacoes-das-reunioes-do-conselho-diretor/"),
    ("Súmulas Comissões Temporárias", 18695, "sumula_comissao",         "https://transparencia.caupr.gov.br/sumulas-das-reunioes-de-comissoes-temporarias/"),
    ("Resoluções",                    110,   "resolucao",               "https://transparencia.caupr.gov.br/resolucoes/"),
    ("Atos Declaratórios",            118,   "ato_declaratorio",        "https://transparencia.caupr.gov.br/atos-declaratorios/"),
    ("Atos Declaratórios (antigos)",  17932, "ato_declaratorio",        "https://transparencia.caupr.gov.br/atos-declaratorios-2/"),
    ("Orientações Jurídicas",         120,   "orientacao_juridica",     "https://transparencia.caupr.gov.br/orientacoes-juridicas/"),
    ("Pautas das Reuniões Plenárias", 18664, "pauta_plenaria",          "https://transparencia.caupr.gov.br/pautas-das-reunioes-plenarias/"),
    ("Folhas de Pagamento",           17580, "folha_pagamento",         "https://transparencia.caupr.gov.br/folhas-de-pagamentos/"),
    ("Tabelas de Remuneração",        17225, "tabela_remuneracao",      "https://transparencia.caupr.gov.br/tabelas-de-remuneracao/"),
    ("Acordos Nacionais",             122,   "acordo_nacional",         "https://transparencia.caupr.gov.br/acordos-nacionais/"),
    ("Acordos Internacionais",        124,   "acordo_internacional",    "https://transparencia.caupr.gov.br/acordos-internacionais/"),
    ("Eleições do CAU",               597,   "eleicao",                 "https://transparencia.caupr.gov.br/eleicoes-dos-cau/"),
]

DOC_RE = re.compile(r'\.(pdf|xls|xlsx|doc|docx|zip)(\?[^"\']*)?$', re.IGNORECASE)
PDF_RE = re.compile(r'\.pdf(\?[^"\']*)?$', re.IGNORECASE)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extrair_links(rendered: str) -> list[tuple[str, str]]:
    """Extrai (anchor_text, href) de todos os links de documentos no HTML renderizado."""
    vistos: set[str] = set()
    out: list[tuple[str, str]] = []

    # Formato JSON do WP (aspas escapadas com backslash)
    for m in re.finditer(r'href=\\"([^\\"]+)\\"[^>]*>([^<]*)<', rendered):
        href = m.group(1).replace('\\/', '/')
        texto = hlib.unescape(m.group(2)).strip()
        if DOC_RE.search(href) and href not in vistos:
            out.append((texto or _nome_arquivo(href), href))
            vistos.add(href)

    # Formato HTML normal (fallback para conteúdo já renderizado)
    for m in re.finditer(r'href="([^"]+)"[^>]*>([^<]*)<', rendered):
        href = m.group(1)
        texto = hlib.unescape(m.group(2)).strip()
        if DOC_RE.search(href) and href not in vistos:
            out.append((texto or _nome_arquivo(href), href))
            vistos.add(href)

    return out


def _nome_arquivo(href: str) -> str:
    return href.split('?')[0].rstrip('/').split('/')[-1]


def _numero_de_url(href: str) -> str:
    """
    Deriva um identificador único do URL — usado como `numero` no banco.
    Ex: .../DISPENSA-ELETRONICA-002-2023.pdf → DISPENSA-ELETRONICA-002-2023
    """
    path = href.split('?')[0].rstrip('/')
    filename = path.split('/')[-1]
    name = re.sub(r'\.(pdf|xls|xlsx|doc|docx|zip)$', '', filename, flags=re.IGNORECASE)
    name = re.sub(r'[%+\s]', '-', name)
    name = re.sub(r'-{2,}', '-', name).strip('-')
    return name[:100] or filename[:100]


def _extrair_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        n_pages = len(pdf.pages)
        parts = [p.extract_text() or "" for p in pdf.pages]
    texto = ftfy.fix_text("\n\n".join(parts))
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip(), n_pages


# ── Core: processa uma seção ──────────────────────────────────────────────────

async def _processar_secao(
    conn: asyncpg.Connection,
    http:  httpx.AsyncClient,
    label: str,
    page_id: int,
    tipo: str,
    url_original: str,
    dry_run: bool,
    limit: int | None,
) -> dict:
    stats = {"ok": 0, "ja_existe": 0, "escaneado": 0, "nao_pdf": 0, "erro": 0}

    # Busca conteúdo via WP REST API
    api_url = f"{WP_BASE}/{page_id}?_fields=content,link"
    try:
        r = await http.get(api_url, timeout=30)
        r.raise_for_status()
        rendered = r.json().get("content", {}).get("rendered", "")
    except Exception as e:
        print(f"  ✗  API falhou [page_id={page_id}]: {e}")
        stats["erro"] += 1
        return stats

    links = _extrair_links(rendered)
    if not links:
        print(f"  ⚠  Nenhum documento encontrado — pode ser JS-only ou seção vazia")
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

    # Download e inserção
    for idx, (texto_link, href) in enumerate(links, 1):
        numero = _numero_de_url(href)
        prefix = f"[{idx:3d}/{len(links)}] {numero[:45]}"

        # INSERT idempotente
        ato_row = await conn.fetchrow(
            """
            INSERT INTO atos
                (id, tenant_id, numero, tipo, subtipo,
                 url_original, url_pdf, pdf_baixado, processado)
            VALUES ($1, $2, $3, $4, NULL, $5, $6, false, false)
            ON CONFLICT (tenant_id, numero, tipo) DO NOTHING
            RETURNING id
            """,
            uuid.uuid4(), TENANT_ID, numero, tipo, url_original, href,
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

        # Não-PDFs: registra no banco mas não extrai texto
        if not PDF_RE.search(href):
            ext = href.rsplit('.', 1)[-1].split('?')[0].upper()[:5]
            await conn.execute(
                "UPDATE atos SET erro_download=$1 WHERE id=$2",
                f"formato_{ext.lower()}", ato_id,
            )
            print(f"  ─  {prefix}: [{ext}] registrado sem extração")
            stats["nao_pdf"] += 1
            await asyncio.sleep(0.3)
            continue

        # Download + extração PDF
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
    print(f"\n{'='*65}")
    print("Scraper — Portal da Transparência CAU/PR")
    print(f"{'='*65}\n")

    secoes = SECOES
    if filtro:
        secoes = [s for s in SECOES if s[2] in filtro]
        if not secoes:
            validos = sorted({s[2] for s in SECOES})
            sys.exit("Tipo(s) não encontrado(s). Válidos:\n  " + "\n  ".join(validos))

    modo = "DRY RUN" if dry_run else "DOWNLOAD"
    print(f"Modo: {modo} | Seções: {len(secoes)} | Limit por seção: {limit or 'todas'}\n")

    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    totais: dict[str, int] = {"ok": 0, "ja_existe": 0, "escaneado": 0, "nao_pdf": 0, "erro": 0}

    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True) as http:
            for i, (label, page_id, tipo, url_original) in enumerate(secoes, 1):
                print(f"\n{'─'*65}")
                print(f"  [{i}/{len(secoes)}] {label}")
                print(f"  tipo={tipo}  page_id={page_id}")
                print(f"{'─'*65}")

                stats = await _processar_secao(
                    conn, http, label, page_id, tipo, url_original, dry_run, limit
                )
                for k, v in stats.items():
                    totais[k] += v

                if not dry_run and i < len(secoes):
                    await asyncio.sleep(1.5)

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
        description="Scraper genérico do Portal da Transparência CAU/PR"
    )
    parser.add_argument(
        "--secao", type=str, default="",
        help="Tipos separados por vírgula. Ex: dispensa_eletronica,relatorio_tcu"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Lista documentos sem fazer download nem inserir no banco"
    )
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Limite de documentos por seção (útil para testes)"
    )
    args = parser.parse_args()

    filtro = [s.strip() for s in args.secao.split(",") if s.strip()] if args.secao else []
    asyncio.run(main(filtro, args.dry_run, args.limit))
