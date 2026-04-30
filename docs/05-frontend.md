# Frontend — Páginas, Componentes e Fluxos

> ## ⚠️ Atualização — Sprint Abril 2026
>
> **Deploy mudou:** Lovable foi descontinuado. Agora deploy é **Docker no VPS Hostinger** via `bash scripts/deploy-frontend.sh` (rebuild image + restart container, ~3min). Bundle Vite é baked no `Dockerfile.frontend` stage 1.
>
> ### Páginas novas
>
> | Rota | Componente |
> |---|---|
> | `/painel/conta` | Painel da conta com 4 abas: **Perfil** (nome, foto, avatar upload), **Assinatura** (status, próxima cobrança, cancelar), **Doação** (link pra `/apoiar`), **Favoritos** (lista de atos salvos com nota pessoal) |
> | `/whitepaper-08-tres-dias` | "Três Dias Sem Dormir" |
> | `/whitepaper-09-dados-o-que-fazer` | "Dados: O Que Fazer Com Eles" |
> | `/whitepaper-10-antes-da-proxima-onda` | "Antes da Próxima Onda" — sprint Abril 2026 |
>
> ### Painel principal (`/painel/$slug`) — mudanças
>
> - **Aba `Dados` reorganizada por ATLAS** (não mais por tipo do scraper): `Documentos` (10 categorias investigáveis), `Especial` (Pendentes, Auditorias Externas, Relatórios de Gestão), `Financeiro` (Diárias, Passagens, Licitações, Aditivos, Balanços, Orçamentos, Demonstrativos)
> - **Visão Geral** ganha seção "Categorias detectadas pelo ATLAS" com cobertura por categoria canônica
> - **Tab persistente via URL:** `?tab=denuncias&sub=processo_etico` — back do navegador volta pra onde estava
> - **Sidebar fixa no viewport** (sticky top:0, height:100dvh) — só conteúdo central rola
> - **Sidebar footer:** avatar 44×44 do user, badge do plano (verde/cinza), botão `apoiar / assinar` (vira vermelho no hover) → leva pra `/apoiar`
> - **Painel de conexões** (`/painel/$slug/conex`): mini-cards no canvas, modo foco com layout radial, breadcrumbs, halo no hover
> - **Botão favoritar** em cada ficha de ato (`/painel/$slug/ato/$id`) — toggle estrela
> - **Badge ↻ refazer** nos atos legados (Haiku → vão pro Bud) na fila admin e na ficha
>
> ### Spline (3D background) trocado
>
> Default URL agora é `circleparticle-2mOq8ZvTFErySjAW1QrVZhd6` (era `particles-f6xFiWCaq16O5rpaA7nIxf2O`). Renderizado em `/painel/chat`. Componente: `src/components/SplineEmbed.tsx`.
>
> ### Tipos atualizados
>
> - `PublicStats` ganhou `por_categoria_atlas?: Record<string, {total, analisados}>`
> - `AtoAuditoria` ganhou `legado: bool` e `agentes: ("haiku_legado"|"piper"|"bud"|"new")[]`
> - `FilaItem` ganhou `legado?: bool`
> - `fetchPainelAtos` aceita `tipoAtlas?: string` (param `tipo_atlas`)
>
> ---

# (Conteúdo original)

**Stack:** React + Vite + shadcn/ui + TanStack Router  
**Deploy:** Docker no VPS Hostinger (era Lovable; trocou no Sprint Abril/2026)  
**Auth:** Supabase Auth (client-side)  
**Design:** Inter (editorial, todas as páginas públicas) + Mono para labels  
**Atualizado em:** 30 de abril de 2026 (revisão Sprint Abril)

---

## 1. Mapa de Rotas

