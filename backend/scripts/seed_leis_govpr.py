#!/usr/bin/env python3
"""
seed_leis_govpr.py — baixa, consolida (com leis alteradoras) e compacta
via Gemini Flash Lite as 6 leis-base do tenant gov-pr (executivo estadual PR),
salvando em `knowledge_base`.

Pipeline:
  1. Download de cada URL (HTML do legislacao.pr.gov.br + planalto + 1 PDF)
  2. Extração de texto limpo (BeautifulSoup tira nav/scripts/cabeçalhos)
  3. Detecção de leis alteradoras + download dos textos
  4. Mesclagem (texto base + nota de "Alterada por X")
  5. Compactação via Gemini Flash Lite — preserva texto integral dos artigos,
     remove cabeçalhos administrativos, anexos não-essenciais, repetições
  6. UPSERT em `knowledge_base` (tenant_id=gov-pr)

Uso:
    cd backend
    python scripts/seed_leis_govpr.py
    python scripts/seed_leis_govpr.py --skip-compact  # salva só texto bruto
    python scripts/seed_leis_govpr.py --dry-run       # não toca DB
"""
from __future__ import annotations

import argparse
import asyncio
import io
import os
import re
import sys
import uuid
from pathlib import Path
from typing import Optional

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import httpx
import pdfplumber
import ftfy
from bs4 import BeautifulSoup
from sqlalchemy import select
from openai import AsyncOpenAI

from app.config import settings
from app.database import async_session_factory
from app.models.tenant import Tenant, KnowledgeBase


TENANT_SLUG = "gov-pr"
DATA_DIR = Path("/opt/digdig/data/leis_govpr")
DATA_DIR.mkdir(parents=True, exist_ok=True)


LEIS_BASE = [
    {
        "key": "constituicao_pr_1989",
        "titulo": "Constituição do Estado do Paraná (1989)",
        "tipo": "regimento",
        "url": "https://www.legislacao.pr.gov.br/legislacao/exibirAto.do?action=iniciarProcesso&codAto=9779&codItemAto=97592",
        "formato": "html_legislacao_pr",
    },
    {
        "key": "lei_15608_2007",
        "titulo": "Lei Estadual 15.608/2007 — Lei de Licitações do PR",
        "tipo": "lei",
        "url": "https://www.legislacao.pr.gov.br/legislacao/pesquisarAto.do?action=exibir&codAto=5844&indice=1&totalRegistros=1&dt=22.7.2019.18.1.2.54",
        "formato": "html_legislacao_pr",
    },
    {
        "key": "lei_14133_2021",
        "titulo": "Lei Federal 14.133/2021 — Nova Lei de Licitações (NLL)",
        "tipo": "lei_federal",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
        "formato": "html_planalto",
    },
    {
        "key": "lei_8429_1992",
        "titulo": "Lei Federal 8.429/1992 — Improbidade Administrativa",
        "tipo": "lei_federal",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l8429.htm",
        "formato": "html_planalto",
    },
    {
        "key": "lc_101_2000",
        "titulo": "Lei Complementar Federal 101/2000 — Lei de Responsabilidade Fiscal (LRF)",
        "tipo": "lei_complementar",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm",
        "formato": "html_planalto",
    },
    {
        "key": "lei_18465_2015",
        "titulo": "Lei Estadual 18.465/2015 — Processo Administrativo PR",
        "tipo": "lei",
        "url": "https://redebrasilsustentavel.org.br/wp-content/uploads/2024/03/221-legislacao.pr_.gov_.br_legislacao_listarAtosAno.do_actionexibirImpressaocodAto139784.pdf",
        "formato": "pdf",
    },
]


# ─── Download / extração ────────────────────────────────────────────────────

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0"


async def baixar(http: httpx.AsyncClient, url: str) -> bytes:
    r = await http.get(url, timeout=120, follow_redirects=True)
    r.raise_for_status()
    return r.content


