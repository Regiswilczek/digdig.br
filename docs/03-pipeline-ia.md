# Pipeline de Inteligência Artificial

**Modelos:** Haiku 4.5 (triagem) + Sonnet 4.6 (análise crítica e síntese)  
**SDK:** `anthropic` Python  
**Custo estimado por rodada CAU-PR:** ~$10-12  

---

## 0. Cobertura da Análise (CAU/PR — Portarias)

**IMPORTANTE:** O relatório final DEVE documentar explicitamente quais atos foram analisados
e quais foram excluídos, e por quê. Isso é requisito de credibilidade da auditoria.

### Situação atual das portarias CAU/PR (levantamento 2026-04)

| Ano  | Total | Com texto | Escaneadas | Cobertura |
|------|-------|-----------|------------|-----------|
| 2026 | 15    | 13        | 2          | 87%       |
| 2025 | 114   | 113       | 1          | 99%       |
| 2024 | 94    | 94        | 0          | 100%      |
| 2023 | 45    | 42        | 3          | 93%       |
| 2022 | 52    | 52        | 0          | 100%      |
| 2021 | 87    | 54        | 33         | 62%       |
| 2020 | 33    | 4         | 29         | 12%       |
| 2019 | 21    | 0         | 21         | 0%        |
| 2018 | 63    | 1         | 62         | 2%        |
| 2017 | 12    | 12        | 0          | 100%      |
| 2016 | 7     | 7         | 0          | 100%      |

**Deliberações:** 595 das ~1.238 deliberações não possuem link PDF no site do CAU/PR — são
publicadas apenas em formato HTML. Análise de deliberações requer scraper HTML separado.

### Nota metodológica obrigatória no relatório

Todo relatório gerado pelo sistema deve incluir a seguinte nota:

> "Esta auditoria analisou **N portarias** do CAU/PR com texto extraível. Outras **M portarias**
> (principalmente do período 2018–2021) não puderam ser incluídas por serem documentos
> digitalizados sem camada de texto (PDFs escaneados). A lista completa dos documentos
> excluídos está disponível no arquivo `cobertura_analise.json`. Para análise futura desses
> documentos, seria necessária aplicação de OCR."

### Script de cobertura

```bash
# Gera cobertura_analise.json com lista completa de analisadas e excluídas
python scripts/relatorio_cobertura.py
```

O JSON gerado contém:
- `resumo`: totais e percentuais
- `por_ano`: cobertura ano a ano
- `portarias_escaneadas`: lista completa com número, data, ementa e URL
- `portarias_analisadas`: lista completa com resultado da análise IA
- `nota_metodologica`: texto padronizado para incluir nos relatórios

---

## 1. Visão Geral do Pipeline

```
Fase 1: HAIKU (em lote, todos os atos)
  → Analisa cada ato individualmente
  → Extrai pessoas, cargos, valores
  → Classifica nível de alerta
  → Custo: ~$4

Fase 2: SONNET — Aprofundamento (atos flagged)
  → Recebe os laranja + vermelho do Haiku
  → Analisa com contexto completo:
     texto + histórico + grafo de pessoas
  → Detecta padrões entre atos
  → Custo: ~$6

Fase 3: SONNET — Síntese Final
  → Lê todos os resultados críticos
  → Gera narrativa executiva
  → Gera fichas de denúncia
  → Custo: incluso na Fase 2
```

---

## 2. Prompt Caching

O system prompt contendo o regimento interno é **cacheado** pela API Anthropic.

```python
# Estrutura das mensagens com cache
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": SYSTEM_PROMPT_COM_REGIMENTO,
                "cache_control": {"type": "ephemeral"}  # Cache de 5 minutos
            },
            {
                "type": "text", 
                "text": prompt_do_ato_especifico
            }
        ]
    }
]
```

**Economia:** o regimento (~8.000 tokens) é cacheado após o primeiro uso.  
Cache reads custam 10x menos que input normal.  
Com 1.171 atos: **economiza ~$3** vs. sem cache.

