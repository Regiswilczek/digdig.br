#!/usr/bin/env python3
"""
Testa o Obscura como scraper da página de deliberações do CAU/PR.

Pré-requisito: Obscura rodando em outro terminal:
    c:/Users/Regis/Desktop/obscura-eval/obscura.exe serve --port 9222 --stealth

Uso:
    cd backend
    python scripts/teste_obscura.py
"""
import asyncio
import sys
from playwright.async_api import async_playwright

PAGE_URL = "https://www.caupr.gov.br/?page_id=17916"
CDP_URL = "http://localhost:9222"


async def main():
    print(f"\n{'='*60}")
    print(f"  TESTE OBSCURA — deliberações CAU/PR")
    print(f"  CDP: {CDP_URL}")
    print(f"  URL: {PAGE_URL}")
    print(f"{'='*60}\n")

    async with async_playwright() as p:
        try:
            browser = await p.chromium.connect_over_cdp(CDP_URL)
        except Exception as e:
            print(f"✗ Não conseguiu conectar ao Obscura em {CDP_URL}")
            print(f"  Erro: {e}")
            print(f"\n  Certifique-se que o Obscura está rodando:")
            print(f"  c:/Users/Regis/Desktop/obscura-eval/obscura.exe serve --port 9222 --stealth")
            return

        print("✓ Conectado ao Obscura via CDP\n")

        page = await browser.new_page()

        print(f"Carregando página (aguardando JS renderizar)...")
        await page.goto(PAGE_URL, wait_until="networkidle", timeout=30000)
        print(f"✓ Página carregada\n")

        # 1. Testa LP.getMarkdown (domínio customizado do Obscura)
        print("── LP.getMarkdown ──────────────────────────────────")
        try:
            md = await page.evaluate("() => window.LP?.getMarkdown?.()")
            if md:
                print(f"✓ LP.getMarkdown funcionou! {len(md)} chars")
                print(f"  Prévia:\n{md[:400]}\n")
            else:
                print("  LP.getMarkdown retornou vazio ou não disponível")
        except Exception as e:
            print(f"  LP.getMarkdown não disponível: {e}")

        # 2. Conta links PDF na página renderizada
        print("\n── Links PDF encontrados ───────────────────────────")
        pdf_links = await page.query_selector_all("a[href*='.pdf'], a[href*='.PDF']")
        print(f"Total: {len(pdf_links)}")
        for i, link in enumerate(pdf_links[:20]):
            href = await link.get_attribute("href")
            text = (await link.inner_text()).strip()[:60]
            print(f"  [{i+1:2d}] {text or '(sem texto)':40s}  {(href or '')[:70]}")
        if len(pdf_links) > 20:
            print(f"  ... e mais {len(pdf_links) - 20} links")

        # 3. Conta todos os links de deliberação (qualquer formato)
        print("\n── Deliberações mencionadas (número + ano) ─────────")
        import re
        content = await page.content()
        numeros = re.findall(r"\b\d{2,4}-\d{2}/\d{4}\b|\b\d{1,4}/\d{4}\b", content)
        numeros_uniq = sorted(set(numeros))
        print(f"Padrões de número encontrados: {len(numeros_uniq)}")
        for n in numeros_uniq[:20]:
            print(f"  {n}")
        if len(numeros_uniq) > 20:
            print(f"  ... e mais {len(numeros_uniq) - 20}")

        await browser.close()

    print(f"\n{'='*60}")
    print(f"  Conclusão:")
    print(f"  - Links PDF: {len(pdf_links)}")
    print(f"  - Números de deliberação: {len(numeros_uniq)}")
    if len(pdf_links) > 14:
        print(f"  → O Obscura encontrou MAIS que o httpx (que achava 0-14)")
        print(f"     Vale integrar ao scraper de deliberações!")
    else:
        print(f"  → Resultado similar ao httpx — Obscura não ajuda aqui")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())
