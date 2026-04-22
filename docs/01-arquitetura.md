# Arquitetura do Sistema

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET / USUÁRIOS                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    FRONTEND — Vercel                             │
│                    Next.js 15 + Tailwind CSS                    │
│  • Landing page pública                                         │
│  • App autenticado (dashboard, filtros, relatórios)             │
│  • Painel admin (gerenciar órgãos, rodadas de análise)          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / REST API
┌──────────────────────────────▼──────────────────────────────────┐
│                    BACKEND — Railway                             │
│                    FastAPI (Python 3.12)                        │
│  • API REST com autenticação JWT                                │
│  • Validação de planos e permissões                             │
│  • Orquestração de jobs                                         │
│  • Geração de relatórios                                        │
└──────┬───────────────────────┬────────────────────┬─────────────┘
       │                       │                    │
┌──────▼──────┐   ┌────────────▼──────────┐   ┌────▼──────────────┐
│  Supabase   │   │   Redis (Railway)      │   │  Claude API       │
│  PostgreSQL │   │   Fila de Jobs         │   │  (Anthropic)      │
│  Auth       │   │   (Celery)            │   │  Haiku + Sonnet   │
│  Storage    │   └────────────┬──────────┘   └───────────────────┘
└─────────────┘                │
                  ┌────────────▼──────────────────────────────────┐
                  │         WORKERS — Railway                       │
                  │         Celery Workers (Python)                │
                  │  • Scraper de PDFs                            │
                  │  • Extrator de texto (pdfplumber)             │
                  │  • Pipeline Haiku → Sonnet                    │
                  │  • Construção do grafo de pessoas             │
                  │  • Geração de relatórios HTML                 │
                  └───────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológico

### Frontend
| Tecnologia | Versão | Função |
|-----------|--------|--------|
| Next.js | 15.x | Framework React com SSR/SSG |
| Tailwind CSS | 3.x | Estilização |
| shadcn/ui | latest | Componentes de UI |
| Recharts | 2.x | Gráficos e visualizações |
| React Query | 5.x | Cache e sincronização de dados |
| Zustand | 4.x | Estado global simples |

### Backend
| Tecnologia | Versão | Função |
|-----------|--------|--------|
| Python | 3.12 | Linguagem principal |
| FastAPI | 0.111 | Framework API REST |
| Pydantic | 2.x | Validação de dados |
| SQLAlchemy | 2.x | ORM |
| Alembic | latest | Migrações de banco |
| Celery | 5.x | Fila de tarefas assíncronas |
| httpx | 0.27 | Cliente HTTP async |
| pdfplumber | 0.11 | Extração de texto de PDFs |
| anthropic | latest | SDK Claude API |

### Infraestrutura
| Serviço | Função |
|---------|--------|
| Supabase | PostgreSQL + Auth + Storage |
| Redis (Railway) | Broker Celery + cache |
| Railway | Deploy backend + workers |
| Vercel | Deploy frontend |
| Stripe | Billing e assinaturas |
| Resend | Email transacional |
| Sentry | Monitoramento de erros |

---

## 3. Estrutura de Diretórios

```
auditapublico/
├── frontend/                    # Next.js app
│   ├── app/
│   │   ├── (public)/           # Rotas públicas (landing, planos)
│   │   ├── (auth)/             # Login, cadastro, reset senha
│   │   ├── (app)/              # App autenticado
│   │   │   ├── dashboard/      # Dashboard principal
│   │   │   ├── [orgao]/        # Dashboard por órgão
│   │   │   │   ├── atos/       # Lista e detalhe de atos
│   │   │   │   ├── pessoas/    # Grafo de pessoas
│   │   │   │   ├── relatorios/ # Relatórios e fichas
│   │   │   │   └── padroes/    # Padrões detectados
│   │   │   └── configuracoes/  # Perfil e assinatura
│   │   └── admin/              # Painel admin (interno)
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── charts/             # Recharts wrappers
│   │   ├── atos/               # Cards e tabelas de atos
│   │   ├── pessoas/            # Grafo e cards de pessoas
│   │   └── relatorios/         # Templates de fichas
│   └── lib/
│       ├── api.ts              # Cliente API
│       ├── auth.ts             # Supabase auth
│       └── types.ts            # Tipos TypeScript
│
├── backend/                     # FastAPI app
│   ├── app/
│   │   ├── main.py             # Entry point FastAPI
│   │   ├── config.py           # Configurações e env vars
│   │   ├── database.py         # Conexão SQLAlchemy
│   │   ├── models/             # Modelos SQLAlchemy
│   │   ├── schemas/            # Schemas Pydantic
│   │   ├── routers/            # Endpoints por domínio
│   │   │   ├── auth.py
│   │   │   ├── tenants.py
│   │   │   ├── atos.py
│   │   │   ├── analises.py
│   │   │   ├── pessoas.py
│   │   │   ├── relatorios.py
│   │   │   ├── planos.py
│   │   │   └── admin.py
│   │   ├── services/           # Lógica de negócio
│   │   │   ├── scraper.py
│   │   │   ├── pdf_extractor.py
│   │   │   ├── ai_pipeline.py
│   │   │   ├── grafo_pessoas.py
│   │   │   ├── relatorio_gen.py
│   │   │   └── billing.py
│   │   └── workers/            # Tasks Celery
│   │       ├── celery_app.py
│   │       ├── tasks_scraper.py
│   │       ├── tasks_analise.py
│   │       └── tasks_relatorio.py
│   ├── migrations/             # Alembic migrations
│   ├── tests/                  # Testes
│   └── requirements.txt
│
└── docs/                       # Esta pasta
```