---

## 3. Fase 1 — Haiku: Análise de Triagem

### 3.1 System Prompt (cacheado)

```
Você é um auditor especializado em direito administrativo brasileiro e ética pública.

Sua missão é analisar atos administrativos do {NOME_ORGAO} e identificar indícios de 
irregularidades legais, morais e éticas com base no Regimento Interno vigente.

═══════════════════════════════════════════════
REGIMENTO INTERNO — {NOME_ORGAO}
{TEXTO_COMPLETO_REGIMENTO}
═══════════════════════════════════════════════

REGRAS ESPECÍFICAS DESTE ÓRGÃO:
{REGRAS_ESPECIFICAS_DO_TENANT}

NÍVEIS DE ALERTA:
- VERDE: ato conforme, sem irregularidades detectadas
- AMARELO: suspeito, requer atenção — possível irregularidade moral ou procedimental
- LARANJA: indício moderado-grave — possível irregularidade moral, ética ou legal
- VERMELHO: indício crítico — padrão altamente suspeito ou aparente violação legal direta

CRITÉRIOS DE ANÁLISE OBRIGATÓRIOS:

1. LEGAL: Violações diretas ao Regimento Interno e à Lei 12.378/2010
   - Autoridade incompetente para o ato
   - Violação de quórum
   - Prazo excedido sem justificativa
   - Composição irregular de comissão

2. MORAL/ÉTICO (mesmo que "legal"):
   - Nepotismo ou favorecimento pessoal
   - Concentração de poder (Ad Referendum excessivo)
   - Perseguição política via comissões processantes
   - Cabide de empregos (cargos desnecessários)
   - Gastos questionáveis (viagens, diárias, eventos)
   - Falta de transparência (ementas genéricas)
   - Aparelhamento político

3. EXTRAÇÃO ESTRUTURADA:
   - Nomes completos de todas as pessoas mencionadas
   - Cargos e funções
   - Valores monetários (se houver)
   - Referências a atos anteriores

Responda SEMPRE em JSON válido com a estrutura especificada.
```

### 3.2 User Prompt (por ato)

```
Analise o seguinte ato administrativo:

TIPO: {tipo}
NÚMERO: {numero}
DATA: {data_publicacao}
EMENTA: {ementa}

TEXTO COMPLETO:
{texto_completo}

CONTEXTO:
- Este ato faz parte de {total_atos} atos do {nome_orgao}
- Atos relacionados mencionados: {referencias_cruzadas}
```

### 3.3 Formato de Resposta (Haiku)

```json
{
  "nivel_alerta": "verde|amarelo|laranja|vermelho",
  "score_risco": 0,
  "status": "conforme|suspeito|alerta|critico",
  "indicios": [
    {
      "categoria": "legal|moral|etica|processual",
      "tipo": "nepotismo|concentracao_poder|perseguicao|...",
      "descricao": "descrição objetiva do indício identificado",
      "artigo_violado": "Art. X, §Y do Regimento",
      "gravidade": "baixa|media|alta|critica"
    }
  ],
  "pessoas_extraidas": [
    {
      "nome": "Nome Completo",
      "cargo": "Cargo ou Função",
      "tipo_aparicao": "nomeado|exonerado|assina|membro_comissao|processado"
    }
  ],
  "valores_monetarios": [],
  "referencias_atos": ["Portaria 580/2025", "Deliberação 191/2025"],
  "requer_aprofundamento": true,
  "motivo_aprofundamento": "Múltiplas prorrogações de comissão processante — suspeita de perseguição",
  "resumo": "Resumo em 2-3 frases do que o ato faz e por que é suspeito"
}
```

### 3.4 Código de Execução (Haiku em lote)

