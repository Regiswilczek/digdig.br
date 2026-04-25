# CEO Memory — Dig Dig
### Referência rápida para execuções diárias
**Versão:** 1.1 — 25/04/2026 (atualizado com dados reais do banco) | Atualizar quando: produto evoluir, decisão estratégica tomada, métricas mudarem

---

## Identidade do Produto

**Dig Dig** — motor de auditoria automática de atos administrativos públicos com IA.
**Tagline:** "Escavamos os atos públicos. Você decide o que fazer com o que encontramos."
**Posicionamento:** Infraestrutura de informação. Neutro, verificável, juridicamente defensável.
**Regra inegociável:** A IA nunca afirma crimes. Sempre linguagem de indício — "padrão irregular", "suspeita de".

---

## Estado do Produto — Abril 2026

| Componente | Status |
|---|---|
| Backend FastAPI + Celery + Redis | ✅ Railway produção |
| 29 tabelas PostgreSQL (Supabase) + RLS | ✅ completo |
| Scraper portarias CAU/PR | ✅ 551 coletadas |
| Pipeline Haiku | ✅ **1.096 atos analisados** — portarias 100%, deliberações 72% |
| Pipeline Sonnet | 🔄 21 atos — **aguardando rodar nos 115 críticos** |
| **Painel autenticado (6 abas + Realtime + gating)** | ✅ **EM PRODUÇÃO** |
| White Papers 01 e 02 | ✅ publicados |
| Billing Mercado Pago | ⬜ SDK configurado, não lançado |
| Chat conversacional | ⬜ não iniciado |

**CAU/PR — Métricas reais (consultado banco 25/04/2026):**
- Portarias: 551 coletadas, **551/551 processadas (100%)** ✅
- Deliberações: 757 no banco, **545/757 processadas (72%)**
- Total analisados Haiku: **1.096 atos**
- Total analisados Sonnet: **21 atos**
- Distribuição classificações: **816 amarelo / 165 verde / 101 laranja / 14 vermelho**
- Custo total acumulado no banco: **$20,01**
- Última rodada (`5b365c0d`): status `haiku_completo` — Sonnet ainda não rodou
- **Próximo passo urgente:** disparar Sonnet nos 115 críticos (laranja + vermelho)

---

## Modelo de Negócio

| Plano | Preço | Chat/mês | Target |
|---|---|---|---|
| Cidadão | R$0 | 5 | Volume, viralização, legitimidade |
| Investigador | R$197/mês | 200 | Jornalistas, pesquisadores |
| Profissional | R$597/mês | 1.000 | Escritórios jurídicos, ONGs |
| API & Dados | R$1.997/mês | via API | Veículos imprensa, plataformas |

**Regra de gating:** Análise Sonnet (ficha completa) somente para Investigador+.
**Billing:** Mercado Pago — PIX nativo, boleto, parcelamento. Decisão irreversível.
**Doações:** /apoiar — mínimo R$25, ativa 1 mês Investigador grátis. Sem meta pública atrelada a órgão.

---

## Estado das Frentes Não-Técnicas — 25/04/2026

| Issue | Responsável | Status | Detalhe |
|---|---|---|---|
| DIG-2 Estrutura Jurídica | CLO (51e3b842) | Todo | Recém atribuída |
| DIG-3 Marketing | CMO (627b8ae4) | Desbloqueada | Pitch deck aprovado — executando calendário |
| DIG-4 Comercial | CCO (b1613e58) | Done | Pipeline estruturado |
| DIG-5 Financeiro | CFO (70ceffaa) | Todo | Recém atribuída |

**Materiais do CMO prontos:** personas, pitch deck, 1-pager, calendário editorial 30 dias, estratégia white papers.

---

## Prioridades CEO — Próximas 4 Semanas (conforme Briefing v1.0)

### Semana 1 — Pipeline crítico + receita
1. **Fase Sonnet** ← **URGENTE** — 14 vermelhos + 101 laranjas aguardam análise profunda (última rodada `haiku_completo`, Sonnet não rodou)
2. **Billing live Mercado Pago** — webhook confirmação + ativação de plano no banco
3. **Env vars no Lovable** — `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` → login funciona

### Semana 2–3 — Produto completo
4. **Deliberações restantes** — 212 deliberações ainda não processadas
5. **Chat conversacional** — `POST /chat` + RAG + interface (antes: item 4)
5. **Chat conversacional** — `POST /chat` + RAG + interface
6. **Alertas por email** — Resend, disparo no pipeline Haiku

### Semana 3–4 — Lançamento público CAU/PR
7. **Post LinkedIn Regis** + fio Twitter + email lista de espera
8. **Outreach direto** — 10–15 jornalistas (CAU, conselhos, transparência)

### Mês 2 — Segundo órgão
9. Candidatos: **CREA/PR** ou **CRM/PR** — grande base online, viável tecnicamente

---

## Projeções de Receita

| Período | MRR Assinaturas | + Doações | Total |
|---|---|---|---|
| Mês 1 | R$3.173 | R$0 | R$3.173 |
| Mês 3 | R$9.916 | R$3.000 | R$12.916 |
| Mês 6 | R$29.177 | R$9.000 | R$38.177 |
| Mês 12 | R$72.277 | R$24.000 | R$96.277 |

**ARR projetado mês 12: ~R$870.000**

LTV: Investigador R$3.940 / Profissional R$19.701 / API & Dados R$99.850

---

## Riscos Críticos

1. **Ação legal** — Mitigação: linguagem de indício, fonte linkada, disclaimer em cada ficha, consulta jurídica antes de publicar atos sensíveis
2. **Alucinação IA** — Mitigação: dois passes (Haiku + Sonnet), revisão manual de todo vermelho antes de publicar
3. **Custo IA estalando antes da receita** — Mitigação: novo órgão só quando há receita para cobrir, limite $15/rodada no backend, 4 camadas de proteção
4. **Dependência excessiva do Regis como distribuição** — Mitigação: SEO por órgão a partir do mês 2, afiliados
5. **Percepção política** — Mitigação: posicionamento rígido de neutralidade, nunca declaração política em nome do produto

---

## Roadmap (frentes paralelas)

| Frente | Próximo item |
|---|---|
| Coleta | 212 deliberações restantes para processar |
| Análise | Cruzamento automático de documentos relacionados |
| Infraestrutura | Mover scraper para IP brasileiro (desvincula do laptop do Regis) |
| Comunidade | Votação de próxima auditoria — fila pública |
| Dados | Diárias, contratos, votações de pautas |

---

## Governança

**Requer aprovação do Presidente (Regis):**
- Decisão financeira > R$1.000
- Contratação de novo agente
- Mudança de posicionamento, precificação ou roadmap

**CEO age com autonomia:**
- Pesquisa, documentos, análises, issues operacionais, delegação a diretores

**PROIBIDO ao CEO:**
- Escrever, editar, criar ou deletar qualquer arquivo do projeto
- Executar scripts, migrações, deploys ou qualquer comando técnico
- Mexer no banco, infraestrutura ou APIs de produção

---

## Referências Rápidas

- **Repo:** github.com/Regiswilczek/dig-dig
- **API Paperclip:** http://127.0.0.1:3100
- **Company ID:** 4cfaa377-0191-4f8d-bc45-82d584abed54
- **CEO Agent ID:** 0a15c551-8b32-4b99-bd8b-2e959e16e3e9
- **Supabase Projeto:** pnmtlpcdivzihspnnuid
- **Briefing completo:** docs/ceo-briefing.md
- **Plano dashboard:** docs/superpowers/plans/2026-04-25-painel-dashboard.md
