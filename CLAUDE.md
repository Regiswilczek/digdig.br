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

**Infraestrutura VPS (Hostinger — 187.127.30.188, Ubuntu 24.04):**
- Docker Compose roda tudo: api, worker_ai, worker_beat, redis, frontend
- nginx (dentro do container frontend) como reverse proxy HTTPS para todos os domínios
- SSL via Let's Encrypt (certbot, wildcard `*.digdig.com.br`)
- Domínios ativos: `digdig.com.br`, `www.digdig.com.br`, `pnl.digdig.com.br`, `office.digdig.com.br`

**Backend (FastAPI + Celery + Redis — VPS Docker):**
- 29 tabelas no Supabase (PostgreSQL) com RLS e migrations aplicadas
- Pipeline Haiku completo: scraper → análise → banco
- Endpoint de rodada com guard contra duplicatas (4 camadas de proteção)
- Endpoints: `POST /pnl/orgaos/{slug}/rodadas`, `POST /pnl/rodadas/{id}/cancelar`, `GET /pnl/orgaos/{slug}/rodadas`, `GET /pnl/rodadas/{id}`
- Webhook Mercado Pago com validação de assinatura HMAC-SHA256 implementada

**Frontend (React + Vite — VPS Docker):**
- SPA servida pelo container frontend via nginx
- Painel autenticado com 6 abas (Visão Geral, Portarias, Deliberações, Denúncias, Pipeline, Relatório)
- Realtime via Supabase, ficha de ato com gating por plano
- White Papers: `/whitepaper-01-extracao-caupr` a `/whitepaper-07-pre-auditoria-integrada`

**Paperclip (office.digdig.com.br — VPS Docker separado):**
- Plataforma de agentes de IA em `/opt/digdig/tools/paperclip/docker/`
- CEO + CMO + CFO + CCO + CLO agentes ativos
- Workspace do projeto montado em `/workspace/digdig:ro` (leitura somente)

**Scraper:**
- `backend/scripts/scrape_local.py` — roda localmente (IP brasileiro) porque o servidor do CAU/PR bloqueia IPs de data centers (403)
- 551 portarias coletadas; 151 escaneadas (2018–2021, sem camada de texto)

**Pipeline IA — Estado atual (consultado 25/04/2026):**
- Rodada `5b365c0d` status `haiku_completo` — Sonnet ainda não rodou
- **1.096 atos analisados pelo Haiku** (portarias 100% + deliberações 72%)
- Distribuição: 816 amarelo / 165 verde / 101 laranja / 14 vermelho
- Custo acumulado no banco: **$20,01**
- **Próximo passo urgente:** disparar Sonnet nos 115 críticos (14 vermelhos + 101 laranjas)

**White Papers publicados:**
- `docs/whitepaper-01-extracao-caupr.html` até `whitepaper-07-pre-auditoria-integrada.html`

### O que ainda falta

1. **Fase Sonnet** — 115 atos críticos (14 vermelhos + 101 laranjas) aguardam análise profunda
2. **Deliberações restantes** — 212 deliberações ainda não processadas pelo Haiku
3. **Chat conversacional** — RAG no banco, Sonnet responde perguntas sobre os atos
4. **Billing live** — Mercado Pago webhook está configurado e validado; falta ativação de plano no banco
5. **OCR para portarias escaneadas** — 151 portarias de 2018–2021 precisam de Tesseract
6. **Alertas por email** — Resend configurado mas sem código de disparo

---

## Decisões Tomadas (não questionar sem motivo)

