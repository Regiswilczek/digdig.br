# tools/

Ferramentas externas utilizadas no pipeline do Dig Dig.

## obscura/

Navegador headless escrito em Rust com modo stealth, usado pra scraping de
sites com JavaScript e proteções anti-bot (ex: Portal Transparência PR
JSF/PrimeFaces).

**Repo:** https://github.com/h4ckf0r0day/obscura (Apache-2.0, Rust)

**Binários NÃO são versionados** (~80MB cada). Pra instalar:
```bash
bash tools/obscura/install.sh           # pega v0.1.1 (default)
bash tools/obscura/install.sh v0.2.0    # versão específica
```

O script detecta OS (Linux x86_64 / macOS arm64) e baixa do GitHub releases.

**Uso:**
```bash
# Modo servidor (CDP em :9222) — Playwright conecta via connect_over_cdp
./obscura serve --port 9222 --stealth

# Fetch one-shot (HTML/text/links)
./obscura fetch --stealth --wait 5 --dump html "https://..."

# Scrape em batch
./obscura scrape --concurrency 10 --format json url1 url2 url3
```

Referência de integração com Playwright: `backend/scripts/teste_obscura.py`

## paperclip/

Framework de orquestração de agentes (open-source, MIT).
Avaliado para uso como camada de agentes no pipeline de análise do Dig Dig.

Instalar dependências: `pnpm install` (requer pnpm)
