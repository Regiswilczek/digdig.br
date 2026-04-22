# Frontend — Páginas, Componentes e Fluxos

**Stack:** React + Vite + shadcn/ui + TanStack Router (via Lovable)  
**Deploy:** Lovable  
**Auth:** Supabase Auth (client-side)

---

## 1. Mapa de Rotas

```
/ (público)
├── /                       → Landing page
├── /planos                 → Página de preços
├── /patrocinar             → Patrocine uma Auditoria (termômetros públicos)
│   └── /patrocinar/[slug]  → Campanha específica de uma instituição
├── /sobre                  → Sobre o projeto
├── /login                  → Login
├── /cadastro               → Cadastro
├── /reset-senha            → Reset de senha
│
└── /app (autenticado)
    ├── /app                → Dashboard geral (lista de órgãos acessíveis)
    ├── /app/[orgao]        → Dashboard do órgão
    │   ├── /app/[orgao]/atos           → Lista de atos com filtros
    │   ├── /app/[orgao]/atos/[id]      → Detalhe do ato + análise
    │   ├── /app/[orgao]/pessoas        → Lista de pessoas
    │   ├── /app/[orgao]/pessoas/[id]   → Perfil da pessoa
    │   ├── /app/[orgao]/grafo          → Visualização do grafo
    │   ├── /app/[orgao]/padroes        → Padrões detectados
    │   └── /app/[orgao]/relatorios     → Relatórios e exportações
    └── /app/configuracoes              → Perfil, plano, billing

/admin (role = admin)
    ├── /admin              → Painel admin
    ├── /admin/orgaos       → Gerenciar órgãos
    ├── /admin/rodadas      → Gerenciar rodadas de análise
    └── /admin/custos       → Dashboard de custos IA
```

---

## 2. Páginas Públicas

### 2.1 Landing Page (`/`)

**Seções:**
1. **Hero** — headline impactante, CTA "Acesse Grátis", screenshot do dashboard
2. **Problema** — "1.800 atos publicados. Quem leu?" — contexto sobre opacidade pública
3. **Como Funciona** — 3 passos animados: coleta → IA → relatório
4. **Órgãos Disponíveis** — cards dos órgãos (CAU-PR ativo, demais "em breve")
5. **Exemplo de Irregularidade** — screenshot de uma ficha de denúncia real (anonimizada no MVP)
6. **Depoimentos** — após lançamento
7. **Planos** — tabela de preços resumida
8. **CTA Final** — "Comece gratuitamente"
9. **Footer** — links, contato, LGPD

### 2.2 Planos (`/planos`)

- Tabela comparativa Free / Pro / Enterprise
- Toggle mensal/anual (com desconto)
- FAQ sobre o produto
- CTA por plano → checkout Stripe

### 2.3 Patrocine uma Auditoria (`/patrocinar`)

Página pública (sem login) que exibe as campanhas ativas de crowdfunding para análise de novas instituições.

**Layout:**
```
[Header: "Escolha o próximo órgão a ser auditado"]
[Subtítulo: "Quando uma campanha atingir R$ 3.000, executamos a análise completa."]

[Grid de cards de campanha]
┌─────────────────────────────────────────────┐
│  Câmara Municipal de Curitiba               │
│  📍 Curitiba, PR                            │
│  ████████████░░░░░░░  68% — R$ 2.040/3.000 │
│  127 apoiadores · 23 dias restantes         │
│  [Apoiar com R$25+]  [Votar grátis (3/mês)] │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  CRM/PR — Conselho Regional de Medicina     │
│  📍 Paraná                                  │
│  ███░░░░░░░░░░░░░░░░  22% — R$ 660/3.000   │
│  44 apoiadores · 51 dias restantes          │
│  [Apoiar com R$25+]  [Votar grátis (3/mês)] │
└─────────────────────────────────────────────┘
```

**Página de campanha individual (`/patrocinar/[slug]`):**
- Header com nome da instituição e progresso detalhado
- Lista de últimas doações (nome ou "Anônimo" + valor se público)
- Formulário de doação (mínimo R$25, integração Stripe)
- Botão de voto gratuito (requer login, 3 votos/mês por usuário)
- Seção "O que você recebe": 6 meses Investigador + badge Patrocinador + acesso 48h antes

**Funcionalidades:**
- Termômetro animado com progresso em tempo real
- Compartilhamento social nativo (cópia de link, Twitter/X, WhatsApp)
- Notificação por email ao atingir a meta (para todos os apoiadores)
- Contador de votos gratuitos restantes (visível após login)

---

## 3. App Autenticado

### 3.1 Dashboard Geral (`/app`)

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
│  Em breve — disponível em Pro  │
│  [Fazer Upgrade →]             │
└─────────────────────────────────┘
```

---

### 3.2 Dashboard do Órgão (`/app/[orgao]`)

**Layout:**
```
[Header: nome do órgão + última análise + botão "Exportar"]

[KPIs em cards]
🔴 12 Críticos   🟠 45 Graves   🟡 180 Suspeitos   🟢 934 Conformes