```
/ (público)
├── /                             → Landing page
├── /solucoes                     → Página de produto + narrativa completa (ex-/produto + ex-/planos)
├── /apoiar                       → Apoio, doações, white papers
├── /produto                      → redirect → /solucoes (TanStack beforeLoad)
│
├── /whitepaper-01-extracao-caupr → White Paper Nº 01 (HTML estático)
├── /whitepaper-02-custo-e-controle → White Paper Nº 02 (HTML estático)
│
├── /login                        → Login
├── /cadastro                     → Cadastro
├── /reset-senha                  → Reset de senha
│
└── /app (autenticado)
    ├── /app                      → Dashboard geral (lista de órgãos acessíveis)
    ├── /app/[orgao]              → Dashboard do órgão
    │   ├── /app/[orgao]/atos           → Lista de atos com filtros
    │   ├── /app/[orgao]/atos/[id]      → Detalhe do ato + análise
    │   ├── /app/[orgao]/pessoas        → Lista de pessoas
    │   ├── /app/[orgao]/pessoas/[id]   → Perfil da pessoa
    │   ├── /app/[orgao]/grafo          → Visualização do grafo
    │   ├── /app/[orgao]/padroes        → Padrões detectados
    │   ├── /app/[orgao]/chat           → Chat conversacional (RAG)
    │   └── /app/[orgao]/relatorios     → Relatórios e exportações
    └── /app/configuracoes              → Perfil, plano, billing

/pnl (admin, autenticado via role)
    ├── /pnl/orgaos           → Gerenciar órgãos (CRUD + rodadas)
    ├── /pnl/rodadas          → Listar rodadas de análise
    └── /pnl/custos           → Dashboard de custos IA
```

**Rotas removidas / redirecionadas:**
- `/planos` → redireciona para `/apoiar`
- `/patrocinar` → redireciona para `/apoiar`
- `/produto` → redireciona para `/solucoes`

---

## 2. Navegação Principal (pública)

Todas as páginas públicas compartilham a mesma nav:

```
[DIG DIG]           [Soluções]  [Apoiar]        [Entrar]
```

- Sem "Início", "Planos", "Patrocinar" ou "Produto" na nav
- Link ativo destacado com `font-medium text-white/85` (Inter)
- CTA "Entrar" leva ao `/login`

---

## 3. Páginas Públicas

### 3.1 Landing Page (`/`)

**Tom:** direto, jornalístico, sem jargão comercial  
**Seções:**
1. **Hero** — headline, subtítulo explicativo, CTA "Ver Soluções" + status da rodada atual
2. **Como funciona** — 4 passos em grid `gap-px`: coleta de PDFs → extração de texto → triagem Haiku → aprofundamento Sonnet
3. **Níveis de alerta** — grid 2×2 com verde/amarelo/laranja/vermelho e critérios
4. **CTA** — link para /solucoes e /apoiar

**StatusBar:** faixa discreta abaixo do hero mostrando progresso da análise atual (atos analisados, porcentagem) — sem valor em dinheiro.

---

### 3.2 Soluções (`/solucoes`) — página principal do produto

Esta é a página de maior conteúdo do site. Serve como produto, narrativa, manifesto e vendas ao mesmo tempo. Substituiu `/produto` e `/planos`.

**Layout geral:** `max-w-[780px] mx-auto` com `PapersSidebar` fixada à direita em desktop (`lg:block hidden`, `sticky top-32`).

**Seções em ordem:**

1. **Hero editorial** — label MONO "O QUE É O DIG DIG", título Inter, parágrafo introdutório

2. **O que nos diferencia** — 4 cards `border-white/[0.06]`:
   - Separação legal vs. moral/ética
   - Grafo de relacionamentos ao longo do tempo
   - Linguagem de indício, nunca de condenação
   - Custo previsível: ~$0,012 por ato

3. **Pipeline** — 4 passos em `grid sm:grid-cols-2 gap-px bg-white/[0.04]` com filhos `bg-[#07080f]`:
   - Coleta automática de PDFs
   - Extração de texto (pdfplumber)
   - Triagem Haiku (todos os atos)
   - Aprofundamento Sonnet (vermelho)

4. **Níveis de alerta** — grid 2×2 com verde/amarelo/laranja/vermelho

5. **Exemplo de ficha de denúncia** — mockup real com dados anonimizados

6. **Padrões detectados** — stats das portarias já analisadas (ex.: "168 amarelos, 93 verdes, 1 laranja")

7. **Chat demo** — screenshot ou mockup do chat conversacional

8. **Tabela de features** — comparativo por plano (Cidadão / Investigador / Profissional / API & Dados)

9. **Quem usa** — 6 perfis compactos em grid 2 colunas:
   - Jornalista Investigativo
   - Fiscal Político / Conselheiro
   - Advogado / Escritório
   - Cidadão Engajado
   - Pesquisador / Acadêmico
   - Veículo de Imprensa / Plataforma

10. **Roadmap** — 4 itens com status:
    - `Em desenvolvimento` — Gastos com diárias e passagens
    - `Em desenvolvimento` — Cartões corporativos
    - `Planejado` — Pedidos de informação automáticos (LAI)
    - `Planejado` — Todos os órgãos públicos do Brasil

11. **White Papers mobile** (`lg:hidden`) — mirror da `PapersSidebar` para telas menores, antes do CTA final

