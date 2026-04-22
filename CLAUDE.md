# Contexto do Projeto — Dig Dig

Este arquivo existe para que o Claude entenda completamente o projeto ao iniciar uma nova sessão. Leia tudo antes de qualquer ação.

---

## O Que É Este Projeto

**Dig Dig** é uma plataforma SaaS que audita automaticamente atos administrativos de órgãos públicos brasileiros usando IA (Claude API). O sistema baixa PDFs de sites oficiais, extrai o texto completo, analisa com Haiku + Sonnet para detectar irregularidades legais e morais, e apresenta os resultados via dashboard web e chat conversacional.

**Dono do projeto:** Regis Alessander Wilczek  
**Contexto político:** Regis é candidato/apoiador de chapa de oposição ao CAU/PR (Conselho de Arquitetura e Urbanismo do Paraná). O CAU/PR é o primeiro órgão auditado e serviu de caso piloto para validar o produto.

---

## Estado Atual do Projeto

### O Que Já Existe (pasta `extracted/agente_auditoria_caupr/`)
- `portarias_completo.json` — 551 portarias do CAU/PR com links para PDFs
- `deliberacoes_completo.json` — 1.238 deliberações com links para PDFs
- `agente_auditoria.py` — script Python v1 (protótipo simples, usar só como referência)
- `resultados_auditoria.json` — análise antiga feita pelo protótipo
- `relatorio_auditoria_caupr.html` — relatório HTML gerado pelo protótipo

### O Que Está Planejado (pasta `docs/`)
Todo o design do novo sistema está documentado em 11 documentos. **Nada do novo sistema foi codificado ainda.** Estamos na fase de planejamento.

### Próximo Passo
Invocar o `writing-plans` skill para criar o plano de implementação passo a passo, depois executar.

---

## Decisões Tomadas (não questionar sem motivo)

| Decisão | O que foi escolhido | Por quê |
|---------|--------------------|---------| 
| Modelos de IA | Haiku 4.5 (triagem) + Sonnet 4.6 (análise + chat) | Custo ~$10/rodada CAU-PR, Sonnet resolve tudo sem Opus |
| Backend | FastAPI + Celery + Redis | Async nativo, fila real para jobs longos |
| Frontend | Next.js 15 + Tailwind + shadcn/ui | SSR para SEO, componentes prontos |
| Banco | PostgreSQL via Supabase | Auth + Storage + RLS inclusos |
| Deploy | Railway (backend) + Vercel (frontend) | Simples, previsível, sem DevOps pesado |
| Multi-tenancy | Schema compartilhado com RLS por tenant_id | Mais simples que schemas separados |
| PDF extraction | pdfplumber + fallback Tesseract OCR | Testado: 10/10 PDFs do CAU-PR têm texto nativo |
| Chat | RAG com contexto do banco (não re-lê PDFs) | PDFs já analisados e salvos — chat é barato (~$0,02-0,10/pergunta) |
| Lançamento | Sistema completo + só CAU-PR ativo | "Mais órgãos em breve" — estratégia de produto |

---

## Arquitetura em 30 Segundos

```
Frontend (Next.js / Vercel)
    ↓ API REST
Backend (FastAPI / Railway)
    ↓ Jobs assíncronos
Workers Celery + Redis
    ├── Scraper: baixa PDFs → extrai texto → salva no banco
    ├── Haiku: analisa todos os atos → classifica nível de alerta
    ├── Sonnet: aprofunda os críticos → gera fichas de denúncia
    └── Sonnet: síntese global → padrões de gestão

Banco: PostgreSQL (Supabase) + Storage (PDFs)
Chat: RAG — usuário pergunta → busca no banco → Sonnet responde
```

---

## Documentação Completa

Toda a documentação está em `docs/`. Leia o documento relevante antes de codar qualquer módulo.

