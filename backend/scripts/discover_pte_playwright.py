#!/usr/bin/env python3
"""
discover_pte_playwright.py — inspeção dos 128 sub-itens do PTE via Playwright
(navegador real). Detecta datatables que aparecem APÓS render JS.

Diferente de discover_pte.py (httpx puro), este captura conteúdo lazy-loaded.

Saída: docs/pte-discovery-playwright.md
"""
from __future__ import annotations

import asyncio
import json
import re
import sys
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).parent.parent.parent
OUT_JSON = ROOT / "docs" / "pte-discovery-playwright.json"
OUT_MD = ROOT / "docs" / "pte-discovery-playwright.md"
PTE_BASE = "https://www.transparencia.pr.gov.br/pte/assunto"

CONCURRENCY = 4   # pages paralelas


async def list_paths(page) -> list[str]:
    await page.goto("https://www.transparencia.pr.gov.br/pte/home",
                    wait_until="networkidle", timeout=60000)
    html = await page.content()
    return [f"{c}/{s}" for c, s in sorted(set(re.findall(r'/pte/assunto/(\d+)/(\d+)', html)))]


async def inspect_path(ctx, path: str) -> dict:
    page = await ctx.new_page()
    try:
        try:
            await page.goto(f"{PTE_BASE}/{path}", wait_until="networkidle", timeout=30000)
        except Exception:
            pass
        await asyncio.sleep(2)  # extra wait pra AJAX terminar
        result = await page.evaluate("""() => {
            const out = {};
            const h1 = document.querySelector('h1');
            out.h1 = h1 ? h1.innerText.trim() : null;
            const h2 = document.querySelector('h2');
            out.h2 = h2 ? h2.innerText.trim() : null;
            // forms
            out.forms = Array.from(document.querySelectorAll('form[id]')).map(f => f.id);
            // datatables (qualquer div com class ui-datatable)
            out.datatables = Array.from(document.querySelectorAll('div.ui-datatable')).map(d => d.id);
            // colunas
            out.columns = Array.from(document.querySelectorAll('th[role="columnheader"]')).map(t => t.innerText.trim()).filter(Boolean);
            // download buttons
            const dlBtns = Array.from(document.querySelectorAll('[id*="lnkDownloadBD"]'));
            out.has_download = dlBtns.length > 0;
            out.download_ids = dlBtns.map(b => b.id);
            // iframes
            out.iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
            // botão imprimir/exportar
            out.has_imprimir = document.querySelectorAll('[id*="btnImprimir"], [id*="lnkImprimir"]').length;
            out.has_planilha = document.querySelectorAll('[id*="btnVisualizarPlanilha"], [id*="VisualizarPlanilha"]').length;
            // anos no dropdown (qualquer)
            out.anos_dropdowns = Array.from(document.querySelectorAll('option'))
                .map(o => o.value)
                .filter(v => /^\\d{4}$/.test(v));
            out.anos_dropdowns = [...new Set(out.anos_dropdowns)].sort();
            return out;
        }""")
        result["path"] = path
        return result
    except Exception as e:
        return {"path": path, "error": str(e)[:200]}
    finally:
        await page.close()


async def main() -> None:
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0",
            viewport={"width": 1280, "height": 720},
        )
        page = await ctx.new_page()
        paths = await list_paths(page)
        await page.close()
        print(f"Total: {len(paths)} sub-itens", flush=True)

        sem = asyncio.Semaphore(CONCURRENCY)
        results: list[dict] = []

        async def worker(path):
            async with sem:
                r = await inspect_path(ctx, path)
                results.append(r)
                tag = "✓" if r.get("datatables") else " "
                print(f"  [{len(results):3d}/{len(paths)}] {tag} {path:>10} {(r.get('h1') or r.get('h2') or '?')[:50]}", flush=True)

        await asyncio.gather(*[worker(p) for p in paths])
        await b.close()

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"\n→ {OUT_JSON}")

    # markdown
    com_dt = [r for r in results if r.get("datatables")]
    com_dl = [r for r in results if r.get("has_download")]
    com_iframe = [r for r in results if r.get("iframes")]

    lines = ["# PTE Discovery — Playwright (render JS completo)", ""]
    lines.append(f"Total: **{len(results)}** sub-itens.")
    lines.append(f"- Com DataTable após render: **{len(com_dt)}**")
    lines.append(f"- Com botão Download do BD: **{len(com_dl)}**")
    lines.append(f"- Com iframe (Qlik/BI/etc): **{len(com_iframe)}**")
    lines.append("")

    lines.append("## DataTables (alvos do scraper)")
    lines.append("")
    lines.append("| path | título | datatable | download | colunas | anos |")
    lines.append("|---|---|---|---|---|---|")
    for r in sorted(com_dt, key=lambda x: tuple(map(int, x['path'].split('/')))):
        title = (r.get("h1") or r.get("h2") or "?")[:40]
        dts = ", ".join(r.get("datatables") or [])
        dl = "✓" if r.get("has_download") else ""
        cols = " · ".join((r.get("columns") or [])[:4])
        anos = r.get("anos_dropdowns") or []
        anos_s = f"{anos[0]}..{anos[-1]} ({len(anos)})" if anos else "—"
        lines.append(f"| `{r['path']}` | {title} | `{dts}` | {dl} | {cols} | {anos_s} |")
    lines.append("")

    lines.append("## Iframes (Qlik BI / outros)")
    lines.append("")
    lines.append("| path | título | iframe |")
    lines.append("|---|---|---|")
    for r in sorted(com_iframe, key=lambda x: tuple(map(int, x['path'].split('/')))):
        title = (r.get("h1") or r.get("h2") or "?")[:40]
        ifr = r.get("iframes", [""])[0][:80]
        lines.append(f"| `{r['path']}` | {title} | {ifr} |")
    lines.append("")

    lines.append("## Sub-itens com Download do BD (mas sem datatable)")
    lines.append("")
    only_dl = [r for r in com_dl if not r.get("datatables")]
    for r in only_dl:
        title = (r.get("h1") or r.get("h2") or "?")[:50]
        lines.append(f"- `{r['path']}` — {title} (ids: {r.get('download_ids')})")
    lines.append("")

    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text("\n".join(lines))
    print(f"→ {OUT_MD}")
    print(f"\nResumo: {len(com_dt)} datatables | {len(com_dl)} downloads | {len(com_iframe)} iframes")


if __name__ == "__main__":
    asyncio.run(main())
