# Spec — Página /modelos
**Data:** 2026-04-25
**Rota:** `/modelos`
**Tipo:** Página de produto/venda — estilo Anthropic Models, marca Dig Dig

---

## Objetivo

Página educacional/comercial que apresenta os três modelos do Dig Dig como produtos com personalidade própria. Não menciona Anthropic, Claude, Haiku, Sonnet ou Opus — apenas os codinomes Dig Dig. Sem métricas de custo ou dados que envelhecem. Foco em texto de venda baseado em capacidade e propósito dentro do contexto de auditoria pública.

---

## Design System

Segue o padrão existente do site:
- `GOLD = "#F0C81E"`, fundo `#07080f`, texto `white/78`
- Fontes: `Inter` (corpo/UI), `JetBrains Mono` (destaques numéricos/badges)
- Estrutura: `createFileRoute("/modelos")` com TanStack Router
- Sem dependências externas além das já usadas no projeto

---

## Estrutura da Página

### Hero
- Título grande: `"Os Modelos Dig Dig"`
- Subtítulo: motores especializados em auditoria pública — não assistentes genéricos — cada um com papel definido na investigação
- Fundo escuro padrão, tipografia editorial

---

### Seção 1 — Dig Dig Piper
**Motor:** Claude Haiku 4.5 (não mencionado na UI)
**Badge:** `TRIAGEM` — cor amarela/verde (alerta verde do sistema)
**Personalidade:** velocidade e escala

**Bloco de texto de venda:**
O Piper lê o que ninguém leria manualmente. Processa milhares de atos por hora, classifica cada um em verde, amarelo, laranja ou vermelho, extrai nomes, datas e vínculos — tudo antes que qualquer analista humano abra o primeiro PDF.

**Benchmarks apresentados (reais da Claude Haiku 4.5):**
- MMLU: 73,5%
- GPQA: 33,3%
- HumanEval: 75,9% *(recontextualizado como "precisão de extração estruturada")*

**Benchmark de auditoria (contexto Dig Dig):**
- Resultado: triagem de portarias do CAU/PR com 4 níveis de alerta
- Capacidade: análise de documentos jurídicos em linguagem técnica
- Foco: volume e cobertura total

**Posicionamento:** primeiro filtro, garante que nenhum ato escapa.

---

### Seção 2 — Dig Dig Bud
**Motor:** Claude Sonnet 4.6 (não mencionado na UI)
**Badge:** `ANÁLISE PROFUNDA` — cor laranja (alerta laranja do sistema)
**Personalidade:** raciocínio jurídico, precisão

**Bloco de texto de venda:**
O Bud é o analista que transforma um padrão irregular em argumento. Pega os casos marcados pelo Piper, lê o regimento interno, cita o artigo violado, descreve o padrão e sugere o questionamento público correto. A ficha que o Bud gera é o que um advogado levaria semanas para construir.

**Benchmarks apresentados (reais da Claude Sonnet 4.6):**
- MMLU: 88,7%
- GPQA: 59,4%
- HumanEval: 93,7% *(recontextualizado como "precisão de raciocínio estruturado")*

**Benchmark de auditoria (contexto Dig Dig):**
- Resultado: fichas de denúncia com citação de regimento, identificação de violação e sugestão de questionamento
- Capacidade: raciocínio jurídico sobre documentos técnicos
- Foco: qualidade e acionabilidade da análise

**Posicionamento:** onde a investigação vira produto. Exclusivo para planos Investigador+.

---

### Seção 3 — Dig Dig Zew *(Em breve)*
**Motor:** Claude Opus 4.7 (não mencionado na UI)
**Badge:** `EM BREVE` — borda dourada, fundo levemente diferenciado (gradiente sutil ou borda GOLD)
**Personalidade:** investigação sistêmica e histórica

**Bloco de texto de venda:**
O Zew não analisa um ato — analisa uma gestão. Capaz de cruzar décadas de documentos, identificar padrões de comportamento que só aparecem ao longo do tempo: nepotismo acumulado, concentração progressiva de poder, perseguição sistemática disfarçada em portarias numeradas. O que o Piper e o Bud fazem ato por ato, o Zew faz sobre toda a história de uma instituição.

**Benchmarks apresentados (reais do Claude Opus 4.7):**
- MMLU: 91,4%+
- GPQA: 74,9%
- Raciocínio estendido: sim (diferencial principal)

**Benchmark de auditoria (contexto Dig Dig):**
- Cruzamento de documentos de períodos distintos
- Detecção de padrões longitudinais (repetição ao longo de anos)
- Análise comparativa entre órgãos

**CTA:** `"Avisar quando chegar"` → campo de email simples inline (sem modal), POST para lista de espera ou apenas `mailto:` como fallback inicial.

---

## Navegação

Adicionar link `/modelos` no menu de navegação principal (verificar onde `solucoes` e `apoiar` aparecem no nav e seguir o mesmo padrão).

---

## Rota

```ts
// src/routes/modelos.tsx
export const Route = createFileRoute("/modelos")({ ... })
```

Registrar no `routeTree.gen.ts` seguindo o padrão dos outros arquivos de rota.

---

## Restrições

- Não mencionar Anthropic, Claude, Haiku, Sonnet, Opus em nenhum texto visível ao usuário
- Não exibir valores de custo por análise
- Não exibir métricas numéricas que dependem do estado do pipeline
- Benchmarks apresentados como capacidade do modelo, não como publicidade da Anthropic
