#!/usr/bin/env python3
"""
inspect_pte_download.py — captura request real do clique "Download do BD"
via Playwright. Mostra URL, headers e payload do POST que dispara o ZIP/CSV.

Uso:
    python scripts/inspect_pte_download.py <URL>
    python scripts/inspect_pte_download.py https://www.transparencia.pr.gov.br/pte/pessoal/viagens
"""
import asyncio
import sys
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright


async def inspect(url: str) -> None:
    print(f"\n══ Inspecting download flow: {url} ══\n")
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0",
            accept_downloads=True,
        )
        page = await ctx.new_page()

        # captura todas as requests pra ver qual é a do download
        requests_log: list[dict] = []

        async def on_request(req):
            if req.method == "POST" or "/pte/" in req.url:
                requests_log.append({
                    "method": req.method,
                    "url": req.url,
                    "headers": dict(req.headers),
                    "post_data": req.post_data,
                    "resource_type": req.resource_type,
                })

        # capturar TODAS as POSTs pro mesmo host (sem filtro restritivo)
        page.on("request", lambda req: requests_log.append({
            "method": req.method,
            "url": req.url,
            "headers": dict(req.headers),
            "post_data": req.post_data,
            "resource_type": req.resource_type,
            "ts": "now",
        }) if "transparencia.pr.gov.br" in req.url else None)

        download_info = []

        async def on_download(download):
            download_info.append({
                "url": download.url,
                "suggested_filename": download.suggested_filename,
            })
            print(f"\n📥 DOWNLOAD INICIADO:")
            print(f"   url: {download.url}")
            print(f"   filename: {download.suggested_filename}")
            tmp = Path(f"/tmp/inspect_{download.suggested_filename}")
            await download.save_as(str(tmp))
            print(f"   salvo em: {tmp} ({tmp.stat().st_size:,} bytes)")

        page.on("download", on_download)

        await page.goto(url, wait_until="networkidle", timeout=60000)
        print(f"[loaded] {await page.title()}")

        # pra Viagens/Servidores, é necessário primeiro pesquisar pra popular a tabela.
        # tentar clicar btnPesquisar antes (selector genérico).
        for sel in ['button:has-text("PESQUISAR")', 'button[id$="btnPesquisar"]']:
            try:
                btn = page.locator(sel).first
                if await btn.count() > 0:
                    print(f"[pesquisar] {sel}")
                    await btn.click()
                    await page.wait_for_load_state("networkidle", timeout=30000)
                    break
            except Exception as e:
                pass

        # marcar índice atual de requests pra distinguir as do clique do download
        idx_pre_click = len(requests_log)

        # clica DownloadBD
        clicked = False
        for selector in [
            'button[id$="lnkDownloadBD"]',
            'button:has-text("DOWNLOAD DO BANCO DE DADOS")',
            'button:has-text("Download do Banco de Dados")',
        ]:
            try:
                btn = page.locator(selector).first
                if await btn.count() > 0:
                    print(f"[click] {selector}")
                    async with page.expect_download(timeout=60000) as dl_info:
                        await btn.click()
                    download = await dl_info.value
                    print(f"\n📥 DOWNLOAD: url={download.url} fn={download.suggested_filename}")
                    out = Path(f"/tmp/inspect_{download.suggested_filename}")
                    await download.save_as(str(out))
                    print(f"   salvo: {out} ({out.stat().st_size:,} b)")
                    download_info.append({"url": download.url, "fn": download.suggested_filename})
                    clicked = True
                    break
            except Exception as e:
                # pode ser que o click abriu modal sem disparar download — capturar e tentar interno
                print(f"[click {selector} sem download] {str(e)[:80]}")
                try:
                    inner = page.locator('button#formDialogDownloadBancoDados\\:lnkDownloadBD').first
                    if await inner.count() > 0:
                        print(f"[modal click]")
                        async with page.expect_download(timeout=60000) as dl_info:
                            await inner.click()
                        download = await dl_info.value
                        print(f"\n📥 DOWNLOAD via modal: url={download.url} fn={download.suggested_filename}")
                        out = Path(f"/tmp/inspect_{download.suggested_filename}")
                        await download.save_as(str(out))
                        print(f"   salvo: {out} ({out.stat().st_size:,} b)")
                        download_info.append({"url": download.url, "fn": download.suggested_filename})
                        clicked = True
                        break
                except Exception as e2:
                    print(f"[modal sem download] {str(e2)[:80]}")

        await asyncio.sleep(2)
        await b.close()

        print(f"\n══ Total requests transparencia.pr capturadas: {len(requests_log)} ══")
        # mostrar POSTs depois do clique
        post_pre = sum(1 for r in requests_log[:idx_pre_click] if r["method"] == "POST")
        post_pos = [r for r in requests_log[idx_pre_click:] if r["method"] == "POST"]
        print(f"POSTs pre-click: {post_pre}, POSTs pós-click: {len(post_pos)}")
        for i, req in enumerate(post_pos):
            pd = req.get("post_data") or ""
            print(f"\n  POST [{i}] {req['url']}")
            print(f"    headers: {[(k, v[:80]) for k, v in req['headers'].items() if k.lower() in ('content-type', 'referer', 'origin', 'x-requested-with', 'faces-request', 'cookie')]}")
            print(f"    payload (FULL): {pd}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("uso: python scripts/inspect_pte_download.py <URL>")
    asyncio.run(inspect(sys.argv[1]))
