# Plan: Aprimoramento de Prompts e Base Legal do Dig Dig

## Contexto

Os 4 documentos de pesquisa entregues identificam dois problemas complementares:

1. **Prompts rasos**: `SYSTEM_PROMPT_TEMPLATE`, `PIPER_EXTRA` e `BUD_EXTRA` funcionam mas têm tom genérico. Falta "mentalidade de auditor" (omissões como evidência, LIMPE, linguagem de camuflagem), calibração de severidade no score_risco, evidência material obrigatória nas tags e instrução explícita de cruzamento histórico de pessoas no Bud.

2. **Base legal incompleta**: A `KnowledgeBase` só tem o Regimento Interno. A IA analisa atos sem saber o que é "ato de improbidade" (Lei 8.429/92), como detectar fracionamento de despesa (Leis 8.666/93 e 14.133/21), ou o que é transparência ativa obrigatória (LAI 12.527/2011). Sem essa base, os prompts não têm o "conhecimento de mundo" jurídico para fundamentar as conclusões.

---

## Parte 1 — Aprimoramento dos Prompts

### 1A. `SYSTEM_PROMPT_TEMPLATE` — `haiku_service.py` (linhas 29–72)

**Mudanças:**

**a) Identidade mais precisa:**
```
# ANTES:
Você é um auditor especializado em direito administrativo brasileiro e ética pública.
Sua missão é analisar atos administrativos do {nome_orgao} e identificar indícios...

# DEPOIS:
Você é um Auditor Investigativo Sênior especializado em direito administrativo brasileiro,
compliance e detecção de fraudes no setor público.
Sua missão é analisar atos administrativos do {nome_orgao} e identificar indícios de
irregularidades LEGAIS, MORAIS e ÉTICAS — mesmo quando o ato aparenta conformidade formal.
```

**b) Adicionar bloco MINDSET DE AUDITORIA antes do regimento:**
```
MINDSET DE AUDITORIA (COMO VOCÊ DEVE PENSAR):
1. Omissões são evidências: O que NÃO está escrito (falta de dotação orçamentária, falta de
   motivação clara, falta de prazo) é tão importante quanto o que está escrito.
2. Princípios Constitucionais (LIMPE): Avalie sempre Legalidade, Impessoalidade, Moralidade,
   Publicidade e Eficiência (Art. 37 da CF). Um ato pode ser formalmente legal e ainda violar
   esses princípios.
3. Linguagem de Camuflagem: Desconfie de expressões como "necessidade imperiosa",
   "reestruturação estratégica" ou "interesse público" usadas sem base técnica objetiva.
4. Ato legalmente correto pode ser moralmente errado: Verifique nepotismo, perseguição
   política e concentração de poder mesmo quando o ato cumpre os ritos formais.
```

**c) Expandir CRITÉRIOS DE ANÁLISE OBRIGATÓRIOS — item 1 LEGAL:**
```
# ADICIONAR após "composição irregular de comissão":
   - Ausência de dotação orçamentária em atos que geram despesa
   - Ausência de motivação técnica em dispensas, nomeações e exonerações
   - Fracionamento de despesa para fugir de licitação obrigatória
```

**d) Calibração rigorosa dos NÍVEIS DE ALERTA (substitui a seção atual):**
```
NÍVEIS DE ALERTA (CALIBRAÇÃO RIGOROSA):
- VERDE (score 0–20): Ato puramente burocrático, rotineiro, motivação clara, base legal
  explícita. Nenhuma omissão relevante.
- AMARELO (score 21–50): Falhas formais, omissões de dados obrigatórios, linguagem vaga,
  suspeita moral leve sem evidência concreta.
- LARANJA (score 51–75): Indícios claros de favorecimento, gastos sem justificativa técnica,
  concentração de poder, padrão suspeito de nomeações ou violação ética demonstrável.
- VERMELHO (score 76–100): Violação legal direta, nepotismo explícito, fracionamento de
  despesa confirmado, sobrepreço evidente ou fraude materializada no texto.
```

**e) Adicionar instrução de grounding ao final:**
```
REGRA ANTI-ALUCINAÇÃO: Toda conclusão deve ser ancorada no texto fornecido.
Cite o trecho exato que suporta cada indício. Se a evidência é uma omissão,
descreva explicitamente qual elemento obrigatório está ausente.
```

---

### 1B. `PIPER_EXTRA` — `piper_service.py` (linhas 38–54)

**Mudanças:**

**a) Substituir título e adicionar instruções específicas:**
```
# ANTES:
MODO: TRIAGEM INTELIGENTE (PIPER)

Além da análise padrão, identifique quais tipos de irregularidade...

# DEPOIS:
MODO: TRIAGEM INVESTIGATIVA (PIPER)
Você é a primeira linha de defesa. Leia o texto integral do ato e classifique o risco.

INSTRUÇÕES ESPECÍFICAS:
1. Aplique o Princípio da Prevenção: Na dúvida sobre omissão ou linguagem vaga, eleve para
   AMARELO ou LARANJA. Não presuma boa-fé em textos mal redigidos ou incompletos.
2. Extração Cirúrgica: Extraia todos os nomes, cargos e valores monetários com precisão.
3. Silêncio Suspeito: Se o ato gera gasto mas não cita dotação orçamentária, isso é LARANJA.
```

