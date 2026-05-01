# Contexto do Projeto — Dig Dig

Este arquivo existe para que o Claude entenda completamente o projeto ao iniciar uma nova sessão. Leia tudo antes de qualquer ação.

---

## O Que É Este Projeto

**Dig Dig** é uma plataforma SaaS que audita automaticamente atos administrativos de órgãos públicos brasileiros usando IA. O sistema baixa PDFs de sites oficiais, extrai texto, organiza em categorias canônicas (ATLAS), faz triagem (Piper), aprofunda os críticos (Bud), e apresenta resultados via dashboard web e chat conversacional.

**Dono do projeto:** Regis Alessander Wilczek — engenheiro, desenvolvedor full-stack, fundador da T.ZION. Tem background como Assessor Parlamentar na Câmara de Curitiba (onde fez investigações manuais de transparência e descobriu o escândalo da água San Pelegrino) e depois trabalhou no próprio CAU/PR como Chefe de Gabinete e Assessor Especial. Construiu o Dig Dig como a ferramenta que não existia enquanto fazia esse trabalho manualmente.

**Contexto do CAU/PR:** Regis não é arquiteto e portanto não pode integrar chapas eleitorais do CAU/PR. O CAU/PR é o primeiro órgão auditado por ser o que ele conhece por dentro. O tom do projeto é de transparência e fiscalização pública — não partidário.

---

## Estado Atual do Projeto (01/05/2026 — Sprint Maio, dia 1)

### Pipeline com 4 agentes

> Convenção editorial: documentos públicos (whitepapers, página `/modelos`, `/soluções`) **nunca nomeiam** o motor por trás de cada agente — só falamos de Atlas, Piper, Bud e Zew. O CLAUDE.md aqui é interno e detalha o motor pra rastreabilidade técnica.

| Agente | Motor (interno) | Função | Estado |
|--------|--------|--------|--------|
| **ATLAS** | Gemini 2.5 Flash Lite | Organização estrutural pré-Piper. 26 categorias canônicas, metadado barato (data, número, valor, pessoas). Também opera como OCR especializado pra atas escaneadas (~$0.013/ata). | ✅ rodou em 3.486+ docs do CAU/PR + começando GOV/PR |
| **Piper** | Gemini 2.5 Pro (1M tokens, multimodal) | Triagem investigativa com janela de contexto longa. Lê regimento + ato completo numa só passada. Faz Vision em PDFs digitalizados sem chamada separada. | ✅ migrado de Haiku → Pro. 160/161 atas plenárias do CAU/PR analisadas |
| **Bud** | Claude Sonnet 4.6 | Aprofundamento dos críticos (vermelho/laranja) com contexto histórico das pessoas envolvidas. Complementa CVSS-A e tags onde Piper deixou em branco. | ✅ 116 atas com Bud no CAU/PR |
| **Zew/New** | Claude Opus 4.7 | Síntese sistêmica do corpus, padrões de longa duração, hipóteses | 🚧 em testes pontuais |

### Infraestrutura VPS (Hostinger — 187.127.30.188, Ubuntu 24.04)
- Docker Compose: api, worker_ai, worker_beat, redis, frontend
- nginx (no container frontend) como reverse proxy HTTPS
- SSL via Let's Encrypt (cert SAN com 4 domínios + dns code.digdig.com.br criado mas não em uso)
- Domínios ativos: `digdig.com.br`, `www.digdig.com.br`, `pnl.digdig.com.br`, `office.digdig.com.br`
- **Deploy frontend:** `bash scripts/deploy-frontend.sh` (rebuild image + restart container — comando único). Documentado em `package.json` como `deploy:frontend`.
- **Deploy backend (API):** `docker compose build api && docker compose up -d api` quando há mudanças em `requirements.txt` ou no código que precisem persistir além de `restart`.

### Backend (FastAPI + Celery + Redis)
- 35+ tabelas no Supabase com RLS e migrations aplicadas (última: `j9k0l1m2n3o4_access_request_instagram_handle`)
- Pipeline ATLAS → Piper → Bud (Zew em testes) — orquestrador em `app/workers/orquestrador.py`
- Endpoints públicos `/public/*`, painel `/painel/*`, conta `/me/*`, billing `/billing/*`, admin `/pnl/admin/*`
- Webhook Mercado Pago com HMAC-SHA256 validado e replay protection (300s)
- **reCAPTCHA v3**: `/public/recaptcha-verify` (standalone) + validação inline em `/public/access-requests`. Threshold 0.5, fail-open em outage do Google.
- **Stack atualizada (Maio/2026):** FastAPI 0.115.6, Starlette 0.41.3, h11 0.16.0, sentry-sdk 2.18.0, lxml 6.1.0, python-multipart 0.0.9. Snyk: 17 issues fechadas.

