# Infraestrutura e Deploy

> ## ⚠️ Atualização — Sprint Abril 2026
>
> ### Comando único de deploy do frontend
>
> ```bash
> bash scripts/deploy-frontend.sh
> # ou
> bun run deploy:frontend
> ```
>
> Faz rebuild da imagem `digdig-frontend` (npm install + vite build:vps no stage 1) e reinicia o container nginx (~3min). Necessário **toda vez** que `src/`, `public/` ou `vite.config.vps.ts` mudar — o `dist-vps/` local NÃO é o que vai pra produção.
>
> ### nginx — locations novos
>
> Em `nginx/nginx.conf` (server `digdig.com.br`):
>
> ```nginx
> # Painel do usuário
> location = /me                      # GET/PATCH
> location /me/                       # /me/avatar, /me/assinatura, /me/favoritos
>     client_max_body_size 5M;       # avatar até 2MB com folga
>
> # Já existiam: /painel/, /public/, /billing/, /webhooks/, /admin/, /chat/, /health
> ```
>
> Pra recarregar nginx **sem rebuild** quando só a config muda:
>
> ```bash
> docker cp nginx/nginx.conf digdig-frontend-1:/etc/nginx/nginx.conf
> docker exec digdig-frontend-1 nginx -t
> docker exec digdig-frontend-1 nginx -s reload
> ```
>
> ### Backend não tem volume mount
>
> O código do backend é **baked-in na imagem `digdig-api`**. `docker compose restart api` NÃO pega mudanças de código — precisa de:
>
> ```bash
> docker compose build api
> docker compose up -d api
> ```
>
> ### Supabase Storage bucket de avatars
>
> Bucket `avatars` criado out-of-band via SQL: `backend/scripts/setup_supabase_storage.sql`. Roda uma vez no SQL Editor do Supabase OU via psql como service_role. Tem RLS owner-only no insert/update/delete + leitura pública.
>
> ### Supabase Secret Key (formato novo)
>
> A `SUPABASE_SERVICE_ROLE_KEY` do projeto está no formato novo `sb_secret_*` (não JWT). Pra usar com Storage REST, precisa mandar tanto no header `Authorization: Bearer ...` quanto no header `apikey: ...`. Sem o `apikey`, Storage devolve 400 "Invalid Compact JWS".
>
> ### Worker do Celery e o ATLAS
>
> O ATLAS é executado como **script Python no host** (`backend/scripts/atlas_classificar.py`), não como task Celery. Por isso `docker compose restart worker_ai` não afeta um run em andamento.
>
> ---

## 1. Ambientes

| Ambiente | Finalidade | URL |
|---------|-----------|-----|
| **Development** | Local dos desenvolvedores | localhost |
| **Production** | Usuários reais | digdig.com.br |

---

## 2. Serviços e Responsabilidades

| Serviço | Plano | Custo/mês | O que roda |
|---------|-------|-----------|-----------|
| **VPS Hostinger** | KVM2 (4 vCPU, 8GB RAM) | ~R$100–150 | Tudo: nginx, frontend, api, workers, redis, paperclip |
| **Supabase** | Free → Pro | $0 → $25 | PostgreSQL + Auth + Storage + Realtime |
| **Mercado Pago** | Pay-as-you-go | ~3.99% + R$0.40/transação | Billing (PIX, cartão, boleto) |
| **Resend** | Free → Pro | $0 → $20 | Email transacional |
| **Anthropic** | Pay-as-you-go | ~$5–20/rodada | Claude Haiku + Sonnet |
| **Sentry** | Free | $0 | Monitoramento de erros |
| **Total mensal estimado** | | **~R$200–300** | |

---

## 3. Arquitetura de Deploy

