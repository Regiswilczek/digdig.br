# Dig Dig — Documentação do Projeto

Plataforma SaaS de auditoria de atos administrativos públicos com IA.

> **Para o estado mais atual do projeto**, leia primeiro o [CLAUDE.md](../CLAUDE.md) na raiz. Os documentos abaixo cobrem **design e especificação detalhada**; alguns ainda refletem a arquitetura anterior à reestruturação do Sprint Abril/2026 (4 agentes, ATLAS, CVSS-A, painel da conta) — quando aplicável, cada doc tem uma seção "⚠️ Atualização Sprint Abril 2026" no topo com os deltas.

## Documentos

| # | Documento | Conteúdo | Status |
|---|-----------|---------|---|
| 00 | [Visão Geral e Modelo Comercial](00-visao-geral-e-comercial.md) | Produto, estratégia, planos, personas, roadmap | core inalterado |
| 01 | [Arquitetura do Sistema](01-arquitetura.md) | Stack, estrutura, fluxos | ✅ delta no topo |
| 02 | [Banco de Dados](02-banco-de-dados.md) | Schema, RLS, índices | ✅ delta no topo (3 tabelas + colunas novas) |
| 03 | [Pipeline de IA](03-pipeline-ia.md) | ATLAS + Piper + Bud + Zew, prompts, custos | ✅ reescrito no topo (4 agentes) |
| 04 | [API Endpoints](04-api-endpoints.md) | Endpoints REST, schemas | ✅ delta no topo (`/me/*` novo) |
| 05 | [Frontend](05-frontend.md) | Páginas, componentes, fluxos | ✅ delta no topo (painel da conta, ATLAS na DADOS) |
| 06 | [Segurança e LGPD](06-seguranca-e-lgpd.md) | Auth, RLS, CORS, LGPD | core inalterado |
| 07 | [Scraper e Instituições](07-scraper-e-instituicoes.md) | Como adicionar novos órgãos, extração de PDF | core inalterado |
| 08 | [Testes](08-testes.md) | Unitários, integração, E2E | parcialmente desatualizado |
| 09 | [Infraestrutura e Deploy](09-infraestrutura-e-deploy.md) | VPS, Docker, nginx, deploy | ✅ delta no topo (deploy:frontend, /me locations) |
| 10 | [Logs e Analytics](10-logs-e-analytics.md) | Structlog, AuditLog, PostHog | core inalterado |
| 11 | [Chat e IA Conversacional](11-chat-e-ia-conversacional.md) | RAG, custos, limites por plano | core inalterado |
| 12 | [Plano de Negócios](12-plano-de-negocios.md) | Posicionamento, projeções | core inalterado |
| 13 | [API & Dados — Comercial](13-api-dados-comercial.md) | Plano API & Dados (R$1.998/mês) | core inalterado |
| 14 | [Revisão Pré-Implementação](14-revisao-pre-implementacao.md) | Auditoria técnica de riscos | parcialmente desatualizado (vários itens já implementados) |
| 15 | [Alertas Email + Deduplicação](15-alertas-email-e-deduplicacao.md) | Spec de alertas + rapidfuzz | spec ainda válida; impl. pendente |

## White Papers publicados

01–10 em `src/routes/whitepaper-*.tsx`. O paper **10 (Antes da Próxima Onda)** documenta o sprint que adicionou ATLAS, CVSS-A, meta-tags, painel da conta e o painel de conexões.

## Onde está o estado real

- **CLAUDE.md** (raiz) — sempre atualizado, é o ponto de entrada do agente
- **`backend/migrations/versions/`** — fonte da verdade do schema (Alembic)
- **`backend/app/models/`** — fonte da verdade do ORM
- **`backend/app/routers/`** — fonte da verdade dos endpoints

## Status do projeto

- [x] Design e especificação aprovados
- [x] Backend + frontend em produção
- [x] Pipeline IA (ATLAS, Piper, Bud) operacional no CAU/PR
- [x] 10 white papers publicados
- [ ] Zew (Opus 4.7) integrado ao orquestrador
- [ ] ATLAS integrado ao orquestrador automático
- [ ] Próximos órgãos: Governo do Estado do Paraná
