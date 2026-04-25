# Painel Interno — Dashboard Autenticado do Dig Dig

## Objetivo

Construir o painel interno do Dig Dig: área autenticada onde usuários acompanham auditorias em tempo real, acessam fichas de denúncia completas, filtram documentos e veem o pipeline de IA rodando ao vivo via Supabase Realtime.

---

## Arquitetura

### Stack

- **Auth**: `@supabase/supabase-js` — `signInWithPassword`, sessão em localStorage
- **Realtime**: Supabase Realtime via `postgres_changes` na tabela `analises`
- **Queries de dados**: FastAPI com `Authorization: Bearer {jwt}` — valida JWT + plano
- **Frontend**: React + TanStack Router + shadcn/ui (padrão do projeto)
- **Rotas protegidas**: `beforeLoad` verifica sessão; redireciona para `/entrar` se ausente

### Por que esse modelo é seguro

- A `anon key` do Supabase é pública por design — só permite o que o RLS autoriza
- A `service role key` fica exclusivamente no FastAPI, nunca no frontend
- Controle de plano (quem vê o quê) é feito no FastAPI, não via RLS — mais simples e auditável
- Realtime assina apenas a tabela `analises` com dados de status — sem expor conteúdo sensível diretamente

---

## Rotas Frontend

| Rota | Descrição | Proteção |
|------|-----------|----------|
| `/entrar` | Login — conectar ao Supabase Auth | Pública |
| `/painel` | Redirect para `/painel/cau-pr` | Auth obrigatória |
| `/painel/$slug` | Dashboard da instituição | Auth obrigatória |
| `/painel/$slug/ato/$id` | Ficha completa de um ato | Auth obrigatória |

---

## Layout

### Estrutura geral (3 colunas)

```
┌──────────────┬────────────────────────────────┬─────────────────────┐
│   SIDEBAR    │      ÁREA CENTRAL              │   PAINEL DIREITO    │
│   (220px)    │                                │   (280px)           │
│              │  [tab ativa]                   │  Atividade recente  │
│  DIG DIG     │                                │  (Realtime feed)    │
│              │  conteúdo da tab               │                     │
│  ● Chat IA   │                                │  Buscar atividade   │
│  ▾ Escavações│                                │                     │
│    ● CAU/PR  │                                │                     │
│    ○ Curitiba│                                │                     │
│    ○ CRM/PR  │                                │                     │
│              │                                │                     │
│  Feedback    │                                │                     │
└──────────────┴────────────────────────────────┴─────────────────────┘
```

### Sidebar — itens

- **DIG DIG** — logo/marca, link para `/`
- **Chat com IA** — tela inicial (home do painel); placeholder para chat conversacional futuro
- **▾ Escavações** — accordion expansível
  - `● CAU/PR` — ativo e clicável → `/painel/cau-pr`
  - `○ Prefeitura de Curitiba` — desabilitado, badge "em breve"
  - `○ CRM/PR` — desabilitado, badge "em breve"
  - `○ Câmara de Curitiba` — desabilitado, badge "em breve"
- **Feedback** — rodapé da sidebar
- **Avatar + plano + sair** — rodapé da sidebar

### Tela inicial — Chat IA (home)

Quando o usuário entra no painel, vê a tela de boas-vindas:

```
Olá, [nome]
Escave documentos públicos com inteligência artificial.

[Explorar Atos]  [Ver Denúncias]  [Pipeline Ativo]
[Relatório Final]  [Regimento Interno]  [Chat Plenário ↗]

[campo: Pergunte sobre qualquer ato... — placeholder, em breve]
```

Cards de ação rápida levam para as tabs correspondentes da instituição ativa. "Chat Plenário" é placeholder visual (feature futura).

### Painel direito — Atividade Recente

Feed em tempo real (Supabase Realtime). Cada nova análise inserida na tabela `analises` aparece no topo:

```
● 🔴 Deliberação 0171-02  Vermelho   agora
  🟠 Deliberação 0172-06  Laranja    há 2min
  🟡 Portaria 0589        Amarelo    há 5min
  🟢 Portaria 0590        Verde      há 8min

[Buscar atividade...]
```

---

## Tabs da Instituição

### Tab 1 — Visão Geral

4 stat cards (dados da API pública, já existente):
- Total de documentos coletados (`total_atos`)
- Documentos analisados (`total_analisados`)
- Casos críticos (`total_criticos`)
- "R$ 0 para começar" (fixo)

Barra de progresso da rodada ativa (polling 30s via `/pnl/orgaos/{slug}/rodadas`):
```
Deliberações em análise
████████████░░░░░░░░  42% — 228 / 543
```

