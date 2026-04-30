# Pauta de White Papers — Dig Dig

Este arquivo é a agenda do agente redator. Para pedir um paper, adicione um item na seção
"Fila para escrever" com título, status e as ideias principais. Quando estiver pronto,
diga ao Claude: "escreve o próximo paper da pauta".

O agente lê este arquivo, escolhe o primeiro item com status `pronto`, escreve o paper
no estilo dos anteriores, salva o TSX em `src/routes/whitepaper-XX-slug.tsx`, atualiza a
entrada do `/blog` em `src/routes/blog.tsx`, atualiza este arquivo marcando o item como
`publicado`, e abre um commit.

---

## Fila para escrever

### White Paper Nº 11 — O Inventário do CAU/PR (Pós-ATLAS)
**Status:** ideia
**Quando escrever:** depois que rodar o Piper em todos os atos com tipo_atlas (3.424 docs)
**Ideias principais:**
- Como ficou o mapa do órgão depois da reorganização canônica do ATLAS
- Distribuição real por categoria (44% licitação, 18% deliberação, 16% portaria, etc)
- O que o ATLAS revela sobre o portal de transparência: muito edital, pouca prestação de contas narrativa
- Qual o custo de auditar 100% do corpus com 4 agentes
- O que aparece quando rodamos Bud nos 47 críticos pendentes (incluindo as auditorias legadas)

### White Paper Nº 12 — Os Vermelhos do Bud
**Status:** ideia
**Quando escrever:** depois que o Bud passar nos 47 críticos pendentes
**Ideias principais:**
- O que mudou quando o Bud reanalisou os legados do Haiku 4.5
- Casos específicos com nomes (cuidado: linguagem de indício)
- Padrões transversais entre vermelhos: comissões, prazos, ad referendum
- Comparação Piper vs Bud: o que o Sonnet 4.6 viu que o Pro não viu

### White Paper Nº 13 — Paraná: O Salto de Escala
**Status:** ideia
**Quando escrever:** depois do primeiro órgão estadual auditado (provavelmente Gov PR)
**Ideias principais:**
- O que muda quando o órgão é 100x maior que o CAU/PR
- Como ATLAS escala: $2 no CAU vs quanto no Estado?
- Estratégia de priorização: rodar Piper só nos 20% que ATLAS marca como críticos?
- O que aprendemos sobre jornalismo de dados em ordem de magnitude diferente

### White Paper Nº 14 — Conexões: Quando o Grafo Fala
**Status:** ideia
**Quando escrever:** quando o painel de conexões tiver fichas-cidadãs completas
**Ideias principais:**
- Como visualizar a rede de poder de um órgão sem ser arquivista
- A diferença entre "uma pessoa aparece em vários atos" e "essa pessoa controla um padrão"
- ICP (Índice de Concentração de Poder) e como calcular
- Casos reais visualizáveis: cluster de comissões processantes, cabide de emprego, perseguição política

---

## Publicados

- **Nº 01 — Como Automatizamos a Auditoria do CAU/PR com IA**
  `src/routes/whitepaper-01-extracao-caupr.tsx` · `docs/whitepaper-01-extracao-caupr.html`
  A origem do projeto, a arquitetura e os 7 problemas reais que tivemos que resolver.

- **Nº 02 — Custo e Controle**
  `src/routes/whitepaper-02-custo-e-controle.tsx`
  Como detectamos e corrigimos $20 em chamadas de API não rastreadas — 4 camadas de proteção.

- **Nº 03 — Quando as Deliberações Falam Mais Alto**
  `src/routes/whitepaper-03-deliberacoes-e-primeiros-achados.tsx`
  545 PDFs extraídos e primeiros achados com 41% de casos críticos.

- **Nº 04 — O Que a Máquina Encontrou**
  `src/routes/whitepaper-04-o-que-a-maquina-encontrou.tsx`
  Resultados reais de 1.096 atos do CAU/PR analisados por IA.

- **Nº 05 — Quando a Máquina Entra na Sala**
  `src/routes/whitepaper-05-quando-a-maquina-entra-na-sala.tsx`
  179 atas plenárias, OCR sem Tesseract e o que o quórum revela que a portaria esconde.

- **Nº 06 — Do Gabinete ao Terminal**
  `src/routes/whitepaper-06-do-gabinete-ao-terminal.tsx`
  Mapeamos o Portal da Transparência do CAU/PR e encontramos o que ele esconde.

- **Nº 07 — Pré-Auditoria Integrada do CAU/PR**
  `src/routes/whitepaper-07-pre-auditoria-integrada.tsx`
  1.789 atos, dois PADs secretos ativos e quatro padrões sistêmicos documentados.

- **Nº 08 — Três Dias Sem Dormir**
  `src/routes/whitepaper-08-tres-dias.tsx`
  Como o corpus foi de 2.300 para 7.718 documentos — e por que o Dig Dig vai abrir por convite.

- **Nº 09 — Dados: O Que Fazer Com Eles**
  `src/routes/whitepaper-09-dados-o-que-fazer.tsx`
  Tags, Dune Analytics, linhas investigativas e a pergunta que mudou.

- **Nº 10 — Antes da Próxima Onda**
  `src/routes/whitepaper-10-antes-da-proxima-onda.tsx`
  CVSS-A, meta-tags, painel de conexões, painel da conta e o quarto agente (ATLAS).
  *Sprint Abril 2026 — fechamento.*

---

## Ideias soltas (sem paper definido ainda)

- A história do San Pelegrino: como uma investigação manual virou o Dig Dig
- Multi-tenancy: como adicionamos um segundo órgão sem tocar no código (na prática)
- O scraper local: por que o data-center é bloqueado e como resolvemos
- OCR nas portarias escaneadas (2018–2021)
- Bot de Telegram: como acompanhar o projeto sem abrir o laptop
- O painel da conta: do "demo" pra "plataforma"
