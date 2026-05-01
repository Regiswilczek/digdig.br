#!/usr/bin/env python3
"""
scrape_pte_export.py — baixa dumps via subdomínio dedicado
`transparencia.download.pr.gov.br/exportacao/{TIPO}/{TIPO}-{ANO}.zip`.

Caminho dourado descoberto em 2026-05-01: o portal expõe URLs REST simples
sem autenticação, sem windowId, sem ViewState. Cada tipo entrega CSVs
descompactados com TODOS os registros do ano.

Tipos confirmados (ano disponível):
- CONVENIOS    2010-2026
- CONTRATOS    2010-2026
- LICITACOES   2010-2026
- RECEITAS     2002-2024 (drásticamente reduzido após 2020)
- DESPESAS     2002-2024 (idem)
- VIAGENS      2012-2026

Uso:
    python scripts/scrape_pte_export.py --tipo VIAGENS --todos
    python scripts/scrape_pte_export.py --tipo LICITACOES --ano 2024
    python scripts/scrape_pte_export.py --todos-tipos --todos
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
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
import httpx


BASE = "https://www.transparencia.download.pr.gov.br/exportacao"
TENANT_SLUG = "gov-pr"
DATA_DIR = Path(os.environ.get("PTE_BD_DIR", "/opt/digdig/data/pte_bd"))

DATABASE_URL = os.environ.get("DATABASE_URL", "")
ASYNCPG_URL = (
    DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace(":5432/", ":6543/")
)

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0"


# Range de anos por tipo (descoberto via probe HEAD)
# Modos:
#   - "anual": URL `/{TIPO}/{TIPO}-{ano}.zip` por ano
#   - "snapshot": URL `/{TIPO}/{TIPO}.zip` arquivo único (snapshot atual)
#   - "mensal": URL `/{TIPO}/{TIPO}-{ano}-{mm}.zip` por ano-mês (REMUNERACAO)
TIPOS: dict[str, dict] = {
    # === Anuais ===
    "CONVENIOS":   {"modo": "anual", "anos": list(range(2007, 2027)), "ato_tipo": "dump_convenio_anual",   "fonte_sistema": "pte_export_convenios"},
    "CONTRATOS":   {"modo": "anual", "anos": list(range(2007, 2027)), "ato_tipo": "dump_contrato_anual",   "fonte_sistema": "pte_export_contratos"},
    "LICITACOES":  {"modo": "anual", "anos": list(range(2007, 2027)), "ato_tipo": "dump_licitacao_anual",  "fonte_sistema": "pte_export_licitacoes"},
    "RECEITAS":    {"modo": "anual", "anos": list(range(2002, 2025)), "ato_tipo": "dump_receita_anual",    "fonte_sistema": "pte_export_receitas"},
    "DESPESAS":    {"modo": "anual", "anos": list(range(2002, 2025)), "ato_tipo": "dump_despesa_anual",    "fonte_sistema": "pte_export_despesas"},
    "VIAGENS":     {"modo": "anual", "anos": list(range(2012, 2027)), "ato_tipo": "dump_viagem_anual",     "fonte_sistema": "pte_export_viagens"},

    # === Snapshots (sem ano — arquivo único atualizado periodicamente) ===
    "REMUNERACAO_RH":     {"modo": "snapshot", "ato_tipo": "dump_remuneracao_funcional", "fonte_sistema": "pte_export_remuneracao_rh"},
    "RELACAO_SERVIDORES": {"modo": "snapshot", "ato_tipo": "dump_servidores_relacao",    "fonte_sistema": "pte_export_relacao_servidores"},
    "FORNECEDORES":       {"modo": "snapshot", "ato_tipo": "dump_fornecedores_geral",    "fonte_sistema": "pte_export_fornecedores"},
    "ESTOQUE_SUPRIMENTOS":{"modo": "snapshot", "ato_tipo": "dump_estoque_suprimentos",   "fonte_sistema": "pte_export_estoque"},
    "PRECOS_REGISTRADOS": {"modo": "snapshot", "ato_tipo": "dump_precos_registrados",    "fonte_sistema": "pte_export_precos"},
    "CATALOGO_ITENS":     {"modo": "snapshot", "ato_tipo": "dump_catalogo_itens",        "fonte_sistema": "pte_export_catalogo"},

    # === Mensais (REMUNERACAO financeira: 12 arquivos/ano × 14 anos = 168 arquivos) ===
    "REMUNERACAO":        {"modo": "mensal",   "anos": list(range(2012, 2027)), "ato_tipo": "dump_remuneracao_financeira", "fonte_sistema": "pte_export_remuneracao"},

    # === Anuais com underline ===
    "DISPENSAS_INEXIGIBILIDADE":       {"modo": "anual", "anos": list(range(2016, 2027)), "ato_tipo": "dump_dispensa_anual",      "fonte_sistema": "pte_export_dispensas"},
    "DISPENSAS_INEXIGIBILIDADE_COVID": {"modo": "anual_csv", "anos": [2020, 2021],         "ato_tipo": "dump_dispensa_covid",      "fonte_sistema": "pte_export_dispensas_covid"},
    "DESPESA_CREDOR":                  {"modo": "anual", "anos": list(range(2002, 2019)), "ato_tipo": "dump_despesa_credor",      "fonte_sistema": "pte_export_despesa_credor"},
    "DESPESA_RP":                      {"modo": "anual", "anos": list(range(2002, 2019)), "ato_tipo": "dump_despesa_rp",          "fonte_sistema": "pte_export_despesa_rp"},
}

RATE = 2.0  # segundos entre downloads


def _path(tipo: str, ano: int | None = None, mes: int | None = None) -> Path:
    p = DATA_DIR / f"export_{tipo.lower()}"
    p.mkdir(parents=True, exist_ok=True)
    if ano is None:
        return p / "snapshot.zip"
    if mes is None:
        return p / f"{ano}.zip"
    return p / f"{ano}-{mes:02d}.zip"


def _build_url(tipo: str, ano: int | None = None, mes: int | None = None,
               sufixo: str = "") -> str:
    if ano is None:  # snapshot
        return f"{BASE}/{tipo}/{tipo}.zip"
    if mes is None:  # anual (com sufixo opcional, ex: _CSV)
        return f"{BASE}/{tipo}/{tipo}-{ano}{sufixo}.zip"
    return f"{BASE}/{tipo}/{tipo}-{ano}-{mes:02d}{sufixo}.zip"


def _label(tipo: str, ano: int | None, mes: int | None) -> str:
    if ano is None:
        return f"{tipo}/snapshot"
    if mes is None:
        return f"{tipo}/{ano}"
    return f"{tipo}/{ano}-{mes:02d}"


async def get_tenant_id(conn) -> str:
    row = await conn.fetchrow("SELECT id FROM tenants WHERE slug=$1", TENANT_SLUG)
    if not row:
        sys.exit(f"Tenant '{TENANT_SLUG}' não cadastrado.")
    return str(row["id"])


async def upsert_dump(conn, tenant_id: str, tipo: str, cfg: dict,
                      ano: int | None, mes: int | None,
                      arquivo: Path, sha: str, size: int) -> str:
    if ano is None:
        numero = f"{tipo.lower()}/snapshot"
        titulo = f"Dump {tipo} (snapshot atual)"
        data_pub = date.today()
    elif mes is None:
        numero = f"{tipo.lower()}/{ano}"
        titulo = f"Dump {tipo} {ano} (PTE export)"
        data_pub = date(ano, 1, 1)
    else:
        numero = f"{tipo.lower()}/{ano}-{mes:02d}"
        titulo = f"Dump {tipo} {ano}-{mes:02d} (PTE export)"
        data_pub = date(ano, mes, 1)
    url_origem = _build_url(tipo, ano, mes)
    existing = await conn.fetchrow(
        "SELECT id FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo=$3",
        tenant_id, numero, cfg["ato_tipo"],
    )
    if existing:
        await conn.execute(
            "UPDATE atos SET pdf_baixado=TRUE, pdf_tamanho_bytes=$1, pdf_path=$2 WHERE id=$3",
            size, str(arquivo), existing["id"],
        )
        return f"REPLACE {numero}"
    ato_id = uuid.uuid4()
    await conn.execute(
        """INSERT INTO atos (id, tenant_id, numero, tipo, titulo, ementa,
            data_publicacao, url_original, pdf_baixado, pdf_path, pdf_tamanho_bytes,
            processado, fonte_sistema)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, FALSE, $11)""",
        ato_id, tenant_id, numero, cfg["ato_tipo"], titulo, titulo, data_pub,
        url_origem, str(arquivo), size, cfg["fonte_sistema"],
    )
    payload = {"tipo": tipo, "ano": ano, "mes": mes, "sha256": sha, "size_bytes": size,
               "arquivo": str(arquivo), "url_origem": url_origem}
    await conn.execute(
        "INSERT INTO atos_metadata (ato_id, dados) VALUES ($1, $2::jsonb)",
        ato_id, json.dumps(payload, ensure_ascii=False, default=str),
    )
    return f"OK {numero}"


async def baixar_um(http: httpx.AsyncClient, conn, tenant_id: str,
                    tipo: str, cfg: dict, ano: int | None, mes: int | None = None) -> str:
    arq = _path(tipo, ano, mes)
    label = _label(tipo, ano, mes)
    if arq.exists() and arq.stat().st_size > 1000:
        return f"  [skip] {label} já existe ({arq.stat().st_size:,}b)"
    sufixo = "_CSV" if cfg.get("modo") == "anual_csv" else ""
    url = _build_url(tipo, ano, mes, sufixo)
    last_err = ""
    for tentativa in range(3):
        try:
            r = await http.get(url, timeout=300)
            if r.status_code != 200:
                last_err = f"HTTP {r.status_code}"
                continue
            if r.content[:2] != b"PK":
                return f"  ✗ {label} não é ZIP (ct={r.headers.get('content-type')})"
            arq.write_bytes(r.content)
            sha = hashlib.sha256(r.content).hexdigest()
            msg = await upsert_dump(conn, tenant_id, tipo, cfg, ano, mes, arq, sha, len(r.content))
            return f"  ✓ {label} {len(r.content):,}b sha={sha[:12]} {msg}{(' (try ' + str(tentativa+1) + ')') if tentativa else ''}"
        except Exception as exc:
            last_err = str(exc)[:120]
            await asyncio.sleep(3 * (tentativa + 1))
    return f"  ✗ {label} ERR após 3 tentativas: {last_err}"


async def coletar(tipos: list[str], anos_filter: list[int] | None) -> None:
    print(f"\n{'='*72}")
    print(f"  PTE Export — tipos={tipos} anos={anos_filter or 'todos do range'}")
    print(f"{'='*72}\n")
    headers = {"User-Agent": UA, "Accept": "application/zip,*/*"}
    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=600) as http:
        conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
        tenant_id = await get_tenant_id(conn)
        try:
            ok = err = skip = 0
            for tipo in tipos:
                if tipo not in TIPOS:
                    print(f"  ⚠ tipo desconhecido: {tipo}")
                    continue
                cfg = TIPOS[tipo]
                modo = cfg.get("modo", "anual")

                # Snapshot — 1 arquivo único, sem ano
                if modo == "snapshot":
                    print(f"\n══ {tipo} (snapshot) ══")
                    msg = await baixar_um(http, conn, tenant_id, tipo, cfg, None, None)
                    print(msg, flush=True)
                    if "✓" in msg:      ok += 1
                    elif "skip" in msg: skip += 1
                    else:               err += 1
                    await asyncio.sleep(RATE)
                    continue

                anos = [a for a in cfg["anos"] if anos_filter is None or a in anos_filter]

                # Mensal — itera 12 meses por ano
                if modo == "mensal":
                    print(f"\n══ {tipo} (mensal) — {len(anos)} anos × 12 meses ══")
                    for ano in anos:
                        for mes in range(1, 13):
                            # pular meses futuros
                            today = date.today()
                            if (ano, mes) > (today.year, today.month):
                                continue
                            msg = await baixar_um(http, conn, tenant_id, tipo, cfg, ano, mes)
                            print(msg, flush=True)
                            if "✓" in msg:      ok += 1
                            elif "skip" in msg: skip += 1
                            else:               err += 1
                            await asyncio.sleep(RATE)
                    continue

                # Anual / anual_csv (modo default)
                print(f"\n══ {tipo} — {len(anos)} anos {('(_CSV)' if modo == 'anual_csv' else '')} ══")
                for ano in anos:
                    msg = await baixar_um(http, conn, tenant_id, tipo, cfg, ano)
                    print(msg, flush=True)
                    if "✓" in msg:      ok += 1
                    elif "skip" in msg: skip += 1
                    else:               err += 1
                    await asyncio.sleep(RATE)
            print(f"\n══ TOTAL: OK={ok} SKIP={skip} ERR={err} ══")
        finally:
            await conn.close()


async def main(args):
    if args.todos_tipos:
        tipos = list(TIPOS.keys())
    elif args.tipo:
        tipos = [args.tipo.upper()]
    else:
        sys.exit("use --tipo X ou --todos-tipos")
    if args.todos:
        anos = None
    elif args.ano:
        anos = [args.ano]
    elif args.anos:
        import re
        m = re.match(r"(\d{4})-(\d{4})", args.anos)
        if not m:
            sys.exit("--anos AAAA-AAAA")
        anos = list(range(int(m.group(1)), int(m.group(2)) + 1))
    else:
        anos = None  # default: todos do range
    await coletar(tipos, anos)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--tipo", help=f"um de: {list(TIPOS.keys())}")
    p.add_argument("--todos-tipos", action="store_true", help="todos os tipos conhecidos")
    p.add_argument("--ano", type=int)
    p.add_argument("--anos", type=str, help="AAAA-AAAA")
    p.add_argument("--todos", action="store_true", help="todos anos do range")
    asyncio.run(main(p.parse_args()))
