#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-vps.sh — Dig Dig VPS Setup (Ubuntu 24.04 LTS)
# Instala Docker + Docker Compose, clona o repo e sobe tudo via docker-compose.
#
# Uso:
#   chmod +x setup-vps.sh
#   sudo ./setup-vps.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

REPO_URL="https://github.com/Regiswilczek/digdig.br.git"
APP_DIR="/opt/digdig"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Dig Dig VPS Setup — Ubuntu 24.04 LTS + Docker"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. Sistema base ───────────────────────────────────────────────────────────
echo "▶ [1/6] Atualizando sistema..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git unzip htop nano \
  ca-certificates gnupg lsb-release
echo "✓ Sistema atualizado"

# ── 2. Docker Engine ──────────────────────────────────────────────────────────
echo ""
echo "▶ [2/6] Instalando Docker..."
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
fi
systemctl enable docker
systemctl start docker
echo "✓ Docker $(docker --version)"

# ── 3. Claude Code ────────────────────────────────────────────────────────────
echo ""
echo "▶ [3/6] Instalando Claude Code..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
  apt-get install -y -qq nodejs
fi
if ! command -v claude &>/dev/null; then
  npm install -g @anthropic-ai/claude-code --silent
fi
echo "✓ Claude Code instalado"
echo "  → Após o setup, rode: claude /login"

# ── 4. Clonar repositório ─────────────────────────────────────────────────────
echo ""
echo "▶ [4/6] Clonando repositório..."
if [ -d "$APP_DIR/.git" ]; then
  echo "  Repositório já existe — fazendo git pull..."
  git -C "$APP_DIR" pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi
echo "✓ Código em $APP_DIR"

# ── 5. Arquivo de ambiente ────────────────────────────────────────────────────
echo ""
echo "▶ [5/6] Verificando .env..."
if [ ! -f "$APP_DIR/backend/.env" ]; then
  if [ -f "$APP_DIR/backend/.env.example" ]; then
    cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
    echo "  ⚠ .env criado a partir do .env.example"
    echo "  → EDITE antes de subir os serviços:"
    echo "     nano $APP_DIR/backend/.env"
  else
    echo "  ⚠ Crie manualmente: $APP_DIR/backend/.env"
    echo "  → Variáveis obrigatórias: DATABASE_URL, ANTHROPIC_API_KEY,"
    echo "     SUPABASE_URL, SUPABASE_SERVICE_KEY,"
    echo "     MP_ACCESS_TOKEN, MP_PUBLIC_KEY, SECRET_KEY"
  fi
else
  echo "✓ .env já existe"
fi

# ── 6. Docker Compose up ──────────────────────────────────────────────────────
echo ""
echo "▶ [6/6] Iniciando serviços via Docker Compose..."
cd "$APP_DIR"

if [ -f "backend/.env" ] && grep -q "DATABASE_URL=" backend/.env && \
   ! grep -q "DATABASE_URL=$" backend/.env; then
  docker compose pull 2>/dev/null || true
  docker compose up -d --build
  echo "✓ Serviços no ar"
else
  echo "  ⏭ .env incompleto — serviços NÃO iniciados"
  echo "  → Edite $APP_DIR/backend/.env e rode:"
  echo "     cd $APP_DIR && docker compose up -d --build"
fi

# ── Resumo final ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Setup concluído!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Serviços gerenciados por Docker Compose em $APP_DIR"
echo ""
echo "  Comandos úteis:"
echo ""
echo "  Ver logs:"
echo "     cd $APP_DIR && docker compose logs -f api"
echo "     cd $APP_DIR && docker compose logs -f worker_ai"
echo ""
echo "  Reiniciar tudo:"
echo "     cd $APP_DIR && docker compose restart"
echo ""
echo "  Rebuild após git pull:"
echo "     cd $APP_DIR && git pull && docker compose up -d --build"
echo ""
echo "  SSL (substitua pelo seu domínio):"
echo "     apt-get install -y certbot"
echo "     certbot certonly --standalone -d digdig.com.br -d api.digdig.com.br"
echo "     cd $APP_DIR && docker compose restart frontend"
echo ""
echo "  Claude Code:"
echo "     cd $APP_DIR && claude /login"
echo ""
