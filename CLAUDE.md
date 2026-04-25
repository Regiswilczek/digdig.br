# Contexto do Projeto — Dig Dig

Este arquivo existe para que o Claude entenda completamente o projeto ao iniciar uma nova sessão. Leia tudo antes de qualquer ação.

---

## O Que É Este Projeto

**Dig Dig** é uma plataforma SaaS que audita automaticamente atos administrativos de órgãos públicos brasileiros usando IA (Claude API). O sistema baixa PDFs de sites oficiais, extrai o texto completo, analisa com Haiku + Sonnet para detectar irregularidades legais e morais, e apresenta os resultados via dashboard web e chat conversacional.

**Dono do projeto:** Regis Alessander Wilczek — engenheiro, desenvolvedor full-stack, fundador da T.ZION. Tem background como Assessor Parlamentar na Câmara de Curitiba (onde fez investigações manuais de transparência e descobriu o escândalo da água San Pelegrino) e depois trabalhou no próprio CAU/PR como Chefe de Gabinete e Assessor Especial. Construiu o Dig Dig como a ferramenta que não existia enquanto fazia esse trabalho manualmente.

**Contexto do CAU/PR:** Regis não é arquiteto e portanto não pode integrar chapas eleitorais do CAU/PR. O CAU/PR é o primeiro órgão auditado por ser o que ele conhece por dentro. O tom do projeto é de transparência e fiscalização pública — não partidário.

---

## Estado Atual do Projeto (Abril 2026)

### O que já está construído e funcionando

**Backend (Railway):**
- FastAPI + Celery + Redis em produção
- 29 tabelas no Supabase (PostgreSQL) com RLS e migrations aplicadas
- Pipeline Haiku completo: scraper → análise → banco
- Endpoint de rodada com guard contra duplicatas (4 camadas de proteção)
- Endpoints: `POST /pnl/orgaos/{slug}/rodadas`, `POST /pnl/rodadas/{id}/cancelar`, `GET /pnl/orgaos/{slug}/rodadas`, `GET /pnl/rodadas/{id}`

**Frontend (Lovable):**
- React + Vite + TanStack Router + shadcn/ui em produção via Lovable
- White Papers publicados como rotas: `/whitepaper-01-extracao-caupr`, `/whitepaper-02-custo-e-controle`
- Dashboard ainda sem dados reais conectados (próximo passo)

**Scraper:**
- `backend/scripts/scrape_local.py` — roda localmente (IP brasileiro) porque o servidor do CAU/PR bloqueia o Railway (403 em IPs americanos)
- 400 portarias com texto extraído, 151 escaneadas (sem camada de texto, 2018–2021)

**Pipeline IA — Estado atual:**
- Rodada `9063d83c` em progresso
- 262 de 400 portarias analisadas (66%)
- Distribuição: 168 amarelo / 93 verde / 1 laranja
- Custo rastreado no banco: $3,09 (média $0,0118/ato)
- Regimento interno cacheado: 68.000 tokens, ephemeral cache, 5 min TTL

**White Papers publicados:**
- `docs/whitepaper-01-extracao-caupr.html` + rota React
- `docs/whitepaper-02-custo-e-controle.html` + rota React

### O que ainda falta

1. **Terminar rodada atual** — 138 portarias pendentes (Haiku)
2. **Fase Sonnet** — aprofundar os casos vermelho quando Haiku terminar
3. **Deliberações via HTML** — 595 deliberações existem só como HTML, precisam de scraper diferente
4. **OCR para portarias escaneadas** — 151 portarias de 2018–2021 precisam de Tesseract
5. **Dashboard conectado** — frontend já existe, falta ligar na API com dados reais
6. **Chat conversacional** — RAG no banco, Sonnet responde perguntas sobre os atos

---

## Decisões Tomadas (não questionar sem motivo)