```
┌──────────────────────────────────────────────────────────────┐
│  VPS HOSTINGER (187.127.30.188 — Ubuntu 24.04)               │
│                                                              │
│  Docker Compose — /opt/digdig/docker-compose.yml             │
│  ├── frontend  → nginx HTTPS, porta 80/443                  │
│  │   ├── digdig.com.br / www → SPA React + proxy /api       │
│  │   └── pnl.digdig.com.br  → SPA React + proxy /api        │
│  ├── api        → FastAPI (porta 8000 interna)              │
│  ├── worker_ai  → Celery (filas ai,default)                 │
│  ├── worker_beat→ Celery Beat (agendamentos)                │
│  └── redis      → Redis 7 (broker Celery)                   │
│                                                              │
│  Docker Compose separado — tools/paperclip/docker/          │
│  ├── office.digdig.com.br → Paperclip (proxy do nginx)      │
│  │   server → Node.js porta 3100                            │
│  └── db     → PostgreSQL 17 (banco interno Paperclip)       │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  SUPABASE (Dados)                                        │
│  ├── PostgreSQL 15 (banco principal Dig Dig)            │
│  ├── Auth (JWT, usuários)                               │
│  └── Storage (PDFs, relatórios)                        │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Variáveis de Ambiente por Serviço

### Backend (VPS — backend/.env)
```env
# Banco
DATABASE_URL=postgresql+asyncpg://...@pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_JWT_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...

# IA
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_HAIKU_MODEL=claude-haiku-4-5-20251001
CLAUDE_SONNET_MODEL=claude-sonnet-4-6

# Billing (Mercado Pago)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=...  # usado para validação HMAC-SHA256

# Email
RESEND_API_KEY=re_...
RESEND_FROM=noreply@digdig.com.br

# Redis
REDIS_URL=redis://redis:6379/0

# App
ENVIRONMENT=production
ALLOWED_ORIGINS=https://digdig.com.br,https://www.digdig.com.br,https://pnl.digdig.com.br
FRONTEND_URL=https://digdig.com.br
WEBHOOK_SECRET=...
```

### Frontend (VPS — .env na raiz, args do Dockerfile.frontend)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://digdig.com.br
VITE_MP_PUBLIC_KEY=APP_USR-...
```

### Paperclip (tools/paperclip/.env)
```env
DATABASE_URL=postgres://paperclip:paperclip@db:5432/paperclip
PORT=3100
SERVE_UI=true
BETTER_AUTH_SECRET=...
ANTHROPIC_API_KEY=sk-ant-...
PAPERCLIP_PUBLIC_URL=https://office.digdig.com.br
PAPERCLIP_DEPLOYMENT_MODE=authenticated
PAPERCLIP_DEPLOYMENT_EXPOSURE=private
```

---

## 5. Configuração VPS — Docker Compose

### Serviços principais (docker-compose.yml na raiz)

```yaml
services:
  redis:       # Redis 7 Alpine — broker Celery
  api:         # FastAPI, porta 8000 interna, 2 workers uvicorn
  worker_ai:   # Celery worker, filas ai,default, concurrency=2
  worker_beat: # Celery Beat — agendamentos
  frontend:    # nginx + SPA React, porta 80/443, monta /etc/letsencrypt
```

### Serviços Paperclip (tools/paperclip/docker/docker-compose.yml)

```yaml
services:
  db:     # PostgreSQL 17 Alpine — banco interno do Paperclip
  server: # Node.js, porta 3100, monta /opt/digdig em /workspace/digdig:ro
```

### Comandos de operação

```bash
# Na VPS como root — subir tudo
cd /opt/digdig
docker compose up -d

# Subir Paperclip separado
cd /opt/digdig/tools/paperclip/docker
docker compose up -d

# Recriar serviços após mudança de .env
docker compose up -d --force-recreate api worker_ai

# Ver logs
docker compose logs -f api
docker compose logs -f worker_ai

# Renovar SSL (certbot já configurado como cron no host)
certbot renew
docker exec digdig-frontend-1 nginx -s reload
```

---