[Linha do Tempo — gráfico de barras por mês]
  mostra distribuição de alertas ao longo do tempo

[Top 5 Irregularidades Mais Graves]
  lista rápida com link para o ato

[Padrões Detectados]
  cards dos padrões globais (perseguição política, concentração poder...)

[Pessoas em Destaque]
  top 5 pessoas com mais aparições suspeitas

[Acesso Rápido]
  → Ver todos os atos    → Grafo de pessoas    → Relatórios
```

---

### 3.3 Lista de Atos (`/app/[orgao]/atos`)

**Filtros (sidebar ou toolbar):**
- Tipo: Portaria / Deliberação / Portaria Normativa
- Nível: 🔴 Crítico / 🟠 Grave / 🟡 Suspeito / 🟢 Conforme
- Período: date picker de/até
- Busca full-text: campo de pesquisa
- Pessoa: autocomplete de nomes

**Tabela de resultados:**
```
Nº    Tipo        Data       Ementa (truncada)              Alerta    Ações
678   Portaria    02/04/26   Prorroga Comissão Processante  🔴 CRÍTICO  [Ver] [Ficha]
677   Portaria    19/03/26   Nomeia para Cargo em Comissão  🟡 ATENÇÃO  [Ver] [Ficha]
```

Paginação + opção de visualização em cards.

---

### 3.4 Detalhe do Ato (`/app/[orgao]/atos/[id]`)

```
[Breadcrumb: CAU-PR > Atos > Portaria 678]

┌──────────────────────────────────────────────────┐
│  PORTARIA PRESIDENCIAL Nº 678              🔴   │
│  02 de Abril de 2026                            │
│  [📄 Ver PDF Original]  [🎯 Exportar Ficha]    │
└──────────────────────────────────────────────────┘

[EMENTA]
Prorroga o prazo da Comissão Processante nomeada pela Portaria nº 580...

[TEXTO COMPLETO — expansível]
...

[ANÁLISE DA IA]
  📊 Score de Risco: 87/100
  
  ⚖️ IRREGULARIDADES LEGAIS
  ┌─ Prazo excedido — Alta gravidade
  │  A comissão processante ultrapassa 240 dias o prazo máximo...
  │  Artigo violado: Art. 89, §3º do Regimento Interno
  └─
  
  🎭 IRREGULARIDADES MORAIS/ÉTICAS
  ┌─ Perseguição Política — Crítica
  │  O processado aparece em manifestações contra a gestão...
  └─
  
  📝 RESUMO EXECUTIVO
  "Desde abril de 2025, a gestão mantém aberto..."
  
  🎯 FICHA DE DENÚNCIA
  [ver ficha completa]

[PESSOAS ENVOLVIDAS]
  Avatar + nome + cargo + link para perfil

[ATOS RELACIONADOS]
  Portaria 580 → Portaria 667 → Portaria 673 → [este] 678

[HISTÓRICO DE ANÁLISE]
  Analisado por Haiku + Sonnet em 22/04/2026