Distribuição por nível (círculos coloridos com contagem):
`● Verde 9  ● Amarelo 158  ● Laranja 56  ● Vermelho 5`

### Tab 2 — Portarias / Tab 3 — Deliberações

Mesma estrutura para os dois tipos. Tabela com:

**Filtros:**
- Nível de alerta: [Todos | Verde | Amarelo | Laranja | Vermelho]
- Ano: [Todos | 2020 | 2021 | ... | 2026]
- Busca texto: número do ato ou trecho da ementa

**Colunas da tabela:**

| Coluna | Dado |
|--------|------|
| Número | `ato.numero` |
| Ementa | `ato.ementa` (truncada, 80 chars) |
| Nível | badge colorido com `nivel_alerta` |
| Score | `score_risco` |
| Data | `data_publicacao` |
| Ações | ícone de link externo (PDF original) + ícone "ver ficha" |

Paginação: 50 por página. Ordenação padrão: mais críticos primeiro.

Cada linha clicável → `/painel/$slug/ato/$id`

**Controle de plano:**
- Cidadão: vê tabela completa + nível de alerta + score
- Investigador+: vê tudo acima + pode abrir a ficha de denúncia completa

### Tab 4 — Denúncias

Apenas atos com `nivel_alerta = 'vermelho'` ou `'laranja'`. Grid de 2 colunas com cards:

**Card de denúncia:**
```
🔴 VERMELHO · Score 95                          Deliberação 0171-02/2024

Plenário declara-se suspeito mas delibera com 17 votos em favor de
ex-presidente em ação trabalhista contra o CAU/PR...

Irregularidades detectadas:
• Violação do princípio de imparcialidade
• Paradoxo processual: suspeito que julga

[Ver ficha completa]  [PDF original →]
```

Filtros: [Vermelho | Laranja | Todos críticos]

**Controle de plano nos cards:**
- Cidadão: vê resumo Haiku + irregularidades básicas. Botão "Ver ficha completa" bloqueado com "Upgrade para Investigador"
- Investigador+: acesso total à ficha

### Tab 5 — Pipeline (Realtime)

Feed ao vivo mostrando cada análise conforme entra no banco.

**Supabase Realtime — assinatura:**
```typescript
supabase
  .channel('pipeline-feed')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'analises',
  }, (payload) => { /* adiciona item ao feed */ })
  .subscribe()
```

**Layout do feed:**
```
● AO VIVO — Deliberações CAU/PR em análise

14:32:07  Delib. 0312-04/2023  🟡 Amarelo   score 38   agora
14:31:55  Delib. 0311-02/2023  🟢 Verde     score 09   há 12s
14:31:41  Delib. 0310-01/2023  🟠 Laranja   score 71   há 26s
14:30:18  Delib. 0309-05/2022  🔴 Vermelho  score 88   há 1min 49s
```

Contador no topo atualiza em tempo real:
`228 analisados · 315 restantes · ~$4,45 gasto`

Quando pipeline inativo: mensagem "Nenhuma rodada ativa no momento."

### Tab 6 — Relatório Final

Enquanto rodada não concluída:
```
📋 Relatório Final — CAU/PR 2020–2026

Disponível quando 100% dos documentos forem analisados.
Progresso: ████████░░░░  42% concluído

Todos os planos terão acesso quando publicado.
```

Quando concluído:
- Documento longo renderizado em página (texto + tabelas + gráficos de distribuição)
- Link para download em PDF
- Acesso para todos os planos, incluindo Cidadão

---

## Ficha Completa do Ato — `/painel/$slug/ato/$id`

Página de detalhe acessada ao clicar numa linha da tabela ou num card de denúncia.

```
← Voltar

DELIBERAÇÃO Nº 0171-02/2024                    🔴 VERMELHO — Score 95
CAU/PR · data_publicacao ou "data não disponível"

━━━ RESUMO EXECUTIVO ━━━━━━━━━━━━━━━━━━━━━━━━━━
[resumo_executivo do Haiku — visível para todos]

━━━ ANÁLISE PROFUNDA [Investigador+] ━━━━━━━━━━
[resultado_sonnet.analise_profunda — bloqueado para Cidadão]

━━━ IRREGULARIDADES ━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Violação do princípio de imparcialidade — Art. 47 Regimento
• Paradoxo processual: suspeito que delibera

━━━ PESSOAS IDENTIFICADAS [Investigador+] ━━━━━
[resultado_sonnet.pessoas — bloqueado para Cidadão]

━━━ RECOMENDAÇÃO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[recomendacao_campanha]

━━━ LINKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[📄 Documento original no caupr.gov.br →]
[📖 Regimento Interno CAU/PR →]
[⬇ Exportar PDF]  (Investigador+)
```