---

## 4. Fluxo de Dados Principal

### 4.1 Fluxo de Scraping e Análise

```
[Admin dispara rodada]
        ↓
[Celery Task: scraper]
   → Para cada PDF link nos JSONs:
     → Baixa PDF (httpx com retry)
     → Extrai texto (pdfplumber)
     → Salva ato + texto em PostgreSQL
     → Marca como "pronto para análise"
        ↓
[Celery Task: analise_haiku]
   → Para cada ato em lote de 50:
     → Monta prompt com system (cacheado) + texto do ato
     → Chama Haiku 4.5
     → Salva resultado estruturado no banco
     → Extrai pessoas/entidades citadas
     → Classifica: verde/amarelo/laranja/vermelho
        ↓
[Celery Task: analise_sonnet]
   → Lê resultados do Haiku (laranja + vermelho)
   → Para cada ato crítico:
     → Monta prompt com contexto: texto + atos relacionados + grafo de pessoas
     → Chama Sonnet 4.6
     → Salva análise profunda
     → Atualiza grafo de relacionamentos
        ↓
[Celery Task: sintese_sonnet]
   → Lê todos os resultados críticos
   → Gera narrativa executiva de padrões
   → Gera fichas de denúncia individuais
   → Salva relatórios finais
        ↓
[Notifica usuários via email (Resend)]
```

### 4.2 Fluxo de Acesso do Usuário

```
[Usuário acessa a plataforma]
        ↓
[Supabase Auth valida JWT]
        ↓
[FastAPI verifica plano e permissões]
        ↓
[Consulta PostgreSQL com RLS por tenant]
        ↓
[Retorna dados paginados para o frontend]
        ↓
[Next.js renderiza dashboard]
```

---

## 5. Multi-Tenancy

### Estratégia: Schema Compartilhado com Tenant ID

Todos os dados ficam nas mesmas tabelas, separados por `tenant_id`. Row Level Security (RLS) do Supabase garante isolamento.

**Vantagens sobre schemas separados:**
- Mais simples de manter
- Migrations únicas
- Queries cross-tenant para admin

**Proteção:**
- RLS ativo em todas as tabelas sensíveis
- `tenant_id` sempre validado no backend antes de qualquer query
- Usuários só enxergam tenants aos quais têm acesso

### Adicionando Novo Órgão

1. Inserir registro na tabela `tenants` com configuração do scraper
2. Inserir regimento interno na tabela `knowledge_base`
3. Definir regras específicas em `tenant_regras`
4. Disparar rodada de scraping + análise
5. Publicar (mudar `status` para `active`)

---

## 6. Escalabilidade

### Fase 1 (até 10 órgãos, ~20.000 atos)
- 1 instância Railway backend
- 2-4 Celery workers
- Supabase free tier (500MB)
- Custo infra: ~R$ 150/mês

### Fase 2 (10-50 órgãos, ~100.000 atos)
- Auto-scaling Railway
- 4-8 workers com concorrência
- Supabase Pro ($25/mês)
- Redis dedicado
- Custo infra: ~R$ 500/mês

### Fase 3 (50+ órgãos, 500.000+ atos)
- Migrar para AWS ECS
- RDS PostgreSQL
- ElastiCache Redis
- S3 para PDFs
- Custo infra: ~R$ 2.000/mês

---

## 7. Decisões de Arquitetura e Justificativas

| Decisão | Alternativa Considerada | Justificativa |
|---------|------------------------|---------------|
| FastAPI | Django REST | Mais rápido, async nativo, melhor para I/O intensivo (downloads PDF) |
| Celery + Redis | FastAPI BackgroundTasks | Jobs longos precisam de fila real com retry, monitoramento e concorrência |
| Supabase | PostgreSQL próprio | Auth + Storage + RLS prontos, economiza semanas de desenvolvimento |
| SQLite → PostgreSQL | Manter SQLite | Multi-tenant, concorrência, RLS exigem PostgreSQL |
| Next.js | Vite + React SPA | SSR para SEO na landing page, SSG para docs públicos |
| pdfplumber | PyMuPDF / PDFMiner | Melhor extração de tabelas e layout, mais Pythônico |
| Railway | Heroku / Fly.io | Pricing previsível, suporte Redis nativo, deploy simples |