### Frontend (React + Vite + TanStack Router)
- SPA servida pelo container frontend via nginx
- Painel autenticado com 5 abas: **Visão Geral, Relatório, Denúncias, Pipeline, Dados**
- Aba **Dados** organizada pelo ATLAS — 26 categorias canônicas + Pendentes + Financeiro
- **Painel de conexões** (`/conex`) — grafo navegável com mini-cards de pessoa/ato/tag, modo foco
- **Painel da conta** (`/painel/conta`) — perfil, assinatura, doação, favoritos, avatar (4 abas)
- **Botão favoritar** em cada ato + lista no painel da conta
- Sidebar fixa no viewport com card "Pipeline" agregando todos tenants ativos (sem porcentagem, design minimal)
- **Spline brain** (cena `circleparticlecopy`) na home, no topo do stack lateral direito
- **/solicitar-acesso** com 3 perguntas obrigatórias (filiado a partido, agente público, como nos encontrou) + Instagram opcional + reCAPTCHA invisível
- **/entrar** com card "Sem cadastro? Solicite acesso →" e reCAPTCHA pré-check
- **/por-que-fechado** — página minimalista nova explicando beta fechado
- White Papers: `/whitepaper-01` a `/whitepaper-11`

### Paperclip (office.digdig.com.br — Docker separado)
- Plataforma de agentes de IA em `/opt/digdig/tools/paperclip/docker/`
- CEO + CMO + CFO + CCO + CLO agentes ativos
- Workspace do projeto montado em `/workspace/digdig:ro` (leitura)

### Scraper
- `backend/scripts/scrape_local.py` roda localmente (IP brasileiro) — VPS é bloqueada com 403 pelo CAU/PR
- Scripts GOV/PR rodam na VPS direto (PTE permite IP de DC): `scrape_pte_*.py` (Convênios v3, Licitações, Viagens, etc.)
- **OCR Flash Lite especializado:** `ocr_atas_flash.py` — usa o motor do ATLAS pra OCR puro de PDFs escaneados, ~18× mais barato que Piper Vision Pro

---

## Cobertura Real do Sistema (01/05/2026)

**Total no banco: 99.723 documentos** divididos em dois órgãos.

### CAU/PR — auditoria entregue como MVP

| Indicador | Valor |
|---|---|
| Total de atos | 4.689 |
| Com `tipo_atlas` (classificados pelo ATLAS) | 3.486 (74%) |
| Com texto utilizável | 3.488 (74%) |
| **Atas plenárias** | 161 (160 analisadas, 1 sem texto OCR-extraível) |
| Atas com qualidade `digitalizado_ocr` (recuperadas pelo OCR especializado) | 50 |

**Distribuição de níveis de alerta — atas plenárias** (após OCR + Piper pós-OCR):
- 🔴 **14 vermelhas** (era 7 antes do OCR — +7 descobertas pré-2018)
- 🟠 96 laranjas
- 🟡 49 amarelas
- 🟢 1 verde

**Status de auditoria**: rodada Piper + Bud final pendente nos 274 sinalizados (Vermelhos + Laranjas) pra completar tags + CVSS-A e fechar o MVP.

### GOV/PR — primeiro dia operacional (95.034 atos)

| Categoria | Qtd |
|---|---|
| Convênios estaduais | 27.832 |
| Licitações | 19.280 |
| Catálogo de itens | 18.463 |
| Fornecedores do Estado | 16.690 |
| Contratos públicos | 9.348 |
| Preços registrados | 2.228 |
| Viagens / diárias | 479 |
| Remuneração mensal de servidores | 168 |
| Remuneração financeira | 168 |
| Dispensas / inexigibilidade | 103 |
| Inventário PTE (sub-itens) | 101 |
| Dumps anuais (despesa, receita, licitação, contrato) | 86 |
| **Total** | **95.034** |

**Análise IA no GOV/PR**: **10 amostras estratégicas** processadas (ATLAS → Piper) — 4 vermelhos, 5 laranjas, 1 amarelo. Detalhes na tabela do white paper Nº 11.

**Próximo na fila**: ATLAS classificando os 95k em massa, depois Piper. Secretarias de governo (decretos, portarias do Governador, leis estaduais consolidadas) ainda não capturadas.

### Custos da última rodada (Maio/2026)

| Operação | Custo |
|---|---|
| OCR especializado (Flash Lite) em 20 atas | $0.21 |
| Piper Vision Pro (3 atas smoke test) | $0.73 |
| ATLAS pós-OCR (38 atas) | $0.04 |
| Piper texto (25 atas + 3 retries) | $2.69 |
| **Total da rodada** | **~$3.67** |

**Custo acumulado total do projeto**: ~$26 (Piper texto $20,01 + ATLAS $2,05 + rodada Maio $3,67 + miscellaneous).

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
A rodada hoje é: scrape → Piper → Bud (críticos). **ATLAS ainda não está integrado no orquestrador automático** — roda standalone via `backend/scripts/atlas_classificar.py` ou `atlas_pos_ocr.py` (atos sem tipo_atlas após OCR). Inserir ATLAS antes do Piper é a Fase 2 do projeto ATLAS (ver white paper Nº 10).

