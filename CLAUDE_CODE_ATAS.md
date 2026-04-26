# Implementação de Atas Plenárias no Dig Dig

Este documento contém a especificação técnica completa para o Claude Code implementar a extração e análise das Atas Plenárias do CAU-PR no projeto Dig Dig.

## 1. Contexto e Decisão Arquitetural

Após análise de custos e limites de tokens, a decisão arquitetural para as atas é **Full Context com Claude Sonnet**.
- **Não faremos chunking** (quebra de texto), pois isso cria pontos cegos na auditoria.
- O custo de processar uma ata inteira de 25 páginas (~18k tokens) no Sonnet é de apenas ~$0.08.
- O pipeline será: `Download Manual -> Conversão Markdown -> Sonnet -> Banco de Dados`.

## 2. Estrutura do Banco de Dados (Supabase)

O Claude Code deve criar as seguintes tabelas/colunas no Supabase:

### Tabela `atas_plenarias`
```sql
CREATE TABLE atas_plenarias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    numero INTEGER NOT NULL,
    data_reuniao DATE,
    url_original TEXT,
    arquivo_local VARCHAR(255), -- Caminho do arquivo baixado
    texto_markdown TEXT,
    tokens_estimados INTEGER,
    status_analise VARCHAR(50) DEFAULT 'pendente', -- pendente, analisado, erro
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela `analises_atas`
```sql
CREATE TABLE analises_atas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ata_id UUID REFERENCES atas_plenarias(id) ON DELETE CASCADE,
    nivel_alerta VARCHAR(20), -- verde, amarelo, laranja, vermelho
    resumo_executivo TEXT,
    irregularidades_encontradas JSONB, -- Array de objetos com as denúncias
    votos_vencidos JSONB, -- Array com conselheiros que votaram contra e justificativas
    ad_referendum_homologados JSONB, -- Array com Ad Referendums citados
    tokens_usados INTEGER,
    custo_usd NUMERIC(10,6),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Pipeline de Extração Offline

Como o WAF do CAU-PR bloqueia downloads via script, os PDFs serão baixados manualmente e colocados em uma pasta local (ex: `data/atas_caupr/`).

O Claude Code deve criar um script `backend/scripts/importar_atas_locais.py` que:
1. Lê todos os PDFs da pasta `data/atas_caupr/`.
2. Usa `pdfplumber` para extrair o texto.
3. Limpa cabeçalhos e rodapés repetitivos (para economizar tokens).
4. Salva o texto limpo na tabela `atas_plenarias`.

## 4. Prompt Investigativo para o Sonnet

O Claude Code deve criar um novo serviço `backend/app/services/sonnet_atas_service.py` usando o seguinte prompt de sistema:

```text
Você é um auditor investigativo sênior analisando uma Ata Plenária completa de um conselho profissional (CAU-PR).
Seu objetivo é encontrar irregularidades, conflitos de interesse, gastos suspeitos e concentrações de poder.

Leia a ata inteira com extrema atenção às entrelinhas e procure especificamente por:
1. Votos Vencidos e Abstenções: Conselheiros que votaram contra a maioria e suas justificativas (frequentemente apontam falhas legais).
2. Homologação de Ad Referendum: Debates sobre o presidente tomando decisões sozinho antes da plenária.
3. Inversões de Pauta: Assuntos polêmicos movidos para o final da reunião.
4. Gastos Desproporcionais: Aprovação de viagens internacionais, diárias excessivas ou contratações sem licitação clara.
5. Nepotismo ou Favorecimento: Menção a empresas ou pessoas ligadas a conselheiros.

Responda EXCLUSIVAMENTE em formato JSON com a seguinte estrutura:
{
  "nivel_alerta": "verde|amarelo|laranja|vermelho",
  "resumo_executivo": "Resumo de 2 parágrafos focando apenas no que é suspeito ou polêmico.",
  "irregularidades_encontradas": [
    {
      "tipo": "string",
      "descricao": "string",
      "trecho_ata": "Citação exata da ata que comprova a irregularidade",
      "gravidade": "alta|media|baixa"
    }
  ],
  "votos_vencidos": [
    {
      "conselheiro": "Nome",
      "pauta": "Assunto votado",
      "justificativa": "Por que votou contra"
    }
  ],
  "ad_referendum_homologados": [
    {
      "numero": "Número do ato",
      "assunto": "Tema",
      "houve_debate": true/false
    }
  ]
}
```

## 5. Instruções de Execução para o Claude Code

Copie e cole este prompt no Claude Code para iniciar a implementação:

```prompt
Claude, preciso que você implemente o módulo de Atas Plenárias no Dig Dig seguindo a especificação do arquivo CLAUDE_CODE_ATAS.md.

Passos:
1. Crie as migrations no Supabase (ou atualize os models SQLAlchemy) para as tabelas `atas_plenarias` e `analises_atas`.
2. Crie o script `backend/scripts/importar_atas_locais.py` para ler PDFs de uma pasta local, extrair o texto com pdfplumber e salvar no banco.
3. Crie o serviço `backend/app/services/sonnet_atas_service.py` implementando a chamada à API da Anthropic com o prompt investigativo fornecido na especificação.
4. Crie um worker Celery `analisar_ata_task` que pega uma ata pendente, envia para o Sonnet e salva o resultado.

Lembre-se que a decisão arquitetural é FULL CONTEXT. Não faça chunking do texto. Envie a ata inteira para o Sonnet.
```
