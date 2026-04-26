#!/usr/bin/env python3
"""
Scraper das Portarias Normativas do CAU/PR.

Fonte: https://www.caupr.gov.br/wp-json/wp/v2/pages/26552
Tipo no banco: portaria_normativa

Uso (cd backend/):
    python scripts/scrape_portarias_normativas.py --dry-run
    python scripts/scrape_portarias_normativas.py
"""
import argparse
import asyncio
import base64
import io
import os
import re
import sys
import uuid
from datetime import date
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import asyncpg
import fitz  # PyMuPDF — renderiza PDF para imagem (OCR)
import ftfy
import httpx
import pdfplumber
from anthropic import AsyncAnthropic
from bs4 import BeautifulSoup

TENANT_ID   = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"
TIPO        = "portaria_normativa"
WP_API_URL  = "https://www.caupr.gov.br/wp-json/wp/v2/pages/26552"
RATE_LIMIT  = 1.5

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado no backend/.env")
ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

MESES = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8,
    "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
}


def _fix(text: str) -> str:
    return ftfy.fix_text(text).strip() if text else ""


def _parse_date_from_text(txt: str) -> date | None:
    """Extrai data de texto como 'de 04 de setembro de 2025'."""
    m = re.search(r"(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})", txt, re.IGNORECASE)
    if m:
        dia, mes_str, ano = int(m.group(1)), m.group(2).lower(), int(m.group(3))
        mes = MESES.get(mes_str)
        if mes:
            return date(ano, mes, dia)
    return None


def _parse_numero_from_text(txt: str) -> tuple[str, int | None] | None:
    """
    Retorna (numero, ano) ou None.
    Formatos:
      'Nº 04, de 04 de setembro de 2025' → ('04/2025', 2025)
      'N.04/2024'                         → ('04/2024', 2024)
      'N.11/2022'                         → ('11/2022', 2022)
    """
    # Formato com data por extenso: Nº XX, de ...AAAA
    m = re.search(r"[Nn][º°o.]?\s*(\d+)[,.]?\s*de\s+\d+\s+de\s+\w+\s+de\s+(\d{4})", txt)
    if m:
        return f"{int(m.group(1)):02d}/{m.group(2)}", int(m.group(2))

    # Formato N.XX/AAAA ou Nº XX/AAAA
    m = re.search(r"[Nn][º°o.]?\s*(\d+)[/.](\d{4})", txt)
    if m:
        return f"{int(m.group(1)):02d}/{m.group(2)}", int(m.group(2))

    # Fallback: só número (usar ano do contexto)
    m = re.search(r"[Nn][º°o.]?\s*(\d+)", txt)
    if m:
        return m.group(1), None

    return None


