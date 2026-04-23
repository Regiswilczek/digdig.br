# Chat e IA Conversacional

**Conceito:** O usuário conversa em linguagem natural com a IA sobre os dados já analisados da instituição. A IA não re-analisa os documentos — ela navega pelo banco de dados de análises previamente computadas e responde com inteligência, contexto e precisão.

---

## 1. A Diferença Fundamental

```
❌ COMO NÃO FUNCIONA:
   Usuário pergunta → IA lê 1.800 PDFs → responde
   (caro, lento, impossível)

✅ COMO FUNCIONA:
   Usuário pergunta → Sistema busca dados relevantes no banco
                    → IA lê só os dados relevantes → responde
   (rápido, barato, preciso)
```

O trabalho pesado (baixar PDFs, extrair texto, analisar com Haiku e Sonnet) já foi feito na **rodada de análise**. O chat usa esses resultados como memória permanente da IA.

---

## 2. O Que a IA "Sabe" Sobre a Instituição

Quando um usuário abre o chat do CAU-PR, a IA tem acesso instantâneo a:

```
MEMÓRIA ESTRUTURADA DO CAU-PR (no banco):
├── 1.789 atos com metadados completos
├── 1.171 textos completos de PDFs extraídos
├── Análise individual de cada ato (nível, irregularidades, resumo)
├── Fichas de denúncia prontas para cada caso grave
├── Grafo de 847 pessoas com seus relacionamentos
├── 12 padrões globais detectados (perseguição, nepotismo, etc.)
├── Linha do tempo de irregularidades 2020-2026
└── Regimento Interno completo (base legal)
```

A IA não "lembra" tudo isso simultaneamente — ela **busca** o que é relevante para cada pergunta.

---

## 3. Arquitetura RAG (Retrieval Augmented Generation)

```
PERGUNTA DO USUÁRIO
"Existe alguma relação entre as exonerações de 2025 e os processos abertos?"
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  PASSO 1: CLASSIFICAR INTENÇÃO (Haiku — rápido e barato) │
│  → Tipo: "investigação de padrão"                        │
│  → Entidades: exonerações, 2025, comissões processantes  │
│  → Queries necessárias: [exoneracoes_2025, processos]    │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│  PASSO 2: BUSCAR DADOS NO BANCO (SQL — sem IA)           │
│  Query 1: atos tipo portaria, ementa LIKE 'exoner%',     │
│           data 2025, ORDER BY data                       │
│  Query 2: atos tipo portaria, ementa LIKE '%processante%'│
│           data 2025, incluindo referências cruzadas      │
│  Query 3: pessoas que aparecem em ambos os conjuntos     │
│  Query 4: padrões detectados tipo perseguicao_politica   │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│  PASSO 3: RANQUEAR E SELECIONAR (Python — sem IA)        │
│  → Ordenar por relevância e gravidade                    │
│  → Selecionar top 20 registros mais relevantes           │
│  → Montar contexto estruturado (~6.000 tokens)           │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│  PASSO 4: CLAUDE SONNET RESPONDE                         │
│  Recebe: pergunta + histórico da conversa + dados do banco│
│  Gera: resposta em linguagem natural com citações        │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
RESPOSTA AO USUÁRIO (com citações dos atos e evidências)
```

---

## 4. Os 4 Tipos de Pergunta e Como São Resolvidos

### Tipo 1 — Factual/Quantitativo (resolvido só com banco, sem IA)

Perguntas com resposta objetiva nos dados:

```
"Quantos atos foram classificados como críticos?"
"Quem foi nomeado mais vezes em 2026?"
"Quantas prorrogações de comissão processante existem?"
"Quais atos têm link para o mesmo processo PAD 2025.01?"
```

**Como resolve:**
```python
# Detecta intenção factual → executa query SQL → formata resposta
# SEM chamada à API da Claude
resultado = db.query(func.count(Ato.id)).filter(Analise.nivel_alerta == "vermelho").scalar()
resposta = f"Foram encontrados {resultado} atos classificados como críticos (🔴 vermelho)."
```