12. **CTA final** — botão para `/apoiar` e para cadastro

---

### 3.3 Apoiar (`/apoiar`) — suporte e doações

**Substitui** `/patrocinar` e `/planos`. Página editorial unificada.

**Seções:**
1. **Hero** — label MONO "APOIE O DIG DIG", título sobre transparência pública como bem comum
2. **Manifesto** — por que o projeto existe, de onde vem, o que representa
3. **Como apoiar** — doação voluntária (Mercado Pago), assinaturas, compartilhar
4. **`PapersSidebar`** à direita em desktop — os dois white papers publicados
5. **White Papers inline** (`lg:hidden`) — cards dos papers para mobile antes do CTA
6. **CTA** — link de doação + link para cadastro gratuito

**Sem:** termômetros públicos de meta, contador de apoiadores, mecânica de campanha.

---

### 3.4 White Papers

Dois documentos publicados como rotas estáticas — servem conteúdo HTML diretamente.

| Rota | Arquivo | Conteúdo |
|------|---------|----------|
| `/whitepaper-01-extracao-caupr` | `docs/whitepaper-01-extracao-caupr.html` | Extração de 551 atos do CAU/PR: scraper, pdfplumber, portarias escaneadas, desafios técnicos |
| `/whitepaper-02-custo-e-controle` | `docs/whitepaper-02-custo-e-controle.html` | $23 perdidos em rodadas paralelas, diagnóstico, 4 camadas de proteção, custo real por ato |

Ambos são acessíveis sem login. São o principal instrumento de marketing orgânico do projeto.

---

## 4. Design System (páginas públicas)

### Constantes de estilo (definidas por arquivo como `React.CSSProperties`)

```typescript
const INTER = { fontFamily: "'Inter', sans-serif" }
const MONO  = { fontFamily: "'IBM Plex Mono', monospace" }
const GOLD  = { color: "#c9a84c" }
```

### Paleta
- Background: `#07080f`
- Texto principal: `text-white/85`
- Labels MONO: `text-white/22`, `text-[9px]`, `tracking-[0.28em]`, uppercase
- Bordas: `border-white/[0.06]`
- Cards: `bg-[#07080f]` com `border border-white/[0.06] p-6`

### Sem gradients, sem Syne
Todas as páginas públicas usam Inter. Syne foi removido. Sem `bg-gradient-*` ou `text-gradient`.

### StatusBar
Faixa de status do pipeline acima do fold em `/`. Mostra atos analisados + percentual da rodada ativa. Não exibe custo em dinheiro.

### PapersSidebar
- `hidden lg:block` — desktop apenas
- `sticky top-32`, 260px de largura
- Lista os dois white papers com número MONO e título Inter
- Todas as páginas públicas com conteúdo longo devem incluí-la

---

## 5. App Autenticado (`/app`)

### 5.1 Dashboard Geral (`/app`)

Cards dos órgãos acessíveis pelo plano do usuário:
```
┌─────────────────────────────────┐
│  CAU/PR                 🔴 12  │
│  Conselho de Arq. e Urb. do PR │
│  1.789 atos | 45 irregulares   │
│  Última análise: 22/04/2026    │
│  [Ver Dashboard →]             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Câmara de Curitiba    🔒      │
│  Em breve                      │
└─────────────────────────────────┘
```

---

### 5.2 Dashboard do Órgão (`/app/[orgao]`)

```
[Header: nome do órgão + última análise + botão "Exportar"]

[KPIs]
🔴 Críticos   🟠 Graves   🟡 Suspeitos   🟢 Conformes

[Linha do Tempo — gráfico de barras por mês]

[Top 5 Irregularidades Mais Graves]

[Padrões Detectados]

[Pessoas em Destaque — top 5 com mais aparições suspeitas]

[Acesso Rápido]
→ Ver todos os atos    → Grafo de pessoas    → Chat    → Relatórios
```

---

### 5.3 Lista de Atos (`/app/[orgao]/atos`)

**Filtros:** Tipo | Nível de alerta | Período | Busca full-text | Pessoa

**Tabela:**
```
Nº    Tipo        Data       Ementa (truncada)              Alerta    Ações
678   Portaria    02/04/26   Prorroga Comissão Processante  🔴 CRÍTICO  [Ver] [Ficha]
677   Portaria    19/03/26   Nomeia para Cargo em Comissão  🟡 ATENÇÃO  [Ver] [Ficha]
```

---

### 5.4 Detalhe do Ato (`/app/[orgao]/atos/[id]`)