| Arquivo | O que contém |
|---------|-------------|
| `docs/00-visao-geral-e-comercial.md` | Produto, planos (Free/Pro/Enterprise), personas, roadmap |
| `docs/01-arquitetura.md` | Stack completo, estrutura de pastas, fluxos de dados |
| `docs/02-banco-de-dados.md` | 20 tabelas com SQL completo, RLS, índices |
| `docs/03-pipeline-ia.md` | Prompts Haiku e Sonnet, prompt caching, código de execução |
| `docs/04-api-endpoints.md` | Todos os endpoints REST incluindo chat |
| `docs/05-frontend.md` | Todas as páginas, componentes, layout do chat |
| `docs/06-seguranca-e-lgpd.md` | Auth, RLS, CORS, SQL injection, LGPD |
| `docs/07-scraper-e-instituicoes.md` | Código do scraper, como adicionar novo órgão |
| `docs/08-testes.md` | Unitários, integração, E2E, segurança, CI/CD |
| `docs/09-infraestrutura-e-deploy.md` | Railway, Vercel, Supabase, monitoramento, backup |
| `docs/10-logs-e-analytics.md` | Structlog, auditoria de usuário (4 tabelas), PostHog |
| `docs/11-chat-e-ia-conversacional.md` | RAG completo, tipos de pergunta, custos, system prompt |

---

## Dados do CAU/PR Disponíveis

Os JSONs já coletados têm esta estrutura:
```json
{
  "numero": "678",
  "tipo": "administrativa",
  "titulo": "PORTARIA Nº 678",
  "data": "02/04/2026",
  "ementa": "Prorroga o prazo da Comissão Processante...",
  "links_pdf": ["https://www.caupr.gov.br/wp-content/uploads/...pdf"],
  "links_doc": []
}
```

**Resultado do teste de scraping (feito nesta sessão):**
- 10/10 PDFs baixados com sucesso
- 10/10 têm texto nativo extraível (pdfplumber funciona sem OCR)
- Média de ~360 tokens por documento (abaixo da estimativa inicial)
- Custo real provavelmente menor que $10 por rodada completa

---

## Planos Comerciais

| Plano | Preço | Perguntas chat/mês | Órgãos |
|-------|-------|-------------------|--------|
| Free | R$0 | 20 | 1 (só visualização) |
| Pro | R$297/mês | 300 | Todos |
| Enterprise | R$997/mês | Ilimitado + API | Todos |

---

## Como Adicionar Novo Órgão

1. Inserir em `tenants` com `scraper_config` (URL, paginação, seletores)
2. Inserir regimento em `knowledge_base`
3. Definir regras em `tenant_regras`
4. Disparar rodada: `POST /admin/orgaos/{slug}/rodadas`
5. Mudar `status` para `active`

Custo de IA por novo órgão: ~$10-15 (similar ao CAU/PR)

---

## Regras de Trabalho Neste Projeto

1. **Sempre leia o documento relevante antes de codar** — o design está nos docs
2. **Não reinvente o schema** — as 20 tabelas estão definidas em `02-banco-de-dados.md`
3. **Prompt caching obrigatório** — o system prompt do pipeline IA deve usar `cache_control`
4. **RLS em tudo** — toda tabela com `tenant_id` precisa de política RLS ativa
5. **Logs em toda ação significativa** — usar `AuditLog.registrar()` nos endpoints
6. **Validar plano antes de servir dados** — verificar `user.plano` antes de retornar conteúdo
7. **Nunca commitar secrets** — toda variável sensível vai em `.env` e nunca no repositório

---

## Contexto Político (Importante para os Prompts)

O sistema analisa atos de órgãos públicos com foco em:
- **Irregularidades legais:** violações diretas ao regimento interno
- **Irregularidades morais/éticas:** nepotismo, perseguição política, concentração de poder — mesmo quando "legais"
- **Uso político:** as fichas de denúncia são usadas em campanhas, entrevistas e processos

A IA **não afirma crimes** — usa linguagem de "indício", "suspeita", "padrão irregular". A conclusão jurídica fica para advogados.

---

## Contatos e Referências

- **Site CAU/PR:** https://www.caupr.gov.br
- **Portarias:** https://www.caupr.gov.br/portarias
- **Deliberações:** https://www.caupr.gov.br/?page_id=17916
- **Regimento Interno:** https://www.caupr.gov.br/regimento/ (6ª versão — DPOPR 0191-02/2025)
- **Lei 12.378/2010:** Lei de criação do CAU (base legal nacional)