**Custo:** $0,00

---

### Tipo 2 — Análise de Contexto (Sonnet com contexto pequeno)

Perguntas sobre um ato, pessoa ou período específico:

```
"Me explique o que foi encontrado na Portaria 678"
"O que há de suspeito sobre João da Silva?"
"Resuma as irregularidades de março/2026"
"O que são esses atos Ad Referendum e por que são suspeitos?"
```

**Contexto montado (~2.000-4.000 tokens):**
- Dados do ato/pessoa específico
- Histórico relacionado
- Definição da regra violada (do regimento)
- Análise já feita pelo Haiku/Sonnet

**Custo:** ~$0,01-0,02 por pergunta

---

### Tipo 3 — Síntese e Narrativa (Sonnet com contexto médio)

Perguntas que pedem produção de conteúdo:

```
"Prepare um resumo dos 5 indícios mais graves para um debate político"
"Redija uma pergunta incisiva sobre os processos disciplinares para fazer em plenário"
"Escreva um parágrafo para usar em entrevista de jornal sobre o padrão de nomeações"
"Liste os argumentos mais fortes que temos sobre concentração de poder"
```

**Contexto montado (~6.000-10.000 tokens):**
- Top irregularidades por gravidade
- Padrões detectados pelo Sonnet
- Fichas de denúncia relevantes
- Linha do tempo dos eventos

**Custo:** ~$0,04-0,08 por pergunta

---

### Tipo 4 — Investigação Multi-etapa (Sonnet com contexto rico)

Perguntas que exigem cruzamento de múltiplos conjuntos de dados:

```
"Existe alguma relação entre as exonerações de 2025 e os processos abertos?"
"Trace o histórico completo do conselheiro X desde 2022"
"Quem se beneficiou mais das decisões Ad Referendum do presidente?"
"Há padrão nas datas das prorrogações de comissão comparadas com datas de eleição?"
```

**Contexto montado (~12.000-20.000 tokens):**
- Múltiplos conjuntos de dados cruzados
- Histórico completo das pessoas envolvidas
- Análises do Sonnet sobre padrões
- Timeline de eventos relacionados

**Custo:** ~$0,08-0,15 por pergunta

---

## 5. Como a IA Navega, Entende e Responde

### 5.1 Linguagem e Tom

A IA do chat é configurada para falar de forma:

```
FORMAL mas ACESSÍVEL:
  Não usa jargão jurídico desnecessário
  Explica artigos do regimento em linguagem simples
  Não pressupõe conhecimento técnico do usuário

PRECISA e CITADA:
  Sempre cita o ato de origem ("conforme Portaria 678/2026")
  Distingue fato de análise ("o ato diz X — isso sugere Y")
  Indica quando algo é suspeito vs. comprovado

DIRETA e ÚTIL:
  Não dá respostas genéricas
  Aponta a irregularidade específica
  Sugere o que fazer com a informação

CAUTELOSA na GRAVIDADE:
  Não afirma crime onde há suspeita
  Usa "suspeita", "indício", "padrão irregular"
  Deixa a conclusão jurídica final para advogados
```

### 5.2 System Prompt do Chat

