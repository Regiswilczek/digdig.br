# tools/

Ferramentas externas utilizadas no pipeline do Dig Dig.

## obscura/

Navegador headless com stealth para scraping de sites com JavaScript e proteções anti-bot.
Usado via subprocess Python quando o `scrape_local.py` precisa de JS rendering.

- `obscura.exe` — binário Windows (desenvolvimento local)
- `obscura.zip` — pacote completo (contém binário Linux para VPS)

Referência de uso: `backend/scripts/teste_obscura.py`

## paperclip/

Framework de orquestração de agentes (open-source, MIT).
Avaliado para uso como camada de agentes no pipeline de análise do Dig Dig.

Instalar dependências: `pnpm install` (requer pnpm)
