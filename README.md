# Dig Dig

**Escavamos os atos públicos. Você decide o que fazer com o que encontramos.**

Plataforma SaaS que audita automaticamente atos administrativos de órgãos públicos brasileiros usando IA — detectando irregularidades legais e morais enterradas em PDFs que ninguém lê.

---

## O Problema

Órgãos públicos brasileiros publicam centenas de portarias, deliberações e resoluções por ano. Esses documentos estão disponíveis publicamente — mas ninguém lê. São PDFs técnicos, numerados, sem contexto, impossíveis de auditar manualmente.

Resultado: irregularidades passam despercebidas. Nepotismo, concentração de poder, perseguição política e gastos suspeitos ficam escondidos na burocracia.

---

## A Solução

O Dig Dig baixa automaticamente todos os atos administrativos de um órgão público, extrai o texto completo dos PDFs e usa IA para analisar cada documento — detectando tanto violações legais quanto irregularidades morais e éticas.

O resultado é apresentado em um dashboard interativo com filtros, visualização de relacionamentos entre pessoas e um sistema de chat onde o usuário pode perguntar em linguagem natural sobre qualquer irregularidade encontrada.

---

## Como Funciona

```
1. COLETA
   O sistema baixa todos os PDFs do site oficial do órgão
   e extrai o texto completo de cada documento.

2. ANÁLISE COM IA
   Haiku 4.5 analisa todos os atos em lote (triagem rápida).
   Sonnet 4.6 aprofunda os casos críticos e gera fichas de denúncia.
   Custo total por órgão: ~$10-15 (feito uma vez, resultados permanentes).

3. DASHBOARD
   Todos os resultados ficam armazenados e disponíveis via
   interface web com filtros, busca, grafo de pessoas e
   linha do tempo de irregularidades.

4. CHAT CONVERSACIONAL
   O usuário conversa com a IA sobre os dados analisados.
   "Qual a relação entre as exonerações de 2025 e os processos abertos?"
   A IA busca no banco e responde com citações precisas dos atos.

5. FICHAS DE DENÚNCIA
   Cada irregularidade grave gera uma ficha pronta para uso
   em imprensa, processos jurídicos ou campanha política.
```

---

## Primeiro Órgão Disponível: CAU/PR

O Conselho de Arquitetura e Urbanismo do Paraná foi o caso piloto:

- **1.789 atos analisados** (551 portarias + 1.238 deliberações)
- **1.171 PDFs** baixados e com texto extraído
- Período coberto: 2020–2026
- Custo da análise completa: ~$10

**Mais órgãos em breve:** Câmaras Municipais, outros Conselhos Profissionais, Autarquias estaduais.

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 + Tailwind CSS + shadcn/ui |
| Backend | FastAPI (Python 3.12) + Celery + Redis |
| Banco de Dados | PostgreSQL via Supabase |
| Autenticação | Supabase Auth (JWT) |
| Storage | Supabase Storage (PDFs e relatórios) |
| IA — Triagem | Claude Haiku 4.5 (Anthropic) |
| IA — Análise e Chat | Claude Sonnet 4.6 (Anthropic) |
| Extração de PDF | pdfplumber + Tesseract OCR (fallback) |
| Fila de Jobs | Celery + Redis |
| Deploy Backend | Railway |
| Deploy Frontend | Vercel |
| Billing | Stripe |
| Email | Resend |
| Monitoramento | Sentry + structlog |
| Analytics | PostHog |

---

## Planos

| Plano | Preço | Órgãos | Chat IA/mês |
|-------|-------|--------|-------------|
| **Gratuito** | R$ 0 | 1 órgão (só leitura) | 20 perguntas |
| **Pro** | R$ 297/mês | Todos os órgãos | 300 perguntas |
| **Enterprise** | R$ 997/mês | Todos + API | Ilimitado |

---

## Tipos de Irregularidades Detectadas

### Legais (violações diretas ao regimento)
- Autoridade incompetente para o ato
- Violação de quórum em deliberações
- Prazo de comissão processante excedido
- Composição irregular de comissão

### Morais e Éticas (mesmo quando "legais")
- **Nepotismo e favorecimento** — nomeação de aliados sem critério técnico
- **Concentração de poder** — excesso de atos Ad Referendum (decisão monocrática do presidente)
- **Perseguição política** — processos disciplinares como instrumento contra opositores
- **Cabide de empregos** — criação de cargos desnecessários
- **Aparelhamento** — mesmo grupo controlando todas as comissões estratégicas
- **Falta de transparência** — ementas genéricas para esconder o real propósito

---

## O Chat com IA

Após a análise ser feita uma vez, o usuário pode conversar com a IA sobre os dados:

```
Usuário: "Existe alguma relação entre as exonerações de 2025 e os processos abertos?"

IA: "Encontrei um padrão claro nos dados. Em 2025 ocorreram 18 exonerações de cargos
     em comissão. Dessas, 7 pessoas (39%) tiveram processo disciplinar aberto nos
     60 dias anteriores à exoneração:

     • João Silva — exonerado em 15/03/2025 (Portaria 601) após processo aberto
       em 10/01/2025 (Portaria 558)
     ...

     Isso configura um padrão de uso do processo disciplinar como instrumento
     para afastar pessoas antes de exonerá-las formalmente."
```

**A IA não re-analisa os PDFs a cada pergunta** — ela consulta os resultados já armazenados no banco. Custo por pergunta: ~$0,02 a $0,10.

---

## Estrutura do Repositório

```
/
├── CLAUDE.md                    ← contexto completo para o Claude
├── README.md                    ← este arquivo
│
├── docs/                        ← documentação completa do sistema
│   ├── README.md                ← índice dos documentos
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
│   └── 11-chat-e-ia-conversacional.md
│
├── extracted/agente_auditoria_caupr/   ← dados do CAU/PR já coletados
│   ├── portarias_completo.json         ← 551 portarias com links de PDF
│   ├── deliberacoes_completo.json      ← 1.238 deliberações
│   ├── agente_auditoria.py             ← protótipo v1 (referência apenas)
│   ├── resultados_auditoria.json       ← análise feita pelo protótipo
│   └── relatorio_auditoria_caupr.html  ← relatório HTML do protótipo
│
├── backend/                     ← (a criar) FastAPI + Celery
├── frontend/                    ← (a criar) Next.js
└── .vscode/
```

---

## Status do Projeto

| Fase | Status | Descrição |
|------|--------|-----------|
| Dados CAU/PR | ✅ Concluído | 1.789 atos coletados, PDFs testados |
| Documentação | ✅ Concluído | 11 documentos de design e arquitetura |
| Implementação | ⏳ Próximo passo | Plano de implementação a ser criado |
| Deploy | — | Após implementação |
| Lançamento CAU/PR | — | Meta: validar com dados reais |

---

## Documentação

Toda a arquitetura, banco de dados, endpoints, segurança e estratégia estão documentados em `docs/`.

Comece por [docs/README.md](docs/README.md) para o índice completo.

---

## Contexto para IA (Claude)

Se você é o Claude trabalhando neste projeto, leia **[CLAUDE.md](CLAUDE.md)** primeiro. Ele contém todas as decisões tomadas, o estado atual do projeto e as regras de trabalho.