```
Você é um analista especializado em transparência pública e controle social, 
trabalhando com dados auditados do {NOME_ORGAO}.

SEU PAPEL:
Você tem acesso aos resultados de uma auditoria completa de {TOTAL_ATOS} atos 
administrativos do {NOME_ORGAO}, analisados por IA com base no Regimento Interno 
vigente ({VERSAO_REGIMENTO}).

VOCÊ PODE:
- Explicar indícios e suspeitas identificados em atos específicos
- Identificar padrões entre múltiplos atos
- Produzir resumos, denúncias e textos para uso político/jornalístico
- Responder perguntas sobre pessoas, cargos e relacionamentos detectados
- Calcular estatísticas e comparações dos dados

VOCÊ NÃO PODE:
- Afirmar que houve crime (isso é competência judicial)
- Inventar dados que não estão na base auditada
- Opinar sobre política partidária ou recomendar candidatos
- Revelar dados de usuários da plataforma

COMO CITAR:
Sempre que mencionar um ato, cite: Tipo + Número + Data
Exemplo: "conforme Portaria 678 de 02/04/2026"

SE NÃO SOUBER:
Diga claramente que os dados disponíveis não permitem responder, 
e sugira o que o usuário poderia verificar manualmente.

DADOS DA AUDITORIA DISPONÍVEIS:
{RESUMO_ESTATISTICO_DO_ORGAO}

PADRÕES JÁ IDENTIFICADOS:
{LISTA_DE_PADROES_DETECTADOS}
```

### 5.3 Como Monta o Contexto por Pergunta

```python
def montar_contexto_para_pergunta(pergunta: str, tenant_id: str, historico: list) -> str:
    
    # 1. Extrair entidades da pergunta (nomes, números, datas, tipos)
    entidades = extrair_entidades(pergunta)  # regex + NER simples
    
    contexto_partes = []
    
    # 2. Buscar atos relevantes
    if entidades.numeros_ato:
        atos = buscar_atos_por_numero(entidades.numeros_ato, tenant_id)
        contexto_partes.append(formatar_atos(atos, incluir_analise=True))
    
    if entidades.palavras_chave:
        atos_busca = buscar_atos_fulltext(entidades.palavras_chave, tenant_id, limit=10)
        contexto_partes.append(formatar_atos(atos_busca, incluir_analise=True))
    
    # 3. Buscar pessoas relevantes
    if entidades.nomes_pessoa:
        pessoas = buscar_pessoas_por_nome(entidades.nomes_pessoa, tenant_id)
        for pessoa in pessoas:
            historico_pessoa = get_historico_completo_pessoa(pessoa.id)
            contexto_partes.append(formatar_pessoa(pessoa, historico_pessoa))
    
    # 4. Adicionar padrões relevantes
    if any(kw in pergunta.lower() for kw in ["padrão", "relação", "esquema", "perseguição"]):
        padroes = get_padroes_detectados(tenant_id)
        contexto_partes.append(formatar_padroes(padroes))
    
    # 5. Limitar tokens (máximo 15.000)
    contexto = "\n\n---\n\n".join(contexto_partes)
    return truncar_para_tokens(contexto, max_tokens=15_000)
```

### 5.4 Memória da Conversa

```python
# Dentro de uma sessão: últimas 8 trocas ficam no contexto
# Entre sessões: histórico salvo no banco, não carregado automaticamente

HISTORICO_SESSION = [
    {"role": "user",      "content": "Quem é João da Silva?"},
    {"role": "assistant", "content": "João da Silva aparece em 23 atos..."},
    {"role": "user",      "content": "E qual é a relação dele com Maria Costa?"},
    # ← IA já sabe quem é João, não precisa re-explicar
]
```

**Memória persistida (banco):**
- Sessões salvas por 30 dias
- Usuário pode retomar conversa anterior
- Admin pode ver histórico para suporte

---

## 6. Banco de Dados do Chat

