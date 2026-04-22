# Infraestrutura e Deploy

---

## 1. Ambientes

| Ambiente | Finalidade | URL |
|---------|-----------|-----|
| **Development** | Local dos desenvolvedores | localhost |
| **Staging** | Testes antes de produção | staging.auditapublico.com.br |
| **Production** | Usuários reais | auditapublico.com.br |

---

## 2. Serviços e Responsabilidades

| Serviço | Plano | Custo/mês | O que roda |
|---------|-------|-----------|-----------|
| **Vercel** | Hobby → Pro | $0 → $20 | Frontend Next.js |
| **Railway** | Starter | ~$20-50 | Backend FastAPI + Celery Workers + Redis |
| **Supabase** | Free → Pro | $0 → $25 | PostgreSQL + Auth + Storage |
| **Stripe** | Pay-as-you-go | 2.9% + R$0.30/transação | Billing |
| **Resend** | Free → Pro | $0 → $20 | Email transacional |
| **Sentry** | Free | $0 | Monitoramento de erros |
| **Total inicial** | | **~R$ 200-300/mês** | |

---

## 3. Arquitetura de Deploy

```
┌──────────────────────────────────────────────────────────┐
│  VERCEL (Frontend)                                       │
│  ├── auditapublico.com.br        → Next.js (produção)   │
│  └── staging.auditapublico.com.br → Next.js (staging)   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  RAILWAY (Backend)                                       │
│  ├── api-service    → FastAPI (porta 8000)              │
│  ├── worker-service → Celery workers (3 processos)      │
│  ├── beat-service   → Celery Beat (agendamentos)        │
│  └── redis-service  → Redis 7                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  SUPABASE (Dados)                                        │
│  ├── PostgreSQL 15 (banco principal)                    │
│  ├── Auth (JWT, usuários)                               │
│  └── Storage (PDFs, relatórios)                        │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Variáveis de Ambiente por Serviço

### Backend (Railway)
```env
# Banco
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...   # service_role — nunca exposta ao cliente

# IA
ANTHROPIC_API_KEY=sk-ant-...

# Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@auditapublico.com.br

# Redis
REDIS_URL=redis://:senha@redis.railway.internal:6379

# App
SECRET_KEY=chave-aleatoria-longa-para-JWT-interno
ENVIRONMENT=production
ALLOWED_ORIGINS=https://auditapublico.com.br,https://www.auditapublico.com.br
SENTRY_DSN=https://...@sentry.io/...

# Limites
MAX_PDF_SIZE_MB=10
CLAUDE_BUDGET_ALERT_USD=20.0
```

### Frontend (Vercel)
```env
# Apenas variáveis PÚBLICAS
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # anon key — permissões mínimas
NEXT_PUBLIC_API_URL=https://api.auditapublico.com.br
NEXT_PUBLIC_STRIPE_PK=pk_live_...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## 5. Configuração Railway

### railway.toml
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile"

[[services]]
name = "api"
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"
healthcheckPath = "/health"
healthcheckTimeout = 10

[[services]]
name = "worker"
startCommand = "celery -A app.workers.celery_app worker --loglevel=info --concurrency=4"

[[services]]
name = "beat"
startCommand = "celery -A app.workers.celery_app beat --loglevel=info"
```

### Dockerfile (Backend)
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Instalar dependências do sistema (para pdfplumber e tesseract)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-por \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Usuário não-root
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8000
```

---

## 6. CI/CD — GitHub Actions

### Deploy automático
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    uses: ./.github/workflows/tests.yml

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/railway-action@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: api

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Estratégia de branching
```
main          → deploy automático em produção
staging       → deploy automático em staging
feature/*     → PR para staging, testes obrigatórios
hotfix/*      → PR direto para main (emergências)
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
| Falha de pagamento Stripe | Email para usuário + admin |

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
| Railway reinicia pod | < 2 min | 0 | Automático |
| Banco corrompido | < 1h | 24h | Restore Supabase |
| Deploy quebrado | < 10 min | 0 | Rollback Railway |
| Perda total Railway | < 2h | 24h | Re-deploy + restore |

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

**Fase 1 (MVP, 1-5 órgãos):**
```
Uvicorn: 2 workers
Celery: 3 workers, concurrency=4
Redis: 1 instância Railway
```

**Fase 2 (5-20 órgãos):**
```
Uvicorn: 4 workers (ou auto-scale Railway)
Celery: 5 workers, concurrency=8
Redis: 1 instância dedicada
```

**Fase 3 (20+ órgãos):**
```
Migrar para AWS ECS com auto-scaling
SQS no lugar do Redis/Celery
RDS PostgreSQL com read replicas
CloudFront para assets estáticos
```

---

## 11. Checklist de Deploy (Pré-produção)

### Infraestrutura
- [ ] Todos os secrets configurados no Railway e Vercel
- [ ] Domínio configurado com HTTPS
- [ ] Health check respondendo `/health`
- [ ] Migrations aplicadas em produção
- [ ] Stripe webhook configurado com o endpoint correto

### Segurança
- [ ] CORS configurado apenas para o domínio de produção
- [ ] RLS ativo no Supabase
- [ ] Rate limiting ativo
- [ ] Sentry configurado e recebendo eventos

### Dados
- [ ] Planos inseridos na tabela `planos`
- [ ] CAU-PR inserido na tabela `tenants`
- [ ] Regimento Interno do CAU-PR inserido em `knowledge_base`
- [ ] Regras específicas do CAU-PR inseridas em `tenant_regras`

### Funcional
- [ ] Fluxo de cadastro + login funciona
- [ ] Stripe checkout funciona em modo live
- [ ] Webhook Stripe recebe eventos
- [ ] Email de boas-vindas é enviado
- [ ] Dashboard CAU-PR carrega com dados reais
- [ ] Exportação de ficha de denúncia funciona