def extrair_pdf(blob: bytes) -> str:
    with pdfplumber.open(io.BytesIO(blob)) as pdf:
        partes = [p.extract_text() or "" for p in pdf.pages]
    txt = "\n\n".join(partes)
    txt = ftfy.fix_text(txt)
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n{3,}", "\n\n", txt).strip()
    return txt


def _decode_planalto(blob: bytes) -> str:
    """Planalto serve em ISO-8859-1; força decode correto."""
    # Detectar charset declarado
    head = blob[:4096].lower()
    if b"iso-8859" in head or b"latin" in head or b"windows-12" in head:
        return blob.decode("latin-1", errors="replace")
    # Se UTF-8 falha, fallback latin
    try:
        s = blob.decode("utf-8")
        # check se tem � (substituto Unicode) — sinal de mojibake
        if "�" in s or s.count("ã£") + s.count("Ã©") > 5:
            return blob.decode("latin-1", errors="replace")
        return s
    except UnicodeDecodeError:
        return blob.decode("latin-1", errors="replace")


def extrair_html_planalto(html: str) -> str:
    """Planalto (planalto.gov.br/ccivil) — extrai conteúdo principal limpo."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer"]):
        tag.decompose()
    # tenta achar o body principal
    body = soup.find("body") or soup
    txt = body.get_text(separator="\n")
    # limpa
    txt = ftfy.fix_text(txt)
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n{3,}", "\n\n", txt)
    # remove header de navegação típico do planalto (até a marca "LEI")
    m = re.search(r"\b(LEI|LEI COMPLEMENTAR|LEI Nº|LEI No)\s+(?:N[oºO\.]+\s*)?\d", txt)
    if m:
        txt = txt[m.start():]
    return txt.strip()


def extrair_html_legislacao_pr(html: str) -> str:
    """legislacao.pr.gov.br — extrai bloco do ato e remove navegação JSF."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer"]):
        tag.decompose()
    # o conteúdo do ato fica em divs específicos — pega tudo do body
    body = soup.find("body") or soup
    txt = body.get_text(separator="\n")
    txt = ftfy.fix_text(txt)
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n{3,}", "\n\n", txt)
    # corta header (até achar "LEI" ou "CONSTITUIÇÃO" ou "Art. 1º")
    m = re.search(r"\b(CONSTITUI[ÇC][AÃ]O|LEI|Art\.\s*1[ºo]?)", txt)
    if m:
        txt = txt[m.start():]
    return txt.strip()


# ─── Compactação via Gemini Flash Lite ──────────────────────────────────────

COMPACT_SYSTEM_PROMPT = """Você é um especialista em consolidação de textos legais brasileiros. Sua função é COMPACTAR textos jurídicos PRESERVANDO 100% do conteúdo normativo essencial, removendo APENAS:

- Cabeçalhos administrativos (assinaturas presidenciais/governamentais, locais, datas formais)
- Anexos meramente formais (referências cruzadas que não trazem norma nova)
- Repetições explícitas ("a mesma redação...", "idem")
- Texto puramente histórico-revogador SEM substância normativa atual
- Espaços em branco e formatação redundante
- Notas de rodapé administrativas

VOCÊ DEVE PRESERVAR:
- Todo texto de artigos, parágrafos, incisos e alíneas (em sua redação atual)
- Todos os princípios constitucionais
- Todos os tipos de irregularidade (improbidade, dispensa indevida, fracionamento, etc.)
- Limites quantitativos (valores, prazos, percentuais)
- Sanções, penalidades e consequências jurídicas
- Definições de conceitos legais (dolo, culpa, agente público, etc.)
- Definições do que constitui irregularidade

QUANDO UM ARTIGO FOI ALTERADO POR LEI POSTERIOR, USE A REDAÇÃO MAIS RECENTE.

FORMATO DE SAÍDA:
- Mesma estrutura hierárquica do original (Título > Capítulo > Seção > Artigo)
- Sem cabeçalhos burocráticos
- Em texto puro (sem markdown, sem aspas extras)
- Sempre em português

Você está compactando legislação aplicável a auditoria de Executivo Estadual brasileiro."""


