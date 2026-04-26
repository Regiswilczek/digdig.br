#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-vps.sh — Dig Dig VPS Setup (Ubuntu 24.04 LTS)
# Instala tudo: sistema, Node.js 20, Python 3.12, Redis, nginx, Claude Code
#
# Uso:
#   chmod +x setup-vps.sh
#   sudo ./setup-vps.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e  # para em qualquer erro

REPO_URL="https://github.com/Regiswilczek/digdig.br.git"
APP_DIR="/opt/digdig"
APP_USER="digdig"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Dig Dig VPS Setup — Ubuntu 24.04 LTS"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. Sistema base ───────────────────────────────────────────────────────────
echo "▶ [1/9] Atualizando sistema..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git unzip htop nano \
  build-essential \
  software-properties-common \
  libpq-dev libffi-dev libssl-dev \
  libjpeg-dev libpng-dev zlib1g-dev \
  python3-pip python3-venv python3-dev \
  redis-server \
  nginx \
  certbot python3-certbot-nginx

echo "✓ Sistema atualizado"

# ── 2. Node.js 20 ─────────────────────────────────────────────────────────────
echo ""
echo "▶ [2/9] Instalando Node.js 20..."
if ! command -v node &>/dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
  apt-get install -y -qq nodejs
fi
echo "✓ Node.js $(node -v) / npm $(npm -v)"

# ── 3. Claude Code ────────────────────────────────────────────────────────────
echo ""
echo "▶ [3/9] Instalando Claude Code..."
curl -fsSL https://claude.ai/install.sh | bash
echo "✓ Claude Code instalado"
echo "  → Após o setup, rode: claude /login"

# ── 4. Usuário de serviço ─────────────────────────────────────────────────────
echo ""
echo "▶ [4/9] Criando usuário de serviço '$APP_USER'..."
if ! id "$APP_USER" &>/dev/null; then
  useradd --system --shell /bin/bash --home "$APP_DIR" --create-home "$APP_USER"
fi
echo "✓ Usuário $APP_USER ok"

# ── 5. Clonar repositório ─────────────────────────────────────────────────────
echo ""
echo "▶ [5/9] Clonando repositório..."
if [ -d "$APP_DIR/.git" ]; then
  echo "  Repositório já existe — fazendo git pull..."
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
echo "✓ Código em $APP_DIR"

# ── 6. Python venv + dependências backend ─────────────────────────────────────
echo ""
echo "▶ [6/9] Instalando dependências Python..."
cd "$APP_DIR/backend"
python3 -m venv .venv
source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
deactivate
echo "✓ Python $(python3 --version) / venv criado"

# ── 7. Dependências frontend ──────────────────────────────────────────────────
echo ""
echo "▶ [7/9] Instalando dependências Node.js (backend do frontend)..."
cd "$APP_DIR"
npm install --silent
echo "✓ npm install concluído"

# ── 8. Redis ──────────────────────────────────────────────────────────────────
echo ""
echo "▶ [8/9] Configurando Redis..."
systemctl enable redis-server
systemctl start redis-server
redis-cli ping | grep -q PONG && echo "✓ Redis rodando" || echo "⚠ Redis não respondeu"

# ── 9. Serviços systemd (uvicorn + celery) ────────────────────────────────────
echo ""
echo "▶ [9/9] Criando serviços systemd..."

# uvicorn (FastAPI)
cat > /etc/systemd/system/digdig-api.service <<EOF
[Unit]
Description=Dig Dig API (FastAPI + uvicorn)
After=network.target redis.service

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$APP_DIR/backend/.env
ExecStart=$APP_DIR/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# celery worker
cat > /etc/systemd/system/digdig-worker.service <<EOF
[Unit]
Description=Dig Dig Celery Worker
After=network.target redis.service

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$APP_DIR/backend/.env
ExecStart=$APP_DIR/backend/.venv/bin/celery -A app.celery_app worker --loglevel=info --concurrency=2
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable digdig-api digdig-worker
echo "✓ Serviços criados (não iniciados — configure o .env primeiro)"

# ── nginx config básico ───────────────────────────────────────────────────────
cat > /etc/nginx/sites-available/digdig <<'EOF'
server {
    listen 80;
    server_name _;  # substitua pelo seu domínio

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Rotas diretas do backend (sem prefixo /api/)
    location ~ ^/(public|painel|billing|admin|webhooks|health)/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Frontend (servido pelo Lovable, ou build estático aqui)
    location / {
        return 301 https://digdig.com.br$request_uri;
    }
}
EOF

ln -sf /etc/nginx/sites-available/digdig /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "✓ nginx configurado"

# ── Resumo final ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Setup concluído!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Próximos passos:"
echo ""
echo "  1. Criar o arquivo de ambiente:"
echo "     cp $APP_DIR/backend/.env.example $APP_DIR/backend/.env"
echo "     nano $APP_DIR/backend/.env"
echo "     # Preencha: DATABASE_URL, ANTHROPIC_API_KEY,"
echo "     # SUPABASE_*, MERCADOPAGO_*, etc."
echo ""
echo "  2. Iniciar os serviços:"
echo "     systemctl start digdig-api digdig-worker"
echo "     systemctl status digdig-api"
echo ""
echo "  3. Ver logs em tempo real:"
echo "     journalctl -u digdig-api -f"
echo "     journalctl -u digdig-worker -f"
echo ""
echo "  4. SSL (substitua pelo seu domínio):"
echo "     certbot --nginx -d api.digdig.com.br"
echo ""
echo "  5. Claude Code:"
echo "     cd $APP_DIR && claude /login"
echo ""