```
[Breadcrumb: CAU-PR > Atos > Portaria 678]

PORTARIA PRESIDENCIAL Nº 678  🔴
02 de Abril de 2026
[📄 Ver PDF Original]  [🎯 Exportar Ficha]

[EMENTA]
[TEXTO COMPLETO — expansível]

[ANÁLISE DA IA]
  Score de Risco: 87/100
  IRREGULARIDADES LEGAIS: ...
  IRREGULARIDADES MORAIS/ÉTICAS: ...
  RESUMO EXECUTIVO: ...
  [FICHA DE DENÚNCIA]

[PESSOAS ENVOLVIDAS]
[ATOS RELACIONADOS]
[HISTÓRICO DE ANÁLISE: Haiku + Sonnet, data]
```

---

### 5.5 Ficha de Denúncia (modal ou página dedicada)

Gerada pelo Sonnet para atos críticos. Contém:
- Título jornalístico
- O fato (o que aconteceu)
- Irregularidade legal (artigo violado)
- Irregularidade moral/ética (padrão)
- Evidências (lista de atos relacionados com datas)
- Impacto

Ações: Copiar texto | Baixar PDF | Compartilhar

---

### 5.6 Chat com IA (`/app/[orgao]/chat`)

Interface conversacional com acesso ao banco de atos analisados via RAG (Sonnet 4.6).

```
[Sidebar: histórico de sessões]
[Área principal: mensagens com streaming]
[Input + sugestões contextuais]
[Contador de cota restante do plano]
```

Comportamento por plano:
- Cidadão: 5 perguntas/mês
- Investigador: 200/mês
- Profissional: 1.000/mês
- API & Dados: via API

---

### 5.7 Outras páginas do app

| Rota | Conteúdo |
|------|----------|
| `/app/[orgao]/pessoas` | Grid/tabela de pessoas extraídas, filtros por tipo de aparição |
| `/app/[orgao]/pessoas/[id]` | Perfil: todos os atos, cargos ao longo do tempo, score |
| `/app/[orgao]/grafo` | Grafo interativo de relacionamentos (vis-network / react-force-graph) |
| `/app/[orgao]/padroes` | Cards de padrões detectados pela análise transversal |
| `/app/[orgao]/relatorios` | Geração e download de relatórios (HTML, PDF, CSV, JSON) |
| `/app/configuracoes` | Perfil do usuário, plano ativo, billing (Mercado Pago) |

---

## 6. Painel Admin (`/pnl`)

| Rota | Função |
|------|--------|
| `/pnl/orgaos` | Lista de tenants, criar/editar, disparar rodada |
| `/pnl/rodadas` | Listar rodadas com status, progresso, custo, log de erros |
| `/pnl/custos` | Gráfico de gastos por mês, breakdown Haiku vs Sonnet |

---

## 7. Componentes Reutilizáveis

| Componente | Descrição |
|-----------|-----------|
| `AlertaBadge` | Badge colorido com nível de alerta |
| `AtoCard` | Card resumido de um ato |
| `IrregularidadeItem` | Item com ícone e gravidade |
| `PessoaAvatar` | Avatar + nome + cargo + badge de suspeita |
| `GraficoLinhaTempo` | Recharts: distribuição de alertas por mês |
| `FichaDenuncia` | Template completo da ficha |
| `StatusRodada` | Progress bar + % com polling automático |
| `PapersSidebar` | Sidebar fixa com links dos white papers (desktop only) |
| `FiltroPainel` | Sidebar com filtros combinados |
| `ExportMenu` | Menu dropdown com opções de exportação |

---

## 8. Responsividade

- **Mobile:** PapersSidebar oculta (`hidden lg:block`); seção inline `lg:hidden` antes do CTA final em /solucoes e /apoiar
- **Tablet:** layout de 2 colunas
- **Desktop:** layout completo com PapersSidebar fixa
- **Grafo:** desktop-only (complexidade visual incompatível com touch)

---

## 9. Estado Atual (abril 2026)

| Página | Status |
|--------|--------|
| `/` (landing) | Em produção via Lovable |
| `/solucoes` | Em produção (reescrita editorial, narrativa completa) |
| `/apoiar` | Em produção (página unificada) |
| `/produto` | Em produção (redireciona para /solucoes) |
| `/whitepaper-01-extracao-caupr` | Em produção |
| `/whitepaper-02-custo-e-controle` | Em produção |
| `/app/*` | Estrutura de rotas existe, dashboard sem dados reais |
| Chat RAG | Não implementado |
| Billing Mercado Pago | Não implementado |
