#!/usr/bin/env python3
"""
scrape_pte.py — coletor genérico do Portal de Transparência PR (PTE).

Sucessor do `scrape_pte_convenios_v3.py`. Mantém a abordagem httpx puro
replicando o postback PrimeFaces, mas parametriza o endpoint via registry
declarativo. Cada sub-item do PTE vira uma entrada em `PTE_ENDPOINTS`.

Foco: **inventário total** (metadata + URL), sem download de PDF, sem
extração de texto, sem IA. O conteúdo vem depois via outro pipeline.

Salva em:
    atos              — campos canônicos best-effort (numero, titulo,
                        ementa, data_publicacao, url_pdf, fonte_sistema)
    atos_metadata     — JSONB com TODAS as colunas da tabela do PTE
                        (Modalidade, Órgão, Valor, Situação, etc.)

Uso:
    # inspeção: descobre estrutura sem gravar nada
    python scripts/scrape_pte.py --inspect licitacoes
    python scripts/scrape_pte.py --inspect 5/115           # ad-hoc por path

    # coleta:
    python scripts/scrape_pte.py licitacoes --anos 2007-2026 --metadata-only
    python scripts/scrape_pte.py contratos --todos --metadata-only

Adicionar novo sub-item:
    1. python scripts/scrape_pte.py --inspect <cat>/<subitem>
    2. anote o widget_id, filtro_ano e colunas
    3. adicione entrada em PTE_ENDPOINTS abaixo
    4. rode o scraper com --metadata-only
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import asyncpg
import httpx


# ── Registry de endpoints ───────────────────────────────────────────────────

PTE_BASE = "https://www.transparencia.pr.gov.br/pte/assunto"
TENANT_SLUG = "gov-pr"

PTE_ENDPOINTS: dict[str, dict[str, Any]] = {
    # path = "<categoria>/<subitem>"
    # widget_id = id do <p:dataTable> dentro de formPesquisa (ex: "convenios")
    # filtro_ano = nome do input do filtro de ano (None se não tem)
    # vazio_ok = True se POST sem filtro retorna universo completo
    # tipo = ato.tipo canônico
    # fonte_sistema = ato.fonte_sistema
    # url_anexo_re = regex pra extrair URL do PDF anexo (None se não tem)
    "convenios": {
        "path": "4/127",
        "widget_id": "convenios",
        "filtro_ano": "formPesquisa:filtroAno_input",
        "vazio_ok": True,
        "tipo": "convenio_estadual",
        "fonte_sistema": "pte_convenios",
        "url_anexo_re": r'href="(https://servicos\.tce\.pr\.gov\.br[^"]+\.pdf[^"]*)"',
    },
    "licitacoes": {
        "path": "5/115",
        "widget_id": "licitacoes",
        "filtro_ano": "formPesquisa:sel-ano_input",
        "vazio_ok": False,  # vazio retorna só 490 (default oculto)
        "tipo": "licitacao",
        "fonte_sistema": "pte_licitacoes",
        "url_anexo_re": None,  # tem botão de download CSV/BD, não PDF inline
    },
    "contratos": {
        "path": "5/114",
        "widget_id": "contrato",  # singular no PrimeFaces
        "filtro_ano": "formPesquisa:sel-ano_input",
        "rows_per_page": 20,
        "vazio_ok": True,  # 9364 sem filtro = universo
        "tipo": "contrato_publico",
        "fonte_sistema": "pte_contratos",
        "url_anexo_re": None,
    },
    "dispensas": {
        "path": "5/204",
        "widget_id": "dispensas",
        "filtro_ano": "formPesquisa:sel-ano_input",  # forçar ano-loop pra contornar bug
        "vazio_ok": False,
        "tipo": "dispensa_inexigibilidade",
        "fonte_sistema": "pte_dispensas",
        "url_anexo_re": None,
        "_obs": "vazio retorna apenas 110 linhas (paginação trava). Ano-loop é workaround.",
    },
    "fornecedores": {
        "path": "5/116",
        "widget_id": "fornecedores",
        "filtro_ano": None,
        "vazio_ok": True,
        "tipo": "fornecedor_estado",
        "fonte_sistema": "pte_fornecedores",
        "url_anexo_re": None,
    },
    "precos": {
        "path": "5/117",
        "widget_id": "precos",
        "filtro_ano": None,
        "vazio_ok": True,
        "tipo": "preco_registrado",
        "fonte_sistema": "pte_precos",
        "url_anexo_re": None,
    },
    "itens": {
        "path": "5/297",
        "widget_id": "itens",
        "filtro_ano": None,
        "vazio_ok": True,
        "tipo": "catalogo_item",
        "fonte_sistema": "pte_itens",
        "url_anexo_re": None,
    },
}

DEFAULT_ROWS_PER_PAGE = 30
RATE_LIMIT_PAGE = 1.5
DEFAULT_ANO_INICIO = 2003
DEFAULT_ANO_FIM = 2026

DATABASE_URL = os.environ.get("DATABASE_URL", "")
ASYNCPG_URL = (
    DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace(":5432/", ":6543/")
)

UA_HTML = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0"


# ── Parsing ─────────────────────────────────────────────────────────────────

def _strip(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&nbsp;", " ", s)
    s = re.sub(r"&[a-z]+;", "", s)
    return re.sub(r"\s+", " ", s).strip()


def _parse_data(s: str) -> Optional[date]:
    s = (s or "").strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
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


def extrair_viewstate(body: str) -> Optional[str]:
    m = re.search(r'<update id="javax\.faces\.ViewState[^"]*"><!\[CDATA\[([^\]]+)', body)
    if m:
        return m.group(1).strip()
    m = re.search(r'name="javax\.faces\.ViewState"[^>]+value="([^"]+)"', body)
    return m.group(1) if m else None


def extrair_total(body: str) -> int:
    m = re.search(r'totalRecords["\s:=]+(\d+)', body)
    return int(m.group(1)) if m else 0


def parse_th_headers(body: str) -> list[str]:
    """Extrai nomes das colunas da datatable a partir dos <th role=columnheader>."""
    ths = re.findall(r'<th[^>]+role="columnheader"[^>]*>(.*?)</th>', body, re.DOTALL)
    nomes = []
    for t in ths:
        nome = _strip(t)
        if nome:
            nomes.append(nome)
    return nomes


def parse_linhas(body: str, headers: list[str], url_anexo_re: Optional[str]) -> list[dict]:
    """Pra cada linha de dados: dict com colunas mapeadas pelos headers.

    PrimeFaces usa dois formatos comuns:
      a) <tr role="row" ...>  — convênios, licitações, contratos
      b) <tr id="...:N:..._row_0" class="ui-widget-content">  — dispensas

    Ambos têm os <td> de dados na mesma estrutura interna.
    """
    out = []
    # formato (a): role="row"
    trs = re.findall(r'<tr[^>]*role="row"[^>]*>(.*?)</tr>', body, re.DOTALL)
    # formato (b): linhas de dados explícitas com class ui-widget-content + sufixo _row_0
    if not trs:
        trs = re.findall(
            r'<tr[^>]*class="ui-widget-content"[^>]*>(.*?)</tr>',
            body, re.DOTALL,
        )
    if not trs:
        # fallback: id contendo "_row_0"
        trs = re.findall(
            r'<tr[^>]*id="[^"]*_row_0"[^>]*>(.*?)</tr>',
            body, re.DOTALL,
        )
    for tr in trs:
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
        if not tds:
            continue
        textos = [_strip(t) for t in tds]
        # alguns sub-itens têm <td> de checkbox/expander vazio antes — pula vazios iniciais
        while textos and not textos[0]:
            textos = textos[1:]
            tds = tds[1:]
        if not textos:
            continue
        linha: dict[str, Any] = {}
        for i, txt in enumerate(textos):
            col = headers[i] if i < len(headers) else f"col_{i}"
            linha[col] = txt
        # extrai href do PDF anexo se aplicável
        if url_anexo_re:
            m = re.search(url_anexo_re, tr, re.I)
            if m:
                linha["_url_pdf"] = m.group(1)
        # extrai todos os hrefs como bonus
        hrefs = re.findall(r'href="([^"]+)"', tr)
        if hrefs:
            linha["_hrefs"] = hrefs
        out.append(linha)
    return out


# ── PFSession ───────────────────────────────────────────────────────────────

class PFSession:
    def __init__(self, http: httpx.AsyncClient, endpoint: dict[str, Any]):
        self.http = http
        self.cfg = endpoint
        self.url = f"{PTE_BASE}/{endpoint['path']}"
        self.viewstate: Optional[str] = None
        self.action_url: Optional[str] = None
        self.input_names: list[str] = []
        self.headers_th: list[str] = []

    async def init(self) -> None:
        r = await self.http.get(self.url)
        body = r.text
        m = re.search(r'<form[^>]+id="formPesquisa"[^>]+action="([^"]+)"', body)
        vs = extrair_viewstate(body)
        if not m or not vs:
            raise RuntimeError(f"Não conseguiu inicializar sessão JSF em {self.url}")
        action = m.group(1)
        self.action_url = (
            f"https://www.transparencia.pr.gov.br{action}"
            if action.startswith("/") else action
        )
        self.viewstate = vs
        # capturar todos os names de inputs do form pra preencher payload completo
        self.input_names = sorted(set(re.findall(r'<input[^>]+name="(formPesquisa:[^"]+)"', body)))
        self.headers_th = parse_th_headers(body)

    def _common_headers(self) -> dict:
        return {
            "Faces-Request": "partial/ajax",
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "Origin": "https://www.transparencia.pr.gov.br",
            "Referer": self.url,
        }

    def _payload_base(self) -> dict[str, str]:
        p = {
            "javax.faces.partial.ajax": "true",
            "javax.faces.partial.execute": "@all",
            "javax.faces.partial.render": "formPesquisa",
            "formPesquisa": "formPesquisa",
            "javax.faces.ViewState": self.viewstate or "",
        }
        for name in self.input_names:
            if name not in p:
                p[name] = ""
        return p

    async def pesquisar(self, ano: Optional[int]) -> str:
        payload = self._payload_base()
        payload["javax.faces.source"] = "formPesquisa:btnPesquisar"
        payload["formPesquisa:btnPesquisar"] = "formPesquisa:btnPesquisar"
        if self.cfg["filtro_ano"]:
            payload[self.cfg["filtro_ano"]] = "" if ano is None else str(ano)
        r = await self.http.post(self.action_url, data=payload, headers=self._common_headers())
        body = r.text
        new_vs = extrair_viewstate(body)
        if new_vs:
            self.viewstate = new_vs
        # se a primeira pesquisa veio sem TH no datatable (porque <th> só aparece após pesquisa),
        # tenta extrair agora
        ths = parse_th_headers(body)
        if ths and not self.headers_th:
            self.headers_th = ths
        elif ths and len(ths) > len(self.headers_th):
            self.headers_th = ths
        return body

    @property
    def rows_per_page(self) -> int:
        return self.cfg.get("rows_per_page", DEFAULT_ROWS_PER_PAGE)

    async def paginar(self, first: int) -> str:
        widget = f"formPesquisa:{self.cfg['widget_id']}"
        payload = self._payload_base()
        payload["javax.faces.source"] = widget
        payload["javax.faces.partial.execute"] = widget
        payload["javax.faces.partial.render"] = widget
        payload[f"{widget}_pagination"] = "true"
        payload[f"{widget}_first"] = str(first)
        payload[f"{widget}_rows"] = str(self.rows_per_page)
        payload[f"{widget}_encodeFeature"] = "true"
        r = await self.http.post(self.action_url, data=payload, headers=self._common_headers())
        body = r.text
        new_vs = extrair_viewstate(body)
        if new_vs:
            self.viewstate = new_vs
        return body


# ── Persistência ────────────────────────────────────────────────────────────

async def get_tenant_id(conn) -> str:
    row = await conn.fetchrow("SELECT id FROM tenants WHERE slug=$1", TENANT_SLUG)
    if not row:
        sys.exit(f"Tenant '{TENANT_SLUG}' não cadastrado.")
    return str(row["id"])


def _gerar_numero(linha: dict, headers: list[str]) -> str:
    """Best-effort: identificador único do registro.

    Prioridade: campos com "Nº", "Número", "Protocolo", "Edital",
    "Identificação". Se nenhum existir, gera hash SHA256 dos campos
    semânticos pra produzir um numero estável e único por linha.
    """
    import hashlib
    candidatos_explicitos = (
        "Nº Ano", "Nº/Ano", "Nº", "N°", "Número", "Numero",
        "Protocolo", "Edital", "Identificação", "Identificacao",
    )
    for k in candidatos_explicitos:
        if k in linha and linha[k]:
            return str(linha[k])[:80]
    # busca por chave que comece com "Nº" / "Número"
    for k, v in linha.items():
        if not v or k.startswith("_"):
            continue
        if re.match(r"(N°|Nº|Número|Numero)", k, re.I):
            return str(v)[:80]
    # fallback determinístico: SHA1 dos campos não-_ ordenados
    payload = "|".join(
        f"{k}={v}" for k, v in sorted(linha.items())
        if not k.startswith("_") and v
    )
    h = hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]
    return f"hash:{h}"


def _extrair_data(linha: dict) -> Optional[date]:
    for k in ("Data de Abertura", "Data de Apresentação", "Data Início",
              "Data de Início", "Data", "Vigência Início"):
        v = linha.get(k)
        if v:
            d = _parse_data(v)
            if d:
                return d
    # qualquer campo com /
    for v in linha.values():
        if isinstance(v, str) and re.match(r"\d{2}/\d{2}/\d{4}", v):
            d = _parse_data(v)
            if d:
                return d
    return None


def _extrair_titulo(linha: dict) -> str:
    for k in ("Resumo do Edital", "Objeto", "Resumo", "Descrição"):
        v = linha.get(k)
        if v:
            return v[:1000]
    return ""


def _extrair_url_pdf(linha: dict) -> Optional[str]:
    if "_url_pdf" in linha:
        return linha["_url_pdf"]
    hrefs = linha.get("_hrefs") or []
    for h in hrefs:
        if h.lower().endswith(".pdf") or "/download" in h.lower():
            return h
    return None


async def upsert_inventario(
    conn, tenant_id: str, endpoint: dict, linha: dict, headers: list[str]
) -> str:
    numero = _gerar_numero(linha, headers)
    titulo = _extrair_titulo(linha)
    data_pub = _extrair_data(linha)
    url_pdf = _extrair_url_pdf(linha)
    tipo = endpoint["tipo"]
    fonte = endpoint["fonte_sistema"]

    existing = await conn.fetchrow(
        "SELECT id FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo=$3",
        tenant_id, numero, tipo,
    )
    if existing:
        return f"SKIP {numero[:50]}"

    ato_id = uuid.uuid4()
    await conn.execute(
        """INSERT INTO atos (id, tenant_id, numero, tipo, titulo, ementa,
            data_publicacao, url_pdf, pdf_baixado, processado, fonte_sistema)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, FALSE, $9)""",
        ato_id, tenant_id, numero, tipo, titulo, titulo, data_pub, url_pdf, fonte,
    )
    # metadata extra: tudo que veio (menos os hrefs, que ficam num sub-campo)
    payload = {k: v for k, v in linha.items() if not k.startswith("_")}
    if "_hrefs" in linha:
        payload["_hrefs"] = linha["_hrefs"]
    if "_url_pdf" in linha:
        payload["_url_pdf"] = linha["_url_pdf"]
    payload["_headers_th"] = headers
    await conn.execute(
        "INSERT INTO atos_metadata (ato_id, dados) VALUES ($1, $2::jsonb)",
        ato_id, json.dumps(payload, default=str, ensure_ascii=False),
    )
    return f"META {numero[:50]}"


# ── Inspect ─────────────────────────────────────────────────────────────────

def resolve_endpoint(arg: str) -> dict[str, Any]:
    """Aceita nome do registry ou path 'cat/subitem'."""
    if arg in PTE_ENDPOINTS:
        return PTE_ENDPOINTS[arg]
    if "/" in arg:
        return {
            "path": arg,
            "widget_id": "?",
            "filtro_ano": None,
            "vazio_ok": True,
            "tipo": "inventario_pte",
            "fonte_sistema": f"pte_{arg.replace('/','_')}",
            "url_anexo_re": None,
        }
    sys.exit(f"endpoint desconhecido: {arg}. Conhecidos: {list(PTE_ENDPOINTS)}")


async def inspect(endpoint: dict[str, Any]) -> None:
    print(f"\n══ Inspect — {endpoint['path']} ══\n")
    headers_html = {"User-Agent": UA_HTML, "Accept-Language": "pt-BR,pt;q=0.9"}
    async with httpx.AsyncClient(headers=headers_html, follow_redirects=True, timeout=30) as h:
        sess = PFSession(h, endpoint)
        await sess.init()
        print(f"action_url: {sess.action_url}")
        print(f"viewstate:  {sess.viewstate[:50]}...")
        print(f"inputs ({len(sess.input_names)}): {sess.input_names[:8]}{'...' if len(sess.input_names)>8 else ''}")
        print(f"headers TH (página inicial): {sess.headers_th}")
        # POST btnPesquisar sem filtro
        body = await sess.pesquisar(None)
        total_vazio = extrair_total(body)
        widgets = re.findall(r'PrimeFaces\.cw\("DataTable","([^"]+)"', body)
        print(f"\npesquisa vazia: totalRecords={total_vazio}  widgets={widgets}")
        print(f"headers TH (após pesquisa): {sess.headers_th}")
        linhas = parse_linhas(body, sess.headers_th, endpoint.get("url_anexo_re"))
        print(f"linhas parseadas: {len(linhas)}")
        if linhas:
            print(f"primeira linha:")
            for k, v in list(linhas[0].items())[:12]:
                vs = str(v)[:60]
                print(f"  {k:30} = {vs}")
        # se filtro_ano configurado, testar com 2024
        if endpoint.get("filtro_ano"):
            body24 = await sess.pesquisar(2024)
            tot24 = extrair_total(body24)
            print(f"\npesquisa ano=2024 ({endpoint['filtro_ano']}): totalRecords={tot24}")


# ── Main coleta ─────────────────────────────────────────────────────────────

def parse_anos_arg(args) -> Optional[list[Optional[int]]]:
    if args.todos:
        return [None]
    if args.ano:
        return [args.ano]
    if args.anos:
        m = re.match(r"(\d{4})-(\d{4})$", args.anos)
        if not m:
            sys.exit("--anos AAAA-AAAA")
        return list(range(int(m.group(1)), int(m.group(2)) + 1))
    return None


async def _abrir_sessao(http: httpx.AsyncClient, endpoint: dict, ano: Optional[int],
                        first: int) -> tuple[PFSession, str, int]:
    """Cria sessão fresca e posiciona no offset desejado.

    Útil quando a ViewState expira após N paginadas — basta reabrir sessão e
    pular pra `first`. Retorna (sess, body_da_pagina, total).
    """
    sess = PFSession(http, endpoint)
    await sess.init()
    body = await sess.pesquisar(ano)
    total = extrair_total(body)
    if first > 0:
        body = await sess.paginar(first)
    elif not parse_linhas(body, sess.headers_th, endpoint.get("url_anexo_re")):
        # alguns endpoints só populam linhas após paginate(0)
        body = await sess.paginar(0)
    return sess, body, total


async def coletar(endpoint: dict[str, Any], anos: list[Optional[int]],
                  metadata_only: bool, max_paginas: int, chunk_pages: int) -> None:
    rotulo = "TODOS" if anos == [None] else f"{anos[0]}..{anos[-1]}"
    print(f"\n{'='*72}")
    print(f"  PTE Coleta — {endpoint['path']} ({endpoint['fonte_sistema']}) ano={rotulo} chunk={chunk_pages}")
    print(f"{'='*72}\n")

    headers_html = {"User-Agent": UA_HTML, "Accept-Language": "pt-BR,pt;q=0.9"}
    async with httpx.AsyncClient(headers=headers_html, follow_redirects=True, timeout=60) as h:
        sess = PFSession(h, endpoint)
        await sess.init()
        print(f"[setup] action: {sess.action_url}")
        print(f"[setup] inputs: {len(sess.input_names)}, headers iniciais: {len(sess.headers_th)}")

        conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
        tenant_id = await get_tenant_id(conn)
        try:
            ok = err = skip = 0
            for ano in anos:
                rotulo_ano = "TODOS" if ano is None else str(ano)
                print(f"\n══ ANO {rotulo_ano} ══")
                try:
                    body = await sess.pesquisar(ano)
                except Exception as exc:
                    print(f"  pesquisa falhou: {exc!s:.100}")
                    continue
                total = extrair_total(body)
                print(f"  total: {total} registros, headers={len(sess.headers_th)}")
                if total == 0:
                    continue

                linhas = parse_linhas(body, sess.headers_th, endpoint.get("url_anexo_re"))
                if not linhas and total > 0:
                    # alguns endpoints (ex: dispensas) só populam linhas após paginate(0).
                    # btnPesquisar atualiza o totalRecords mas não renderiza linhas inicialmente.
                    try:
                        body = await sess.paginar(0)
                        linhas = parse_linhas(body, sess.headers_th, endpoint.get("url_anexo_re"))
                        print(f"  (refetch via paginar(0))")
                    except Exception as exc:
                        print(f"  refetch falhou: {exc!s:.100}")
                print(f"  pág 1: {len(linhas)} linhas")
                pagina = 1
                while True:
                    if max_paginas and pagina > max_paginas:
                        print(f"  → atingiu --max-paginas={max_paginas}")
                        break
                    for i, linha in enumerate(linhas, 1):
                        try:
                            msg = await upsert_inventario(conn, tenant_id, endpoint, linha, sess.headers_th)
                        except Exception as exc:
                            msg = f"✗ ERR {exc!s:.80}"
                        tag = msg[:4].strip()
                        if   tag == "META": ok += 1
                        elif tag == "SKIP": skip += 1
                        else:               err += 1
                        if i % 10 == 1:
                            print(f"    [p{pagina}/{i:>2}] {msg}", flush=True)

                    next_first = pagina * sess.rows_per_page
                    if next_first >= total:
                        print(f"  → fim do ano ({total} cobertos)")
                        break
                    # se atingiu chunk_pages, recriar sessão pra evitar VS expirada
                    if chunk_pages and pagina % chunk_pages == 0:
                        try:
                            sess, body, _ = await _abrir_sessao(h, endpoint, ano, next_first)
                            linhas = parse_linhas(body, sess.headers_th, endpoint.get("url_anexo_re"))
                            print(f"  ↻ sessão renovada @ first={next_first}")
                        except Exception as exc:
                            print(f"  renovação falhou: {exc!s:.100}")
                            break
                    else:
                        try:
                            body = await sess.paginar(next_first)
                            linhas = parse_linhas(body, sess.headers_th, endpoint.get("url_anexo_re"))
                        except Exception as exc:
                            print(f"  paginate falhou: {exc!s:.100}")
                            break
                    if not linhas:
                        # tenta uma vez recriar sessão antes de desistir
                        if chunk_pages:
                            try:
                                sess, body, _ = await _abrir_sessao(h, endpoint, ano, next_first)
                                linhas = parse_linhas(body, sess.headers_th, endpoint.get("url_anexo_re"))
                                if linhas:
                                    print(f"  ↻ sessão renovada (após vazio) @ first={next_first}")
                            except Exception as exc:
                                print(f"  retry-via-renovação falhou: {exc!s:.100}")
                        if not linhas:
                            print(f"  → resposta vazia na pág {pagina+1}, parando")
                            break
                    pagina += 1
                    print(f"  pág {pagina}: {len(linhas)} linhas")
                    await asyncio.sleep(RATE_LIMIT_PAGE)

            print(f"\n══ TOTAL: META={ok} SKIP={skip} ERR={err} ══\n")
        finally:
            await conn.close()


async def main(args) -> None:
    if args.inspect:
        endpoint = resolve_endpoint(args.inspect)
        await inspect(endpoint)
        return

    if not args.endpoint:
        sys.exit("informe o endpoint (ex: licitacoes) ou use --inspect")
    endpoint = resolve_endpoint(args.endpoint)

    anos = parse_anos_arg(args)
    if anos is None:
        # default: se vazio_ok use [None], senão range padrão
        anos = [None] if endpoint.get("vazio_ok") else list(range(DEFAULT_ANO_INICIO, DEFAULT_ANO_FIM + 1))

    await coletar(endpoint, anos, args.metadata_only, args.max_paginas, args.chunk_pages)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("endpoint", nargs="?", help="nome do endpoint (licitacoes, contratos, ...) ou path 'cat/subitem'")
    p.add_argument("--inspect", help="inspeciona estrutura do endpoint sem gravar")
    p.add_argument("--ano", type=int)
    p.add_argument("--anos", type=str, help="AAAA-AAAA")
    p.add_argument("--todos", action="store_true", help="sem filtro de ano")
    p.add_argument("--max-paginas", type=int, default=0)
    p.add_argument("--chunk-pages", type=int, default=0,
                   help="renova a sessão JSF a cada N páginas (resolve VS expirada). 0=desativa.")
    p.add_argument("--metadata-only", action="store_true", help="só metadados/URL no banco")
    asyncio.run(main(p.parse_args()))