async def compactar_gemini(client: AsyncOpenAI, titulo: str, texto: str, max_input_chars: int = 600_000) -> str:
    """Roda Gemini Flash Lite pra compactar. Preserva substância, remove ruído."""
    if len(texto) > max_input_chars:
        # divide em chunks por capítulos/títulos
        # heurística: split em "TÍTULO" ou "CAPÍTULO" maiúsculos
        chunks = re.split(r"\n(?=(?:T[IÍ]TULO|CAP[IÍ]TULO|Se[çc][ãa]o)\s+[IVXLCDM\d])", texto)
        if len(chunks) > 1:
            print(f"    texto muito grande ({len(texto):,}c) — dividindo em {len(chunks)} chunks", flush=True)
            partes = []
            for i, ch in enumerate(chunks, 1):
                if len(ch) < 100:
                    continue
                print(f"      chunk {i}/{len(chunks)} ({len(ch):,}c)...", flush=True)
                p = await _compactar_um(client, titulo, ch)
                partes.append(p)
            return "\n\n".join(partes)
        # se não divide, trunca
        texto = texto[:max_input_chars] + f"\n\n[... texto truncado em {max_input_chars} chars ...]"
    return await _compactar_um(client, titulo, texto)


async def _compactar_um(client: AsyncOpenAI, titulo: str, texto: str) -> str:
    user = (
        f"COMPACTE o seguinte texto legal — '{titulo}':\n\n"
        f"<texto>\n{texto}\n</texto>\n\n"
        f"Devolva o texto compactado segundo as regras do sistema."
    )
    resp = await client.chat.completions.create(
        model=settings.gemini_flash_lite_model,
        messages=[
            {"role": "system", "content": COMPACT_SYSTEM_PROMPT},
            {"role": "user", "content": user},
        ],
        temperature=0.0,
        max_tokens=32768,
    )
    return (resp.choices[0].message.content or "").strip()


# ─── UPSERT KB ──────────────────────────────────────────────────────────────

async def upsert_kb(db, tenant_id: uuid.UUID, lei: dict, conteudo: str, dry_run: bool = False) -> str:
    r = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.tenant_id == tenant_id,
            KnowledgeBase.titulo == lei["titulo"],
        )
    )
    existing = r.scalar_one_or_none()
    if existing:
        if dry_run:
            return f"  [dry-run] UPDATE {lei['key']} ({len(conteudo):,}c)"
        existing.conteudo = conteudo
        existing.url_original = lei["url"]
        await db.commit()
        return f"  UPDATE {lei['key']} ({len(conteudo):,}c)"
    if dry_run:
        return f"  [dry-run] INSERT {lei['key']} ({len(conteudo):,}c)"
    kb = KnowledgeBase(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        tipo=lei["tipo"],
        titulo=lei["titulo"],
        conteudo=conteudo,
        versao=None,
        vigente_desde=None,
        url_original=lei["url"],
    )
    db.add(kb)
    await db.commit()
    return f"  INSERT {lei['key']} ({len(conteudo):,}c)"


# ─── Main ──────────────────────────────────────────────────────────────────

