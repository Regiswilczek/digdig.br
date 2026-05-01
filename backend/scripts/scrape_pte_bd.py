#!/usr/bin/env python3
"""
scrape_pte_bd.py — baixa o "Download do Banco de Dados" de sub-itens do PTE
que oferecem dump mensal/anual completo via PrimeFaces dialog.

Diferente de scrape_pte.py (que paginava DataTables), este script:
  1. Faz a "AJAX dance" pra abrir o modal e setar filtros
  2. Submit não-AJAX → o servidor retorna ZIP/CSV direto
  3. Salva o arquivo em filesystem + cria 1 row em `atos`

Casos cobertos:
  - Remuneração (mensal, 2012-2026)        — formRemuneracoes / dataTableServidores
  - Viagens / Diárias (mensal, ?-2026)     — formViagens / dataTableServidores
  - Servidores (?)                          — TBD
  - Convênios CSV (anual)                  — formConvenios   — TBD

Cada arquivo baixado representa um "ato" no inventário, do tipo `dump_<categoria>_<periodicidade>`.

Uso:
    # smoke 1 mês
    python scripts/scrape_pte_bd.py remuneracao --ano 2024 --mes 4

    # ano completo
    python scripts/scrape_pte_bd.py remuneracao --ano 2024

    # universo completo
    python scripts/scrape_pte_bd.py remuneracao --todos

    # listar sem baixar
    python scripts/scrape_pte_bd.py remuneracao --todos --dry-run
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


PTE_BASE = "https://www.transparencia.pr.gov.br"
TENANT_SLUG = "gov-pr"

DATA_DIR = Path(os.environ.get("PTE_BD_DIR", "/opt/digdig/data/pte_bd"))

DATABASE_URL = os.environ.get("DATABASE_URL", "")
ASYNCPG_URL = (
    DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace(":5432/", ":6543/")
)

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0"

RATE_LIMIT_BETWEEN = 4.0  # segundos entre downloads (educado com o portal)


# ── Registry de endpoints com Download do BD ────────────────────────────────

PTE_BD: dict[str, dict[str, Any]] = {
    # fluxo: "dialog"  → AJAX dance (abre modal, change ano/mes, submit)
    #        "direto"  → submit direto do form principal com filtros + btn
    # filtros: dict com nomes dos inputs e como mapear ano/mes
    "remuneracao": {
        "url": f"{PTE_BASE}/pte/pessoal/servidores/poderexecutivo/remuneracao",
        "fluxo": "dialog",
        "form_outer": "formRemuneracoes",
        "form_dialog": "formDialogDownloadBancoDados",
        "btn_open": "formRemuneracoes:lnkDownloadBD",
        "btn_submit": "formDialogDownloadBancoDados:lnkDownloadBD",
        "filtro_ano_input": "formDialogDownloadBancoDados:filtroAno_input",
        "filtro_mes_inputs": ["formDialogDownloadBancoDados:filtroMes_input"],
        "anos": list(range(2012, 2027)),
        "periodicidade": "mensal",
        "ato_tipo": "dump_remuneracao_mensal",
        "fonte_sistema": "pte_remuneracao_bd",
    },
    "viagens": {
        "url": f"{PTE_BASE}/pte/pessoal/viagens",
        "fluxo": "direto",
        "form_outer": "formViagens",
        "btn_submit": "formViagens:lnkDownloadBD",
        "filtro_ano_input": "formViagens:filtroAno_input",
        "filtro_mes_inputs": [
            "formViagens:filtroMesInicio_input",
            "formViagens:filtroMesTermino_input",
        ],
        "anos": list(range(2012, 2027)),
        "periodicidade": "mensal",
        "ato_tipo": "dump_viagens_mensal",
        "fonte_sistema": "pte_viagens_bd",
        "_obs": "BLOQUEADO: dropdown de ano vem vazio (lazy load JS), servidor exige ano",
    },
    "consultacredor": {
        "url": f"{PTE_BASE}/pte/despesas/consultacredor",
        "fluxo": "direto",
        "form_outer": "formPesquisa",
        "btn_submit": "formPesquisa:lnkDownloadBD",
        "filtro_ano_input": "formPesquisa:filtroAno_input",
        "filtro_mes_inputs": [],
        "anos": list(range(2002, 2024)),  # 2002-2023
        "periodicidade": "anual",
        "ato_tipo": "dump_despesa_credor_anual",
        "fonte_sistema": "pte_consultacredor_bd",
    },
}


# ── HTTP helpers ────────────────────────────────────────────────────────────

def extrair_viewstate_xml(body: str) -> Optional[str]:
    m = re.search(r'<update id="javax\.faces\.ViewState[^"]*"><!\[CDATA\[([^\]]+)', body)
    return m.group(1).strip() if m else None


def extrair_viewstate_html(body: str) -> Optional[str]:
    m = re.search(r'name="javax\.faces\.ViewState"[^>]+value="([^"]+)"', body)
    return m.group(1) if m else None


async def baixar_dump(http: httpx.AsyncClient, cfg: dict, ano: int, mes: Optional[int]) -> bytes:
    """Dispatcher por fluxo."""
    if cfg["fluxo"] == "dialog":
        return await _baixar_via_dialog(http, cfg, ano, mes)
    if cfg["fluxo"] == "direto":
        return await _baixar_direto(http, cfg, ano, mes)
    raise RuntimeError(f"fluxo desconhecido: {cfg['fluxo']}")


def _validar_arquivo(content: bytes, ct: str) -> bytes:
    if "html" in ct.lower() and "zip" not in ct.lower() and "octet" not in ct.lower() and "csv" not in ct.lower():
        raise RuntimeError(f"esperava arquivo, recebeu {ct} (len={len(content)})")
    return content


def _form_focus(name: str) -> str:
    return name.replace("_input", "_focus")


def _widget_id(input_name: str) -> str:
    return input_name.rsplit("_", 1)[0]


async def _baixar_via_dialog(http: httpx.AsyncClient, cfg: dict, ano: int,
                              mes: Optional[int]) -> bytes:
    """4 passos: GET → AJAX abrir modal → AJAX onchange mês → AJAX onchange ano → POST final."""
    H_AJAX = {
        "Faces-Request": "partial/ajax",
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Origin": PTE_BASE,
        "Referer": cfg["url"],
    }
    H_FORM = {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Origin": PTE_BASE,
        "Referer": cfg["url"],
    }
    r = await http.get(cfg["url"], timeout=60)
    body = r.text
    action_match = re.search(
        rf'<form[^>]+id="{re.escape(cfg["form_dialog"])}"[^>]+action="([^"]+)"', body
    )
    if not action_match:
        raise RuntimeError(f"action de {cfg['form_dialog']} não encontrado")
    action_url = PTE_BASE + action_match.group(1)
    vs = extrair_viewstate_html(body)
    if not vs:
        raise RuntimeError("ViewState não encontrado")

    fmes = cfg["filtro_mes_inputs"][0]  # dialog tem só 1
    fano = cfg["filtro_ano_input"]

    p1 = {
        "javax.faces.partial.ajax": "true",
        "javax.faces.source": cfg["btn_open"],
        "javax.faces.partial.execute": cfg["btn_open"],
        "javax.faces.partial.render": "",
        cfg["btn_open"]: cfg["btn_open"],
        cfg["form_outer"]: cfg["form_outer"],
        "javax.faces.ViewState": vs,
    }
    r1 = await http.post(action_url, data=p1, headers=H_AJAX, timeout=30)
    nv = extrair_viewstate_xml(r1.text)
    if nv: vs = nv

    if mes is not None:
        p2 = {
            "javax.faces.partial.ajax": "true",
            "javax.faces.source": _widget_id(fmes),
            "javax.faces.partial.execute": _widget_id(fmes),
            "javax.faces.partial.render": cfg["form_dialog"],
            "javax.faces.behavior.event": "change",
            "javax.faces.partial.event": "change",
            cfg["form_dialog"]: cfg["form_dialog"],
            fmes: str(mes),
            _form_focus(fmes): "",
            fano: "",
            _form_focus(fano): "",
            "javax.faces.ViewState": vs,
        }
        r2 = await http.post(action_url, data=p2, headers=H_AJAX, timeout=30)
        nv = extrair_viewstate_xml(r2.text)
        if nv: vs = nv

    p3 = {
        "javax.faces.partial.ajax": "true",
        "javax.faces.source": _widget_id(fano),
        "javax.faces.partial.execute": _widget_id(fano),
        "javax.faces.partial.render": cfg["form_dialog"],
        "javax.faces.behavior.event": "change",
        "javax.faces.partial.event": "change",
        cfg["form_dialog"]: cfg["form_dialog"],
        fmes: str(mes) if mes is not None else "",
        _form_focus(fmes): "",
        fano: str(ano),
        _form_focus(fano): "",
        "javax.faces.ViewState": vs,
    }
    r3 = await http.post(action_url, data=p3, headers=H_AJAX, timeout=30)
    nv = extrair_viewstate_xml(r3.text)
    if nv: vs = nv

    p4 = {
        cfg["form_dialog"]: cfg["form_dialog"],
        fmes: str(mes) if mes is not None else "",
        _form_focus(fmes): "",
        fano: str(ano),
        _form_focus(fano): "",
        cfg["btn_submit"]: cfg["btn_submit"],
        "javax.faces.ViewState": vs,
    }
    r4 = await http.post(action_url, data=p4, headers=H_FORM, timeout=600)
    if r4.status_code != 200:
        raise RuntimeError(f"submit retornou {r4.status_code}")
    return _validar_arquivo(r4.content, r4.headers.get("content-type", ""))


async def _baixar_direto(http: httpx.AsyncClient, cfg: dict, ano: int,
                          mes: Optional[int]) -> bytes:
    """Submit direto do form_outer com filtros + btn_submit. Sem AJAX dance."""
    H_FORM = {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Origin": PTE_BASE,
        "Referer": cfg["url"],
    }
    r = await http.get(cfg["url"], timeout=60)
    body = r.text
    action_match = re.search(
        rf'<form[^>]+id="{re.escape(cfg["form_outer"])}"[^>]+action="([^"]+)"', body
    )
    if not action_match:
        raise RuntimeError(f"action de {cfg['form_outer']} não encontrado")
    action_url = PTE_BASE + action_match.group(1)
    vs = extrair_viewstate_html(body)
    if not vs:
        raise RuntimeError("ViewState não encontrado")

    payload: dict[str, str] = {
        cfg["form_outer"]: cfg["form_outer"],
        cfg["filtro_ano_input"]: str(ano),
        _form_focus(cfg["filtro_ano_input"]): "",
        # IMPORTANTE: PrimeFaces espera o nome do botão com valor VAZIO,
        # não com o próprio name como valor (foi assim que o browser envia)
        cfg["btn_submit"]: "",
        "javax.faces.ViewState": vs,
    }
    # mes pode ser None (anual) ou int — neste caso replicado em todos os filtros de mês
    for fmes in cfg["filtro_mes_inputs"]:
        payload[fmes] = str(mes) if mes is not None else ""
        payload[_form_focus(fmes)] = ""
    # também precisa preencher os outros inputs do form com vazio (PrimeFaces exige)
    inputs_no_form = re.findall(
        rf'<(?:input|select)[^>]+name="({re.escape(cfg["form_outer"])}:[^"]+)"', body
    )
    for n in set(inputs_no_form):
        payload.setdefault(n, "")
    r2 = await http.post(action_url, data=payload, headers=H_FORM, timeout=600)
    if r2.status_code != 200:
        raise RuntimeError(f"submit retornou {r2.status_code}")
    return _validar_arquivo(r2.content, r2.headers.get("content-type", ""))


# ── Persistência ────────────────────────────────────────────────────────────

async def get_tenant_id(conn) -> str:
    row = await conn.fetchrow("SELECT id FROM tenants WHERE slug=$1", TENANT_SLUG)
    if not row:
        sys.exit(f"Tenant '{TENANT_SLUG}' não cadastrado.")
    return str(row["id"])


def _path_arquivo(slug: str, ano: int, mes: Optional[int]) -> Path:
    base = DATA_DIR / slug
    base.mkdir(parents=True, exist_ok=True)
    nome = f"{ano}-{mes:02d}" if mes is not None else str(ano)
    return base / f"{nome}.zip"


async def upsert_dump(conn, tenant_id: str, slug: str, cfg: dict,
                       ano: int, mes: Optional[int], arquivo: Path,
                       sha: str, size: int) -> str:
    rotulo = f"{ano}-{mes:02d}" if mes is not None else str(ano)
    numero = f"{slug}/{rotulo}"
    titulo = f"Dump {slug} {rotulo} (PTE BD)"
    data_pub = date(ano, mes or 1, 1)
    existing = await conn.fetchrow(
        "SELECT id FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo=$3",
        tenant_id, numero, cfg["ato_tipo"],
    )
    if existing:
        await conn.execute(
            "UPDATE atos SET pdf_baixado=TRUE, pdf_tamanho_bytes=$1 WHERE id=$2",
            size, existing["id"],
        )
        ato_id = existing["id"]
        return f"REPLACE {numero}"
    ato_id = uuid.uuid4()
    await conn.execute(
        """INSERT INTO atos (id, tenant_id, numero, tipo, titulo, ementa,
            data_publicacao, url_original, pdf_baixado, pdf_path, pdf_tamanho_bytes,
            processado, fonte_sistema)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, FALSE, $11)""",
        ato_id, tenant_id, numero, cfg["ato_tipo"], titulo, titulo, data_pub,
        cfg["url"], str(arquivo), size, cfg["fonte_sistema"],
    )
    payload = {
        "ano": ano,
        "mes": mes,
        "sha256": sha,
        "size_bytes": size,
        "arquivo": str(arquivo),
        "url_origem": cfg["url"],
    }
    await conn.execute(
        "INSERT INTO atos_metadata (ato_id, dados) VALUES ($1, $2::jsonb)",
        ato_id, json.dumps(payload, ensure_ascii=False),
    )
    return f"OK {numero}"


# ── Main ────────────────────────────────────────────────────────────────────

async def coletar(slug: str, ano_mes_list: list[tuple[int, Optional[int]]],
                  dry_run: bool) -> None:
    cfg = PTE_BD[slug]
    print(f"\n{'='*72}")
    print(f"  PTE BD — {slug} ({cfg['url']})")
    print(f"  arquivos: {len(ano_mes_list)} | data dir: {DATA_DIR / slug}")
    print(f"{'='*72}\n")

    if dry_run:
        for ano, mes in ano_mes_list:
            arq = _path_arquivo(slug, ano, mes)
            existe = "✓" if arq.exists() else "✗"
            print(f"  {existe} {arq}")
        print(f"\n[dry-run] {len(ano_mes_list)} arquivos planejados.")
        return

    headers = {"User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9"}
    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=600,
                                  cookies=httpx.Cookies()) as http:
        conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
        tenant_id = await get_tenant_id(conn)
        try:
            ok = err = skip = 0
            for ano, mes in ano_mes_list:
                arq = _path_arquivo(slug, ano, mes)
                rotulo = f"{ano}-{mes:02d}" if mes is not None else str(ano)
                if arq.exists() and arq.stat().st_size > 1000:
                    print(f"  [skip] {rotulo} já existe ({arq.stat().st_size:,}b)")
                    skip += 1
                    continue
                try:
                    print(f"  [{rotulo}] baixando...", flush=True)
                    blob = await baixar_dump(http, cfg, ano, mes)
                    if len(blob) < 1000:
                        # provavelmente vazio (mês sem dados) — registra mesmo assim
                        print(f"    suspeitamente pequeno: {len(blob)}b")
                    arq.write_bytes(blob)
                    sha = hashlib.sha256(blob).hexdigest()
                    msg = await upsert_dump(conn, tenant_id, slug, cfg, ano, mes,
                                             arq, sha, len(blob))
                    print(f"    ✓ {len(blob):,}b sha={sha[:12]} {msg}", flush=True)
                    ok += 1
                except Exception as exc:
                    print(f"    ✗ ERR {exc!s:.150}", flush=True)
                    err += 1
                await asyncio.sleep(RATE_LIMIT_BETWEEN)
            print(f"\n══ TOTAL: OK={ok} SKIP={skip} ERR={err} ══")
        finally:
            await conn.close()


def parse_args(args):
    cfg = PTE_BD.get(args.slug)
    if not cfg:
        sys.exit(f"slug desconhecido: {args.slug}. Disponíveis: {list(PTE_BD)}")

    if args.todos:
        anos = cfg["anos"]
    elif args.ano:
        anos = [args.ano]
    else:
        sys.exit("use --ano N ou --todos")

    meses: list[Optional[int]]
    if cfg["periodicidade"] == "mensal":
        if args.mes:
            meses = [args.mes]
        else:
            meses = list(range(1, 13))
    else:
        meses = [None]

    return cfg, anos, meses


async def main(args):
    cfg, anos, meses = parse_args(args)
    ano_mes_list = [(a, m) for a in anos for m in meses]
    # filtra meses do ano corrente que ainda não aconteceram
    today = date.today()
    ano_mes_list = [
        (a, m) for a, m in ano_mes_list
        if m is None or (a, m) <= (today.year, today.month)
    ]
    await coletar(args.slug, ano_mes_list, args.dry_run)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("slug", help=f"sub-item ({list(PTE_BD)})")
    p.add_argument("--ano", type=int)
    p.add_argument("--mes", type=int)
    p.add_argument("--todos", action="store_true")
    p.add_argument("--dry-run", action="store_true")
    asyncio.run(main(p.parse_args()))