```python
import os
import anthropic
from app.models import Ato, Analise, ConteudoAto
from app.services.grafo_pessoas import extrair_e_salvar_pessoas

client = anthropic.Anthropic()

# IDs de modelo: sempre via variável de ambiente, nunca hardcoded
# Configurar em .env:
#   CLAUDE_HAIKU_MODEL=claude-haiku-4-5-20251001
#   CLAUDE_SONNET_MODEL=claude-sonnet-4-6
HAIKU_MODEL  = os.environ["CLAUDE_HAIKU_MODEL"]
SONNET_MODEL = os.environ["CLAUDE_SONNET_MODEL"]
LOTE_SIZE = 50  # processar 50 atos por task Celery

def analisar_lote_haiku(ato_ids: list[str], tenant_id: str):
    system_prompt = montar_system_prompt(tenant_id)  # busca regimento do banco
    
    for ato_id in ato_ids:
        ato = Ato.get(ato_id)
        conteudo = ConteudoAto.get(ato_id)
        
        response = client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=1500,
            system=[
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"}
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": montar_prompt_ato(ato, conteudo)
                }
            ]
        )
        
        # Parsing da resposta com fallback para JSON inválido
        raw_text = response.content[0].text

        try:
            resultado = json.loads(raw_text)
        except json.JSONDecodeError as e:
            logger.warning(
                "json_invalido_claude",
                ato_id=str(ato.id),
                erro=str(e),
                raw_preview=raw_text[:500]
            )
            # Tentar extrair campos críticos por regex antes de descartar
            nivel_match = re.search(r'"nivel_alerta"\s*:\s*"(\w+)"', raw_text)
            resultado = {
                "nivel_alerta": nivel_match.group(1) if nivel_match else "suspeito",
                "resumo": "Análise incompleta — resposta da IA malformada. Reprocessar manualmente.",
                "irregularidades_legais": [],
                "irregularidades_morais": [],
                "parse_error": True
            }

        # Salvar análise
        salvar_analise_haiku(ato_id, tenant_id, resultado, response.usage)
        
        # Extrair e salvar pessoas no grafo
        extrair_e_salvar_pessoas(ato_id, tenant_id, resultado["pessoas_extraidas"])
        
        # Registrar custo
        registrar_custo(rodada_id, response.usage, HAIKU_MODEL)
```

---

## 4. Fase 2 — Sonnet: Aprofundamento de Casos Críticos

### 4.1 Contexto Enriquecido

Para atos classificados como laranja/vermelho, o Sonnet recebe:

```python
def montar_contexto_enriquecido(ato_id: str, tenant_id: str) -> str:
    ato = Ato.get(ato_id)
    analise_haiku = Analise.get_haiku(ato_id)
    
    # Histórico da pessoa principal no ato
    pessoas = get_pessoas_do_ato(ato_id)
    historico_pessoas = []
    for pessoa in pessoas:
        aparicoes = get_aparicoes_pessoa(pessoa.id, tenant_id, limit=10)
        historico_pessoas.append({
            "nome": pessoa.nome_normalizado,
            "total_aparicoes": pessoa.total_aparicoes,
            "cargos_anteriores": [a.cargo for a in aparicoes],
            "tipos_aparicao": list(set(a.tipo_aparicao for a in aparicoes))
        })
    
    # Atos relacionados (mesmo número de portaria referenciada)
    atos_relacionados = get_atos_relacionados(ato_id, tenant_id)
    
    return f"""
ANÁLISE PRÉVIA DO HAIKU:
{json.dumps(analise_haiku.resultado_haiku, indent=2)}

HISTÓRICO DAS PESSOAS ENVOLVIDAS:
{json.dumps(historico_pessoas, indent=2)}

ATOS RELACIONADOS:
{json.dumps([{"numero": a.numero, "ementa": a.ementa, "data": str(a.data_publicacao)} 
             for a in atos_relacionados], indent=2)}
"""
```

### 4.2 System Prompt Sonnet

Igual ao Haiku com adição:

