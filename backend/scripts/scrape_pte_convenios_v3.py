#!/usr/bin/env python3
"""
scrape_pte_convenios_v3.py — POST AJAX direto pro PrimeFaces (sem browser).

V1: 30 convênios fixos (sem filtro). V2: Playwright via Obscura CDP (falhou
por jQuery quebrado). V3: httpx puro replicando o postback PrimeFaces — mais
rápido, mais confiável, sem JS.

Achado-chave: filtroAno=2024 retorna `totalRecords: 8607`. O total real do
PR é gigantesco (dezenas de milhares de convênios entre 1995 e hoje).

Fluxo:
  1. GET inicial pra capturar ViewState + cookies + windowId da URL
  2. POST AJAX btnPesquisar (filtroAno=N) → response XML com 30 linhas + novo ViewState + totalRecords
  3. POST AJAX pagination (first=30, 60, ...) → próximas páginas
  4. Pra cada convênio: parse → INSERT → download PDF do TCE → extrai texto

Uso:
    python scripts/scrape_pte_convenios_v3.py --ano 2024 --max-paginas 2  # smoke
    python scripts/scrape_pte_convenios_v3.py --ano 2024                  # ano completo
    python scripts/scrape_pte_convenios_v3.py --anos 2007-2026            # tudo
    python scripts/scrape_pte_convenios_v3.py --probe --anos 1995-2026    # só conta
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

PTE_URL = "https://www.transparencia.pr.gov.br/pte/assunto/4/127"
TENANT_SLUG = "gov-pr"
ROWS_PER_PAGE = 30
RATE_LIMIT_PDF = 1.0
RATE_LIMIT_PAGE = 1.5
MAX_PDF_BYTES = 100 * 1024 * 1024

DATABASE_URL = os.environ.get("DATABASE_URL", "")
ASYNCPG_URL = (
    DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace(":5432/", ":6543/")
)

UA_HTML = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0"


# ── Parse ────────────────────────────────────────────────────────────────────

def _strip(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&nbsp;", " ", s)
    s = re.sub(r"&[a-z]+;", "", s)
    return re.sub(r"\s+", " ", s).strip()


def _parse_data(s):
    s = (s or "").strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _parse_brl(s) -> Optional[float]:
    s = re.sub(r"[^\d,.]", "", s or "")
    if not s:
        return None
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def parse_convenios(html_or_xml: str) -> list[dict]:
    out = []
    trs = re.findall(r'<tr[^>]*role="row"[^>]*>(.*?)</tr>', html_or_xml, re.DOTALL)
    for tr in trs:
        pdf = re.search(r'href="(https://servicos\.tce\.pr\.gov\.br[^"]+\.pdf[^"]*)"', tr, re.I)
        if not pdf:
            continue
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
        textos = [_strip(t) for t in tds]
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


def extrair_viewstate(body: str) -> Optional[str]:
    """Extrai novo ViewState da resposta — formato XML ou HTML."""
    # PrimeFaces partial-response: <update id="...j_id_x"><![CDATA[<input ... value="VS"/>]]></update>
    m = re.search(r'<update id="javax\.faces\.ViewState[^"]*"><!\[CDATA\[([^\]]+)', body)
    if m:
        return m.group(1).strip()
    # HTML normal
    m = re.search(r'name="javax\.faces\.ViewState"[^>]+value="([^"]+)"', body)
    return m.group(1) if m else None


def extrair_total(body: str) -> int:
    m = re.search(r'totalRecords["\s:=]+(\d+)', body)
    return int(m.group(1)) if m else 0


def _gen_numero(c: dict) -> str:
    cc = re.sub(r"[^A-Z0-9]", "", c["concedente"].upper())[:20]
    ano = c["dt_inicio"].year if c["dt_inicio"] else "????"
    return f"{c['numero']}/{ano}-{cc}"[:100]


# ── PrimeFaces postbacks ────────────────────────────────────────────────────

class PFSession:
    """Mantém ViewState + cookies da sessão JSF."""

    def __init__(self, http: httpx.AsyncClient):
        self.http = http
        self.viewstate: Optional[str] = None
        self.action_url: Optional[str] = None  # /pte/compras/convenios?windowId=...

    async def init(self):
        r = await self.http.get(PTE_URL)
        body = r.text
        self.viewstate = extrair_viewstate(body)
        m = re.search(r'<form[^>]+id="formPesquisa"[^>]+action="([^"]+)"', body)
        if not m or not self.viewstate:
            raise RuntimeError("Não conseguiu inicializar sessão JSF")
        action = m.group(1)
        self.action_url = (
            f"https://www.transparencia.pr.gov.br{action}"
            if action.startswith("/") else action
        )

    def _common_headers(self) -> dict:
        return {
            "Faces-Request": "partial/ajax",
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "Origin": "https://www.transparencia.pr.gov.br",
            "Referer": PTE_URL,
        }

    async def pesquisar_ano(self, ano: Optional[int]) -> str:
        """POST btnPesquisar com filtroAno=ano. None ou 0 = todos os anos.

        ATENÇÃO: filtroAno do PTE não é por data de assinatura — ele lista
        convênios com QUALQUER atividade naquele ano (aditivos, prestações
        de contas, pagamentos). Filtrar por ano gera massiva duplicação:
        soma de totais por ano = ~89k, mas total único = ~11k.

        Pra coletar universo único, chame com ano=None.
        """
        ano_str = "" if (ano is None or ano == 0) else str(ano)
        payload = {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": "formPesquisa:btnPesquisar",
            "javax.faces.partial.execute": "@all",
            "javax.faces.partial.render": "formPesquisa",
            "formPesquisa:btnPesquisar": "formPesquisa:btnPesquisar",
            "formPesquisa": "formPesquisa",
            "formPesquisa:filtroAno_focus": "",
            "formPesquisa:filtroAno_input": ano_str,
            "formPesquisa:filtroMes_focus": "",
            "formPesquisa:filtroMes_input": "",
            "formPesquisa:filtroConcedente_focus": "",
            "formPesquisa:filtroConcedente_input": "",
            "formPesquisa:filtroCnpj": "",
            "formPesquisa:filtroConvenente_focus": "",
            "formPesquisa:filtroConvenente_input": "",
            "formPesquisa:filtroSituacao_focus": "",
            "formPesquisa:filtroSituacao_input": "",
            "formPesquisa:filtroObjeto": "",
            "javax.faces.ViewState": self.viewstate,
        }
        r = await self.http.post(self.action_url, data=payload, headers=self._common_headers())
        body = r.text
        new_vs = extrair_viewstate(body)
        if new_vs:
            self.viewstate = new_vs
        return body

    async def paginar(self, first: int) -> str:
        """Pagina a datatable: first=0 (1ª pág), 30 (2ª), 60 (3ª)..."""
        payload = {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": "formPesquisa:convenios",
            "javax.faces.partial.execute": "formPesquisa:convenios",
            "javax.faces.partial.render": "formPesquisa:convenios",
            "formPesquisa:convenios_pagination": "true",
            "formPesquisa:convenios_first": str(first),
            "formPesquisa:convenios_rows": str(ROWS_PER_PAGE),
            "formPesquisa:convenios_encodeFeature": "true",
            "formPesquisa": "formPesquisa",
            "formPesquisa:filtroAno_focus": "",
            "formPesquisa:filtroAno_input": "",  # mantém o filtro do submit anterior implícito
            "formPesquisa:filtroMes_focus": "",
            "formPesquisa:filtroMes_input": "",
            "formPesquisa:filtroConcedente_focus": "",
            "formPesquisa:filtroConcedente_input": "",
            "formPesquisa:filtroCnpj": "",
            "formPesquisa:filtroConvenente_focus": "",
            "formPesquisa:filtroConvenente_input": "",
            "formPesquisa:filtroSituacao_focus": "",
            "formPesquisa:filtroSituacao_input": "",
            "formPesquisa:filtroObjeto": "",
            "javax.faces.ViewState": self.viewstate,
        }
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


def _extract_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        n = len(pdf.pages)
        partes = [p.extract_text() or "" for p in pdf.pages]
    txt = ftfy.fix_text("\n\n".join(partes))
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n{3,}", "\n\n", txt)
    return txt.strip(), n


async def upsert_convenio(
    conn, tenant_id: str, c: dict, http_pdf: httpx.AsyncClient,
    metadata_only: bool = False,
) -> str:
    numero = _gen_numero(c)
    titulo = f"{c['concedente']} × {c['convenente']} (Conv. {c['numero']})"[:1000]
    ementa = c["objeto"][:500]
    existing = await conn.fetchrow(
        "SELECT id, pdf_baixado FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo=$3",
        tenant_id, numero, "convenio_estadual",
    )
    if metadata_only:
        if existing:
            return f"SKIP {numero[:50]} (já existe)"
        ato_id = uuid.uuid4()
        await conn.execute(
            """INSERT INTO atos (id, tenant_id, numero, tipo, titulo, ementa,
                data_publicacao, url_pdf, pdf_baixado, processado, fonte_sistema)
               VALUES ($1, $2, $3, 'convenio_estadual', $4, $5, $6, $7, FALSE, FALSE, 'pte_convenios')""",
            ato_id, tenant_id, numero, titulo, ementa, c["dt_inicio"], c["pdf_url"],
        )
        return f"META {numero[:50]} {(c['valor_repasses'] or 0):>14.2f} {c['situacao'][:20]}"

    if existing and existing["pdf_baixado"]:
        return f"SKIP {numero[:50]}"
    if existing:
        ato_id = existing["id"]
    else:
        ato_id = uuid.uuid4()
        await conn.execute(
            """INSERT INTO atos (id, tenant_id, numero, tipo, titulo, ementa,
                data_publicacao, url_pdf, pdf_baixado, processado, fonte_sistema)
               VALUES ($1, $2, $3, 'convenio_estadual', $4, $5, $6, $7, FALSE, FALSE, 'pte_convenios')""",
            ato_id, tenant_id, numero, titulo, ementa, c["dt_inicio"], c["pdf_url"],
        )
    try:
        r = await http_pdf.get(c["pdf_url"], timeout=60)
        r.raise_for_status()
        raw = r.content
        if len(raw) > MAX_PDF_BYTES:
            raise ValueError(f"PDF {len(raw):,}b")
        texto, n = _extract_pdf(raw)
        qual = "boa" if len(texto) > 200 else ("ruim" if len(texto) < 50 else "parcial")
        await conn.execute(
            """INSERT INTO conteudo_ato (ato_id, texto_completo, metodo_extracao, qualidade, tokens_estimados)
               VALUES ($1, $2, 'pdfplumber', $3, $4)
               ON CONFLICT (ato_id) DO UPDATE SET texto_completo=EXCLUDED.texto_completo,
                qualidade=EXCLUDED.qualidade, tokens_estimados=EXCLUDED.tokens_estimados""",
            ato_id, texto, qual, len(texto) // 4,
        )
        await conn.execute(
            "UPDATE atos SET pdf_baixado=TRUE, pdf_paginas=$1, pdf_tamanho_bytes=$2 WHERE id=$3",
            n, len(raw), ato_id,
        )
        return f"OK   {numero[:50]} {n}p qual={qual}"
    except Exception as exc:
        await conn.execute("UPDATE atos SET erro_download=$1 WHERE id=$2", str(exc)[:200], ato_id)
        return f"✗ ERR {numero[:50]} {exc!s:.60}"


# ── Main ────────────────────────────────────────────────────────────────────

def parse_anos(args) -> Optional[tuple[int, int]]:
    if args.todos:
        return None
    if args.ano:
        return args.ano, args.ano
    if args.anos:
        m = re.match(r"(\d{4})-(\d{4})", args.anos)
        if not m:
            sys.exit("--anos AAAA-AAAA")
        return int(m.group(1)), int(m.group(2))
    sys.exit("Use --ano AAAA, --anos AAAA-AAAA, ou --todos")


async def main(args):
    range_anos = parse_anos(args)
    if range_anos is None:
        anos_iter: list[Optional[int]] = [None]
        rotulo = "TODOS"
    else:
        ano_ini, ano_fim = range_anos
        anos_iter = list(range(ano_ini, ano_fim + 1))
        rotulo = f"{ano_ini}..{ano_fim}"
    print(f"\n{'='*72}")
    print(f"  PTE Convênios — {'PROBE' if args.probe else 'COLETA'} ano={rotulo}")
    print(f"{'='*72}\n")

    headers_html = {"User-Agent": UA_HTML, "Accept-Language": "pt-BR,pt;q=0.9"}
    headers_pdf = {"User-Agent": UA_HTML, "Accept": "application/pdf,*/*"}

    async with httpx.AsyncClient(headers=headers_html, follow_redirects=True, timeout=60) as http:
        sess = PFSession(http)
        await sess.init()
        print(f"[setup] action: {sess.action_url}")
        print(f"[setup] ViewState inicial: {sess.viewstate[:40]}...")

        if args.probe:
            for ano in anos_iter:
                try:
                    body = await sess.pesquisar_ano(ano)
                    total = extrair_total(body)
                    n_pag = len(parse_convenios(body))
                    rotulo_ano = "TODOS" if ano is None else str(ano)
                    print(f"  {rotulo_ano}: total={total:>6}  primeira_pag={n_pag}")
                except Exception as exc:
                    print(f"  {ano}: ERRO {exc!s:.80}")
                await asyncio.sleep(RATE_LIMIT_PAGE)
            return

        # Modo coleta
        conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
        tenant_id = await get_tenant_id(conn)
        try:
            async with httpx.AsyncClient(headers=headers_pdf, follow_redirects=True, timeout=60) as http_pdf:
                ok = err = skip = 0
                for ano in anos_iter:
                    rotulo_ano = "TODOS" if ano is None else str(ano)
                    print(f"\n══ ANO {rotulo_ano} ══")
                    try:
                        body = await sess.pesquisar_ano(ano)
                    except Exception as exc:
                        print(f"  pesquisa falhou: {exc!s:.100}")
                        continue
                    total = extrair_total(body)
                    print(f"  total: {total} convênios")
                    if total == 0:
                        continue

                    convenios = parse_convenios(body)
                    print(f"  pág 1: {len(convenios)} convênios")
                    pagina = 1
                    while True:
                        if args.max_paginas and pagina > args.max_paginas:
                            print(f"  → atingiu --max-paginas={args.max_paginas}")
                            break
                        for i, c in enumerate(convenios, 1):
                            msg = await upsert_convenio(
                                conn, tenant_id, c, http_pdf,
                                metadata_only=args.metadata_only,
                            )
                            tag = msg[:4].strip()
                            if   tag in ("OK", "META"): ok += 1
                            elif tag == "SKIP":         skip += 1
                            else:                       err += 1
                            if not args.metadata_only or i % 10 == 1:
                                print(f"    [p{pagina}/{i:>2}] {msg}", flush=True)
                            if not args.metadata_only:
                                await asyncio.sleep(RATE_LIMIT_PDF)

                        # próxima página
                        next_first = pagina * ROWS_PER_PAGE
                        if next_first >= total:
                            print(f"  → fim do ano ({total} cobertos)")
                            break
                        try:
                            body = await sess.paginar(next_first)
                            convenios = parse_convenios(body)
                            if not convenios:
                                print(f"  → resposta vazia na pág {pagina+1}, parando")
                                break
                            pagina += 1
                            print(f"  pág {pagina}: {len(convenios)} convênios")
                            await asyncio.sleep(RATE_LIMIT_PAGE)
                        except Exception as exc:
                            print(f"  paginate falhou: {exc!s:.100}")
                            break

                print(f"\n══ TOTAL: OK={ok} SKIP={skip} ERR={err} ══\n")
        finally:
            await conn.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--ano", type=int)
    p.add_argument("--anos", type=str)
    p.add_argument("--todos", action="store_true",
                   help="Sem filtro de ano — universo único de convênios (~11k em vez de ~89k duplicados)")
    p.add_argument("--max-paginas", type=int, default=0, help="Limita páginas/ano (0=sem limite)")
    p.add_argument("--probe", action="store_true")
    p.add_argument("--metadata-only", action="store_true",
                   help="Salva só metadados+URL no banco (não baixa PDF, não extrai texto)")
    asyncio.run(main(p.parse_args()))
