#!/usr/bin/env python3
"""
descobrir_downloads.py — automatiza descoberta de URLs de download do PTE.

Pra cada sub-item /pte/assunto/X/Y do discovery:
  1. Abre a página em browser headless real
  2. Procura botão "DOWNLOAD DO BANCO DE DADOS"
  3. Tenta clicar sem filtros — se baixar, captura URL
  4. Se servidor exigir Ano/Mês, itera valores e captura URL pra cada combinação
  5. Intercepta as redirects pra `transparencia.download.pr.gov.br/exportacao/...`

Saída:
  docs/pte-download-urls.json — { path: {tipo, urls_descobertas, padrao_url, ...} }
  docs/pte-download-urls.md  — relatório legível

Uso:
    python scripts/descobrir_downloads.py                    # roda os 128 sub-itens
    python scripts/descobrir_downloads.py --paths 6/2 4/30   # só específicos
    python scripts/descobrir_downloads.py --has-download-only # só os que tem botão
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path
from typing import Any

from playwright.async_api import async_playwright, Page

ROOT = Path(__file__).parent.parent.parent
DISCOVERY_JSON = ROOT / "docs" / "pte-discovery-playwright.json"
OUT_JSON = ROOT / "docs" / "pte-download-urls.json"
OUT_MD = ROOT / "docs" / "pte-download-urls.md"

PTE_BASE = "https://www.transparencia.pr.gov.br/pte/assunto"
DOWNLOAD_HOST = "transparencia.download.pr.gov.br"


MESES_ENUM = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO",
              "JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"]


async def _selecionar_dropdown(page: Page, sel_id: str, value: str) -> bool:
    """Força selecionar valor em um <select> PrimeFaces e disparar change."""
    js = """([id, val]) => {
        const sel = document.getElementById(id);
        if (!sel) return false;
        // adicionar option se não existir
        let opt = Array.from(sel.options).find(o => o.value === val);
        if (!opt) {
            opt = document.createElement('option');
            opt.value = val; opt.text = val;
            sel.appendChild(opt);
        }
        sel.value = val;
        sel.dispatchEvent(new Event('change'));
        return true;
    }"""
    try:
        return await page.evaluate(js, [sel_id, value])
    except Exception:
        return False


async def _tentar_clique(page: Page, btn_sel: str, timeout: int = 10000) -> dict:
    """Clica botão e tenta capturar download. Retorna dict com url/erro."""
    try:
        async with page.expect_download(timeout=timeout) as dl_info:
            await page.click(btn_sel, timeout=5000)
        d = await dl_info.value
        url = d.url
        fn = d.suggested_filename
        try:
            await d.cancel()
        except Exception:
            pass
        return {"url": url, "filename": fn}
    except Exception as exc:
        # ler erros do servidor (PrimeFaces growl)
        try:
            errs = await page.evaluate("""() => {
                const out = [];
                document.querySelectorAll('.ui-messages-error-summary, .ui-growl-message').forEach(e => {
                    if (e.innerText) out.push(e.innerText.trim());
                });
                return out;
            }""")
        except Exception:
            errs = []
        return {"timeout": True, "server_errors": errs, "exc": str(exc)[:120]}


async def tentar_baixar(page: Page, path: str) -> dict:
    """Captura URL de download. Estratégia:
    1. Tenta clicar botão direto (sem mexer filtros)
    2. Se modal abrir, clica botão do modal
    3. Se servidor pedir Ano: itera anos do dropdown (até pegar 1)
    4. Se servidor pedir Mês: itera meses
    5. Captura URL via download event OU via request event ('/exportacao/')
    """
    out: dict[str, Any] = {
        "path": path, "urls_capturadas": [], "errors": [],
        "filtros_disponiveis": {}, "tentativas": [],
    }
    captured_urls: list[str] = []

    def on_request(req):
        if DOWNLOAD_HOST in req.url and "/exportacao/" in req.url:
            captured_urls.append(req.url)
    page.on("request", on_request)

    try:
        await page.goto(f"{PTE_BASE}/{path}", wait_until="networkidle", timeout=45000)
        await asyncio.sleep(2)
    except Exception as exc:
        out["errors"].append(f"goto: {exc!s:.150}")
        return out

    btn_ids = await page.evaluate("""() => {
        const btns = document.querySelectorAll('[id$="lnkDownloadBD"]');
        return Array.from(btns).map(b => b.id);
    }""")
    if not btn_ids:
        out["errors"].append("sem botão lnkDownloadBD")
        return out
    out["btn_ids"] = btn_ids

    # detecta filtros
    selects_data = await page.evaluate("""() => {
        const out = {};
        const sels = document.querySelectorAll('select[id*="filtro"]');
        sels.forEach(sel => {
            const opts = Array.from(sel.options).map(o => ({value: o.value, label: o.innerText.trim()}));
            out[sel.id] = opts;
        });
        return out;
    }""")
    out["filtros_disponiveis"] = selects_data

    # heurística: identificar select de ano e mês
    sel_ano = next((id for id in selects_data if "ano" in id.lower() and "_input" in id), None)
    sel_mes = next((id for id in selects_data if "mes" in id.lower() and "_input" in id), None)
    sel_mes_inicio = next((id for id in selects_data if "mesinicio" in id.lower() and "_input" in id), None)
    sel_mes_termino = next((id for id in selects_data if "mestermino" in id.lower() and "_input" in id), None)

    # estratégia 1: clicar botão direto
    btn = btn_ids[0]
    btn_sel = f"#{btn.replace(':', '\\:')}"
    r = await _tentar_clique(page, btn_sel)
    out["tentativas"].append({"estrategia": "direto", "result": r})
    if r.get("url"):
        out["download_capturado"] = r
        out["urls_capturadas"] = sorted(set(captured_urls))
        return out

    # estratégia 2: modal pode ter aberto
    modal_btn_ids = await page.evaluate("""() => {
        const btns = document.querySelectorAll('[id*="DialogDownload"][id$="lnkDownloadBD"]');
        return Array.from(btns).map(b => b.id);
    }""")
    if modal_btn_ids:
        out["modal_abriu"] = True
        modal_btn = modal_btn_ids[0]
        modal_sel = f"#{modal_btn.replace(':', '\\:')}"
        # filtros do dialog também
        dialog_sels = await page.evaluate("""() => {
            const out = {};
            const sels = document.querySelectorAll('[id*="DialogDownload"] select[id*="filtro"]');
            sels.forEach(sel => {
                const opts = Array.from(sel.options).map(o => ({value: o.value, label: o.innerText.trim()}));
                out[sel.id] = opts;
            });
            return out;
        }""")
        out["filtros_modal"] = dialog_sels
        # se modal tem ano/mês, usar ele
        d_sel_ano = next((id for id in dialog_sels if "ano" in id.lower() and "_input" in id), sel_ano)
        d_sel_mes = next((id for id in dialog_sels if "mes" in id.lower() and "_input" in id), sel_mes)

        # se modal tem ano populado, tentar pegar o primeiro válido
        if d_sel_ano and dialog_sels.get(d_sel_ano):
            anos_opts = [o["value"] for o in dialog_sels[d_sel_ano] if o["value"]]
            if anos_opts:
                ano_v = anos_opts[0]
                await _selecionar_dropdown(page, d_sel_ano, ano_v)
                if d_sel_mes and dialog_sels.get(d_sel_mes):
                    meses_opts = [o["value"] for o in dialog_sels[d_sel_mes] if o["value"]]
                    if meses_opts:
                        await _selecionar_dropdown(page, d_sel_mes, meses_opts[0])
                await asyncio.sleep(1)
                r2 = await _tentar_clique(page, modal_sel, timeout=20000)
                out["tentativas"].append({"estrategia": "modal_filtrado", "ano": ano_v, "result": r2})
                if r2.get("url"):
                    out["download_capturado"] = r2
                    out["urls_capturadas"] = sorted(set(captured_urls))
                    return out
        # fallback: clica modal sem filtro
        r3 = await _tentar_clique(page, modal_sel, timeout=15000)
        out["tentativas"].append({"estrategia": "modal_vazio", "result": r3})
        if r3.get("url"):
            out["download_capturado"] = r3
            out["urls_capturadas"] = sorted(set(captured_urls))
            return out

    # estratégia 3: form direto (fora de modal) com filtro de ano populado
    if sel_ano and selects_data.get(sel_ano):
        anos_opts = [o["value"] for o in selects_data[sel_ano] if o["value"] and o["value"] != "TODOS"]
        # se vazio, forçar 2024 (o servidor talvez aceite mesmo sem estar no dropdown)
        if not anos_opts:
            anos_opts = ["2024"]
        for ano_v in anos_opts[:2]:  # tentar até 2 anos pra garantir
            await _selecionar_dropdown(page, sel_ano, ano_v)
            # se tem mês, popular também
            if sel_mes_inicio and selects_data.get(sel_mes_inicio):
                meses = [o["value"] for o in selects_data[sel_mes_inicio] if o["value"]]
                meses_alt = ["JANEIRO", "ABRIL"]  # fallback
                m = (meses or meses_alt)[0]
                await _selecionar_dropdown(page, sel_mes_inicio, m)
                if sel_mes_termino:
                    await _selecionar_dropdown(page, sel_mes_termino, m)
            elif sel_mes:
                meses = [o["value"] for o in selects_data[sel_mes] if o["value"]]
                if meses:
                    await _selecionar_dropdown(page, sel_mes, meses[0])
                else:
                    # tentar enum
                    await _selecionar_dropdown(page, sel_mes, "ABRIL")
            await asyncio.sleep(1)
            r4 = await _tentar_clique(page, btn_sel, timeout=20000)
            out["tentativas"].append({"estrategia": f"form_ano_{ano_v}", "result": r4})
            if r4.get("url"):
                out["download_capturado"] = r4
                out["urls_capturadas"] = sorted(set(captured_urls))
                return out

    out["urls_capturadas"] = sorted(set(captured_urls))
    return out


async def main(args):
    if not DISCOVERY_JSON.exists():
        sys.exit(f"missing {DISCOVERY_JSON}")
    discovery = json.load(open(DISCOVERY_JSON))

    paths_filter = args.paths.split(",") if args.paths else None
    if paths_filter:
        items = [r for r in discovery if r.get("path") in paths_filter]
    elif args.has_download_only:
        items = [r for r in discovery if r.get("has_download")]
    else:
        items = discovery

    print(f"Investigando {len(items)} sub-itens...")

    results: list[dict] = []
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0",
            accept_downloads=True,
            viewport={"width": 1280, "height": 800},
        )
        for i, item in enumerate(items, 1):
            path = item.get("path")
            if not path:
                continue
            label = (item.get("h1") or item.get("h2") or "?").split("\n")[0][:40]
            page = await ctx.new_page()
            try:
                r = await tentar_baixar(page, path)
                r["label"] = label
                results.append(r)
                # status compacto
                tag = ""
                if r.get("download_direto"):
                    tag = "✓ DIRETO"
                elif r.get("download_modal"):
                    tag = "✓ MODAL"
                elif r.get("urls_capturadas"):
                    tag = f"⚡ {len(r['urls_capturadas'])} reqs"
                elif "sem botão" in str(r.get("errors", "")):
                    tag = "  -"
                else:
                    tag = "✗"
                url_curta = ""
                if r.get("download_direto"):
                    url_curta = r["download_direto"]["url"].split("/exportacao/")[-1][:60]
                elif r.get("download_modal"):
                    url_curta = r["download_modal"]["url"].split("/exportacao/")[-1][:60]
                elif r.get("urls_capturadas"):
                    url_curta = r["urls_capturadas"][0].split("/exportacao/")[-1][:60]
                print(f"  [{i:3d}/{len(items)}] {tag:9} {path:>10} {label:40} {url_curta}", flush=True)
            except Exception as e:
                print(f"  [{i:3d}/{len(items)}] ✗ {path} EXC {e!s:.80}", flush=True)
                results.append({"path": path, "label": label, "errors": [f"exc: {e!s:.150}"]})
            finally:
                await page.close()

        await b.close()

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"\n→ {OUT_JSON}")

    # markdown report
    lines = ["# PTE Download URLs — descoberta via Playwright", ""]
    com_dl = [r for r in results if r.get("download_direto") or r.get("download_modal") or r.get("urls_capturadas")]
    sem_btn = [r for r in results if "sem botão" in str(r.get("errors", []))]
    com_btn_sem_dl = [r for r in results if r.get("btn_ids") and not (r.get("download_direto") or r.get("download_modal") or r.get("urls_capturadas"))]
    lines.append(f"- Com URL capturada: **{len(com_dl)}**")
    lines.append(f"- Com botão mas sem download: **{len(com_btn_sem_dl)}**")
    lines.append(f"- Sem botão Download: **{len(sem_btn)}**")
    lines.append("")
    lines.append("## URLs capturadas")
    lines.append("")
    lines.append("| path | título | URL exemplo |")
    lines.append("|---|---|---|")
    for r in com_dl:
        u = ""
        if r.get("download_direto"): u = r["download_direto"]["url"]
        elif r.get("download_modal"): u = r["download_modal"]["url"]
        elif r.get("urls_capturadas"): u = r["urls_capturadas"][0]
        u_short = u.replace("https://www.transparencia.download.pr.gov.br/exportacao/", "…/")
        u_short = u_short.split("?")[0]
        lines.append(f"| `{r['path']}` | {r.get('label','?')} | `{u_short}` |")
    lines.append("")
    lines.append("## Com botão mas sem download (precisa investigar filtros)")
    lines.append("")
    lines.append("| path | título | filtros disponíveis | erros |")
    lines.append("|---|---|---|---|")
    for r in com_btn_sem_dl:
        filt = list((r.get("filtros_disponiveis") or {}).keys())
        errs = "; ".join((r.get("errors") or [])[:2])[:80]
        lines.append(f"| `{r['path']}` | {r.get('label','?')} | {len(filt)} | {errs} |")
    OUT_MD.write_text("\n".join(lines))
    print(f"→ {OUT_MD}")
    print(f"\nResumo: {len(com_dl)} URLs capturadas, {len(com_btn_sem_dl)} com botão mas sem download")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--paths", help="paths específicos separados por vírgula (6/2,4/30)")
    p.add_argument("--has-download-only", action="store_true", help="só sub-itens com lnkDownloadBD")
    asyncio.run(main(p.parse_args()))