```
MODO: ANÁLISE PROFUNDA

Você está recebendo um ato que foi PRÉ-CLASSIFICADO como suspeito.
Use o histórico das pessoas envolvidas e os atos relacionados para:

1. Confirmar ou refutar a suspeita inicial do Haiku
2. Identificar padrões que só aparecem com contexto histórico
3. Construir uma narrativa política coerente
4. Gerar uma ficha de denúncia pronta para uso

A recomendacao_campanha deve ser específica e impactante — uma frase que 
poderia ser usada em debate público ou entrevista.
```

### 4.3 Formato de Resposta (Sonnet)

```json
{
  "nivel_alerta_confirmado": "vermelho",
  "score_risco_final": 87,
  "confirmacao_suspeita": true,
  "analise_aprofundada": {
    "indicios_legais": [
      {
        "tipo": "prazo_excedido_comissao_processante",
        "descricao": "Comissão Processante nomeada em abril/2025 foi prorrogada pela quarta vez, totalizando 360 dias — o Regimento permite máximo de 120 dias.",
        "artigo_violado": "Art. 89, §3º do Regimento Interno",
        "gravidade": "alta"
      }
    ],
    "indicios_morais": [
      {
        "tipo": "perseguicao_politica",
        "descricao": "O processado aparece em 3 manifestações públicas contra a gestão atual (01/2025, 03/2025, 11/2025). As prorrogações mantêm o processo aberto sem conclusão, impedindo o processado de exercer cargos.",
        "impacto_politico": "Instrumento de cassação política disfarçado de processo disciplinar.",
        "gravidade": "critica"
      }
    ],
    "padrao_identificado": "perseguicao_politica_via_processo_disciplinar",
    "narrativa_completa": "Desde abril de 2025, a gestão do CAU/PR mantém aberto um processo disciplinar contra [nome], membro da oposição. Em 12 meses, o processo foi prorrogado 4 vezes, excedendo em 240 dias o prazo máximo previsto no Regimento. O padrão é claro: enquanto o processo está aberto, o oponente não pode assumir cargos ou representar o conselho."
  },
  "ficha_denuncia": {
    "titulo": "CAU/PR mantém processo disciplinar aberto por mais de 1 ano para afastar opositor",
    "fato": "A Portaria 678/2026 prorroga pela 4ª vez a Comissão Processante instaurada em abril/2025, totalizando 360 dias de investigação sem conclusão.",
    "indicio_legal": "Indício de violação do Art. 89, §3º do Regimento Interno: prazo máximo de 120 dias, prorrogável uma vez.",
    "indicio_moral": "Indício de uso do processo disciplinar como instrumento de perseguição política.",
    "evidencias": [
      "Portaria 580/2025 — instauração em 07/04/2025",
      "Portaria 667/2026 — 1ª recondução em 02/02/2026",  
      "Portaria 673/2026 — 2ª prorrogação em 02/03/2026",
      "Portaria 678/2026 — 3ª prorrogação em 02/04/2026"
    ],
    "impacto": "O processado está impedido de exercer funções no CAU/PR há mais de 1 ano.",
    "recomendacao_campanha": "A gestão atual usa o processo disciplinar como arma política — 360 dias investigando um opositor, quando o Regimento permite apenas 120. Isso não é processo, é perseguição documentada."
  }
}
```

---

## 5. Fase 3 — Sonnet: Síntese Global

### 5.1 Input

```python
def sintetizar_resultados(tenant_id: str, rodada_id: str):
    # Pegar todos os resultados críticos
    criticos = get_analises_criticas(tenant_id, rodada_id)
    padroes_pessoas = get_padroes_grafo(tenant_id)
    estatisticas = get_estatisticas_rodada(rodada_id)
    
    prompt = f"""
Você analisou {estatisticas['total']} atos administrativos do {tenant_id}.
Aqui estão os {len(criticos)} casos mais graves encontrados:

{json.dumps(criticos, indent=2)}

PADRÕES NO GRAFO DE PESSOAS:
{json.dumps(padroes_pessoas, indent=2)}

ESTATÍSTICAS GERAIS:
- Total Ad Referendum: {estatisticas['ad_referendum']}
- Total prorrogações de comissões processantes: {estatisticas['prorrogacoes']}
- Total nomeações: {estatisticas['nomeacoes']}
- Total exonerações: {estatisticas['exoneracoes']}

Produza:
1. Um relatório executivo narrativo (500-800 palavras) conectando os padrões
2. Um ranking dos 10 indícios mais graves
3. Uma lista de 5 padrões globais detectados com narrativa para cada um
4. 3 recomendações de denúncia prioritárias para uso em campanha
"""
```

