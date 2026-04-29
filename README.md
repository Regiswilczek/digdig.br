# Dig Dig

**Escavamos os atos públicos. Você decide o que fazer com o que encontramos.**

Plataforma SaaS que audita automaticamente atos administrativos de órgãos públicos brasileiros usando IA — detectando irregularidades legais e morais enterradas em PDFs que ninguém lê.

---

## O Problema

Órgãos públicos brasileiros publicam centenas de portarias, deliberações e resoluções por ano. Esses documentos estão disponíveis publicamente — mas ninguém lê. São PDFs técnicos, numerados, sem contexto, impossíveis de auditar manualmente em volume.

Resultado: irregularidades passam despercebidas. Nepotismo, concentração de poder, perseguição política e gastos suspeitos ficam escondidos na burocracia.

---

## A Solução

O Dig Dig baixa automaticamente todos os atos administrativos de um órgão público, extrai o texto completo dos PDFs e usa IA para analisar cada documento — detectando tanto violações legais quanto irregularidades morais e éticas.

O resultado fica armazenado em banco de dados e é acessível via dashboard interativo e chat conversacional em linguagem natural.

---

## Como Funciona

```
1. COLETA
   Script local baixa todos os PDFs do site oficial do órgão
   e extrai o texto com pdfplumber. (Roda localmente — servidores
   de alguns órgãos bloqueiam requisições de data centers.)

2. ANÁLISE COM IA — FASE HAIKU
   Claude Haiku 4.5 analisa todos os atos em lote com o regimento
   interno como contexto (prompt caching). Classifica cada ato em:
   Verde / Amarelo / Laranja / Vermelho.
   Custo: ~$5–10 por órgão (portarias com texto nativo).

3. ANÁLISE COM IA — FASE SONNET
   Claude Sonnet 4.6 aprofunda apenas os casos Vermelho:
   análise detalhada, ficha de denúncia, mapeamento de pessoas.

4. DASHBOARD
   Todos os resultados disponíveis via interface web com filtros,
   busca por pessoa, linha do tempo de irregularidades.

5. CHAT CONVERSACIONAL
   O usuário conversa com a IA sobre os dados analisados.
   A IA consulta o banco e responde com citações precisas dos atos.
   Custo por pergunta: ~$0,02–$0,10.
```

---

## Status Atual — CAU/PR (Abril 2026)

O Conselho de Arquitetura e Urbanismo do Paraná é o caso piloto, em análise agora.

| Indicador | Valor |
|-----------|-------|
| Total de atos coletados | 1.789 (551 portarias + 1.238 deliberações) |
| Portarias com texto extraível | 400 |
| Portarias escaneadas (sem texto) | 151 (2018–2021, PDFs-imagem) |
| Deliberações com PDF | 2 |
| Deliberações HTML-only | 595 (próxima sprint) |
| **Portarias analisadas pela IA** | **262 de 400 (em progresso)** |
| Distribuição — Verde | 93 (35%) |
| Distribuição — Amarelo | 168 (64%) |
| Distribuição — Laranja | 1 (<1%) |
| Distribuição — Vermelho | 0 (chegando nos anos anteriores) |
| Custo da rodada atual | ~$5 projetado |

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + Vite + TanStack Router + shadcn/ui |
| Backend | FastAPI (Python 3.12) + Celery + Redis |
| Banco de Dados | PostgreSQL via Supabase (29 tabelas, RLS) |
| Autenticação | Supabase Auth (JWT) |
| Storage | Supabase Storage |
| IA — Triagem | Claude Haiku 4.5 (Anthropic) |
| IA — Análise Profunda e Chat | Claude Sonnet 4.6 (Anthropic) |
| Extração de PDF | pdfplumber |
| Fila de Jobs | Celery + Redis |
| Deploy | VPS Hostinger (Docker Compose — api, workers, redis, nginx) |
| Billing | Mercado Pago |
| Monitoramento | structlog |

---

## Planos

| Plano | Preço | Chat IA/mês | Órgãos |
|-------|-------|-------------|--------|
| **Cidadão** | R$ 0 | 5 perguntas | Todos (só leitura) |
| **Investigador** | R$ 197/mês | 200 perguntas | Todos |
| **Profissional** | R$ 597/mês | 1.000 perguntas | Todos |
| **API & Dados** | R$ 1.997/mês | via API | Todos + API REST |

---

## Tipos de Irregularidades Detectadas

**Legais** (violações diretas ao regimento)
- Autoridade incompetente para o ato
- Violação de quórum em deliberações
- Prazo de comissão processante excedido
- Composição irregular de comissão

