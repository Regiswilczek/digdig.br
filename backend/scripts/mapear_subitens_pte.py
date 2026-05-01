#!/usr/bin/env python3
"""
mapear_subitens_pte.py — abre cada sub-item do PTE no Playwright, faz pesquisa
default e captura: total de registros, estrutura de colunas, amostra de 3 linhas.

NÃO baixa o conteúdo completo. Objetivo: garantir que cada sub-item está
mapeado e conhecemos seu volume + estrutura antes de decidir auditar.

Para cada sub-item:
  1. Abre /pte/assunto/X/Y
  2. Espera render JS (~3s)
  3. Clica btnPesquisar (qualquer um visível)
  4. Captura totalRecords da datatable
  5. Captura cabeçalhos de coluna (TH)
  6. Captura amostra das primeiras 3 linhas
  7. Tenta capturar URL de download se houver botão
  8. Salva tudo em atos_metadata como "ato" do tipo `inventario_pte_subitem`
     (uma row por sub-item), pra ter rastreamento permanente.

Saída:
  docs/pte-subitens-mapeados.json — todos os achados estruturados
  banco: 1 row por sub-item em atos com tipo='inventario_pte_subitem'

Uso:
    python scripts/mapear_subitens_pte.py             # rodaa todos
    python scripts/mapear_subitens_pte.py --paths 6/18,8/119
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import uuid
from datetime import date
from pathlib import Path
from typing import Any

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import asyncpg
from playwright.async_api import async_playwright, Page

PROJECT_ROOT = ROOT.parent
DISCOVERY_JSON = PROJECT_ROOT / "docs" / "pte-discovery-playwright.json"
OUT_JSON = PROJECT_ROOT / "docs" / "pte-subitens-mapeados.json"

PTE_BASE = "https://www.transparencia.pr.gov.br/pte/assunto"
TENANT_SLUG = "gov-pr"
DOWNLOAD_HOST = "transparencia.download.pr.gov.br"

DATABASE_URL = os.environ.get("DATABASE_URL", "")
ASYNCPG_URL = (
    DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace(":5432/", ":6543/")
)


async def get_tenant_id(conn) -> str:
    row = await conn.fetchrow("SELECT id FROM tenants WHERE slug=$1", TENANT_SLUG)
    return str(row["id"]) if row else None


async def mapear(page: Page, path: str) -> dict:
    out: dict[str, Any] = {"path": path, "captured_urls": [], "errors": []}
    captured_urls: list[str] = []

    def on_request(req):
        if DOWNLOAD_HOST in req.url and "/exportacao/" in req.url:
            captured_urls.append(req.url)
    page.on("request", on_request)

    try:
        await page.goto(f"{PTE_BASE}/{path}", wait_until="networkidle", timeout=45000)
        await asyncio.sleep(3)
    except Exception as exc:
        out["errors"].append(f"goto: {exc!s:.150}")
        return out

    # 1. Capturar metadados básicos da página
    page_info = await page.evaluate("""() => ({
        title: document.title,
        h1: document.querySelector('h1')?.innerText?.trim() || null,
        h2: document.querySelector('h2')?.innerText?.trim() || null,
        forms: Array.from(document.querySelectorAll('form[id]')).map(f => f.id),
        iframes: Array.from(document.querySelectorAll('iframe')).map(i => i.src).filter(Boolean),
    })""")
    out.update(page_info)

    # 2. Tentar clicar btnPesquisar via JS (mais robusto que locator com :has-text)
    pesquisar_clicado = False
    try:
        btn_id = await page.evaluate("""() => {
            const btns = document.querySelectorAll('button');
            for (const b of btns) {
                if (b.id && b.id.endsWith('btnPesquisar')) return b.id;
                const txt = (b.innerText || '').toUpperCase();
                if (txt === 'PESQUISAR' && b.id) return b.id;
            }
            return null;
        }""")
        if btn_id:
            await page.click(f"#{btn_id.replace(':', '\\:')}", timeout=5000)
            await asyncio.sleep(4)
            pesquisar_clicado = True
    except Exception as exc:
        out["errors"].append(f"pesquisar: {exc!s:.100}")
    out["pesquisar_clicado"] = pesquisar_clicado

    # 3. Capturar estrutura da datatable
    datatable_info = await page.evaluate("""() => {
        const out = {datatables: [], colunas: [], amostra: []};
        // datatables
        document.querySelectorAll('.ui-datatable').forEach(dt => {
            out.datatables.push(dt.id);
        });
        // colunas (TH com role columnheader)
        document.querySelectorAll('th[role="columnheader"]').forEach(th => {
            const txt = th.innerText.trim();
            if (txt) out.colunas.push(txt.slice(0, 60));
        });
        // amostra: primeiras 3 trs com dados
        const trs = document.querySelectorAll('tr[role="row"], tr.ui-widget-content');
        Array.from(trs).slice(0, 3).forEach(tr => {
            const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim().slice(0, 60));
            if (tds.length > 0 && tds.some(t => t)) out.amostra.push(tds);
        });
        // total records (PrimeFaces aria-rowcount, ou paginator-current text)
        let total = null;
        const dt = document.querySelector('.ui-datatable[aria-rowcount]');
        if (dt) total = parseInt(dt.getAttribute('aria-rowcount')) || null;
        if (!total) {
            const counter = document.querySelector('.ui-paginator-current');
            if (counter) {
                const m = counter.innerText.match(/de\\s+(\\d+)|de\\s+([\\d.]+)/);
                if (m) total = parseInt((m[1] || m[2]).replace(/\\./g, ''));
            }
        }
        out.total_records = total;
        return out;
    }""")
    out.update(datatable_info)

    # 4. Botão de download — itera todos os elementos com id terminando em "lnkDownloadBD"
    try:
        btn_download = await page.evaluate("""() => {
            const out = [];
            const all = document.querySelectorAll('[id]');
            all.forEach(el => {
                if (el.id && el.id.endsWith('lnkDownloadBD')) out.push(el.id);
            });
            document.querySelectorAll('button').forEach(b => {
                const txt = (b.innerText || '').toUpperCase();
                if (txt.includes('DOWNLOAD') && b.id && !out.includes(b.id)) {
                    out.push(b.id);
                }
            });
            return out;
        }""")
    except Exception as exc:
        btn_download = []
        out["errors"].append(f"btn_eval: {exc!s:.100}")
    out["botao_download"] = btn_download

    # 5. Tentar capturar URL de download (clica primeiro botão lnkDownloadBD encontrado)
    if btn_download:
        first_btn = btn_download[0]
        sel = f"#{first_btn.replace(':', '\\:')}"
        try:
            async with page.expect_download(timeout=10000) as dl_info:
                await page.click(sel, timeout=5000)
            d = await dl_info.value
            out["download_url"] = d.url
            try: await d.cancel()
            except: pass
        except Exception:
            pass  # captured_urls pode ter pegado mesmo assim

    out["captured_urls"] = sorted(set(captured_urls))
    return out


async def upsert_inventario_subitem(conn, tenant_id: str, item: dict) -> str:
    """Salva 1 row em atos pra cada sub-item mapeado, com tudo em atos_metadata."""
    path = item["path"]
    numero = f"subitem/{path}"
    titulo = (item.get("h1") or item.get("h2") or item.get("title") or path)[:200]
    titulo = titulo.split("\n")[0]
    ementa = f"Sub-item PTE {path} — {titulo[:100]}"
    if item.get("total_records"):
        ementa += f" ({item['total_records']:,} registros)"
    existing = await conn.fetchrow(
        "SELECT id FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo=$3",
        tenant_id, numero, "inventario_pte_subitem",
    )
    if existing:
        ato_id = existing["id"]
        await conn.execute(
            "UPDATE atos SET titulo=$1, ementa=$2 WHERE id=$3",
            titulo, ementa, ato_id,
        )
        # update metadata
        await conn.execute(
            """INSERT INTO atos_metadata (ato_id, dados) VALUES ($1, $2::jsonb)
               ON CONFLICT (ato_id) DO UPDATE SET dados=$2::jsonb, coletado_em=now()""",
            ato_id, json.dumps(item, ensure_ascii=False, default=str),
        )
        return f"REPLACE {path}"
    ato_id = uuid.uuid4()
    await conn.execute(
        """INSERT INTO atos (id, tenant_id, numero, tipo, titulo, ementa,
            data_publicacao, url_original, pdf_baixado, processado, fonte_sistema)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, FALSE, $9)""",
        ato_id, tenant_id, numero, "inventario_pte_subitem", titulo, ementa,
        date.today(), f"{PTE_BASE}/{path}", "pte_inventario",
    )
    await conn.execute(
        "INSERT INTO atos_metadata (ato_id, dados) VALUES ($1, $2::jsonb)",
        ato_id, json.dumps(item, ensure_ascii=False, default=str),
    )
    return f"OK {path}"


# Sub-itens prioritários a mapear (dos 110 não cobertos pelo /exportacao/)
PRIORITARIOS = [
    # Pessoal
    "6/18", "6/34", "6/35", "6/45", "6/207", "6/308", "6/271",
    # Info Gerais
    "8/17", "8/119", "8/121", "8/130", "8/177", "8/211", "8/259",
    "8/295", "8/300", "8/302", "8/303", "8/306", "8/307", "8/317",
    "8/321", "8/322", "8/323",
    # Obras
    "11/61", "11/208", "11/209", "11/305", "11/311", "11/320",
    # Justiça Fiscal
    "12/222", "12/290", "12/313", "12/314",
    # Despesas (faltantes)
    "4/30", "4/96", "4/99", "4/101", "4/102", "4/104", "4/254",
    "4/255", "4/256", "4/284", "4/287", "4/288", "4/324", "4/325",
    "4/50", "4/100", "4/191",
    # Receitas (faltantes)
    "3/3", "3/57", "3/27", "3/242", "3/243", "3/247", "3/248",
    "3/250", "3/251", "3/253", "3/261", "3/262", "3/265", "3/266",
    "3/267", "3/285", "3/289", "3/298", "3/299", "3/304", "3/309",
    "3/310", "3/316",
    # Compras (faltantes)
    "5/212", "5/215", "5/318",
    # Planejamento
    "2/25", "2/62", "2/63", "2/64", "2/67", "2/68", "2/69", "2/70",
    "2/214", "2/268", "2/282", "2/326", "2/327",
    # LRF
    "7/36", "7/53", "7/54", "7/257", "7/258",
    # Temática
    "10/48", "10/56", "10/140", "10/192", "10/315", "10/319",
]


async def main(args):
    paths = args.paths.split(",") if args.paths else PRIORITARIOS
    print(f"Mapeando {len(paths)} sub-itens...")

    results: list[dict] = []
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
        tenant_id = await get_tenant_id(conn)
        try:
            # Recria context a cada CHUNK_SIZE pra evitar contaminação JS entre páginas
            CHUNK_SIZE = 8
            for chunk_start in range(0, len(paths), CHUNK_SIZE):
                chunk = paths[chunk_start:chunk_start + CHUNK_SIZE]
                ctx = await b.new_context(
                    user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0",
                    accept_downloads=True,
                )
                try:
                    for i, path in enumerate(chunk, chunk_start + 1):
                        page = await ctx.new_page()
                        try:
                            item = await mapear(page, path)
                            msg = await upsert_inventario_subitem(conn, tenant_id, item)
                            results.append(item)
                            title = (item.get("h1") or item.get("h2") or item.get("title", "?")).split("\n")[0][:35]
                            n_cols = len(item.get("colunas", []))
                            n_amost = len(item.get("amostra", []))
                            n_iframe = len(item.get("iframes", []))
                            has_dl = "✓DL" if item.get("download_url") or item.get("captured_urls") else ""
                            has_btn = "[btn]" if item.get("botao_download") else ""
                            has_iframe = f"[ifr×{n_iframe}]" if n_iframe else ""
                            total = item.get("total_records")
                            total_str = f"{total:,}" if total else "?"
                            print(f"  [{i:3d}/{len(paths)}] {path:>10} {title:35} cols={n_cols} amost={n_amost} total={total_str} {has_btn}{has_iframe}{has_dl} → {msg}", flush=True)
                        except Exception as exc:
                            print(f"  [{i:3d}/{len(paths)}] {path:>10} EXC {exc!s:.300}", flush=True)
                            results.append({"path": path, "errors": [str(exc)[:300]]})
                        finally:
                            await page.close()
                finally:
                    await ctx.close()
        finally:
            await conn.close()
            await b.close()

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(results, indent=2, ensure_ascii=False, default=str))
    print(f"\n→ {OUT_JSON}")
    com_dt = sum(1 for r in results if r.get("colunas"))
    com_iframe = sum(1 for r in results if r.get("iframes"))
    com_dl = sum(1 for r in results if r.get("download_url") or r.get("captured_urls"))
    print(f"Mapeados: {len(results)} | com datatable: {com_dt} | com iframe: {com_iframe} | com download URL: {com_dl}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--paths", help="vírgula-separado")
    asyncio.run(main(p.parse_args()))