---

## 6. Gestão de Erros e Retry

**Por que não usar `time.sleep` em workers Celery:**  
`time.sleep` bloqueia o slot de concorrência do worker durante toda a espera — um worker
com `concurrency=4` que dorme por 20s em 4 tasks simultâneas fica completamente parado,
sem processar nenhum novo item da fila. O correto é lançar `self.retry`, que libera o
worker imediatamente e reagenda a task para execução futura via scheduler do Celery/Redis.

```python
import re
import json
from anthropic import RateLimitError, APIError
from celery import shared_task

# ERRADO — bloqueia o slot de concorrência durante a espera:
# import time
# time.sleep(espera)
# continue

# CORRETO — libera o worker e reagenda via Celery:
@shared_task(bind=True, max_retries=3)
def analisar_ato_task(self, ato_id: str, tenant_id: str):
    try:
        return analisar_ato(ato_id, tenant_id)
    except RateLimitError as e:
        # Backoff exponencial: 5s, 10s, 20s — worker livre durante a espera
        espera = (2 ** self.request.retries) * 5
        raise self.retry(exc=e, countdown=espera, max_retries=3)
    except APIError as e:
        raise self.retry(exc=e, countdown=5, max_retries=3)
```

---

## 7. Monitoramento de Custos

```python
def registrar_custo(rodada_id: str, usage, modelo: str):
    PRECOS = {
        "claude-haiku-4-5-20251001": {
            "input": 0.80 / 1_000_000,
            "output": 4.00 / 1_000_000,
            "cache_read": 0.08 / 1_000_000,
        },
        "claude-sonnet-4-6": {
            "input": 3.00 / 1_000_000,
            "output": 15.00 / 1_000_000,
            "cache_read": 0.30 / 1_000_000,
        }
    }
    
    p = PRECOS[modelo]
    custo = (
        usage.input_tokens * p["input"] +
        usage.output_tokens * p["output"] +
        getattr(usage, 'cache_read_input_tokens', 0) * p["cache_read"]
    )
    
    # Atualizar rodada com custo acumulado
    RodadaAnalise.incrementar_custo(rodada_id, modelo, custo)
    
    # Alertar se custo passar de $20
    if get_custo_total_rodada(rodada_id) > 20:
        enviar_alerta_custo(rodada_id)
```

---

## 8. Configuração por Tenant

Cada órgão tem seu próprio system prompt gerado dinamicamente:

```python
def montar_system_prompt(tenant_id: str) -> str:
    tenant = Tenant.get(tenant_id)
    regimento = KnowledgeBase.get_vigente(tenant_id)
    regras = TenantRegras.get_ativas(tenant_id)
    
    return TEMPLATE_SYSTEM_PROMPT.format(
        nome_orgao=tenant.nome_completo,
        regimento=regimento.conteudo,
        regras_especificas=formatar_regras(regras)
    )
```

---

## 9. Estimativa de Custos por Órgão

| Órgão (estimativa) | Atos | Custo Haiku | Custo Sonnet | Total |
|---------------------|------|-------------|--------------|-------|
| CAU-PR (atual) | 1.171 | ~$4 | ~$6 | **~$10** |
| Câmara Municipal (médio) | 2.000 | ~$7 | ~$9 | **~$16** |
| TCE-PR (grande) | 10.000 | ~$30 | ~$40 | **~$70** |

Re-análise parcial (só atos novos desde última rodada): **10-20% do custo inicial**
