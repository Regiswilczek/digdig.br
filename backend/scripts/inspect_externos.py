#!/usr/bin/env python3
"""
inspect_externos.py — inspeciona os sistemas externos identificados nos
iframes do PTE pra documentar como atacar cada um.

Pra cada URL:
  1. Abre via Playwright
  2. Captura: title, h1, forms, selects, links de download/export, AJAX requests
  3. Salva em docs/sistemas-externos.json + .md
"""
from __future__ import annotations

import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).parent.parent.parent
OUT_JSON = ROOT / "docs" / "sistemas-externos.json"
OUT_MD = ROOT / "docs" / "sistemas-externos.md"

# Sistemas externos identificados via iframes do PTE
SISTEMAS = [
    ("portal_v4_repasses",   "Portal v4 — Repasses Municípios", "https://www4.pr.gov.br/Gestao/portaldatransparencia/repasses/index.jsp"),
    ("portal_v4_adiantamentos","Portal v4 — Adiantamentos",     "https://www4.pr.gov.br/Gestao/portaldatransparencia/adiantamentos/adiantamentos.jsp"),
    ("rpv",                  "RPV — Requisição Pequeno Valor", "https://rpv.fazenda.pr.gov.br/prpv/publico/transparencia"),
    ("recdiario",            "Recolhimento Diário",            "https://recdiario.fazenda.pr.gov.br/recdiario/index"),
    ("flexportal_receitas",  "FlexPortal Receitas",            "https://www.transparencia.pr.gov.br/FlexPortal/#!Receitas"),
    ("flexportal_despesas",  "FlexPortal Despesas",            "https://www.transparencia.pr.gov.br/FlexPortal/#!Despesas"),
    ("flexportal_fornecedores","FlexPortal Fornecedores",      "https://www.transparencia.pr.gov.br/FlexPortal/#!Fornecedores"),
    ("siafic_consulta1",     "SIAFIC Dispêndios",              "https://www.siafic.pr.gov.br/FlexPortal/#!Consulta1"),
    ("siafic_isspagos",      "SIAFIC ISSPAGOS",                "https://www.siafic.pr.gov.br/FlexPortal/#!ISSPAGOS"),
    ("qlik_pte",             "Qlik PTE (legacy)",              "http://bi.pr.gov.br/QvAJAXZfc/opendoc.htm?document=PTE.qvw&host=QVS%40sparana00541&anonymous=true"),
    ("qlik_realizacoes",     "Qlik Realizações de Governo",    "http://bi.pr.gov.br/QvAJAXZfc/opendoc.htm?document=RealizacoesdeGoverno.qvw&host=QVS%40sparana00541&anonymous=true"),
    ("qlik_terceirizados",   "Qlik Sense Terceirizados",       "https://bi2.pr.gov.br/single/?appid=d9284dcd-1ab8-4044-8fee-28393520e405&sheet=ebb66970-8225-47ea-8a83-a8524a3d1d20"),
    ("qlik_cgeouv",          "Qlik Sense CGEOuv+",             "https://bi2.pr.gov.br/single/?appid=3e7bea38-ccca-4d8f-9853-5484f1630aad&sheet=475ee842-3ac3-4466-b8e7-49949c002473"),
    ("powerbi_emendas_pix",  "PowerBI Emendas PIX",            "https://app.powerbi.com/view?r=eyJrIjoiN2UzN2UyMTQtODgxMC00N2NiLWE1NzQtZjFkYmZkZWQ0YzVmIiwidCI6ImY3MGEwYWY2LWRhMGYtNDViZS1iN2VkLTlmOGMxYjI0YmZkZiIsImMiOjR9"),
    ("powerbi_sefa",         "PowerBI SEFA",                   "https://app.powerbi.com/view?r=eyJrIjoiN2E1YzRmN2EtOGMwMi00NDM0LWFhMWEtOWYzNzNjMjZmZWEwIiwidCI6ImU2MmE4YWQ4LTU0MzYtNDkzMy04OTBmLTk1MmU2ODY3MzM3NyIsImMiOjR9"),
    ("serpro",               "SERPRO Transferências",          "https://dd-publico.serpro.gov.br/extensions/transferencias-discricionarias-e-legais/transferencias-discricionarias-e-legais.html"),
    ("sistag",               "SISTAG Repasses Sociais",        "https://www.sistag.social.pr.gov.br/sis/publico/repasses-geral"),
    ("educacao_convenios",   "SEED Convênios",                 "https://www.educacao.pr.gov.br/Convenios"),
]