| Decisão | O que foi escolhido | Por quê |
|---------|--------------------|---------| 
| Modelos de IA | Haiku 4.5 (triagem) + Sonnet 4.6 (análise + chat) | Custo ~$5/rodada portarias, Sonnet resolve tudo |
| Sonnet no vermelho + laranja | Ambos vão para Sonnet na mesma rodada | Cache write do regimento é pago uma vez ($0,255); laranjas seguintes custam ~$0,06 cada via cache read — amortizado vale a pena |
| Backend | FastAPI + Celery + Redis | Async nativo, fila real para jobs longos |
| Frontend | Lovable + React + Vite + shadcn/ui + TanStack Router | Deploy gerenciado pela Lovable, integrado ao GitHub |
| Banco | PostgreSQL via Supabase | Auth + Storage + RLS inclusos |
| Deploy | Railway (backend) + Lovable (frontend) | Simples, previsível, sem DevOps pesado |
| Multi-tenancy | Schema compartilhado com RLS por tenant_id | Mais simples que schemas separados |
| PDF extraction | pdfplumber (texto nativo) | Testado: funciona nas portarias de 2022–2026 |
| Scraper | Local (não Railway) | Railway tem IP americano bloqueado pelo CAU/PR |
| Chat | RAG com contexto do banco (não re-lê PDFs) | PDFs já analisados e salvos — chat é barato |
| Billing | Mercado Pago | Mercado local, melhor para BR |

---

## Regras Críticas de Operação

### Rodadas de análise
1. **NUNCA dispare nova rodada sem verificar se existe uma ativa** — use `GET /pnl/orgaos/{slug}/rodadas` primeiro
2. Se existir rodada `em_progresso` ou `pendente`, cancele via `POST /pnl/rodadas/{id}/cancelar` antes de criar nova
3. O endpoint agora rejeita com 409 se já existe rodada ativa — mas verifique antes mesmo assim
4. Limite de custo por rodada: $15. Se atingir, a rodada cancela automaticamente.
5. A idempotência está implementada: re-rodar sobre atos já processados é gratuito (não chama API)

### Por que isso importa
Em abril/2026, rodadas paralelas + bugs de debug consumiram $23 sem resultado rastreado. As 4 camadas de proteção (endpoint guard, idempotência, cancellation check, cost threshold) + índice único parcial no banco foram implementadas para prevenir reincidência. Veja `docs/whitepaper-02-custo-e-controle.html` para o diagnóstico completo.

### Scraper local
O `scrape_local.py` **precisa rodar na máquina do Regis**, não no Railway. O servidor do CAU/PR bloqueia IPs de data centers americanos com 403. Headers de browser não ajudam — o bloqueio é por IP.

---

## Arquitetura em 30 Segundos

```
Frontend (React/Vite / Lovable — produção)
    ↓ API REST
Backend (FastAPI / Railway — produção)
    ↓ Jobs assíncronos
Workers Celery + Redis
    ├── Scraper: baixa PDFs → extrai texto → salva no banco
    │   (roda localmente — Railway bloqueado pelo CAU/PR)
    ├── Haiku: analisa todos os atos → classifica nível de alerta
    │   (em progresso: 262/400 portarias)
    ├── Sonnet: aprofunda os vermelho → fichas de denúncia
    └── Sonnet: chat conversacional via RAG

Banco: PostgreSQL (Supabase) + Storage (PDFs)
Cache: Anthropic prompt caching — regimento 68k tokens, ephemeral 5min TTL
```

---

## Cobertura Real do CAU/PR

| Tipo | Total | Com texto | Analisadas | Escaneadas |
|------|-------|-----------|------------|------------|
| Portarias | 551 | 400 | 262 (em andamento) | 151 (2018–2021) |
| Deliberações | 597 | 0 | 0 | — (HTML-only, sem PDF) |

**Distribuição dos resultados até agora (262 portarias):**
- Verde: 93 (35%) — conforme, sem irregularidades
- Amarelo: 168 (64%) — suspeito, requer atenção
- Laranja: 1 (<1%) — indício moderado-grave
- Vermelho: 0 — nenhum ainda (pipeline chegando nos anos anteriores)

---

## Documentação Completa