```sql
-- Sessões de chat
CREATE TABLE chat_sessoes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    titulo          VARCHAR(500),       -- gerado automaticamente da 1ª pergunta
    ativa           BOOLEAN DEFAULT TRUE,
    total_mensagens INTEGER DEFAULT 0,
    custo_total_usd DECIMAL(10,6) DEFAULT 0,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultima_msg_em   TIMESTAMPTZ
);

CREATE INDEX idx_chat_sessoes_user ON chat_sessoes(user_id, ultima_msg_em DESC);
CREATE INDEX idx_chat_sessoes_tenant ON chat_sessoes(tenant_id);

-- Mensagens individuais
CREATE TABLE chat_mensagens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id       UUID NOT NULL REFERENCES chat_sessoes(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,   -- 'user' | 'assistant'
    conteudo        TEXT NOT NULL,
    tipo_pergunta   VARCHAR(50),
    -- 'factual' | 'analise' | 'sintese' | 'investigacao'
    contexto_usado  JSONB,              -- quais dados do banco foram incluídos
    tokens_input    INTEGER DEFAULT 0,
    tokens_output   INTEGER DEFAULT 0,
    custo_usd       DECIMAL(10,6) DEFAULT 0,
    tempo_resposta_ms INTEGER,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_msgs_sessao ON chat_mensagens(sessao_id, criado_em ASC);

-- Feedback do usuário sobre respostas
CREATE TABLE chat_feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mensagem_id     UUID NOT NULL REFERENCES chat_mensagens(id),
    user_id         UUID REFERENCES users(id),
    util            BOOLEAN,            -- 👍 ou 👎
    comentario      TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7. API do Chat

```
POST /orgaos/{slug}/chat/sessoes          → criar nova sessão
GET  /orgaos/{slug}/chat/sessoes          → listar sessões do usuário
GET  /orgaos/{slug}/chat/sessoes/{id}     → histórico de uma sessão
DELETE /orgaos/{slug}/chat/sessoes/{id}   → deletar sessão

POST /orgaos/{slug}/chat/sessoes/{id}/mensagens  → enviar pergunta
POST /orgaos/{slug}/chat/mensagens/{id}/feedback → dar feedback
```

### Endpoint Principal — Enviar Pergunta

```python
@router.post("/orgaos/{slug}/chat/sessoes/{sessao_id}/mensagens")
async def chat_pergunta(
    slug: str,
    sessao_id: str,
    body: ChatPerguntaInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verificar_limite_chat(user, db)  # checar cota do plano
    
    sessao = get_sessao_ou_404(sessao_id, user.id, db)
    historico = get_historico_sessao(sessao_id, db, limit=8)
    
    # Classificar tipo de pergunta (Haiku — barato)
    tipo = classificar_pergunta(body.pergunta)
    
    # Perguntas factuais: banco direto, sem IA
    if tipo == "factual":
        resposta = responder_factual(body.pergunta, sessao.tenant_id, db)
        custo = 0
    else:
        # Montar contexto do banco
        contexto = montar_contexto_para_pergunta(body.pergunta, sessao.tenant_id, db)
        
        # Chamar Claude Sonnet
        response = claude.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            system=montar_system_prompt_chat(sessao.tenant_id),
            messages=historico + [
                {"role": "user", "content": f"{contexto}\n\nPergunta: {body.pergunta}"}
            ]
        )
        resposta = response.content[0].text
        custo = calcular_custo(response.usage, "claude-sonnet-4-6")
    
    # Salvar mensagens no banco
    salvar_mensagem(sessao_id, "user", body.pergunta, db)
    salvar_mensagem(sessao_id, "assistant", resposta, custo=custo, tipo=tipo, db=db)
    
    # Atualizar custo da sessão
    atualizar_custo_sessao(sessao_id, custo, db)
    
    return {"resposta": resposta, "tipo_pergunta": tipo, "custo_usd": custo}
```

### Resposta com Streaming (para respostas longas)

```python
# Streaming com Server-Sent Events
@router.post("/orgaos/{slug}/chat/sessoes/{id}/stream")
async def chat_stream(slug: str, id: str, body: ChatPerguntaInput):
    async def gerar():
        with claude.messages.stream(...) as stream:
            for texto in stream.text_stream:
                yield f"data: {json.dumps({'texto': texto})}\n\n"
        yield f"data: {json.dumps({'fim': True})}\n\n"
    
    return StreamingResponse(gerar(), media_type="text/event-stream")
