#!/usr/bin/env python3
"""
inspect_viagens_pw.py — investigação profunda do form de Viagens via Playwright.

Objetivo: descobrir como o dropdown de Ano popula e qual sequência de cliques
dispara o download do BD.
"""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright


URL = "https://www.transparencia.pr.gov.br/pte/pessoal/viagens"


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0",
            accept_downloads=True,
            viewport={"width": 1920, "height": 1080},
        )
        page = await ctx.new_page()

        # capturar todas as requests POST pra entender o fluxo
        requests_log = []
        responses_log = {}

        def on_request(req):
            if "transparencia.pr.gov.br" in req.url and req.method == "POST":
                requests_log.append({
                    "url": req.url,
                    "post_data": req.post_data,
                })

        async def on_response(res):
            if "transparencia.pr.gov.br" in res.url and "POST" in (res.request.method or ""):
                try:
                    if "xml" in res.headers.get("content-type", ""):
                        text = await res.text()
                        responses_log[res.url + str(len(responses_log))] = text[:2000]
                except Exception:
                    pass

        page.on("request", on_request)
        page.on("response", lambda r: asyncio.create_task(on_response(r)))

        print("[1] carregando página...")
        await page.goto(URL, wait_until="networkidle", timeout=60000)
        await asyncio.sleep(3)

        # 1. inspeciona estado inicial dos selects
        state_inicial = await page.evaluate("""() => {
            const out = {};
            ['filtroAno','filtroMesInicio','filtroMesTermino','filtroInstituicao','filtroCargoViajante','filtroTipoViagem'].forEach(name => {
                const sel = document.getElementById('formViagens:'+name+'_input');
                if (sel) {
                    out[name] = Array.from(sel.options).map(o => ({value: o.value, label: o.innerText.trim()}));
                } else {
                    out[name] = null;
                }
            });
            return out;
        }""")
        print(f"\n[2] estado inicial dos dropdowns:")
        for k, opts in state_inicial.items():
            if opts:
                print(f"  {k}: {len(opts)} opts: {[o['label'][:25] for o in opts[:5]]}")
            else:
                print(f"  {k}: (não encontrado)")

        # 2. tentar abrir o dropdown de ano via clique no widget visível (não no select)
        print(f"\n[3] tentando abrir dropdown filtroAno via widget PrimeFaces...")
        try:
            # PrimeFaces SelectOneMenu tem trigger separado
            await page.click('#formViagens\\:filtroAno', timeout=5000)
            await asyncio.sleep(2)
            opts_apos = await page.evaluate("""() => {
                const items = document.querySelectorAll('#formViagens\\\\:filtroAno_items li');
                return Array.from(items).map(li => li.innerText.trim());
            }""")
            print(f"  itens no painel: {opts_apos[:10]}")
        except Exception as e:
            print(f"  ✗ {e!s:.100}")

        # 3. tentar selecionar Instituição (talvez popule outros)
        print(f"\n[4] tentando selecionar uma instituição (cascata?)...")
        try:
            await page.click('#formViagens\\:filtroInstituicao', timeout=5000)
            await asyncio.sleep(1)
            inst_opts = await page.evaluate("""() => {
                const items = document.querySelectorAll('#formViagens\\\\:filtroInstituicao_items li');
                return Array.from(items).map(li => ({label: li.innerText.trim(), idx: li.getAttribute('data-item-index')}));
            }""")
            print(f"  Instituições: {len(inst_opts)} opts")
            for i in inst_opts[:5]:
                print(f"    {i}")
        except Exception as e:
            print(f"  ✗ {e!s:.100}")

        # 4. olhar HTML do botão lnkDownloadBD pra ver o handler real
        btn_html = await page.evaluate("""() => {
            const btn = document.getElementById('formViagens:lnkDownloadBD');
            if (!btn) return null;
            return {
                outerHTML: btn.outerHTML.slice(0, 800),
                onclick: btn.onclick ? btn.onclick.toString() : null,
                type: btn.type,
                disabled: btn.disabled,
            };
        }""")
        print(f"\n[5] botão lnkDownloadBD:")
        print(f"  type: {btn_html.get('type') if btn_html else None}")
        print(f"  disabled: {btn_html.get('disabled') if btn_html else None}")
        print(f"  onclick: {(btn_html or {}).get('onclick','')[:200]}")
        print(f"  outerHTML: {(btn_html or {}).get('outerHTML','')[:400]}")

        # 5. tentar fazer btnPesquisar primeiro (sem filtros)
        print(f"\n[6] clicando btnPesquisar (sem filtros)...")
        try:
            await page.click('#formViagens\\:btnPesquisar', timeout=10000)
            await asyncio.sleep(5)  # esperar AJAX
            # estado dos selects depois
            state_apos = await page.evaluate("""() => {
                const sel = document.getElementById('formViagens:filtroAno_input');
                if (!sel) return null;
                return Array.from(sel.options).map(o => ({value: o.value, label: o.innerText.trim()}));
            }""")
            print(f"  filtroAno após pesquisar: {state_apos}")
        except Exception as e:
            print(f"  ✗ {e!s:.100}")

        # 6. tentar Download do BD direto agora
        print(f"\n[7] clicando lnkDownloadBD...")
        try:
            async with page.expect_download(timeout=30000) as dl_info:
                await page.click('#formViagens\\:lnkDownloadBD', timeout=10000)
            d = await dl_info.value
            out = Path(f"/tmp/viagens_pw.{d.suggested_filename or 'bin'}")
            await d.save_as(str(out))
            print(f"  ✓ DOWNLOAD: {out} ({out.stat().st_size:,} bytes)")
        except Exception as e:
            print(f"  ✗ sem download: {e!s:.150}")

        # logs finais
        print(f"\n[8] {len(requests_log)} POSTs capturadas pra transparencia.pr")
        for i, req in enumerate(requests_log):
            pd = req.get("post_data") or ""
            tag = ""
            if "lnkDownloadBD" in pd: tag += " [DOWNLOAD]"
            if "btnPesquisar" in pd: tag += " [PESQUISAR]"
            if "filtroInstituicao" in pd and "@change" in pd: tag += " [INST CHANGE]"
            print(f"  POST [{i}]{tag} {req['url'][:80]}")
            print(f"    {pd[:300]}")

        await b.close()


if __name__ == "__main__":
    asyncio.run(main())
