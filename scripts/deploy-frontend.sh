#!/usr/bin/env bash
# deploy-frontend.sh — rebuild + restart do container frontend (nginx + SPA).
#
# Quando o source do frontend (src/, public/, vite.config*) muda, o bundle
# servido em produção NÃO atualiza sozinho — o `dist-vps/` é gerado dentro
# da imagem Docker (Dockerfile.frontend stage 1, `npm run build:vps`).
#
# Esse script faz o ciclo completo:
#   1. docker compose build frontend  (re-roda npm install + build:vps)
#   2. docker compose up -d frontend  (restart com a nova imagem)
#
# Uso (na raiz do projeto, no VPS):
#   bash scripts/deploy-frontend.sh
#
# Dura ~3-5min. Downtime < 1s no momento do restart.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "═══════════════════════════════════════════════════════════════════"
echo "  Deploy frontend — rebuild Docker image + restart container"
echo "═══════════════════════════════════════════════════════════════════"

echo
echo "[1/2] Buildando imagem (npm install + vite build:vps)..."
docker compose build frontend

echo
echo "[2/2] Reiniciando container..."
docker compose up -d frontend

echo
echo "✓ Deploy concluído. Container ativo:"
docker compose ps frontend

echo
echo "Cache do navegador pode segurar arquivos antigos — Ctrl+Shift+R"
echo "se você não vir a mudança imediatamente."