---

## Novos Endpoints FastAPI

### Router: `/painel` (requer JWT válido)

**Middleware de auth:**
- Extrai JWT do header `Authorization: Bearer {token}`
- Valida com chave pública do Supabase
- Lê `plano` do usuário da tabela `users`
- Injeta `current_user` com `id`, `email`, `plano`

**Endpoints:**

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/painel/orgaos/{slug}/atos` | Lista atos com análise; filtra por tipo, nível, ano, busca; pagina 50/página |
| `GET` | `/painel/orgaos/{slug}/atos/{id}` | Ato completo com análise Haiku + Sonnet (Sonnet gateado por plano) |
| `GET` | `/painel/orgaos/{slug}/stats` | Stats detalhados (igual ao público, mas pode ter mais campos futuramente) |
| `GET` | `/painel/orgaos/{slug}/rodadas` | Status da rodada ativa — progresso, custo, atos analisados. O `/pnl/` existente requer X-Admin-Secret; este endpoint usa JWT de usuário comum |

**Campos retornados por plano:**

`/painel/orgaos/{slug}/atos/{id}`:
- **Todos os planos**: `numero`, `tipo`, `titulo`, `ementa`, `data_publicacao`, `url_pdf`, `nivel_alerta`, `score_risco`, `resumo_executivo`
- **Investigador+**: + `resultado_sonnet` (JSONB completo — análise profunda, pessoas identificadas, artigos violados), `recomendacao_campanha`
- **Nota**: A estrutura interna do JSONB `resultado_sonnet` é definida pelo pipeline (ver `docs/03-pipeline-ia.md`). O endpoint retorna o objeto completo; o frontend extrai os campos necessários.

---

## Auth Flow — Detalhado

### Conexão do `/entrar`

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// No componente EntrarPage:
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
if (data.session) navigate('/painel')
```

### Proteção de rotas

```typescript
// src/routes/painel.tsx (layout route)
export const Route = createFileRoute('/painel')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw redirect({ to: '/entrar' })
    return { session }
  }
})
```

### Chamadas autenticadas ao FastAPI

```typescript
// src/lib/api-auth.ts
export async function fetchAuthed(path: string) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${session?.access_token}` }
  })
}
```

---

## Controle de Planos — Regra de Acesso

| Feature | Cidadão | Investigador | Profissional |
|---------|---------|--------------|--------------|
| Tabs Visão Geral, Pipeline, Relatório Final | ✅ | ✅ | ✅ |
| Tabela Portarias + Deliberações (lista) | ✅ | ✅ | ✅ |
| Resumo Haiku + irregularidades básicas | ✅ | ✅ | ✅ |
| Análise Sonnet completa | ❌ (upgrade CTA) | ✅ | ✅ |
| Pessoas identificadas (Sonnet) | ❌ | ✅ | ✅ |
| Exportar PDF/CSV | ❌ | ✅ | ✅ |
| Relatório Final (quando publicado) | ✅ | ✅ | ✅ |

---

## Variáveis de Ambiente (frontend)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://dig-dig-production.up.railway.app
```

---

## Estrutura de Arquivos

**Frontend — novos arquivos:**
```
src/
  lib/
    supabase.ts          # cliente Supabase (auth + realtime)
    api-auth.ts          # fetchAuthed() com JWT
  routes/
    painel.tsx           # layout route — proteção + sidebar
    painel/
      $slug.tsx          # dashboard da instituição (tabs)
      $slug/
        ato.$id.tsx      # ficha completa do ato
```

**Backend — novos arquivos:**
```
backend/app/
  routers/
    painel.py            # /painel/* com JWT validation
  dependencies/
    auth.py              # get_current_user() + check_plan()
```

---

## Supabase Realtime — Configuração Necessária

1. Habilitar replication na tabela `analises` no Supabase Dashboard
2. A RLS da tabela `analises` deve permitir leitura para usuários autenticados do tenant
3. O canal assina `INSERT` events — cada nova análise dispara o feed

---

## O que NÃO está incluído neste spec

- Chat conversacional com RAG (feature futura — placeholder visual apenas)
- Exportação CSV (Investigador+) — estrutura pronta, implementação posterior
- Notificações por email (já existe no backend, não integrado ao painel ainda)
- Multi-tenant admin (gerenciar múltiplos órgãos pelo painel) — fase futura