```

---

## 8. Interface do Chat (Frontend)

```
┌─────────────────────────────────────────────────────┐
│  CAU/PR — Chat com a IA                            │
│  [Nova Conversa] [Histórico ▼]                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🤖 Olá! Sou a IA de auditoria do CAU/PR.          │
│     Analisei 1.789 atos administrativos.            │
│     Pode me perguntar sobre indícios, suspeitas,     │
│     pessoas, padrões ou pedir textos prontos.       │
│                                                     │
│     Exemplos:                                       │
│     → "Quais são os 5 indícios mais graves?"        │
│     → "Me fale sobre a Portaria 678"               │
│     → "Quem foi mais nomeado em 2026?"             │
│     → "Prepare um texto para debate político"      │
│                                                     │
│  👤 Qual a relação entre as exonerações de 2025    │
│     e os processos abertos?                        │
│                                             14:32  │
│                                                     │
│  🤖 Ótima pergunta. Encontrei um padrão claro      │
│     nos dados. Em 2025 ocorreram 18 exonerações    │
│     de cargos em comissão. Dessas, 7 pessoas       │
│     (39%) tiveram processo disciplinar aberto       │
│     nos 60 dias anteriores à exoneração:           │
│                                                     │
│     • João Silva — exonerado em 15/03/2025         │
│       (Portaria 601) após processo aberto em       │
│       10/01/2025 (Portaria 558)                    │
│                                                     │
│     • ...                                          │
│                                                     │
│     Isso configura um padrão de uso do processo    │
│     disciplinar como instrumento para afastar       │
│     pessoas antes de exonerá-las formalmente.       │
│                                             14:32  │
│     👍 👎  [Copiar resposta] [Exportar]            │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [Digite sua pergunta...              ] [Enviar →]  │
│  💡 Sugestões: [5 piores casos] [Padrões] [Pessoas]│
└─────────────────────────────────────────────────────┘
```

**Funcionalidades da interface:**
- Streaming da resposta (texto aparece enquanto é gerado)
- Botão 👍/👎 para feedback em cada resposta
- "Copiar resposta" para usar em outro lugar
- "Exportar conversa" para salvar em PDF ou texto
- Sugestões de perguntas contextuais
- Histórico de conversas anteriores
- Indicador de custo da conversa (para transparência)

---

## 9. Planejamento de Custos do Chat

### Custo por Tipo de Pergunta

| Tipo | Modelo usado | Tokens contexto | Tokens resposta | Custo médio |
|------|-------------|----------------|-----------------|-------------|
| Factual (BD puro) | Nenhum | 0 | 0 | **$0,00** |
| Análise simples | Sonnet 4.6 | ~3.000 | ~500 | **~$0,02** |
| Síntese narrativa | Sonnet 4.6 | ~8.000 | ~1.200 | **~$0,04** |
| Investigação | Sonnet 4.6 | ~15.000 | ~2.000 | **~$0,10** |

### Limite de Perguntas por Plano

| Plano | Perguntas/mês | Tipos liberados | Custo IA/mês (estimado) |
|-------|--------------|-----------------|------------------------|
| **Cidadão** | 5 | Factual + Análise simples | ~$0,02 |
| **Investigador** | 200 | Todos os tipos | ~$2,00-6,00 |
| **Profissional** | 1.000 | Todos os tipos | ~$10-20 |
| **API & Dados** | via API (sem limite de chat direto) | Todos + prioridade | ~$10-20 |

### Custo Total do Produto por Mês (estimativa com 100 usuários Pro)

| Item | Custo/mês |
|------|----------|
| Chat — 100 usuários Pro × 100 perguntas × $0,04 | ~$400 |
| Rodadas de análise (re-análise mensal dos novos atos) | ~$15-30 |
| Infraestrutura (Railway + Vercel + Supabase) | ~$70 |
| **Total operacional** | **~$500/mês** |
| **Receita (100 × R$297)** | **R$29.700/mês** |
| **Margem bruta** | **>90%** |

### Controle de Gastos

```python
def verificar_limite_chat(user: User, db: Session):
    limite = {
        "cidadao": 5,
        "investigador": 200,
        "profissional": 1000,
        "api_dados": float("inf")
    }.get(user.plano.nome, 0)
    
    uso_mes = db.query(func.count(ChatMensagem.id))\
        .join(ChatSessao)\
        .filter(
            ChatSessao.user_id == user.id,
            ChatMensagem.role == "user",
            ChatMensagem.criado_em >= inicio_do_mes()
        ).scalar()
    
    if uso_mes >= limite:
        raise HTTPException(429, detail={
            "code": "LIMITE_CHAT_ATINGIDO",
            "uso_atual": uso_mes,
            "limite": limite,
            "reset_em": fim_do_mes().isoformat(),
            "upgrade_url": "/planos"
        })
