# Dig Dig — Documentação do Projeto

Plataforma SaaS de auditoria de atos administrativos públicos com IA.

> **Para o estado mais atual do projeto**, leia primeiro o [CLAUDE.md](../CLAUDE.md) na raiz. Os documentos abaixo cobrem **design e especificação detalhada**; alguns ainda refletem a arquitetura anterior à reestruturação dos sprints recentes — quando aplicável, cada doc tem uma seção "⚠️ Atualização" no topo com os deltas.

---

## 📐 Especificação técnica (15 documentos numerados)

Núcleo da arquitetura, mantido versionado e revisado a cada sprint.

| # | Documento | Conteúdo | Status |
|---|-----------|---------|---|
| 00 | [Visão Geral e Modelo Comercial](00-visao-geral-e-comercial.md) | Produto, estratégia, planos, personas, roadmap | core inalterado |
| 01 | [Arquitetura do Sistema](01-arquitetura.md) | Stack, estrutura, fluxos | ✅ delta no topo |
| 02 | [Banco de Dados](02-banco-de-dados.md) | Schema, RLS, índices | ✅ delta no topo |
| 03 | [Pipeline de IA](03-pipeline-ia.md) | ATLAS + Piper + Bud + Zew, prompts, custos | ✅ reescrito (4 agentes) |
| 04 | [API Endpoints](04-api-endpoints.md) | Endpoints REST, schemas | ✅ delta no topo |
| 05 | [Frontend](05-frontend.md) | Páginas, componentes, fluxos | ✅ delta no topo |
| 06 | [Segurança e LGPD](06-seguranca-e-lgpd.md) | Auth, RLS, CORS, LGPD, reCAPTCHA | core inalterado |
| 07 | [Scraper e Instituições](07-scraper-e-instituicoes.md) | Como adicionar novos órgãos, extração de PDF | core inalterado |
| 08 | [Testes](08-testes.md) | Unitários, integração, E2E | parcialmente desatualizado |
| 09 | [Infraestrutura e Deploy](09-infraestrutura-e-deploy.md) | VPS, Docker, nginx, deploy | ✅ delta no topo |
| 10 | [Logs e Analytics](10-logs-e-analytics.md) | Structlog, AuditLog, PostHog | core inalterado |
| 11 | [Chat e IA Conversacional](11-chat-e-ia-conversacional.md) | RAG, custos, limites por plano | core inalterado |
| 12 | [Plano de Negócios](12-plano-de-negocios.md) | Posicionamento, projeções | core inalterado |
| 13 | [API & Dados — Comercial](13-api-dados-comercial.md) | Plano API & Dados (R$1.998/mês) | core inalterado |
| 14 | [Revisão Pré-Implementação](14-revisao-pre-implementacao.md) | Auditoria técnica de riscos | parcialmente desatualizado |
| 15 | [Alertas Email + Deduplicação](15-alertas-email-e-deduplicacao.md) | Spec de alertas + rapidfuzz | spec ainda válida |

---

## 🔬 Documentos de pesquisa e mapeamento (GOV-PR)

Dossiê do trabalho de descoberta do segundo órgão (Governo do Estado do Paraná). Pasta dedicada: [`gov-pr-research/`](gov-pr-research/).

| Documento | Conteúdo |
|---|---|
| [gov-pr-research/mapeamento-gov-pr.md](gov-pr-research/mapeamento-gov-pr.md) | Reconhecimento do aparato administrativo estadual: PTE, DIOE, sistemas externos |
| [gov-pr-research/pte-discovery.md](gov-pr-research/pte-discovery.md) | Mapeamento bruto do Portal de Transparência Estadual via varredura HTTP |
| [gov-pr-research/pte-discovery-playwright.md](gov-pr-research/pte-discovery-playwright.md) | Mesma exploração via headless browser (descobre dados que só renderizam com JS) |
| [gov-pr-research/pte-mapa-completo.md](gov-pr-research/pte-mapa-completo.md) | Mapa final consolidado dos sub-itens do PTE acessíveis |
| [gov-pr-research/pte-download-urls.md](gov-pr-research/pte-download-urls.md) | URLs de download direto encontradas |
| [gov-pr-research/sistemas-externos.md](gov-pr-research/sistemas-externos.md) | Sistemas adjacentes ao PTE (SIAFIC, FlexPortal, Qlik, PowerBI emendas) |
| [gov-pr-research/coleta-pendente.md](gov-pr-research/coleta-pendente.md) | Lista de fontes ainda não conectadas (próximas frentes) |
| [gov-pr-research/storage-strategy.md](gov-pr-research/storage-strategy.md) | Estratégia de armazenamento de PDFs vs metadados (sprint Convênios v3) |