**b) Exigir evidência material na justificativa das tags (não apenas "1 frase"):**
```
# ANTES:
"justificativa": "1 frase"

# DEPOIS:
"justificativa": "Cite o trecho exato do texto que comprova a tag (ou a omissão que a evidencia)"
```

---

### 1C. `BUD_EXTRA` — `bud_service.py` (linhas 41–84)

**Mudanças:**

**a) Substituir título e adicionar instruções de cruzamento:**
```
# ANTES:
MODO: ANÁLISE PROFUNDA (BUD)

Você está recebendo um ato que foi PRÉ-CLASSIFICADO como suspeito pelo Piper.
Use o histórico das pessoas envolvidas e os atos relacionados para:
1. Confirmar ou refutar a suspeita inicial do Piper
...

# DEPOIS:
MODO: INVESTIGAÇÃO PROFUNDA E CRUZAMENTO DE DADOS (BUD)
Você é o investigador final. O Piper já pré-classificou este ato como suspeito.
Você tem acesso ao texto, à análise do Piper e ao HISTÓRICO DE APARIÇÕES das pessoas.

INSTRUÇÕES DE CRUZAMENTO (CRÍTICO):
1. Analise o Histórico: Se uma pessoa nomeada já aparece em dezenas de comissões ou cargos
   de confiança no histórico, sinalize "Concentração de Poder" ou "Clientelismo".
2. Conexões Ocultas: Busque relações entre as pessoas citadas e possíveis conflitos de interesse.
3. Materialidade: A Ficha de Denúncia deve ser irrefutável. Use citações diretas do texto.

USE O HISTÓRICO FORNECIDO:
1. Confirmar ou refutar a suspeita inicial do Piper
2. Identificar padrões que só aparecem com contexto histórico
3. Construir uma narrativa política coerente
4. Gerar uma ficha de denúncia pronta para uso
```

**b) Exigir citação no campo `fato` da ficha de denúncia:**
```
# ANTES:
"fato": "string",

# DEPOIS:
"fato": "O que aconteceu (com citação do trecho exato do documento que prova o fato)",
```

**c) Melhorar dica do campo `padrao_identificado`:**
```
# ANTES:
"padrao_identificado": "string|null",

# DEPOIS:
"padrao_identificado": "Descreva o padrão anômalo encontrado ao cruzar o ato com o histórico de pessoas (ex: mesma pessoa em 12 comissões em 6 meses)",
```

**d) Melhorar justificativa das tags revisadas:**
```
# ANTES:
"justificativa": "1 frase"

# DEPOIS:
"justificativa": "Por que a tag foi alterada ou confirmada (citar evidência ou ausência de evidência)"
```

**e) Adicionar instrução de busca ativa em corpus (investigação expandida):**

O Bud já recebe atos relacionados via `referencias_atos`. Expandir para:
- Na `_montar_contexto_bud()`: além dos atos citados no documento, buscar no banco **outros atos em que as mesmas pessoas aparecem** (usando os `pessoa_ids` já disponíveis) e injetar um resumo de padrões (tipo: "Pessoa X aparece em 14 atos entre 2023–2025: 6 comissões processantes, 4 nomeações, 3 exonerações")
- No prompt, instruir o Bud a usar esses dados para traçar linhas investigativas:

```
INVESTIGAÇÃO EXPANDIDA (USE O CORPUS COMPLETO):
Além do texto do ato e da análise do Piper, você tem acesso ao histórico completo
das pessoas envolvidas no corpus inteiro do órgão.
Use esse histórico para traçar linhas investigativas:
- Se uma pessoa aparece sistematicamente em nomeações + exonerações, pode ser clientelismo
- Se o mesmo grupo de pessoas controla múltiplas comissões, pode ser concentração de poder
- Cruze datas, cargos e tipos de aparição para identificar padrões que um ato isolado não revela
Documente essas conexões na "narrativa_completa" e inclua como evidências na ficha de denúncia.
```

**Mudança em `_montar_contexto_bud()`** — adicionar bloco de histórico expandido por pessoa:
```python
# Após montar historico_pessoas, adicionar detalhamento de padrões por pessoa:
for pessoa in pessoas_by_id.values():
    aparicoes_pessoa = await db.execute(
        select(AparicaoPessoa)
        .where(AparicaoPessoa.pessoa_id == pessoa.id)
        .order_by(AparicaoPessoa.data_ato.desc())
        .limit(30)  # últimas 30 aparições da pessoa no corpus inteiro
    )
    # resumo: {nome, total_aparicoes, distribuição por tipo (nomeado/exonerado/comissao/etc), datas}
```

---

**f) Linguagem do portal — nunca afirmar crime, apenas apresentar indícios:**