```

### Alerta de Custo Automático

```python
# Se custo de chat passar de $50/dia → alertar admin
# Se um único usuário gastar > $5/dia → investigar uso anormal
ALERTA_CUSTO_DIARIO_TOTAL = 50.0   # USD
ALERTA_CUSTO_USUARIO_DIA  = 5.0    # USD
```

---

## 10. Perguntas Que a IA Consegue Responder

### Sobre Atos Específicos
- "O que diz a Portaria 678?"
- "Por que a Deliberação 13/2026 foi classificada como grave?"
- "Qual o histórico completo da comissão processante aberta em 2025?"
- "Quais atos fazem referência à Portaria 580?"

### Sobre Pessoas
- "Quem é João da Silva e o que ele faz no CAU-PR?"
- "Quantas vezes Maria Costa assinou atos como presidente?"
- "Quem aparece em mais comissões processantes?"
- "Existe relação entre Pedro Souza e as empresas contratadas?"

### Sobre Padrões e Análises
- "Quais são os indícios de perseguição política encontrados?"
- "O uso de Ad Referendum está acima do normal?"
- "Houve concentração de poder nas comissões especiais?"
- "Qual período teve mais alertas identificados?"

### Sobre Produção de Conteúdo
- "Escreva 3 perguntas para fazer em plenário sobre os processos disciplinares"
- "Prepare um texto de 200 palavras para entrevista de rádio sobre nepotismo"
- "Liste os 5 argumentos mais fortes para uma petição sobre excesso de Ad Referendum"
- "Redija uma denúncia formal ao MP sobre a comissão processante da Portaria 580"

### Comparativas e Estatísticas
- "Compare o número de nomeações de 2024 vs 2025"
- "Qual cargo foi mais criado sem concurso?"
- "Qual o custo estimado dos cargos em comissão criados ilegalmente?"

---

## 11. O Que a IA Não Responde (e Por Quê)

```
❌ "Fulano cometeu crime?"
   → IA responde: "Os dados indicam irregularidades. A tipificação criminal
     é competência do Ministério Público ou do Poder Judiciário."

❌ "Devo votar em X ou Y?"
   → IA responde: "Não emito opiniões eleitorais. Posso te mostrar os dados
     sobre a atuação do candidato X no CAU-PR, se desejar."

❌ "Qual a situação financeira pessoal do conselheiro X?"
   → IA responde: "Não tenho acesso a dados financeiros pessoais. Posso
     mostrar apenas o que consta nos atos administrativos públicos."

❌ Dados inventados ou fora da base auditada
   → IA responde: "Não encontrei dados sobre isso na auditoria do CAU-PR.
     Sugiro verificar diretamente no site da instituição."
```

---

## 12. Evolução Futura do Chat

| Versão | Funcionalidade |
|--------|---------------|
| v1.0 | Chat básico com RAG — perguntas e respostas |
| v1.5 | Sugestões automáticas de perguntas baseadas nos achados mais graves |
| v2.0 | Alertas proativos — "Novo ato suspeito publicado: quer que eu analise?" |
| v2.5 | Multi-instituição — "Compare a gestão do CAU-PR com a do CAU-SC" |
| v3.0 | Agente autônomo — monitora o site, detecta novos atos e notifica com análise |
