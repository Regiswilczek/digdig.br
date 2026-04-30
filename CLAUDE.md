# Contexto do Projeto — Dig Dig

Este arquivo existe para que o Claude entenda completamente o projeto ao iniciar uma nova sessão. Leia tudo antes de qualquer ação.

---

## O Que É Este Projeto

**Dig Dig** é uma plataforma SaaS que audita automaticamente atos administrativos de órgãos públicos brasileiros usando IA. O sistema baixa PDFs de sites oficiais, extrai texto, organiza em categorias canônicas (ATLAS), faz triagem (Piper), aprofunda os críticos (Bud), e apresenta resultados via dashboard web e chat conversacional.

**Dono do projeto:** Regis Alessander Wilczek — engenheiro, desenvolvedor full-stack, fundador da T.ZION. Tem background como Assessor Parlamentar na Câmara de Curitiba (onde fez investigações manuais de transparência e descobriu o escândalo da água San Pelegrino) e depois trabalhou no próprio CAU/PR como Chefe de Gabinete e Assessor Especial. Construiu o Dig Dig como a ferramenta que não existia enquanto fazia esse trabalho manualmente.

**Contexto do CAU/PR:** Regis não é arquiteto e portanto não pode integrar chapas eleitorais do CAU/PR. O CAU/PR é o primeiro órgão auditado por ser o que ele conhece por dentro. O tom do projeto é de transparência e fiscalização pública — não partidário.

---

## Estado Atual do Projeto (30/04/2026 — final do Sprint de Abril)

### Pipeline com 4 agentes

| Agente | Modelo | Função | Estado |
|--------|--------|--------|--------|
| **ATLAS** | Gemini 2.5 Flash Lite | Organização estrutural pré-Piper. 17 categorias, metadado barato (data, número, valor, pessoas) | ✅ 1ª run completa: 3.424 docs classificados, $2,05 |
| **Piper** | Gemini 2.5 Pro (1M tokens) | Triagem investigativa. Lê texto inteiro, classifica nível, extrai indícios e tags | ✅ 1.453 atos analisados |
| **Bud** | Claude Sonnet 4.6 | Aprofundamento dos críticos (vermelho/laranja) com contexto histórico das pessoas envolvidas | 🔄 47 atos na fila (16 vermelhos + 31 laranjas) |
| **Zew/New** | Claude Opus 4.7 | Síntese sistêmica do corpus, padrões de longa duração, hipóteses | 🚧 em testes pontuais |

### Infraestrutura VPS (Hostinger — 187.127.30.188, Ubuntu 24.04)
- Docker Compose: api, worker_ai, worker_beat, redis, frontend
- nginx (no container frontend) como reverse proxy HTTPS
- SSL via Let's Encrypt (wildcard `*.digdig.com.br`)
- Domínios ativos: `digdig.com.br`, `www.digdig.com.br`, `pnl.digdig.com.br`, `office.digdig.com.br`
- **Deploy frontend:** `bash scripts/deploy-frontend.sh` (rebuild image + restart container — comando único). Documentado em `package.json` como `deploy:frontend`.

### Backend (FastAPI + Celery + Redis)
- 32 tabelas no Supabase com RLS e migrations aplicadas
- Pipeline ATLAS → Piper → Bud (Zew em testes) — orquestrador em `app/workers/orquestrador.py`
- Endpoints públicos `/public/*`, painel `/painel/*`, conta `/me/*`, billing `/billing/*`, admin `/pnl/admin/*`
- Webhook Mercado Pago com HMAC-SHA256 validado e replay protection (300s)

### Frontend (React + Vite + TanStack Router)
- SPA servida pelo container frontend via nginx
- Painel autenticado com 5 abas: **Visão Geral, Relatório, Denúncias, Pipeline, Dados**
- Aba **Dados** organizada pelo ATLAS — 17 categorias canônicas + Pendentes + Financeiro
- **Painel de conexões** (`/conex`) — grafo navegável com mini-cards de pessoa/ato/tag, modo foco
- **Painel da conta** (`/painel/conta`) — perfil, assinatura, doação, favoritos, avatar (4 abas)
- **Botão favoritar** em cada ato + lista no painel da conta
- Sidebar fixa no viewport (sticky), avatar do usuário como link clicável
- White Papers: `/whitepaper-01` a `/whitepaper-10`

### Paperclip (office.digdig.com.br — Docker separado)
- Plataforma de agentes de IA em `/opt/digdig/tools/paperclip/docker/`
- CEO + CMO + CFO + CCO + CLO agentes ativos
- Workspace do projeto montado em `/workspace/digdig:ro` (leitura)