## 6. CI/CD — Deploy na VPS

O deploy é manual via SSH + git pull + docker compose. Não há CI/CD automático ainda.

### Fluxo de deploy manual

```bash
# Na VPS como root
cd /opt/digdig
git pull origin main
docker compose build api worker_ai worker_beat frontend
docker compose up -d
```

### Atualizar nginx.conf sem rebuild

O nginx.conf é copiado no build do container frontend (COPY). Para mudanças sem rebuild:

```bash
docker cp /opt/digdig/nginx/nginx.conf digdig-frontend-1:/etc/nginx/nginx.conf
docker exec digdig-frontend-1 nginx -s reload
```

### Estratégia de branching
```
main    → branch de produção — push dispara pull na VPS
feature/* → PR para main
hotfix/*  → PR direto para main (emergências)
```

---

## 7. Migrações de Banco de Dados

### Fluxo de migração
```bash
# Criar nova migração
alembic revision --autogenerate -m "adicionar_campo_score_risco"

# Aplicar em desenvolvimento
alembic upgrade head

# Verificar migrações pendentes
alembic current
alembic history
```

### Migração automática no deploy
```python
# backend/app/main.py
from alembic.config import Config
from alembic import command

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Executar migrações pendentes na inicialização
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    yield
```

### Regras de migração segura
- Nunca dropar coluna em produção sem deprecation period de 1 release
- Sempre criar índices `CONCURRENTLY` para não travar a tabela
- Adicionar colunas com `DEFAULT` ou `NULLABLE` primeiro
- Backfills de dados grandes: job separado, não dentro da migração

```sql
-- CORRETO: criar índice sem travar
CREATE INDEX CONCURRENTLY idx_atos_nivel ON atos(tenant_id, nivel_alerta);

-- ERRADO: trava a tabela em produção
CREATE INDEX idx_atos_nivel ON atos(tenant_id, nivel_alerta);
```

---

## 8. Monitoramento e Observabilidade

### 8.1 Health Check
```python
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        db_ok = True
    except:
        db_ok = False
    
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "error",
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }
```

### 8.2 Sentry — Erros e Performance
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.ENVIRONMENT,
    traces_sample_rate=0.1,   # 10% das requests para performance
    profiles_sample_rate=0.05,
    integrations=[
        FastApiIntegration(),
        CeleryIntegration(),
        SqlalchemyIntegration(),
    ]
)
```

### 8.3 Logs Estruturados
```python
import structlog

logger = structlog.get_logger()

# Uso nos services
logger.info("analise_concluida",
    ato_id=ato_id,
    tenant_id=tenant_id,
    nivel_alerta=resultado["nivel_alerta"],
    custo_usd=custo,
    duracao_ms=duracao
)