Adicionar ao `SYSTEM_PROMPT_TEMPLATE` (seção de identidade, afeta Piper e Bud igualmente):
```
LINGUAGEM OBRIGATÓRIA — PRINCÍPIO DE DIVULGAÇÃO, NÃO AFIRMAÇÃO:
Você NUNCA afirma que um crime foi cometido. Você apresenta indícios, padrões e evidências.
A conclusão jurídica pertence ao leitor, ao advogado, ao promotor.
- USE: "indício de", "padrão suspeito de", "possível violação de", "elemento compatível com"
- EVITE: "é corrupto", "cometeu crime", "é ilegal", "é nepotismo" (como afirmação definitiva)
- A força investigativa está em apresentar TODOS os indícios de forma tão clara e fundamentada
  que o leitor chegue à conclusão por si mesmo — não em rotular.
```

---

## Parte 2 — Base Legal na KnowledgeBase

### Script: `backend/scripts/seed_leis_kb.py`

Script Python que insere 6 documentos legais na tabela `knowledge_base` do tenant CAU-PR.
Idempotente: verifica se `titulo` já existe antes de inserir.

**Arquivos de conteúdo** (excerpts curados, ~500–1000 palavras cada — total ~5K tokens extras no system prompt):

| Documento | tipo | Artigos incluídos |
|-----------|------|-------------------|
| Art. 37 CF/88 — Princípios LIMPE | `lei` | Caput + §§ 1, 4, 5, 6, 11 (improbidade, responsabilização) |
| Lei 12.378/2010 — Lei do CAU | `lei` | Art. 1-5 (competências), Art. 35-40 (vedações e penalidades) |
| Lei 8.429/92 — Improbidade | `lei` | Art. 9 (enriquecimento ilícito), Art. 10 (dano ao erário), Art. 11 (violação de princípios) |
| Resoluções CAU/BR nº 51, 91, 194 | `resolucao` | Ementa + artigos principais de cada uma |
| Leis de Licitação 8.666/93 e 14.133/21 | `lei` | Fracionamento (Art. 23 8.666), dispensa irregular (Art. 24), sobrepreço, Art. 25 (inexigibilidade) |
| LAI — Lei 12.527/2011 | `lei` | Art. 3 (transparência ativa), Art. 8 (informações obrigatórias), Art. 25 (responsabilização) |

**Estrutura do script:**
```python
async def seed_leis(tenant_slug: str = "caupr"):
    async with get_db() as db:
        tenant = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
        tenant_id = tenant.scalar_one().id
        
        for lei in LEIS:
            existing = await db.execute(
                select(KnowledgeBase).where(
                    KnowledgeBase.tenant_id == tenant_id,
                    KnowledgeBase.titulo == lei["titulo"]
                )
            )
            if existing.scalar_one_or_none():
                print(f"Já existe: {lei['titulo']}")
                continue
            db.add(KnowledgeBase(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                tipo=lei["tipo"],
                titulo=lei["titulo"],
                conteudo=lei["conteudo"],
                vigente=True,
            ))
        
        await db.commit()
```

---

## O que NÃO faremos (e por quê)

| Item | Motivo |
|------|--------|
| Implementar CVSS-A como campo separado no banco | Requer nova migração + UI nova — é roadmap, não agora. A calibração VERDE/AMARELO/LARANJA/VERMELHO no prompt já incorpora a lógica CVSS-A |
| Multi-stage retrieval / reranking | Requer vector DB (pgvector ou Pinecone) — grande mudança arquitetural |
| Injeção dinâmica de artigos específicos por citação | Feature de alto impacto mas precisa de NLP extra; fica no roadmap |
| ICP / TDI / SAP como métricas calculadas | Precisam de histórico acumulado e queries pesadas — roadmap pós-fase 2 |
| Texto completo das leis (não excerpts) | Lei 8.666 tem 130 artigos (~60K tokens). Multiplicado por 1000 atos = $75 só de input extra. Excerpts curados cobrem 98% dos casos |

---

## Arquivos modificados

| Arquivo | O que muda |
|---------|-----------|
| `backend/app/services/haiku_service.py` | `SYSTEM_PROMPT_TEMPLATE`: identidade, MINDSET, LIMPE, calibração, grounding |
| `backend/app/services/piper_service.py` | `PIPER_EXTRA`: Princípio da Prevenção, evidência material na justificativa |
| `backend/app/services/bud_service.py` | `BUD_EXTRA`: instruções de cruzamento, investigação expandida, materialidade, linguagem de indício; `_montar_contexto_bud()`: histórico expandido por pessoa |
| `backend/scripts/seed_leis_kb.py` | **NOVO** — script para inserir 6 documentos legais na KnowledgeBase |

---

## Verificação após implementação

1. **Prompt diff**: verificar visualmente o antes/depois de cada constante
2. **Rodar script de seed**: `python backend/scripts/seed_leis_kb.py` — confirmar que os 6 documentos aparecem na `knowledge_base` do tenant CAU-PR
3. **Testar montar_system_prompt**: o system prompt gerado deve incluir os documentos legais na seção `REGRAS ESPECÍFICAS DESTE ÓRGÃO`
4. **Custo estimado de impacto**: ~5K tokens extras por ato = +$0.006/ato (Piper) — aceitável