def _extract_documents(html: str) -> list[dict]:
    """Parseia o HTML e retorna lista de documentos."""
    soup = BeautifulSoup(html, "lxml")
    paragraphs = soup.find_all("p")
    docs = []
    current_year = None

    for i, p in enumerate(paragraphs):
        text = _fix(p.get_text(" ", strip=True))

        # Detecta marcador de ano: <p><strong>2025</strong></p>
        strong_only = p.find("strong")
        if strong_only and re.fullmatch(r"\d{4}", strong_only.get_text(strip=True)):
            current_year = int(strong_only.get_text(strip=True))
            continue

        # Detecta entrada de portaria normativa
        if "portaria normativa" not in text.lower():
            continue

        strong_text = _fix(p.get_text(" ", strip=True))
        parsed = _parse_numero_from_text(strong_text)
        if not parsed:
            continue

        numero, ano = parsed
        # Se o ano não foi extraído, usa o corrente do contexto
        if ano is None and current_year:
            numero = f"{numero.split('/')[0]}/{current_year}"
            ano = current_year

        # Data — fallback para 01/01/AAAA quando só o ano é conhecido
        data_pub = _parse_date_from_text(strong_text)
        if data_pub is None and ano:
            data_pub = date(ano, 1, 1)

        # Ementa: procura no próximo parágrafo (não-portaria, não-ano)
        ementa = None
        if i + 1 < len(paragraphs):
            next_p = paragraphs[i + 1]
            next_txt = _fix(next_p.get_text(" ", strip=True))
            if "portaria normativa" not in next_txt.lower() and not re.fullmatch(r"\d{4}", next_txt):
                # Remove artefatos de link
                raw = re.sub(r'arquivo em format[ao]s?\s*', '', next_txt, flags=re.IGNORECASE)
                raw = re.sub(r'\bPDF\b|\bDOCX?\b', '', raw)
                raw = re.sub(r'[ˆ^\s]e[ˆ^\s]', '', raw)  # remove "e" solto
                raw = re.sub(r'\s+', ' ', raw).strip(" :–-.&\xa0")
                # Só aceita como ementa se tiver texto real (> 10 chars)
                if len(raw) > 10 and raw.lower() not in ("arquivo em formato", "arquivo em formatos"):
                    ementa = raw

        # PDF URL: procura em parágrafo atual e no seguinte
        url_pdf = None
        for search_p in [p] + ([paragraphs[i + 1]] if i + 1 < len(paragraphs) else []):
            for a in search_p.find_all("a", href=True):
                href = a["href"]
                if href.lower().endswith(".pdf") or ".pdf" in href.lower():
                    # Prefere links com "assinado" ou sem versão draft
                    if url_pdf is None or "assinado" in href.lower():
                        url_pdf = href
            if url_pdf:
                break

        docs.append({
            "numero": numero,
            "ano": ano,
            "data_publicacao": data_pub,
            "ementa": ementa or None,
            "url_pdf": url_pdf,
            "url_original": "https://www.caupr.gov.br/portarias-normativas-2/",
        })

    return docs


def _normalizar_texto(texto: str) -> str:
    texto = ftfy.fix_text(texto)
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()


def _extrair_pdf_pdfplumber(pdf_bytes: bytes) -> tuple[str, int]:
    """Extração nativa de texto (PDFs digitais)."""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        n_pages = len(pdf.pages)
        parts = [p.extract_text() or "" for p in pdf.pages]
    return _normalizar_texto("\n\n".join(parts)), n_pages


