#!/usr/bin/env python3
"""
Scraper local das Atas das Reuniões Plenárias do CAU/PR.

Usa o HTML salvo da página de atas para descobrir as URLs dos PDFs,
depois baixa os PDFs com httpx e extrai texto com pdfplumber.

Uso (cd backend/):
    python scripts/scrape_atas_local.py              # roda tudo
    python scripts/scrape_atas_local.py --dry-run    # lista reuniões sem download
    python scripts/scrape_atas_local.py --limit 5    # baixa só as 5 primeiras
"""
import argparse
import asyncio
import io
import os
import re
import sys
from datetime import date
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import uuid

import asyncpg
import ftfy
import httpx
import pdfplumber
from bs4 import BeautifulSoup

# ── Config ────────────────────────────────────────────────────────────────────
TENANT_ID  = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"
ATAS_URL   = "https://www.caupr.gov.br/atas-das-reunioes-plenarias/"
WP_API_URL = "https://www.caupr.gov.br/wp-json/wp/v2/pages/17905"
# Fallback: HTML salvo localmente (pode estar incompleto — browser save perdeu conteúdo)
HTML_PATH  = ROOT.parent / "DOCUMENTOS QUE CONSEGUI NA MAO" / "Atas das Reuniões Plenárias Ordinárias.html"
RATE_LIMIT_SECONDS = 2.0
MAX_PDF_BYTES = 100 * 1024 * 1024  # 100 MB (atas com anexos podem ser grandes)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado no backend/.env")
ASYNCPG_URL = (
    DATABASE_URL
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace(":5432/", ":6543/")
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.caupr.gov.br/",
    "Accept": "application/pdf,*/*",
    "Accept-Language": "pt-BR,pt;q=0.9",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalizar_texto(texto: str) -> str:
    texto = ftfy.fix_text(texto)
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()


def _parse_data(texto: str) -> date | None:
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", texto)
    if not m:
        return None
    try:
        return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    except ValueError:
        return None


def _extrair_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        n_pages = len(pdf.pages)
        parts = [p.extract_text() or "" for p in pdf.pages]
    return _normalizar_texto("\n\n".join(parts)), n_pages


def _melhor_pdf(paragrafos: list) -> str | None:
    """
    Percorre parágrafos do bloco de uma reunião.
    Prioridade 1: link cujo texto contém "assinado" (versão completa com assinaturas).
    Prioridade 2: qualquer href terminando em .pdf.
    """
    assinado = None
    primeiro_pdf = None

    for p in paragrafos:
        for a in p.find_all("a", href=True):
            href = a.get("href", "").strip()
            texto_a = a.get_text(" ", strip=True).lower()
            if not href:
                continue
            if "assinado" in texto_a and href.lower().endswith(".pdf"):
                if assinado is None:
                    assinado = href
            if href.lower().endswith(".pdf") and primeiro_pdf is None:
                primeiro_pdf = href

    return assinado or primeiro_pdf


# ── Fetch listagem ────────────────────────────────────────────────────────────

def _fetch_html() -> str:
    """Busca o HTML completo via WordPress REST API; fallback para arquivo local."""
    try:
        r = httpx.get(WP_API_URL, timeout=30,
                      headers={"User-Agent": HEADERS["User-Agent"]})
        r.raise_for_status()
        html = r.json()["content"]["rendered"]
        print(f"  Fonte: WordPress REST API ({len(html):,} chars)")
        return html
    except Exception as e:
        print(f"  API falhou ({e}), usando arquivo local como fallback")
        if not HTML_PATH.exists():
            sys.exit(f"Arquivo HTML não encontrado: {HTML_PATH}")
        with open(HTML_PATH, encoding="utf-8", errors="replace") as f:
            return f.read()


# ── Parser da listagem ────────────────────────────────────────────────────────

def parsear_html(html: str) -> list[dict]:
    """
    Parseia o HTML da página de atas e retorna lista de dicts:
        {numero, tipo_reuniao, data_publicacao, url_pdf}

    Estruturas coexistentes (todas têm <strong> como filho direto do <p>):

    Nova (2020+):
        <p><strong>179ª Reunião Plenária Ordinária<br></strong>de 28/02/2025</p>

    Antiga (2018-2019):
        <p><strong>94ª Reunião Plenária Ordinária</strong></p>
        <p>de 26/03/2019</p>

    Com ordinal garbled / fora do strong:
        <p><strong>54ª</strong> Reunião Plenária Ordinária</p>
        <p><strong>111ª</strong> <strong>Reunião Plenária Ordinária</strong></p>
        <p><strong>16</strong><strong>ª</strong>ª<strong>Reunião...</strong></p>

    Extraordinária sem PDF direto:
        <p><strong>A 107ª Reunião Plenária do CAU/PR foi Extraordinária</strong>(...)</p>

    NOTA: o char 'ª' aparece como U+FFFD no HTML do WP por problemas de encoding.
    """
    soup = BeautifulSoup(html, "html.parser")

    # API devolve o body do post diretamente; arquivo local tem wrappers de tema
    content = (
        soup.select_one(".page-content")
        or soup.select_one(".entry-content")
        or soup.select_one(".post-content")
        or soup.select_one("article")
        or soup.body
        or soup
    )

    paragrafos = content.find_all("p")
    reunioes: list[dict] = []
    numeros_vistos: set[str] = set()

    def _strong_direto(tag) -> str | None:
        """Retorna o texto concatenado de todos os <strong> filhos DIRETOS do <p>."""
        parts = [
            child.get_text(" ", strip=True)
            for child in tag.children
            if getattr(child, "name", None) == "strong"
        ]
        return " ".join(parts) if parts else None

    def _e_cabecalho_reuniao(tag) -> tuple[str, str] | None:
        """
        Retorna (numero, texto_full) se o <p> é cabeçalho de reunião.
        O ordinal 'ª' é omitido do regex — aparece garbled como U+FFFD ou
        em <strong> separado; o número basta como identificador.
        """
        txt_strong = _strong_direto(tag)
        if not txt_strong:
            return None
        m = re.search(r"(\d+)", txt_strong)
        if not m:
            return None
        n = int(m.group(1))
        if n < 1 or n > 300:
            return None
        txt_full = tag.get_text(" ", strip=True)
        if "Reuni" in txt_full:
            return str(n), txt_full
        return None

    i = 0
    while i < len(paragrafos):
        p = paragrafos[i]

        cabecalho = _e_cabecalho_reuniao(p)
        if not cabecalho:
            i += 1
            continue

        numero, texto_strong = cabecalho

        # Evita duplicatas (ex: reunião 178 tem 2 partes)
        if numero in numeros_vistos:
            i += 1
            continue
        numeros_vistos.add(numero)

        texto_p = p.get_text(" ", strip=True)

        # Tipo extraordinária?
        tipo_reuniao = "extraordinaria" if re.search(
            r"Extraordin", texto_strong, re.IGNORECASE
        ) else "ordinaria"

        # Data: pode estar no mesmo <p> (estrutura nova) ou no próximo (estrutura antiga)
        data_pub = _parse_data(texto_p)

        # Coleta parágrafos seguintes até o próximo cabeçalho de reunião ou ano
        blocos: list = []
        j = i + 1
        while j < len(paragrafos):
            prox = paragrafos[j]
            texto_prox = prox.get_text(" ", strip=True)

            # Para ao encontrar próximo cabeçalho de reunião (<strong> direto com número)
            if _e_cabecalho_reuniao(prox):
                break
            # Para em cabeçalho de ano isolado
            if re.match(r"^\d{4}$", texto_prox):
                break

            # Tenta capturar data se ainda não encontrada (estrutura antiga)
            if data_pub is None and re.match(r"^de\s+\d{1,2}/\d{1,2}/\d{4}", texto_prox):
                data_pub = _parse_data(texto_prox)

            blocos.append(prox)
            j += 1

        url_pdf = _melhor_pdf(blocos)

        reunioes.append({
            "numero": numero,
            "tipo_reuniao": tipo_reuniao,
            "data_publicacao": data_pub,
            "url_pdf": url_pdf,
        })
        i = j

    return reunioes


# ── Main ──────────────────────────────────────────────────────────────────────

async def main(dry_run: bool, limit: int | None) -> None:
    print(f"\n{'='*60}")
    print("Scraper — Atas das Reuniões Plenárias CAU/PR")
    print(f"{'='*60}\n")

    print("Buscando listagem...")
    html = _fetch_html()
    reunioes = parsear_html(html)
    print(f"  Reuniões encontradas: {len(reunioes)}\n")

    if not reunioes:
        print("⚠  Nenhuma reunião parseada — verifique o HTML.")
        return

    # Ordena por número crescente (cronológico)
    reunioes.sort(key=lambda r: int(r["numero"]))

    if limit:
        reunioes = reunioes[:limit]
        print(f"(limitado a {limit} reuniões)\n")

    if dry_run:
        print("─── DRY RUN — nenhum download ───\n")
        sem_pdf = 0
        for r in reunioes:
            pdf_flag = "✓ PDF" if r["url_pdf"] else "✗ sem PDF"
            if not r["url_pdf"]:
                sem_pdf += 1
            data_str = r["data_publicacao"].isoformat() if r["data_publicacao"] else "sem data"
            print(f"  Reunião {r['numero']:>4s}  [{data_str}]  {r['tipo_reuniao']:<15s}  {pdf_flag}")
            if r["url_pdf"]:
                print(f"            {r['url_pdf']}")
        total_sem = len([r for r in reunioes if not r["url_pdf"]])
        print(f"\nTotal: {len(reunioes)} | sem PDF: {total_sem} | com PDF: {len(reunioes)-total_sem}")
        return

    # ── Inserção + download ────────────────────────────────────────────────────
    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    try:
        ok = sem_pdf_count = erro = ja_existe = 0
        total = len(reunioes)

        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=60) as http:
            for idx, r in enumerate(reunioes, 1):
                numero   = r["numero"]
                tipo_sub = r["tipo_reuniao"]
                data_pub = r["data_publicacao"]
                url_pdf  = r["url_pdf"]
                prefix   = f"[{idx:3d}/{total}] Reunião {numero:>4s}"

                # INSERT ato idempotente
                ato_row = await conn.fetchrow(
                    """
                    INSERT INTO atos
                        (id, tenant_id, numero, tipo, subtipo,
                         data_publicacao, url_original, url_pdf,
                         pdf_baixado, processado)
                    VALUES ($1, $2, $3, 'ata_plenaria', $4, $5, $6, $7, false, false)
                    ON CONFLICT (tenant_id, numero, tipo) DO NOTHING
                    RETURNING id
                    """,
                    uuid.uuid4(), TENANT_ID, numero, tipo_sub,
                    data_pub, ATAS_URL, url_pdf,
                )

                # ON CONFLICT: busca id existente
                if ato_row is None:
                    ato_row = await conn.fetchrow(
                        "SELECT id FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo='ata_plenaria'",
                        TENANT_ID, numero,
                    )
                    tem_texto = await conn.fetchval(
                        "SELECT 1 FROM conteudo_ato WHERE ato_id=$1", ato_row["id"]
                    )
                    if tem_texto:
                        print(f"  ─  {prefix}: já no banco, pulando")
                        ja_existe += 1
                        continue

                ato_id = ato_row["id"]

                if not url_pdf:
                    print(f"  ⚠  {prefix}: sem PDF")
                    sem_pdf_count += 1
                    continue

                try:
                    resp = await http.get(url_pdf)
                    if resp.status_code == 403:
                        await conn.execute(
                            "UPDATE atos SET erro_download='403_forbidden' WHERE id=$1", ato_id
                        )
                        print(f"  ⛔ {prefix}: 403 Forbidden")
                        erro += 1
                        continue
                    resp.raise_for_status()
                    pdf_bytes = resp.content

                    if len(pdf_bytes) > MAX_PDF_BYTES:
                        raise ValueError(f"PDF muito grande: {len(pdf_bytes):,} bytes")

                    texto, n_pages = _extrair_pdf(pdf_bytes)
                    qualidade = "boa" if len(texto) > 100 else "ruim"
                    tokens = len(texto) // 4

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
                    status = "✓" if qualidade == "boa" else "⚠ (escaneado)"
                    data_str = data_pub.isoformat() if data_pub else "?"
                    print(f"  {status}  {prefix}  [{data_str}]  {n_pages}p  {tokens:,} tokens")
                    ok += 1

                except Exception as exc:
                    await conn.execute(
                        "UPDATE atos SET erro_download=$1 WHERE id=$2",
                        str(exc)[:200], ato_id,
                    )
                    print(f"  ✗  {prefix}: {exc}")
                    erro += 1

                if idx < total:
                    await asyncio.sleep(RATE_LIMIT_SECONDS)

    finally:
        await conn.close()

    print(f"\n{'='*60}")
    print(f"Concluído: {ok} baixados | {ja_existe} já existiam | {sem_pdf_count} sem PDF | {erro} erros")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scraper das atas plenárias CAU/PR")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run, limit=args.limit))