### Scraper
- `backend/scripts/scrape_local.py` roda localmente (IP brasileiro) — VPS é bloqueada com 403 pelo CAU/PR
- 7.718 documentos no corpus do CAU/PR atual

---

## Cobertura Real do CAU/PR (30/04/2026)

### Por tipo do scraper (origem)

| Tipo | Total | Com texto | Status |
|------|-------|-----------|--------|
| media_library | 2.845 | 1.735 | maior massa, redistribuída pelo ATLAS |
| deliberacao | 759 | 686 | |
| portaria | 551 | 550 | |
| dispensa_eletronica | 208 | 203 | |
| ata_plenaria | 161 | 110 | 51 sem texto (escaneadas pré-2018) |
| relatorio_parecer | 85 | 85 | |
| convenio | 25 | 1 | quase todos sem texto |
| portaria_normativa | 21 | 21 | |
| relatorio_tcu | 12 | 11 | |
| contratacao_direta | 12 | 12 | |
| auditoria_independente | 8 | 8 | |
| contrato | 2 | 2 | |
| **Total** | **4.689** | **3.424** | resto são docs sem texto extraível |

### Por categoria ATLAS (canônica)
| Categoria | Qtd | Categoria | Qtd |
|-----------|-----|-----------|-----|
| licitacao | 1.516 | recursos_humanos | 38 |
| deliberacao_arquivo | 624 | auditoria_externa | 36 |
| portaria_arquivo | 563 | relatorio_gestao | 32 |
| ata_plenaria | 177 | outros | 32 |
| contrato | 107 | aditivo_contratual | 25 |
| financeiro_balanco | 95 | processo_etico | 24 |
| financeiro_orcamento | 55 | juridico_parecer | 4 |
| financeiro_demonstrativo | 53 | comunicacao_institucional | 1 |
| ata_pauta_comissao | 42 | | |

### Análise IA atual
- **Piper**: 1.453 atos analisados (com `resultado_piper` populado)
- **Distribuição**: ~74% amarelo / ~15% verde / ~9% laranja / ~1% vermelho
- **Bud**: ~50 atos completos, **47 críticos pendentes na fila**
  - 21 deles são **legados** (análise primeira pelo Haiku 4.5, antes do Piper). Marcados com badge `↻ refazer` no painel admin.
- **Zew**: testes pontuais
- **Custo acumulado**: ~$22 (Piper $20,01 + ATLAS $2,05)

---

## Decisões Tomadas (não questionar sem motivo)

| Decisão | O que foi escolhido | Por quê |
|---------|--------------------|---------|
| **ATLAS pré-Piper** | Gemini Flash Lite classifica antes do Piper rodar | Filtra docs sem valor investigativo, gera metadado estrutural barato, define a taxonomia canônica do painel |
| **Piper = Gemini 2.5 Pro** | Migração de Haiku → Gemini Pro 1M tokens | Atas plenárias inteiras (40-80pg) cabem sem truncar; recall mais alto |
| **Bud = Claude Sonnet 4.6** | Análise profunda dos críticos | Linhas investigativas (histórico de 30 aparições/pessoa), parse robusto de JSON longo |
| **Streaming no Bud** | `client.messages.stream` em vez de `create` | `max_tokens=32000` (atas) excede o timeout síncrono do SDK |
| **CVSS-A scoring** | 6 dimensões reproduzíveis (FI/LI/RI/AV/AC/PR) inspirado em cyber segurança | Substitui score subjetivo; reprodutível entre análises e órgãos |
| **Meta-tags** | Tag = evento; meta-tag = padrão de pessoa ao longo do tempo | Permite responder "quem tem padrão sistemático de X" em vez de "quem aparece com tag X" |
| **Backend** | FastAPI + Celery + Redis | Async nativo, fila real para jobs longos |
| **Frontend** | React + Vite + shadcn/ui + TanStack Router | SPA com painel responsivo |
| **Banco** | PostgreSQL via Supabase | Auth + Storage + RLS |
| **Storage de avatars** | Supabase Storage bucket `avatars` | Bucket público, RLS owner-only no upload |
| **Multi-tenancy** | Schema compartilhado com RLS por tenant_id | Mais simples que schemas separados |
| **PDF extraction** | pdfplumber (texto nativo) | Funciona em 96% dos PDFs do CAU/PR pós-2022 |
| **Scraper** | Local (não VPS) | IP de data center bloqueado pelo CAU/PR |
| **Chat** | RAG com contexto do banco (não re-lê PDFs) | PDFs já analisados — chat barato |
| **Billing** | Mercado Pago | PIX nativo, parcelamento BR |