async def _ocr_pdf_claude(pdf_bytes: bytes, client: AsyncAnthropic) -> tuple[str, int]:
    """OCR via Claude vision para PDFs baseados em imagem (escaneados)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    n_pages = len(doc)
    parts = []

    for page in doc:
        mat = fitz.Matrix(200 / 72, 200 / 72)  # 200 DPI
        pix = page.get_pixmap(matrix=mat)
        img_b64 = base64.standard_b64encode(pix.tobytes("png")).decode()

        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": "image/png", "data": img_b64},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Extraia todo o texto desta página de documento oficial brasileiro, "
                            "exatamente como aparece. Preserve parágrafos e estrutura. "
                            "Retorne somente o texto, sem comentários."
                        ),
                    },
                ],
            }],
        )
        parts.append(response.content[0].text)

    doc.close()
    return _normalizar_texto("\n\n".join(parts)), n_pages


async def _extrair_pdf_inteligente(
    pdf_bytes: bytes, client: AsyncAnthropic
) -> tuple[str, int, str]:
    """
    Auto-detecta se o PDF é digital ou escaneado e usa a ferramenta certa.
    Retorna (texto, n_paginas, metodo).
    """
    texto, n_pages = _extrair_pdf_pdfplumber(pdf_bytes)

    if len(texto) >= 100:
        return texto, n_pages, "pdfplumber"

    # PDF escaneado — tenta OCR via Claude vision
    texto_ocr, n_pages = await _ocr_pdf_claude(pdf_bytes, client)
    metodo = "claude_vision" if len(texto_ocr) > len(texto) else "pdfplumber"
    return (texto_ocr if metodo == "claude_vision" else texto), n_pages, metodo


async def main(dry_run: bool) -> None:
    print(f"\n{'='*60}")
    print("Scraper Portarias Normativas — CAU/PR")
    print(f"{'='*60}\n")

    # Busca conteúdo da página via REST API
    with httpx.Client(headers=HEADERS, timeout=30, follow_redirects=True) as http:
        resp = http.get(WP_API_URL)
        resp.raise_for_status()
        html = resp.json()["content"]["rendered"]

    docs = _extract_documents(html)
    print(f"Portarias normativas encontradas: {len(docs)}")

    if dry_run:
        print("\n─── DRY RUN ───\n")
        for d in docs:
            print(f"  {d['numero']:>8s}  [{d['data_publicacao']}]  {(d['ementa'] or '')[:60]}  PDF: {'✓' if d['url_pdf'] else '✗'}")
        return

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not anthropic_key:
        sys.exit("ERROR: ANTHROPIC_API_KEY não encontrado no backend/.env")
    claude = AsyncAnthropic(api_key=anthropic_key)

    conn = await asyncpg.connect(ASYNCPG_URL)
    try:
        ok = ja_existe = sem_pdf = erro = 0
        total = len(docs)

        with httpx.Client(headers=HEADERS, timeout=60, follow_redirects=True) as http:
            for idx, doc in enumerate(docs, 1):
                numero = doc["numero"]
                prefix = f"[{idx:2d}/{total}] PN {numero}"

                # INSERT ato idempotente
                ato_row = await conn.fetchrow(
                    """
                    INSERT INTO atos
                        (id, tenant_id, numero, tipo, subtipo,
                         data_publicacao, url_original, url_pdf,
                         pdf_baixado, processado, ementa)
                    VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, false, false, $8)
                    ON CONFLICT (tenant_id, numero, tipo) DO NOTHING
                    RETURNING id
                    """,
                    uuid.uuid4(), TENANT_ID, numero, TIPO,
                    doc["data_publicacao"], doc["url_original"], doc["url_pdf"],
                    doc["ementa"],
                )

                if ato_row is None:
                    ato_row = await conn.fetchrow(
                        "SELECT id FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo=$3",
                        TENANT_ID, numero, TIPO,
                    )
                    tem_texto = await conn.fetchval(
                        "SELECT 1 FROM conteudo_ato WHERE ato_id=$1 AND qualidade='boa'",
                        ato_row["id"]
                    )
                    if tem_texto:
                        print(f"  ─  {prefix}: já no banco, pulando")
                        ja_existe += 1
                        continue

                ato_id = ato_row["id"]

                if not doc["url_pdf"]:
                    print(f"  ⚠  {prefix}: sem PDF disponível")
                    sem_pdf += 1
                    continue

                # Download PDF
                try:
                    r = http.get(doc["url_pdf"])
                    r.raise_for_status()
                    pdf_bytes = r.content
                except Exception as exc:
                    print(f"  ✗  {prefix}: erro no download: {exc}")
                    erro += 1
                    continue

                # Extração inteligente: pdfplumber → Claude vision se escaneado
                try:
                    texto, n_pages, metodo = await _extrair_pdf_inteligente(pdf_bytes, claude)
                except Exception as exc:
                    print(f"  ✗  {prefix}: erro na extração: {exc}")
                    erro += 1
                    continue

                qualidade = "boa" if len(texto) > 100 else "ruim"
                tokens = len(texto) // 4

                await conn.execute(
                    """
                    INSERT INTO conteudo_ato
                        (ato_id, texto_completo, metodo_extracao,
                         qualidade, tokens_estimados, criado_em)
                    VALUES ($1, $2, $3, $4, $5, NOW())
                    ON CONFLICT (ato_id) DO UPDATE
                        SET texto_completo    = EXCLUDED.texto_completo,
                            metodo_extracao  = EXCLUDED.metodo_extracao,
                            qualidade        = EXCLUDED.qualidade,
                            tokens_estimados = EXCLUDED.tokens_estimados
                    """,
                    ato_id, texto, metodo, qualidade, tokens,
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

                ocr_flag = " [OCR]" if metodo == "claude_vision" else ""
                status = "✓" if qualidade == "boa" else "⚠"
                print(f"  {status}  {prefix}: {n_pages}p  {tokens:,} tokens  [{doc['data_publicacao']}]{ocr_flag}")
                ok += 1

                if idx < total:
                    await asyncio.sleep(RATE_LIMIT)

    finally:
        await conn.close()

    print(f"\n{'='*60}")
    print(f"Concluído: {ok} importadas | {ja_existe} já existiam | {sem_pdf} sem PDF | {erro} erros")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scraper Portarias Normativas CAU/PR")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run))