### Scraper
- **CAU/PR**: `scrape_local.py` precisa rodar na máquina do Regis. CAU/PR bloqueia IPs de data center com 403. Headers de browser não ajudam — bloqueio por IP.
- **GOV/PR**: roda direto na VPS (PTE permite IP de DC). Scripts: `scrape_pte_convenios_v3.py`, `scrape_pte_export.py`, `scrape_pte_viagens.py`, `seed_leis_govpr.py`, etc. Cada subsistema do PTE tem sua própria estrutura (POST AJAX, paginação, formato de resposta).

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

### Especificação técnica (15 docs numerados em `docs/`)

`docs/00-*` até `docs/15-*` cobrem a arquitetura formal. Veja [docs/README.md](docs/README.md) pro índice completo com status de cada um.

### Pesquisa e mapeamento (GOV-PR)

Dossiê do trabalho de descoberta do governo do estado em `docs/gov-pr-research/`:
- `mapeamento-gov-pr.md` — visão geral
- `pte-discovery*.md` + `pte-mapa-completo.md` + `pte-download-urls.md` — Portal de Transparência Estadual
- `sistemas-externos.md` — SIAFIC, FlexPortal, Qlik, PowerBI emendas
- `coleta-pendente.md` — fontes ainda não conectadas
- `storage-strategy.md` — armazenamento de PDFs vs metadados

### White Papers publicados

`src/routes/whitepaper-01-*.tsx` até `whitepaper-11-cem-mil-documentos.tsx` — 11 papers publicados.

WP10 documenta o sprint que adicionou ATLAS, CVSS-A, meta-tags, painel de conexões e painel da conta. **WP11 (Maio/2026)** documenta a entrega do CAU/PR como MVP, o primeiro dia operacional do GOV/PR (95k docs), o OCR especializado das atas escaneadas pré-2018, e a pergunta existencial sobre os próximos passos do projeto.

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
9. **Scraper CAU/PR roda local; GOV/PR roda na VPS** — IPs de DC bloqueados pelo CAU, mas permitidos no PTE
10. **CEO e diretores são agentes no Paperclip** — não executam código
11. **Frontend muda? `bash scripts/deploy-frontend.sh`** — sem rebuild, nginx serve bundle antigo
12. **Mudanças destrutivas em prod precisam de autorização explícita do Regis**
13. **Backend (`backend/app/`) muda? `docker compose build api && docker compose up -d api`** — `docker cp` sobrevive a `restart`, mas some em qualquer recreate
14. **Documentos públicos não nomeiam motores** — só "Atlas/Piper/Bud/Zew", nunca "Gemini" ou "Claude". Whitepapers e páginas /modelos, /soluções, /apoiar seguem essa regra. CLAUDE.md aqui é interno e pode citar motor pra rastreabilidade.

---

## Contexto para os Prompts de IA

O sistema analisa atos de órgãos públicos com foco em:
- **Irregularidades legais:** violações diretas ao regimento interno, leis 12.378/2010, 8.429/92, 8.666/93, 14.133/21, LAI
- **Irregularidades morais/éticas:** nepotismo, perseguição política, concentração de poder
- **Princípios constitucionais (LIMPE):** Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência

A IA **não afirma crimes** — usa linguagem de "indício", "suspeita", "padrão irregular". A conclusão jurídica fica para advogados.

---

## Contatos e Referências

### CAU/PR (primeiro órgão — auditoria entregue como MVP)
- **Site CAU/PR:** https://www.caupr.gov.br
- **Portarias:** https://www.caupr.gov.br/portarias
- **Deliberações:** https://www.caupr.gov.br/?page_id=17916
- **Regimento Interno:** https://www.caupr.gov.br/regimento/ (6ª versão — DPOPR 0191-02/2025)
- **Lei 12.378/2010:** Lei de criação do CAU
- **Portal de transparência:** https://transparencia.caupr.gov.br/
- **Implanta:** API mensal de dados financeiros (diárias, passagens) — fonte das tabelas `diarias`

### GOV/PR (segundo órgão — primeiro dia operacional)
- **Portal Transparência Estadual (PTE):** https://www.transparencia.pr.gov.br
- **Diário Oficial Executivo (DIOE):** https://www.documentos.dioe.pr.gov.br
- **Constituição do Paraná**, **Lei 15.608/2007** (Licitações estaduais), **LRF**, **Improbidade**: base legal injetada no system prompt do tenant `gov-pr`
- **SIAFIC, FlexPortal, Qlik, PowerBI emendas:** sistemas adjacentes mapeados em `docs/sistemas-externos.md` — ainda não conectados
