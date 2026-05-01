#!/usr/bin/env python3
"""
scrape_pte_viagens.py — coleta metadata de Viagens do PTE.

Diferente dos demais subitens, Viagens NÃO permite Download do BD em massa
(o servidor exige Ano+Mês válidos do dropdown e não aceita "TODOS"). Logo
precisa paginar mês-a-mês. Cada chamada retorna 30 linhas.

Volume estimado: ~50-70k viagens/mês × 168 meses (jan/2012-abr/2026) =
~8-12 milhões de registros. Em paginação a 30/req com rate ~1.5s = ~70h.

Modo recomendado: --ano N --mes ABRIL (1 mês de cada vez), pra possibilitar
processamento incremental sem segurar uma sessão JSF longa demais.

Usa nome+instituição+ano+mês como chave única (hash determinístico) pra
evitar SKIPs falsos quando a mesma pessoa viaja várias vezes no mesmo mês.

Uso:
    python scripts/scrape_pte_viagens.py --ano 2024 --mes ABRIL --metadata-only
    python scripts/scrape_pte_viagens.py --ano 2024 --mes ABRIL --max-paginas 5  # smoke
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import re
import sys
import uuid
from datetime import date
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


URL = "https://www.transparencia.pr.gov.br/pte/pessoal/viagens"
TENANT_SLUG = "gov-pr"
ROWS_PER_PAGE = 30
RATE_LIMIT_PAGE = 1.0
TIPO = "viagem_diaria"
FONTE = "pte_viagens"

DATABASE_URL = os.environ.get("DATABASE_URL", "")
ASYNCPG_URL = (
    DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace(":5432/", ":6543/")
)

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0"
MESES = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO",
         "JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"]


def _strip(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&nbsp;", " ", s)
    s = re.sub(r"&[a-z]+;", "", s)
    return re.sub(r"\s+", " ", s).strip()


def extrair_viewstate(body: str) -> Optional[str]:
    m = re.search(r'<update id="javax\.faces\.ViewState[^"]*"><!\[CDATA\[([^\]]+)', body)
    if m:
        return m.group(1).strip()
    m = re.search(r'name="javax\.faces\.ViewState"[^>]+value="([^"]+)"', body)
    return m.group(1) if m else None


def extrair_total(body: str) -> int:
    m = re.search(r'totalRecords["\s:=]+(\d+)', body)
    return int(m.group(1)) if m else 0


def parse_linhas(body: str) -> list[dict]:
    out = []
    trs = re.findall(r'<tr[^>]*role="row"[^>]*>(.*?)</tr>', body, re.DOTALL)
    for tr in trs:
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL)
        if len(tds) < 2:
            continue
        textos = [_strip(t) for t in tds]
        nome = textos[0] if len(textos) > 0 else ""
        instituicao = textos[1] if len(textos) > 1 else ""
        if not nome:
            continue
        out.append({"nome": nome, "instituicao": instituicao})
    return out


class PFViagens:
    def __init__(self, http: httpx.AsyncClient):
        self.http = http
        self.viewstate: Optional[str] = None
        self.action_url: Optional[str] = None
        self.input_names: list[str] = []
        self.ano: Optional[int] = None
        self.mes: Optional[str] = None

    async def init(self):
        r = await self.http.get(URL)
        body = r.text
        m = re.search(r'<form[^>]+id="formViagens"[^>]+action="([^"]+)"', body)
        vs = extrair_viewstate(body)
        if not m or not vs:
            raise RuntimeError("não inicializou sessão JSF")
        self.action_url = "https://www.transparencia.pr.gov.br" + m.group(1)
        self.viewstate = vs
        self.input_names = sorted(set(re.findall(r'<(?:input|select)[^>]+name="(formViagens:[^"]+)"', body)))

    def _headers_ajax(self) -> dict:
        return {
            "Faces-Request": "partial/ajax",
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "Origin": "https://www.transparencia.pr.gov.br",
            "Referer": URL,
        }

    def _payload_base(self) -> dict[str, str]:
        p = {
            "javax.faces.partial.ajax": "true",
            "javax.faces.partial.execute": "@all",
            "javax.faces.partial.render": "formViagens",
            "formViagens": "formViagens",
            "javax.faces.ViewState": self.viewstate or "",
            "formViagens:filtroAno_input": str(self.ano) if self.ano else "",
            "formViagens:filtroMesInicio_input": self.mes or "",
            "formViagens:filtroMesTermino_input": self.mes or "",
        }
        for name in self.input_names:
            p.setdefault(name, "")
        return p

    async def pesquisar(self, ano: int, mes: str) -> str:
        self.ano = ano
        self.mes = mes
        payload = self._payload_base()
        payload["javax.faces.source"] = "formViagens:btnPesquisar"
        payload["formViagens:btnPesquisar"] = "formViagens:btnPesquisar"
        r = await self.http.post(self.action_url, data=payload, headers=self._headers_ajax(), timeout=60)
        nv = extrair_viewstate(r.text)
        if nv:
            self.viewstate = nv
        return r.text

    async def paginar(self, first: int) -> str:
        widget = "formViagens:dataTableServidores"
        payload = self._payload_base()
        payload["javax.faces.source"] = widget
        payload["javax.faces.partial.execute"] = widget
        payload["javax.faces.partial.render"] = widget
        payload[f"{widget}_pagination"] = "true"
        payload[f"{widget}_first"] = str(first)
        payload[f"{widget}_rows"] = str(ROWS_PER_PAGE)
        payload[f"{widget}_encodeFeature"] = "true"
        r = await self.http.post(self.action_url, data=payload, headers=self._headers_ajax(), timeout=60)
        nv = extrair_viewstate(r.text)
        if nv:
            self.viewstate = nv
        return r.text


async def get_tenant_id(conn) -> str:
    row = await conn.fetchrow("SELECT id FROM tenants WHERE slug=$1", TENANT_SLUG)
    if not row:
        sys.exit(f"Tenant '{TENANT_SLUG}' não cadastrado.")
    return str(row["id"])


def _chave_unica(linha: dict, ano: int, mes: str) -> str:
    """Hash determinístico por (nome, instituicao, ano, mes) — uma viagem
    individual = uma row, mas sem campo único óbvio então usamos hash."""
    payload = f"{linha['nome']}|{linha['instituicao']}|{ano}|{mes}"
    h = hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]
    return f"viag/{ano}-{mes[:3]}/{h}"


async def upsert_viagem(conn, tenant_id: str, linha: dict, ano: int, mes: str) -> str:
    numero = _chave_unica(linha, ano, mes)
    titulo = f"{linha['nome']} — {linha['instituicao']}"[:1000]
    mes_idx = MESES.index(mes) + 1 if mes in MESES else 1
    data_pub = date(ano, mes_idx, 1)
    existing = await conn.fetchrow(
        "SELECT id FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo=$3",
        tenant_id, numero, TIPO,
    )
    if existing:
        return f"SKIP {numero[-20:]}"
    ato_id = uuid.uuid4()
    await conn.execute(
        """INSERT INTO atos (id, tenant_id, numero, tipo, titulo, ementa,
            data_publicacao, pdf_baixado, processado, fonte_sistema)
           VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, FALSE, $8)""",
        ato_id, tenant_id, numero, TIPO, titulo, titulo, data_pub, FONTE,
    )
    await conn.execute(
        "INSERT INTO atos_metadata (ato_id, dados) VALUES ($1, $2::jsonb)",
        ato_id, json.dumps({"nome": linha["nome"], "instituicao": linha["instituicao"],
                            "ano": ano, "mes": mes}, ensure_ascii=False),
    )
    return f"META {numero[-20:]}"


async def coletar_mes(ano: int, mes: str, max_paginas: int = 0) -> None:
    print(f"\n{'='*72}")
    print(f"  Viagens — {ano}/{mes}")
    print(f"{'='*72}")
    headers = {"User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9"}
    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=60) as http:
        sess = PFViagens(http)
        await sess.init()
        body = await sess.pesquisar(ano, mes)
        total = extrair_total(body)
        if total == 0:
            print(f"  total=0 (sem viagens nesse mês)")
            return
        print(f"  total: {total} viagens")
        # primeira página
        linhas = parse_linhas(body)
        if not linhas:
            body = await sess.paginar(0)
            linhas = parse_linhas(body)
        conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
        tenant_id = await get_tenant_id(conn)
        try:
            ok = err = skip = 0
            pagina = 1
            while True:
                if max_paginas and pagina > max_paginas:
                    print(f"  → atingiu --max-paginas={max_paginas}")
                    break
                for linha in linhas:
                    try:
                        msg = await upsert_viagem(conn, tenant_id, linha, ano, mes)
                    except Exception as exc:
                        msg = f"✗ ERR {exc!s:.80}"
                    tag = msg[:4].strip()
                    if   tag == "META": ok += 1
                    elif tag == "SKIP": skip += 1
                    else:               err += 1
                if pagina % 20 == 1 or (pagina * ROWS_PER_PAGE >= total):
                    print(f"    pág {pagina} — META={ok} SKIP={skip} ERR={err}", flush=True)
                next_first = pagina * ROWS_PER_PAGE
                if next_first >= total:
                    print(f"  → fim do mês ({total} cobertos)")
                    break
                try:
                    body = await sess.paginar(next_first)
                    linhas = parse_linhas(body)
                    if not linhas:
                        print(f"  → resposta vazia na pág {pagina+1}, parando")
                        break
                    pagina += 1
                    await asyncio.sleep(RATE_LIMIT_PAGE)
                except Exception as exc:
                    print(f"  paginate falhou: {exc!s:.100}")
                    break
            print(f"\n  ══ {ano}/{mes} TOTAL: META={ok} SKIP={skip} ERR={err} ══")
        finally:
            await conn.close()


async def main(args) -> None:
    if args.ano and args.mes:
        await coletar_mes(args.ano, args.mes.upper(), args.max_paginas)
    elif args.ano:
        for mes in MESES:
            await coletar_mes(args.ano, mes, args.max_paginas)
    else:
        sys.exit("use --ano AAAA [--mes MES]")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--ano", type=int, required=True)
    p.add_argument("--mes", type=str, help="JANEIRO..DEZEMBRO (default: todos do ano)")
    p.add_argument("--max-paginas", type=int, default=0)
    p.add_argument("--metadata-only", action="store_true",
                   help="(sempre é metadata-only — flag aceita por compatibilidade)")
    asyncio.run(main(p.parse_args()))