---

## Regras Críticas de Operação

### Rodadas de análise
1. **NUNCA dispare nova rodada sem verificar se existe uma ativa** — `GET /pnl/orgaos/{slug}/rodadas` primeiro
2. Se existe rodada `em_progresso` ou `pendente`, cancele antes via `POST /pnl/rodadas/{id}/cancelar`
3. Endpoint rejeita com 409 se já existe rodada ativa (constraint do banco também protege)
4. Limite de custo por rodada: $5 — auto-cancela se atingir
5. Idempotência: re-rodar sobre atos já processados é gratuito (não chama API)

### Sobre o orquestrador (`backend/app/workers/orquestrador.py`)
A rodada hoje é: scrape → Piper → Bud (críticos). **ATLAS ainda não está integrado no orquestrador automático** — roda standalone via `backend/scripts/atlas_classificar.py`. Inserir ATLAS antes do Piper é a Fase 2 do projeto ATLAS (ver white paper Nº 10).

### Scraper local
`scrape_local.py` **precisa rodar na máquina do Regis**. CAU/PR bloqueia IPs de data center com 403. Headers de browser não ajudam — bloqueio por IP.

### Mudanças destrutivas em DB compartilhado
**NUNCA** rode UPDATE em massa, DROP, downgrade alembic ou DELETE em produção sem autorização explícita. O sandbox bloqueia operações arriscadas; quando bloquear, peça pro Regis confirmar.

### Frontend
- **Para mudar qualquer coisa do front em produção:** `bash scripts/deploy-frontend.sh` (rebuild + restart container, ~3min)
- Bundle Vite é baked no Dockerfile.frontend — `dist-vps/` local NÃO é o que vai pra prod
- Cache do navegador segura JS antigo: Ctrl+Shift+R sempre

---

## Arquitetura em 30 Segundos

```
VPS Hostinger (187.127.30.188 — Docker Compose)
    ├── nginx (HTTPS) → digdig.com.br / www / pnl.digdig.com.br
    │       └── proxy → api:8000 para /painel/, /me/, /billing/, /public/, /admin/, /chat/
    ├── office.digdig.com.br → proxy → paperclip:3100
    ├── api (FastAPI porta 8000)
    ├── worker_ai (Celery — fila ai,default)
    ├── worker_beat (Celery Beat — agendamentos)
    └── redis (broker Celery)

Paperclip (Docker separado — /opt/digdig/tools/paperclip/docker/)
    ├── CEO + CMO + CFO + CCO + CLO agentes autônomos
    └── /workspace/digdig montado em :ro

Scraper: roda na máquina do Regis (IP brasileiro)
    └── salva PDFs + texto no Supabase Storage + PostgreSQL

ATLAS: roda manual via scripts/atlas_classificar.py (~10min, $2)
Piper/Bud/Zew: rodam via orquestrador Celery (rodada disparada por endpoint)

Banco: PostgreSQL (Supabase) + Storage (PDFs + avatars)
Cache: Anthropic prompt caching — regimento 68k tokens, ephemeral 5min TTL
```

---

## Tabelas-chave

```
atos                  + tipo, tipo_atlas (ATLAS canônico), numero, ementa, ...
conteudo_ato          texto extraído + qualidade (boa/parcial/ruim/digitalizado)
classificacao_atlas   saída do ATLAS (categoria, confiança, num oficial, valor, ...)
analises              resultado_piper, resultado_bud, resultado_new + CVSS-A
irregularidades       indícios extraídos (categoria, tipo, gravidade, artigo)
ato_tags / tag_historico   tags Piper/Bud com revisão auditável
pessoas / aparicao_pessoa / relacao_pessoa  rede de pessoas e ICP
users                 + avatar_url
atos_favoritos        favoritos do usuário (PK composta user+ato, RLS owner-only)
rodadas_analise       fila + custo + status
diarias               dados financeiros (Implanta)
```

Detalhes em `docs/02-banco-de-dados.md`.

---

## Documentação

