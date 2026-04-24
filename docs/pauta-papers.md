# Pauta de White Papers — Dig Dig

Este arquivo é a agenda do agente redator. Para pedir um paper, adicione um item na seção
"Fila para escrever" com título, status e as ideias principais. Quando estiver pronto,
diga ao Claude: "escreve o próximo paper da pauta".

O agente lê este arquivo, escolhe o primeiro item com status `pronto`, escreve o paper
no estilo dos anteriores (docs/registro-extracao-cau-pr.md e docs/whitepaper-02-custo-e-controle.html),
salva o HTML em `docs/`, cria a rota TSX em `src/routes/`, atualiza este arquivo
marcando o item como `publicado`, e abre um commit.

---

## Fila para escrever

### White Paper Nº 03 — Os Primeiros Vermelhos
**Status:** rascunho
**Quando escrever:** quando o Haiku terminar as 400 portarias e aparecerem os primeiros casos vermelho
**Ideias principais:**
- O pipeline chegou nos anos 2020–2022 e encontrou os primeiros casos críticos
- O que é um "vermelho" na prática — o que a IA sinalizou, por quê
- Como funciona a fase Sonnet: análise profunda, ficha de denúncia, mapeamento de pessoas
- O que o resultado significa: indício, não prova — linguagem correta de transparência
- Distribuição final da rodada CAU/PR por ano e por nível

### White Paper Nº 04 — O Chat que Conhece os Atos
**Status:** ideia
**Quando escrever:** quando o chat conversacional estiver funcionando
**Ideias principais:**
- Como o RAG funciona: o banco já tem tudo analisado, o chat só consulta
- Tipos de pergunta que o chat responde bem (e mal)
- Custo por pergunta (~$0,02–$0,10) e como controlamos
- Diferença entre "chat com PDF" e "chat com banco estruturado"
- Exemplos reais de perguntas e respostas

### White Paper Nº 05 — Nepotismo em Números
**Status:** ideia
**Quando escrever:** quando tivermos dados suficientes do pipeline para mostrar padrões
**Ideias principais:**
- Metodologia de detecção: o que a IA considera nepotismo/favorecimento
- Padrões encontrados no CAU/PR
- Diferença entre ilegal (viola regimento) e moral (mesmo que legal, é problemático)
- Como a ficha de denúncia documenta isso para uso público/jornalístico

---

## Publicados

- **Nº 01 — Como Automatizamos a Auditoria do CAU/PR com IA**
  `docs/whitepaper-01-extracao-caupr.html` · `src/routes/whitepaper-01-extracao-caupr.tsx`
  A origem do projeto, a arquitetura e os 7 problemas reais que tivemos que resolver.

- **Nº 02 — Quando a IA Custa Mais do Que Deveria**
  `docs/whitepaper-02-custo-e-controle.html` · `src/routes/whitepaper-02-custo-e-controle.tsx`
  Como detectamos e corrigimos $20 em chamadas de API não rastreadas — diagnóstico e solução em 4 camadas.

---

## Ideias soltas (sem paper definido ainda)

- A história do San Pelegrino: como uma investigação manual virou o Dig Dig
- Multi-tenancy: como adicionamos um segundo órgão sem tocar no código
- O scraper local: por que o Railway é bloqueado e como resolvemos
- Deliberações HTML-only: o próximo desafio técnico
- OCR nas portarias escaneadas (2018–2021): o que vem depois do texto nativo