| Arquivo | O que contém |
|---------|-------------|
| `docs/00-visao-geral-e-comercial.md` | Produto, planos, personas, roadmap |
| `docs/01-arquitetura.md` | Stack completo, estrutura de pastas, fluxos |
| `docs/02-banco-de-dados.md` | 29 tabelas com SQL completo, RLS, índices |
| `docs/03-pipeline-ia.md` | Prompts Haiku e Sonnet, prompt caching, código |
| `docs/04-api-endpoints.md` | Todos os endpoints REST incluindo chat |
| `docs/05-frontend.md` | Páginas, componentes, layout do chat |
| `docs/06-seguranca-e-lgpd.md` | Auth, RLS, CORS, SQL injection, LGPD |
| `docs/07-scraper-e-instituicoes.md` | Código do scraper, como adicionar novo órgão |
| `docs/08-testes.md` | Unitários, integração, E2E, segurança, CI/CD |
| `docs/09-infraestrutura-e-deploy.md` | Railway, Lovable, Supabase, monitoramento |
| `docs/10-logs-e-analytics.md` | Structlog, auditoria de usuário, PostHog |
| `docs/11-chat-e-ia-conversacional.md` | RAG completo, tipos de pergunta, custos |
| `docs/12-plano-de-negocios.md` | Plano de negócios, posicionamento, projeções |
| `docs/13-api-dados-comercial.md` | Plano API & Dados (R$1.997/mês) |
| `docs/14-revisao-pre-implementacao.md` | **LEIA ANTES DE CODAR** — 8 riscos críticos |
| `docs/15-alertas-email-e-deduplicacao.md` | Alertas por email + deduplicação de nomes |
| `docs/whitepaper-01-extracao-caupr.html` | White Paper Nº 01 — jornada de extração |
| `docs/whitepaper-02-custo-e-controle.html` | White Paper Nº 02 — controle de custos |
| `docs/registro-extracao-cau-pr.md` | Versão MD do White Paper Nº 01 |

---

## Planos Comerciais

| Plano | Preço | Chat/mês | Órgãos |
|-------|-------|----------|--------|
| Cidadão | R$0 | 5 | Todos (leitura) |
| Investigador | R$197/mês | 200 | Todos |
| Profissional | R$597/mês | 1.000 | Todos |
| API & Dados | R$1.997/mês | via API | Todos + API REST |

---

## Como Adicionar Novo Órgão

1. Inserir em `tenants` com `scraper_config`
2. Inserir regimento em `knowledge_base`
3. Verificar se não há rodada ativa: `GET /pnl/orgaos/{slug}/rodadas`
4. Disparar rodada: `POST /pnl/orgaos/{slug}/rodadas`
5. Mudar `status` para `active`

Custo de IA por novo órgão: ~$5–10 (portarias com texto nativo)

---

## Regras de Trabalho Neste Projeto

1. **Sempre leia o documento relevante antes de codar** — o design está nos docs
2. **Não reinvente o schema** — 29 tabelas definidas em `02-banco-de-dados.md`
3. **Prompt caching obrigatório** — system prompt do pipeline deve usar `cache_control`
4. **RLS em tudo** — toda tabela com `tenant_id` precisa de política RLS ativa
5. **Logs em toda ação significativa** — usar `AuditLog.registrar()` nos endpoints
6. **Validar plano antes de servir dados** — verificar `user.plano` antes de retornar conteúdo
7. **Nunca commitar secrets** — toda variável sensível vai em `.env`
8. **Verificar rodada ativa antes de disparar nova** — usar `GET /pnl/orgaos/{slug}/rodadas`
9. **Scraper roda local** — não tentar rodar `scrape_local.py` no Railway

---

## Contexto para os Prompts de IA

O sistema analisa atos de órgãos públicos com foco em:
- **Irregularidades legais:** violações diretas ao regimento interno
- **Irregularidades morais/éticas:** nepotismo, perseguição política, concentração de poder
- **Uso público:** as fichas de denúncia são usadas em transparência, imprensa e processos

A IA **não afirma crimes** — usa linguagem de "indício", "suspeita", "padrão irregular". A conclusão jurídica fica para advogados.

---

## Contatos e Referências

- **Site CAU/PR:** https://www.caupr.gov.br
- **Portarias:** https://www.caupr.gov.br/portarias
- **Deliberações:** https://www.caupr.gov.br/?page_id=17916
- **Regimento Interno:** https://www.caupr.gov.br/regimento/ (6ª versão — DPOPR 0191-02/2025)
- **Lei 12.378/2010:** Lei de criação do CAU (base legal nacional)