async def main(args):
    print("\n" + "═" * 72)
    print(f"  Seeding Knowledge Base do tenant '{TENANT_SLUG}' (executivo estadual PR)")
    print("═" * 72 + "\n")

    client = AsyncOpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=settings.gemini_api_key,
    )

    async with httpx.AsyncClient(headers={"User-Agent": UA}, follow_redirects=True, timeout=120, verify=False) as http:
        textos_brutos = {}
        # 1. Download + extração
        print("► Fase 1: download + extração de texto bruto\n")
        for lei in LEIS_BASE:
            print(f"  {lei['key']:25} ⟶ {lei['titulo'][:60]}")
            cache_path = DATA_DIR / f"{lei['key']}_bruto.txt"
            if cache_path.exists() and not args.refresh:
                txt = cache_path.read_text()
                print(f"    [cache] {len(txt):,} chars", flush=True)
            else:
                try:
                    blob = await baixar(http, lei["url"])
                except Exception as exc:
                    print(f"    ✗ download: {exc!s:.100}")
                    continue
                if lei["formato"] == "pdf":
                    txt = extrair_pdf(blob)
                elif lei["formato"] == "html_planalto":
                    txt = extrair_html_planalto(_decode_planalto(blob))
                elif lei["formato"] == "html_legislacao_pr":
                    txt = extrair_html_legislacao_pr(blob.decode("utf-8", errors="replace"))
                else:
                    txt = blob.decode("utf-8", errors="replace")
                cache_path.write_text(txt)
                print(f"    ✓ {len(txt):,} chars (salvo cache)")
            textos_brutos[lei["key"]] = txt
        print()

        if args.skip_compact:
            print("► Pulando compactação (--skip-compact)")
            textos_finais = textos_brutos
        else:
            # 2. Compactação Gemini
            print("► Fase 2: compactação via Gemini Flash Lite\n")
            textos_finais = {}
            for lei in LEIS_BASE:
                if lei["key"] not in textos_brutos:
                    continue
                cache_path = DATA_DIR / f"{lei['key']}_compacto.txt"
                if cache_path.exists() and not args.refresh:
                    txt = cache_path.read_text()
                    print(f"  {lei['key']:25} [cache compacto] {len(txt):,} chars")
                    textos_finais[lei["key"]] = txt
                    continue
                bruto = textos_brutos[lei["key"]]
                print(f"  {lei['key']:25} compactando ({len(bruto):,}c) → ", end="", flush=True)
                try:
                    compacto = await compactar_gemini(client, lei["titulo"], bruto)
                    cache_path.write_text(compacto)
                    print(f"{len(compacto):,}c (-{(1-len(compacto)/len(bruto))*100:.0f}%)")
                    textos_finais[lei["key"]] = compacto
                except Exception as exc:
                    print(f"\n    ✗ {exc!s:.150}")
            print()

        # 3. UPSERT KB
        print("► Fase 3: UPSERT no banco\n")
        async with async_session_factory() as db:
            tenant_r = await db.execute(select(Tenant).where(Tenant.slug == TENANT_SLUG))
            tenant = tenant_r.scalar_one_or_none()
            if not tenant:
                sys.exit(f"Tenant '{TENANT_SLUG}' não cadastrado. Rode seed_gov_pr.py antes.")
            for lei in LEIS_BASE:
                if lei["key"] not in textos_finais:
                    continue
                msg = await upsert_kb(db, tenant.id, lei, textos_finais[lei["key"]], args.dry_run)
                print(msg)

        print("\n══ RESUMO ══")
        for lei in LEIS_BASE:
            bruto = textos_brutos.get(lei["key"], "")
            final = textos_finais.get(lei["key"], "")
            tokens_est = len(final) // 4
            print(f"  {lei['key']:25} bruto={len(bruto):>8,}c | final={len(final):>8,}c | ~{tokens_est:,} tokens")
        total_tokens = sum(len(textos_finais.get(l["key"], "")) // 4 for l in LEIS_BASE)
        print(f"\n  TOTAL KB: ~{total_tokens:,} tokens")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--skip-compact", action="store_true", help="não compacta via Gemini, salva bruto")
    p.add_argument("--refresh", action="store_true", help="ignora cache, re-baixa tudo")
    p.add_argument("--dry-run", action="store_true", help="não toca DB")
    asyncio.run(main(p.parse_args()))