async def inspect_one(ctx, slug, label, url):
    print(f"\n══ {slug}: {label} ══")
    page = await ctx.new_page()
    requests_seen = []
    page.on("request", lambda r: requests_seen.append({"method": r.method, "url": r.url[:200], "type": r.resource_type}))

    out = {"slug": slug, "label": label, "url": url}
    try:
        try:
            await page.goto(url, wait_until="networkidle", timeout=45000)
            await asyncio.sleep(4)
        except Exception as exc:
            out["goto_err"] = str(exc)[:200]

        info = await page.evaluate("""() => {
            const out = {};
            out.title = document.title;
            out.h1 = document.querySelector('h1')?.innerText?.trim() || null;
            out.forms = Array.from(document.querySelectorAll('form')).map(f => ({id: f.id, action: f.action, method: f.method}));
            out.selects = Array.from(document.querySelectorAll('select')).map(s => ({
                name: s.name || s.id,
                n_opts: s.options.length,
                first_opts: Array.from(s.options).slice(0, 5).map(o => ({v: o.value, t: o.innerText.slice(0, 30)})),
            }));
            out.tables = Array.from(document.querySelectorAll('table')).length;
            out.links_data = Array.from(document.querySelectorAll('a')).filter(a => /xls|csv|excel|download|export|json|zip|pdf/i.test(a.href + a.innerText)).map(a => ({h: a.href.slice(0, 200), t: a.innerText.slice(0, 50)})).slice(0, 10);
            out.iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
            // Verificar se é app SPA (React/Vue/Angular)
            out.has_react = !!document.querySelector('[data-reactroot], #root, #app');
            out.has_swf = !!document.querySelector('object[type*=flash], embed[type*=flash]');
            return out;
        }""")
        out.update(info)

        # Capturar requests AJAX (POST + GETs com .json/.do/.action/api)
        ajax = [r for r in requests_seen if r["url"].startswith("http") and (
            r["method"] == "POST" or
            re.search(r"\.(json|do|action|amf|ashx)|/api/|/services?/|/graphql", r["url"], re.I)
        ) and "google" not in r["url"]]
        out["ajax_requests"] = ajax[:15]

    except Exception as exc:
        out["exc"] = str(exc)[:200]
    finally:
        await page.close()

    # imprimir resumo
    print(f"  title: {out.get('title','?')[:60]}")
    print(f"  forms: {len(out.get('forms',[]))} | selects: {len(out.get('selects',[]))} | tables: {out.get('tables',0)}")
    print(f"  iframes: {len(out.get('iframes',[]))} | links_data: {len(out.get('links_data',[]))}")
    print(f"  AJAX: {len(out.get('ajax_requests',[]))}")
    if out.get("ajax_requests"):
        for ajax in out["ajax_requests"][:3]:
            print(f"    {ajax['method']} {ajax['url'][:120]}")
    return out


async def main():
    print(f"Inspecting {len(SISTEMAS)} sistemas externos...")
    results = []
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0",
            accept_downloads=True,
        )
        for slug, label, url in SISTEMAS:
            try:
                r = await inspect_one(ctx, slug, label, url)
                results.append(r)
            except Exception as exc:
                print(f"  EXC: {exc!s:.150}")
                results.append({"slug": slug, "label": label, "url": url, "exc": str(exc)[:200]})
        await b.close()

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(results, indent=2, ensure_ascii=False, default=str))
    print(f"\n→ {OUT_JSON}")

    # Markdown
    lines = ["# Sistemas Externos do GOV-PR — inspeção", ""]
    lines.append(f"Total: **{len(results)}** sistemas inspecionados.")
    lines.append("")
    for r in results:
        lines.append(f"## {r['slug']} — {r['label']}")
        lines.append(f"- URL: `{r['url']}`")
        lines.append(f"- Title: {r.get('title','?')}")
        if r.get("goto_err"):
            lines.append(f"- ⚠ goto error: {r['goto_err']}")
        lines.append(f"- forms: {len(r.get('forms',[]))} | selects: {len(r.get('selects',[]))} | tables: {r.get('tables',0)} | iframes: {len(r.get('iframes',[]))}")
        if r.get("links_data"):
            lines.append("- **Links de download:**")
            for l in r["links_data"][:5]:
                lines.append(f"  - [{l['t']}]({l['h']})")
        if r.get("selects"):
            lines.append("- **Selects/filtros:**")
            for s in r["selects"][:3]:
                lines.append(f"  - `{s['name']}`: {s['n_opts']} opções (ex: {[o['t'] for o in s['first_opts'][:3]]})")
        if r.get("ajax_requests"):
            lines.append("- **AJAX requests:**")
            for a in r["ajax_requests"][:3]:
                lines.append(f"  - `{a['method']}` {a['url']}")
        if r.get("has_swf"):
            lines.append("- ⚠ Flash/SWF detectado")
        lines.append("")
    OUT_MD.write_text("\n".join(lines))
    print(f"→ {OUT_MD}")


if __name__ == "__main__":
    asyncio.run(main())