| Arquivo | O que contém |
|---------|-------------|
| `docs/00-visao-geral-e-comercial.md` | Produto, planos, personas, roadmap |
| `docs/01-arquitetura.md` | Stack, estrutura de pastas, fluxos |
| `docs/02-banco-de-dados.md` | Tabelas com SQL completo, RLS, índices |
| `docs/03-pipeline-ia.md` | Prompts ATLAS/Piper/Bud/Zew, prompt caching |
| `docs/04-api-endpoints.md` | Todos os endpoints REST (público, painel, /me, admin, chat) |
| `docs/05-frontend.md` | Páginas, componentes, sidebar, painel da conta |
| `docs/06-seguranca-e-lgpd.md` | Auth, RLS, CORS, LGPD |
| `docs/07-scraper-e-instituicoes.md` | Scraper, como adicionar novo órgão |
| `docs/08-testes.md` | Unitários, integração, E2E, segurança, CI/CD |
| `docs/09-infraestrutura-e-deploy.md` | VPS, Docker, nginx, Supabase, deploy:frontend |
| `docs/10-logs-e-analytics.md` | Structlog, AuditLog, PostHog |
| `docs/11-chat-e-ia-conversacional.md` | RAG, tipos de pergunta, custos |
| `docs/12-plano-de-negocios.md` | Posicionamento, projeções |
| `docs/13-api-dados-comercial.md` | Plano API & Dados |
| `docs/14-revisao-pre-implementacao.md` | **LEIA ANTES DE CODAR** — riscos críticos |
| `docs/15-alertas-email-e-deduplicacao.md` | Alertas + deduplicação |
| `src/routes/whitepaper-01-extracao-caupr.tsx` ... `whitepaper-10-antes-da-proxima-onda.tsx` | 10 white papers publicados |

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

**Modelo:** Todo conteúdo gerado (fichas, análises profundas, denúncias, scores) é gratuito e aberto. Planos pagos desbloqueiam chat com IA e geração de documentos prontos (peças jurídicas, artigos, relatórios).

---

## Como Adicionar Novo Órgão

1. Inserir em `tenants` com `scraper_config`
2. Inserir regimento em `knowledge_base`
3. Rodar scraper local pra coletar PDFs
4. Rodar ATLAS pra classificar (`python scripts/atlas_classificar.py --tenant <slug>`)
5. Verificar se não há rodada ativa: `GET /pnl/orgaos/{slug}/rodadas`
6. Disparar Piper: `POST /pnl/orgaos/{slug}/rodadas`
7. Mudar `tenant.status` para `active`

Custo de IA por novo órgão: ~$5–15 (varia com volume + ATLAS antes)

---

## Regras de Trabalho Neste Projeto

1. **Sempre leia o documento relevante antes de codar** — design está nos docs
2. **Não reinvente o schema** — tabelas em `02-banco-de-dados.md`
3. **Prompt caching obrigatório** — system prompt do pipeline deve usar `cache_control` (Anthropic) ou implicit cache (Gemini Pro)
4. **RLS em tudo** — toda tabela com `tenant_id` ou `user_id` precisa de política RLS ativa
5. **Logs em ações significativas** — usar structlog nos endpoints; AuditLog quando relevante
6. **Validar plano antes de servir chat/exportação** — fichas/análises são livres; chat e geração de doc requerem plano
7. **Nunca commitar secrets** — `.env` no `.gitignore`; SECURITY_AUDIT.md também é gitignored
8. **Verificar rodada ativa antes de disparar nova** — endpoint guard + check manual
9. **Scraper roda local** — não tentar na VPS
10. **CEO e diretores são agentes no Paperclip** — não executam código
11. **Frontend muda? `bash scripts/deploy-frontend.sh`** — sem rebuild, nginx serve bundle antigo
12. **Mudanças destrutivas em prod precisam de autorização explícita do Regis**

---

## Contexto para os Prompts de IA

O sistema analisa atos de órgãos públicos com foco em:
- **Irregularidades legais:** violações diretas ao regimento interno, leis 12.378/2010, 8.429/92, 8.666/93, 14.133/21, LAI
- **Irregularidades morais/éticas:** nepotismo, perseguição política, concentração de poder
- **Princípios constitucionais (LIMPE):** Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência

A IA **não afirma crimes** — usa linguagem de "indício", "suspeita", "padrão irregular". A conclusão jurídica fica para advogados.

---

## Contatos e Referências

- **Site CAU/PR:** https://www.caupr.gov.br
- **Portarias:** https://www.caupr.gov.br/portarias
- **Deliberações:** https://www.caupr.gov.br/?page_id=17916
- **Regimento Interno:** https://www.caupr.gov.br/regimento/ (6ª versão — DPOPR 0191-02/2025)
- **Lei 12.378/2010:** Lei de criação do CAU
- **Portal de transparência:** https://transparencia.caupr.gov.br/
- **Implanta:** API mensal de dados financeiros (diárias, passagens) — fonte das tabelas `diarias`