JSONs estruturados (`pte-*.json`, `sistemas-externos.json`, `pte-subitens-mapeados.json`) ficam ao lado de cada `.md` correspondente — formato máquina-legível pra reprocessamento.

---

## 📜 Outros documentos

| Documento | Conteúdo |
|---|---|
| [registro-extracao-cau-pr.md](registro-extracao-cau-pr.md) | Histórico do scraping inicial do CAU/PR (já encerrado como MVP) |
| [pauta-papers.md](pauta-papers.md) | Tópicos pendentes pra próximos white papers |
| [plano-prompts-e-leis.md](plano-prompts-e-leis.md) | Estratégia de prompts e injeção de base legal por tenant |
| [ceo-briefing.md](ceo-briefing.md) | Briefing executivo (uso interno do Paperclip) |
| [relatorio-pesquisa-regis.md](relatorio-pesquisa-regis.md) | Perfil bibliográfico do fundador (informação pública consolidada) |
| [superpowers/](superpowers/) | Planos e specs internos (`plans/`, `specs/`) |

---

## 📰 White Papers publicados

Whitepapers vivos ficam em `src/routes/whitepaper-XX-*.tsx` (TSX, renderizados pelo SPA). Versões HTML antigas estão arquivadas em [`_archive-html/`](_archive-html/) — exports preservados como histórico, **não editar manualmente**.

| # | Título | Tema |
|---|---|---|
| 11 | Cem Mil Documentos e Uma Pergunta | CAU/PR como MVP, GOV/PR no primeiro dia, OCR especializado, 99.723 docs |
| 10 | Antes da Próxima Onda | CVSS-A, meta-tags, conexões, ATLAS, painel da conta |
| 09 | Dados: O Que Fazer Com Eles | Tags, indexação, três agentes |
| 08 | Três Dias Sem Dormir | Implanta, dados financeiros, decisão de abrir por convite |
| 07 | Pré-Auditoria Integrada do CAU/PR | 1.789 atos, dois PADs sigilosos, padrões sistêmicos |
| 06 | Do Gabinete ao Terminal | Mapeamento do Portal de Transparência do CAU/PR |
| 05 | Quando a Máquina Entra na Sala | Live card, painel, 3D Spline |
| 04 | O Que a Máquina Encontrou | Primeiros achados materiais nos atos do CAU/PR |
| 03 | Quando as Deliberações Falam Mais Alto | Análise de deliberações |
| 02 | Quando a IA Custa Mais do Que Deveria | Calibragem de custo |
| 01 | Como Automatizamos a Auditoria do CAU/PR com IA | Pipeline original |

---

## 🗺️ Onde está o estado real (fontes da verdade)

- **[CLAUDE.md](../CLAUDE.md)** (raiz) — sempre atualizado, é o ponto de entrada do agente
- **`backend/migrations/versions/`** — fonte da verdade do schema (Alembic)
- **`backend/app/models/`** — fonte da verdade do ORM
- **`backend/app/routers/`** — fonte da verdade dos endpoints
- **`src/routes/`** — fonte da verdade do frontend e dos whitepapers

---

## ✅ Status do projeto (Maio/2026)

- [x] Design e especificação aprovados
- [x] Backend + frontend em produção (digdig.com.br)
- [x] Pipeline de 4 agentes (ATLAS, Piper, Bud, Zew) operacional
- [x] **CAU/PR — auditoria entregue como MVP** (4.689 atos, 274 sinalizados, 7 vermelhos pós-OCR)
- [x] **GOV/PR — primeiro dia operacional** (95.034 atos: 27.832 convênios, 19.280 licitações, 16.690 fornecedores, 9.348 contratos, viagens/diárias/remuneração)
- [x] OCR especializado pra atas escaneadas (Atlas-tier, ~$0.013/ata)
- [x] reCAPTCHA v3 + 3 perguntas obrigatórias no formulário de acesso
- [x] Página `/por-que-fechado` minimalista
- [x] Snyk: 17 issues fechadas (h11, fastapi, sentry-sdk, lxml)
- [x] 11 white papers publicados
- [ ] Pipeline em massa rodando no GOV/PR (atualmente: ATLAS classificando, Piper em amostra de 10)
- [ ] Próximos: secretarias, decretos do Governador, leis estaduais consolidadas
- [ ] Zew (Opus 4.7) integrado ao orquestrador