| Decisão | O que foi escolhido | Por quê |
|---------|--------------------|---------| 
| Modelos de IA | Haiku 4.5 (triagem) + Sonnet 4.6 (análise + chat) | Custo ~$5/rodada portarias, Sonnet resolve tudo |
| Sonnet no vermelho + laranja | Ambos vão para Sonnet na mesma rodada | Cache write do regimento é pago uma vez ($0,255); laranjas seguintes custam ~$0,06 cada via cache read — amortizado vale a pena |
| Backend | FastAPI + Celery + Redis | Async nativo, fila real para jobs longos |
| Frontend | React + Vite + shadcn/ui + TanStack Router | SPA servida por nginx no VPS |
| Banco | PostgreSQL via Supabase | Auth + Storage + RLS inclusos |
| Deploy | VPS Hostinger (Docker Compose) | Controle total, IP brasileiro, custo fixo |
| Agentes IA (empresa) | Paperclip em office.digdig.com.br | CEO e diretores rodam como agentes autônomos |
| Multi-tenancy | Schema compartilhado com RLS por tenant_id | Mais simples que schemas separados |
| PDF extraction | pdfplumber (texto nativo) | Testado: funciona nas portarias de 2022–2026 |
| Scraper | Local (não VPS) | IP de data center bloqueado pelo CAU/PR |
| Chat | RAG com contexto do banco (não re-lê PDFs) | PDFs já analisados e salvos — chat é barato |
| Billing | Mercado Pago | Mercado local, PIX nativo, parcelamento BR |

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
VPS Hostinger (187.127.30.188 — Docker Compose)
    ├── nginx (HTTPS) → digdig.com.br / www / pnl.digdig.com.br
    │       └── proxy → api:8000 para /painel/, /billing/, /public/, /admin/
    ├── office.digdig.com.br → proxy → paperclip:3100
    ├── api (FastAPI porta 8000)
    ├── worker_ai (Celery — fila ai,default)
    ├── worker_beat (Celery Beat — agendamentos)
    └── redis (broker Celery)

Paperclip (Docker separado — /opt/digdig/tools/paperclip/docker/)
    ├── CEO + CMO + CFO + CCO + CLO agentes autônomos
    └── /workspace/digdig montado em :ro (lê docs do projeto)

Scraper: roda na máquina do Regis (IP brasileiro)
    └── salva PDFs + texto no Supabase Storage + PostgreSQL

Banco: PostgreSQL (Supabase) + Storage (PDFs)
Cache: Anthropic prompt caching — regimento 68k tokens, ephemeral 5min TTL
```

---

## Cobertura Real do CAU/PR

| Tipo | Total | Processadas | Status |
|------|-------|-------------|--------|
| Portarias | 551 | 551 (100%) | ✅ Haiku completo |
| Deliberações | 757 | 545 (72%) | 🔄 212 pendentes |
| **Total Haiku** | **1.308** | **1.096** | — |
| Total Sonnet | — | 21 | 🔄 115 críticos pendentes |

**Distribuição atual (1.096 atos — consultado 25/04/2026):**
- Amarelo: 816 (74%) — suspeito, requer atenção
- Verde: 165 (15%) — conforme, sem irregularidades
- Laranja: 101 (9%) — indício moderado-grave
- Vermelho: 14 (1%) — irregularidade crítica

**Custo acumulado:** $20,01 (média $0,0118/ato no Haiku)

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
| Gratuito | R$0 | — | Todos os dados (leitura completa, tudo aberto) |
| Investigador | R$179/mês | chat + 5 docs/mês | Todos |
| Profissional | R$679/mês | chat + 15 docs/mês | Todos |
| Patrocinador | R$990/ano (~R$82/mês) | chat + 5 docs/mês | Todos + badge de apoiador |
| API & Dados | R$1.998/mês | via API ilimitado | Todos + API REST |
| Técnico | Sob consulta | ilimitado | Personalizado |

**Modelo:** Todo conteúdo gerado (fichas, análises profundas, denúncias, scores) é gratuito e aberto. Planos pagos desbloqueiam chat com IA e geração de documentos prontos (peças jurídicas, artigos, relatórios em PDF/.md).

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
6. **Validar plano antes de servir chat/exportação** — conteúdo (fichas, análises) é livre para todos; só chat e geração de documentos requerem verificação de plano
7. **Nunca commitar secrets** — toda variável sensível vai em `.env`
8. **Verificar rodada ativa antes de disparar nova** — usar `GET /pnl/orgaos/{slug}/rodadas`
9. **Scraper roda local** — não tentar rodar `scrape_local.py` no VPS (IP de data center bloqueado)
10. **CEO e diretores são agentes no Paperclip** — não executam código, só criam issues e aprovações

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