**Morais e Éticas** (mesmo quando "legais")
- Nepotismo e favorecimento — nomeação de aliados sem critério técnico
- Concentração de poder — excesso de atos Ad Referendum
- Perseguição política — processos disciplinares como instrumento contra opositores
- Cabide de empregos — criação de cargos desnecessários
- Aparelhamento — mesmo grupo controlando todas as comissões estratégicas
- Falta de transparência — ementas genéricas para esconder o real propósito

---

## Estrutura do Repositório

```
/
├── CLAUDE.md                         ← contexto completo para o Claude
├── README.md                         ← este arquivo
│
├── docs/                             ← documentação e white papers
│   ├── 00-visao-geral-e-comercial.md
│   ├── 01-arquitetura.md
│   ├── 02-banco-de-dados.md
│   ├── 03-pipeline-ia.md
│   ├── 04-api-endpoints.md
│   ├── 05-frontend.md
│   ├── 06-seguranca-e-lgpd.md
│   ├── 07-scraper-e-instituicoes.md
│   ├── 08-testes.md
│   ├── 09-infraestrutura-e-deploy.md
│   ├── 10-logs-e-analytics.md
│   ├── 11-chat-e-ia-conversacional.md
│   ├── 12-plano-de-negocios.md
│   ├── 13-api-dados-comercial.md
│   ├── 14-revisao-pre-implementacao.md
│   ├── 15-alertas-email-e-deduplicacao.md
│   ├── registro-extracao-cau-pr.md         ← White Paper Nº 01 (MD)
│   ├── whitepaper-01-extracao-caupr.html   ← White Paper Nº 01 (HTML)
│   └── whitepaper-02-custo-e-controle.html ← White Paper Nº 02 (HTML)
│
├── backend/                          ← FastAPI + Celery (em produção)
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/                   ← 29 modelos SQLAlchemy
│   │   ├── routers/                  ← endpoints FastAPI
│   │   ├── services/                 ← piper_service, bud_service, new_service, cvss_service, etc.
│   │   └── workers/                  ← Celery tasks (analise, scraper, orquestrador)
│   ├── migrations/                   ← Alembic migrations
│   ├── scripts/
│   │   ├── scrape_local.py           ← scraper local (IP brasileiro)
│   │   ├── analisar_atas_piper_local.py ← análise Piper (texto + visão)
│   │   └── relatorio_cobertura.py    ← relatório de cobertura por ano
│   └── tests/
│
├── src/                              ← Frontend React/Vite (SPA servida por nginx no VPS)
│   └── routes/
│       ├── index.tsx
│       ├── whitepaper-01-extracao-caupr.tsx
│       └── whitepaper-02-custo-e-controle.tsx
│
└── extracted/agente_auditoria_caupr/ ← dados brutos coletados
    ├── portarias_completo.json        ← 551 portarias com links de PDF
    └── deliberacoes_completo.json     ← 1.238 deliberações
```

---

## Fases de Desenvolvimento

| Fase | Status | Descrição |
|------|--------|-----------|
| Planejamento e docs | ✅ Concluído | 15 documentos de design e arquitetura |
| Backend foundation | ✅ Concluído | FastAPI, 29 tabelas, Celery, auth, deploy VPS |
| Scraper de portarias | ✅ Concluído | 400 portarias com texto, 151 escaneadas documentadas |
| Pipeline Haiku | 🔄 Em progresso | 262/400 portarias analisadas |
| Pipeline Sonnet | ⏳ Próximo | Aguarda Haiku terminar — só casos Vermelho |
| Scraper deliberações (HTML) | ⏳ Próximo | 595 deliberações HTML-only |
| OCR portarias escaneadas | ⏳ Planejado | 151 portarias de 2018–2021 |
| Dashboard conectado | ⏳ Planejado | Frontend existe, falta ligar na API real |
| Chat conversacional | ⏳ Planejado | RAG no banco, Sonnet responde |
| Lançamento CAU/PR | ⏳ Planejado | Após resultados completos |

---

## White Papers

Série de registro técnico público sobre o processo de construção:

- **[Nº 01 — Como Automatizamos a Auditoria do CAU/PR com IA](docs/whitepaper-01-extracao-caupr.html)**
  A origem do projeto, a arquitetura, e os 7 problemas reais que tivemos que resolver.

- **[Nº 02 — Quando a IA Custa Mais do Que Deveria](docs/whitepaper-02-custo-e-controle.html)**
  Como detectamos e corrigimos $20 em chamadas de API não rastreadas — diagnóstico e solução em 4 camadas.

---

## Documentação Técnica

Toda a arquitetura está em `docs/`. Leia [CLAUDE.md](CLAUDE.md) para o estado atual completo e regras de trabalho.