```

---

### 3.5 Ficha de Denúncia (modal ou página)

```
╔══════════════════════════════════════════════════════════╗
║  FICHA DE DENÚNCIA — CAU/PR                             ║
║  Irregularidade Nº 12 | Gerada em 22/04/2026           ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  TÍTULO                                                  ║
║  CAU/PR mantém processo disciplinar aberto por mais     ║
║  de 1 ano para afastar opositor                         ║
║                                                          ║
║  O FATO                                                  ║
║  A Portaria 678/2026 prorroga pela 4ª vez a Comissão   ║
║  Processante instaurada em abril/2025, totalizando      ║
║  360 dias de investigação sem conclusão.                ║
║                                                          ║
║  IRREGULARIDADE LEGAL                                    ║
║  Violação do Art. 89, §3º do Regimento Interno:        ║
║  prazo máximo de 120 dias, prorrogável uma vez.         ║
║                                                          ║
║  IRREGULARIDADE MORAL                                    ║
║  Uso do processo disciplinar como instrumento de        ║
║  perseguição política.                                   ║
║                                                          ║
║  EVIDÊNCIAS                                             ║
║  • Portaria 580/2025 — instauração em 07/04/2025       ║
║  • Portaria 667/2026 — recondução em 02/02/2026        ║
║  • Portaria 673/2026 — prorrogação em 02/03/2026       ║
║  • Portaria 678/2026 — prorrogação em 02/04/2026       ║
║                                                          ║
║  IMPACTO                                                 ║
║  O processado está impedido de exercer funções no       ║
║  CAU/PR há mais de 1 ano.                               ║
║                                                          ║
║  [📋 Copiar texto]  [⬇️ Baixar PDF]  [🔗 Compartilhar]  ║
╚══════════════════════════════════════════════════════════╝
```

---

### 3.6 Lista de Pessoas (`/app/[orgao]/pessoas`)

Grid de cards ou tabela:
```
[João da Silva]           [Maria Costa]
Assessor Técnico          Presidente Comissão X
23 aparições • Suspeito   15 aparições
[Ver perfil →]            [Ver perfil →]
```

Filtros: tipo de aparição, suspeito sim/não, busca por nome.

---

### 3.7 Grafo de Relacionamentos (`/app/[orgao]/grafo`)

Visualização interativa usando `vis-network` ou `react-force-graph`:
- Nós = pessoas/entidades, coloridos por nível de suspeita
- Arestas = relações (nomeador→nomeado, mesma comissão, processador→processado)
- Zoom, pan, clique no nó abre modal com detalhes
- Filtros: mostrar só suspeitos, por tipo de relação, período

---

### 3.8 Padrões Detectados (`/app/[orgao]/padroes`)

Cards por padrão:
```
┌─────────────────────────────────────────────┐
│ 🔴 PERSEGUIÇÃO POLÍTICA VIA PROCESSO        │
│ DISCIPLINAR                                 │
│                                             │
│ 4 atos envolvidos • 2 pessoas • 2025-2026   │
│                                             │
│ "Desde abril de 2025, a gestão do CAU/PR   │
│ mantém aberto um processo disciplinar..."   │
│                                             │
│ [Ver atos envolvidos] [Exportar ficha]      │
└─────────────────────────────────────────────┘
```

---

### 3.9 Chat com IA (`/app/[orgao]/chat`)

Interface conversacional para o usuário perguntar sobre os dados em linguagem natural.

```
┌─────────────────────────────────────────────────────┐
│  CAU/PR — Chat com a IA              [Nova conversa]│
│  [Histórico ▼]                                      │
├──────────────┬──────────────────────────────────────┤
│ CONVERSAS    │                                      │
│              │  🤖 Olá! Analisei 1.789 atos do     │
│ Hoje         │  CAU/PR. Exemplos do que posso fazer:│
│ • Exonerações│  → "Quais as 5 piores irregulars?"  │
│ • Portaria   │  → "Me fale sobre a Portaria 678"   │
│   678        │  → "Prepare texto para debate"      │
│              │                                      │
│ Ontem        │  👤 Qual a relação entre exonerações │
│ • Padrões    │  de 2025 e processos abertos?       │
│              │                              14:32   │
│              │  🤖 Encontrei um padrão claro...    │
│              │  [resposta completa com citações]   │
│              │                              14:32   │
│              │  👍 👎  [Copiar] [Exportar]         │
│              │                                      │
├──────────────┴──────────────────────────────────────┤
│  [Digite sua pergunta...              ]  [Enviar →] │
│  💡 [5 piores casos] [Pessoas suspeitas] [Padrões]  │
└─────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Streaming da resposta (texto aparece em tempo real)
- Memória dentro da sessão (a IA lembra do contexto anterior)
- Sugestões de perguntas contextuais
- Feedback 👍/👎 por resposta
- "Copiar resposta" e "Exportar conversa"
- Histórico de sessões anteriores (30 dias)
- Indicador de cota restante do plano

**Comportamento por plano:**
- Free: 20 perguntas/mês — badge com contador visível
- Pro: 300 perguntas/mês — contador discreto
- Enterprise: ilimitado — sem contador

### 3.10 Relatórios (`/app/[orgao]/relatorios`)

- Botão "Gerar Relatório" com opções de tipo e filtros
- Lista de relatórios gerados com data e download
- Preview inline do relatório HTML
- Exportação em: HTML, PDF (via print), JSON, CSV

---

## 4. Painel Admin (`/admin`)

### Gerenciar Órgãos
- Lista de todos os tenants com status
- Formulário para adicionar novo órgão (scraper config, regimento)
- Botão "Disparar Análise" por órgão
- Status da rodada em tempo real (WebSocket ou polling)

### Rodadas de Análise
- Lista de rodadas com status, progresso, custo
- Log de erros por ato
- Custo total por modelo

### Dashboard de Custos
- Gráfico de gasto por mês
- Breakdown Haiku vs Sonnet
- Projeção do mês atual

---

## 5. Componentes Reutilizáveis

| Componente | Descrição |
|-----------|-----------|
| `AlertaBadge` | Badge colorido com nível de alerta |
| `AtoCard` | Card resumido de um ato |
| `IrregularidadeItem` | Item de irregularidade com ícone e gravidade |
| `PessoaAvatar` | Avatar + nome + cargo + badge de suspeita |
| `GraficoLinhaTempo` | Recharts: distribuição de alertas por mês |
| `FichaDenuncia` | Template completo da ficha |
| `StatusRodada` | Progress bar + % com polling automático |
| `FiltroPainel` | Sidebar com filtros combinados |
| `ExportMenu` | Menu dropdown com opções de exportação |

---

## 6. Estados de Loading e Erro

- Skeleton loaders em todas as listas
- Error boundaries com mensagem amigável + botão retry
- Toast notifications para ações (exportar, gerar relatório)
- Empty states ilustrados ("Nenhuma irregularidade encontrada neste período")

---

## 7. Responsividade

- Mobile: navegação por drawer/bottom sheet, tabelas com scroll horizontal
- Tablet: layout de 2 colunas
- Desktop: layout completo com sidebar
- O grafo de relacionamentos é desktop-only (complexidade visual)
