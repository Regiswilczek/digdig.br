# Guia de Uso: Agente de Auditoria CAU/PR com Claude Code

Este guia explica como utilizar os dados extraídos e o script do Agente de Auditoria em conjunto com o Claude Code para analisar os atos administrativos do CAU/PR, com foco em irregularidades legais e morais/éticas.

## 1. O que foi preparado para você

A pasta `agente_auditoria_caupr` contém tudo que você precisa:

1. `portarias_completo.json`: 551 portarias extraídas do site do CAU/PR.
2. `deliberacoes_completo.json`: 1.238 deliberações plenárias e ad referendum.
3. `agente_auditoria.py`: O script principal em Python que realiza a análise.
4. `ESPECIFICACAO_AGENTE_AUDITORIA_CAUPR.md`: As regras de negócio e critérios de análise (incluindo os critérios morais e políticos).

## 2. Como usar com o Claude Code

Para obter os melhores resultados, você deve usar o Claude Code para executar o script e analisar os resultados. Siga este roteiro:

### Passo 1: Iniciar o Claude Code na pasta do projeto

Abra seu terminal, navegue até a pasta onde você salvou estes arquivos e inicie o Claude Code:

```bash
cd caminho/para/agente_auditoria_caupr
claude
```

### Passo 2: Executar a Análise Rápida (Triagem)

Peça ao Claude para rodar a análise rápida primeiro. Isso vai varrer todos os quase 1.800 atos e identificar os suspeitos usando regras baseadas em palavras-chave.

**Prompt para o Claude Code:**
> "Execute o script `agente_auditoria.py` no modo rápido para analisar todos os atos. O comando é: `python agente_auditoria.py --modo rapido --max-atos 2000`. Depois, leia o arquivo `resultados_auditoria.json` e me faça um resumo dos padrões globais encontrados e liste os 5 atos com nível de alerta 'laranja' ou 'vermelho'."

### Passo 3: Análise Profunda de Atos Específicos

Após identificar os atos suspeitos (como as prorrogações de comissões processantes ou excesso de Ad Referendum), peça ao Claude para analisá-los profundamente.

**Prompt para o Claude Code:**
> "Com base nos resultados da análise rápida, identifiquei que o ato [INSERIR TIPO E NÚMERO DO ATO, ex: Portaria 678] é suspeito. Por favor, leia o conteúdo completo da ementa desse ato no JSON correspondente e faça uma análise crítica detalhada baseada nos critérios morais e éticos definidos no arquivo `ESPECIFICACAO_AGENTE_AUDITORIA_CAUPR.md`. Quero saber como podemos usar isso na campanha."

### Passo 4: Investigação de Padrões Políticos

O script já identificou alguns padrões (como 136 atos Ad Referendum e 32 prorrogações de comissões processantes). Peça ao Claude para investigar esses padrões.

**Prompt para o Claude Code:**
> "O relatório indicou um alto número de atos 'Ad Referendum' e prorrogações de comissões processantes. Por favor, filtre no arquivo JSON todos os atos que se encaixam nesses padrões e analise se há uma concentração de poder ou indícios de perseguição política. Escreva um pequeno texto argumentativo que eu possa usar no site 'House of CAUs' denunciando essa prática."

## 3. Estrutura de Prompts Prontos para a Campanha

Aqui estão alguns prompts que você pode copiar e colar no Claude Code para gerar conteúdo direto para a sua campanha de oposição:

### Prompt: Denúncia de Concentração de Poder
```text
Atue como um analista político da oposição do CAU/PR. Analise os dados do arquivo `resultados_auditoria.json`, especificamente a seção de "padroes_globais". Escreva um artigo contundente para o blog "House of CAUs" denunciando o uso excessivo de atos "Ad Referendum" (decisões monocráticas do presidente) como uma forma de esvaziar o poder do plenário e concentrar decisões. Use tom crítico, mas profissional.
```

### Prompt: Investigação de Comissões Processantes
```text
Preciso investigar se a atual gestão do CAU/PR está usando comissões processantes para perseguir opositores. Busque nos arquivos JSON todas as portarias que mencionam "Comissão Processante" ou "Sindicância". Liste os números dessas portarias, as datas e quantas vezes foram prorrogadas. Depois, analise se esse volume e essas prorrogações sucessivas (como a Portaria 678) configuram um padrão de assédio moral ou uso político da máquina administrativa.
```

### Prompt: Busca por Favorecimento
```text
Leia o arquivo `ESPECIFICACAO_AGENTE_AUDITORIA_CAUPR.md` para entender nossos critérios de "Irregularidades Morais". Agora, crie um script Python rápido que cruze os nomes mencionados nas ementas das portarias de nomeação (no arquivo `portarias_completo.json`) para ver se os mesmos nomes aparecem repetidamente, o que indicaria um "cabide de empregos" ou favorecimento de um grupo pequeno. Execute o script e me dê os resultados.
```

## 4. Dicas Adicionais

- **O script já gerou um relatório HTML**: Abra o arquivo `relatorio_auditoria_caupr.html` no seu navegador para ver um dashboard visual com todos os alertas já classificados por cores (Vermelho, Laranja, Amarelo).
- **Seja específico com o Claude**: O Claude Code é excelente em ler JSONs grandes. Sempre peça para ele "filtrar", "cruzar dados" ou "encontrar padrões" nos arquivos JSON fornecidos.
- **Foco no Moral**: Lembre-se que, como discutimos, muitas coisas no Brasil são legais, mas imorais. O script foi ajustado para sinalizar palavras como "viagem", "turismo", "ad referendum" e "processante" justamente para levantar essas lebres. Use o Claude para transformar esses dados frios em narrativas políticas fortes.