logger.error("erro_download_pdf",
    ato_id=ato_id,
    url=url,
    status_code=resp.status_code,
    tentativa=tentativa
)
```

### 8.4 Alertas Automáticos (via Sentry ou Resend)

| Condição | Ação |
|---------|------|
| Custo Claude > $20/rodada | Email para admin |
| Taxa de erro API > 5% em 5 min | Alerta Sentry |
| Worker Celery parado > 10 min | Alerta Sentry |
| Banco indisponível | Alerta Sentry crítico |
| Falha de pagamento Mercado Pago | Email para usuário + admin |

---

## 9. Backup e Recuperação

### Banco de Dados (Supabase)
- Backups automáticos diários (plano Pro)
- Retenção: 7 dias (Free) → 30 dias (Pro)
- Point-in-time recovery: disponível no Pro
- Restore: via painel Supabase ou CLI

### PDFs no Storage
- Os PDFs são documentos públicos — podem ser re-baixados do site do órgão
- Backup do Storage: não crítico (pode ser re-scraped)
- Relatórios gerados: regeneráveis a partir dos dados do banco

### Plano de Recovery (RTO/RPO)
| Cenário | RTO | RPO | Ação |
|---------|-----|-----|------|
| Container cai e sobe sozinho | < 2 min | 0 | `docker compose up -d` automático via restart:unless-stopped |
| Banco corrompido | < 1h | 24h | Restore Supabase |
| Deploy quebrado | < 10 min | 0 | `git revert` + `docker compose up -d` no commit anterior |
| Perda total da VPS | < 2h | 24h | Provisionar nova VPS + `git clone` + `.env` + `docker compose up -d` |

---

## 10. Escalabilidade

### Gargalos conhecidos e soluções

| Gargalo | Quando acontece | Solução |
|---------|----------------|---------|
| Workers lentos | Muitos PDFs simultâneos | Aumentar `--concurrency` do Celery |
| API lenta | Muitos usuários simultâneos | Aumentar `--workers` do Uvicorn |
| Banco lento | > 100k atos por tenant | Revisar índices + connection pooling (pgBouncer) |
| Storage cheio | Muitos órgãos com PDFs | Migrate para S3 |
| Claude rate limit | Muitas análises paralelas | Reduzir `LOTE_SIZE` do Celery task |

### Configuração de workers por fase

**Fase 1 (MVP, 1-5 órgãos — atual):**
```
Uvicorn: 2 workers
Celery worker_ai: concurrency=2
Redis: 1 instância no Docker Compose (com senha via REDIS_PASSWORD)
VPS: KVM2 (4 vCPU, 8 GB RAM) — Hostinger
```

**Fase 2 (5-20 órgãos):**
```
Uvicorn: 4 workers
Celery worker_ai: concurrency=4
Redis: mesma instância (Redis é leve)
VPS: upgrade para KVM4 (8 vCPU, 16 GB RAM) se necessário
```

**Fase 3 (20+ órgãos):**
```
Considerar migração para VPS dedicada maior ou múltiplas VPS
Nginx load balancer na frente dos workers
Redis Cluster se filas crescerem muito
Supabase Pro com pgBouncer para connection pooling
```

---

## 11. Checklist de Deploy (Pré-produção)

### Infraestrutura
- [ ] Arquivo `.env` na raiz da VPS preenchido com todos os secrets (nunca commitar)
- [ ] `docker compose build` concluído sem erros
- [ ] `docker compose up -d` — todos os 5 containers `Up`
- [ ] Domínio configurado com HTTPS (certbot wildcard `*.digdig.com.br`)
- [ ] Health check respondendo: `curl https://digdig.com.br/health`
- [ ] Migrations aplicadas: `docker compose exec api alembic upgrade head`
- [ ] Webhook Mercado Pago configurado com o endpoint correto (`/billing/webhook/mercadopago`)

### Segurança
- [ ] CORS configurado apenas para os domínios de produção
- [ ] RLS ativo no Supabase (todas as tabelas com `tenant_id`)
- [ ] Rate limiting ativo no nginx
- [ ] Sentry configurado e recebendo eventos
- [ ] `REDIS_PASSWORD` definido no `.env` e referenciado no `docker-compose.yml`

### Dados
- [ ] Planos inseridos na tabela `planos`
- [ ] CAU-PR inserido na tabela `tenants`
- [ ] Regimento Interno do CAU-PR inserido em `knowledge_base`
- [ ] Regras específicas do CAU-PR inseridas em `tenant_regras`

### Funcional
- [ ] Fluxo de cadastro + login funciona (Supabase Auth)
- [ ] Mercado Pago checkout funciona em modo live
- [ ] Webhook Mercado Pago recebe eventos (validação HMAC-SHA256)
- [ ] Email de boas-vindas é enviado (Resend)
- [ ] Dashboard CAU-PR carrega com dados reais
- [ ] Exportação de ficha de denúncia funciona
- [ ] Verificar rodada ativa antes de disparar nova: `GET /pnl/orgaos/{slug}/rodadas`
