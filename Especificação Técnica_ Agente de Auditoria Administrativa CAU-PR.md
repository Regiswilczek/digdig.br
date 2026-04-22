# Especificação Técnica: Agente de Auditoria Administrativa CAU-PR

## 1. Visão Geral

O Agente de Auditoria Administrativa CAU-PR é uma ferramenta de análise automatizada que verifica a conformidade de todos os atos administrativos do Conselho de Arquitetura e Urbanismo do Paraná (CAU-PR) em relação ao seu Regimento Interno vigente.

**Objetivo Principal**: Identificar irregularidades, não-conformidades e violações aos procedimentos estabelecidos no Regimento Interno.

**Público-Alvo**: Chapa de gestão e auditores internos do CAU-PR.

---

## 2. Escopo de Análise

O agente deve analisar os seguintes tipos de atos administrativos:

### 2.1 Portarias (Portarias Administrativas)
- Nomeações para cargos em comissão
- Exonerações
- Designações de funções
- Prorrogações de comissões
- Alterações de servidores
- Designações de gestores e fiscais de contratos

### 2.2 Portarias Normativas
- Regulamentações de procedimentos internos
- Normas de funcionamento
- Políticas administrativas

### 2.3 Deliberações Plenárias
- Decisões do plenário
- Aprovações de atos
- Homologações
- Instituições de comissões

---

## 3. Regimento Interno: Pontos de Conformidade a Verificar

O agente deve validar os seguintes aspectos do Regimento Interno (6ª versão - DELIBERAÇÃO PLENÁRIA DPOPR n° 0191-02/2025):

### 3.1 Estrutura Administrativa
- Composição correta das comissões
- Número máximo de comissões por conselheiro
- Designação apropriada de coordenadores e coordenadores adjuntos
- Respeito aos prazos de mandato

### 3.2 Procedimentos de Nomeação
- Autoridade competente para nomear
- Procedimentos formais obrigatórios
- Documentação necessária
- Prazos de publicação

### 3.3 Comissões Processantes
- Prazos para conclusão de trabalhos
- Procedimentos de recondução
- Autoridade para instauração
- Requisitos de composição

### 3.4 Processos Administrativos
- Instauração correta de processos
- Fases do processo administrativo
- Direitos e garantias das partes
- Prazos processuais

### 3.5 Gestão Financeira e Contratos
- Designação de gestores e fiscais de contratos
- Procedimentos de suprimento de fundos
- Autorização de pagamentos
- Substituições durante férias

### 3.6 Calendário e Reuniões
- Conformidade com calendário de reuniões
- Convocações em prazos apropriados
- Alterações de calendário

---

## 4. Tipos de Irregularidades a Detectar

O agente foi projetado para ter uma visão **crítica e investigativa**, não se limitando apenas ao que é estritamente ilegal, mas também ao que fere a moralidade administrativa, a impessoalidade e a ética pública.

### 4.1 Irregularidades Críticas (Violações Legais Graves)
- [ ] Nomeação sem autoridade competente
- [ ] Violação de quórum em deliberações
- [ ] Processo administrativo instaurado sem fundamentação legal
- [ ] Comissão processante com composição irregular
- [ ] Violação de direitos processuais

### 4.2 Irregularidades Morais e Éticas (Foco de Campanha)
*Estas são as irregularidades que, mesmo que encontrem brechas legais, demonstram má gestão, favorecimento ou falta de ética.*

- [ ] **Nepotismo Cruzado ou Favorecimento**: Nomeação de parentes, sócios ou pessoas com ligações comerciais com conselheiros.
- [ ] **Excesso de Cargos em Comissão**: Proporção desequilibrada entre cargos comissionados e efetivos.
- [ ] **Danos ao Erário (Gastos Questionáveis)**: Aprovação de despesas, viagens ou diárias excessivas sem justificativa clara de interesse público.
- [ ] **Concentração de Poder**: Um mesmo conselheiro ou grupo participando de múltiplas comissões estratégicas simultaneamente.
- [ ] **Perseguição Política**: Exonerações em massa ou instauração de comissões processantes contra opositores políticos.
- [ ] **"Cabide de Empregos"**: Criação de cargos ou funções gratificadas desnecessárias.
- [ ] **Falta de Transparência Intencional**: Atos publicados com ementas genéricas ("dá outras providências") para esconder o real propósito.

### 4.3 Irregularidades Moderadas (Não-Conformidades)
- [ ] Atraso na publicação de atos
- [ ] Falta de documentação apropriada
- [ ] Designação de gestor/fiscal sem procedimento correto
- [ ] Prorrogação de comissão sem justificativa
- [ ] Alteração de ato sem fundamentação

### 4.4 Irregularidades Leves (Questões Procedimentais)
- [ ] Formatação incorreta de atos
- [ ] Falta de referência cruzada
- [ ] Inconsistência em nomenclatura
- [ ] Ausência de data de vigência

---

## 5. Estrutura de Dados do Agente

### 5.1 Entrada de Dados

```json
{
  "tipo_ato": "portaria|portaria_normativa|deliberacao",
  "numero": "678",
  "data_publicacao": "2026-04-02",
  "data_vigencia": "2026-04-02",
  "titulo": "Prorroga o prazo da Comissão Processante",
  "conteudo_resumido": "...",
  "conteudo_completo": "...",
  "pessoas_envolvidas": ["nome1", "nome2"],
  "cargos_afetados": ["cargo1", "cargo2"],
  "comissoes_afetadas": ["comissao1"],
  "referencias_anteriores": ["Portaria 580/2025", "Portaria 667/2026"]
}
```

### 5.2 Saída de Análise

```json
{
  "numero_ato": "678",
  "tipo_ato": "portaria",
  "data_analise": "2026-04-22",
  "status_conformidade": "irregular|conforme|parcialmente_conforme",
  "nivel_severidade": "critica|moderada|leve",
  "irregularidades_detectadas": [
    {
      "tipo": "tipo_irregularidade",
      "descricao": "descrição detalhada",
      "artigo_regimento": "Art. X, §Y",
      "recomendacao": "ação corretiva sugerida"
    }
  ],
  "pontos_positivos": ["conformidade1", "conformidade2"],
  "observacoes": "notas adicionais",
  "requer_investigacao_manual": true|false
}
```

---

## 6. Regras de Análise Específicas (Lógica do Agente)

### 6.1 Portarias de Nomeação e Exoneração
- Verificar se autoridade competente assinou
- Confirmar se cargo em comissão existe no regimento
- Validar se nomeado não viola limite de comissões
- Checar se há conflito de interesses
- Verificar se procedimento de seleção foi seguido
- **Análise Moral**: Cruzar nomes de nomeados com listas de doadores de campanha, sócios de empresas de conselheiros ou parentes.
- **Análise de Padrão**: Detectar se há um padrão de exonerações seguido de nomeações de aliados (aparelhamento).

### 6.2 Portarias de Comissão Processante
- Validar se instauração segue procedimento correto
- Confirmar se composição está conforme regimento
- Verificar prazos de prorrogação
- Checar se há violação de direitos processuais
- Validar se fundamentação é apropriada
- **Análise Moral**: Verificar se a comissão processante tem como alvo membros da oposição ou críticos da gestão atual.
- **Análise de Padrão**: Identificar se as mesmas pessoas são sempre nomeadas para comissões processantes (formação de "tribunal de exceção").

### 6.3 Deliberações Plenárias
- Verificar se quórum foi atingido
- Confirmar se votação seguiu procedimento
- Validar se matéria estava em pauta
- Checar se houve publicação apropriada
- Verificar se fundamentação é clara
- **Análise Moral**: Identificar aprovações de gastos, diárias ou viagens que, embora legais, sejam imorais ou excessivas.
- **Análise de Padrão**: Detectar uso excessivo de "Ad Referendum" (decisões monocráticas do presidente sem consultar o plenário previamente), o que indica autoritarismo.

---

## 7. Fontes de Dados

### 7.1 Documentos Primários
1. **Regimento Interno CAU-PR** (6ª versão - DPOPR 0191-02/2025)
   - URL: https://www.caupr.gov.br/regimento/
   - Atualizado em: 12/12/2025
   - Alterado por: DELIBERAÇÃO AD REFERENDUM Nº 09/2026 (13/03/2026)

2. **Portarias**
   - URL: https://www.caupr.gov.br/portarias
   - Período coberto: 2020-2026
   - Quantidade: 678+ portarias

3. **Portarias Normativas**
   - URL: https://www.caupr.gov.br/portarias-normativas-2/
   - Período coberto: 2020-2025
   - Quantidade: 20+ portarias normativas

4. **Deliberações Plenárias**
   - URL: https://www.caupr.gov.br/?page_id=17916
   - Período coberto: 2024-2026
   - Quantidade: 200+ deliberações

### 7.2 Documentos de Referência
- Lei nº 12.378/2010 (Lei de criação do CAU)
- Regimento Geral do CAU (nacional)
- Código de Conduta e Decoro do CAU

---

## 8. Arquitetura Técnica Proposta

### 8.1 Componentes Principais

```
┌─────────────────────────────────────────────────────────┐
│         AGENTE DE AUDITORIA CAU-PR                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. MÓDULO DE COLETA DE DADOS                    │  │
│  │    - Web scraper dos documentos CAU-PR          │  │
│  │    - Parser de PDFs e documentos                │  │
│  │    - Normalização de dados                      │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 2. MÓDULO DE BASE DE CONHECIMENTO               │  │
│  │    - Regimento Interno estruturado              │  │
│  │    - Regras de conformidade                     │  │
│  │    - Histórico de atos anteriores               │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 3. MOTOR DE ANÁLISE (LLM + Regras)              │  │
│  │    - Análise de conformidade                    │  │
│  │    - Detecção de anomalias                      │  │
│  │    - Validação de procedimentos                 │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 4. MÓDULO DE RELATÓRIOS                         │  │
│  │    - Relatórios por ato                         │  │
│  │    - Relatórios consolidados                    │  │
│  │    - Dashboards de conformidade                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Fluxo de Processamento

1. **Coleta**: Extrair atos administrativos do site CAU-PR
2. **Normalização**: Padronizar formato e estrutura dos dados
3. **Análise**: Aplicar regras de conformidade
4. **Classificação**: Categorizar irregularidades por tipo e severidade
5. **Relatório**: Gerar relatório detalhado com recomendações
6. **Armazenamento**: Guardar histórico de análises

---

## 9. Integração com Claude Code

O agente será implementado como um sistema que pode ser:

1. **Executado localmente** via Claude Code com acesso a arquivos
2. **Integrado com APIs** do CAU-PR (se disponível)
3. **Alimentado manualmente** com documentos PDF/DOC
4. **Atualizado periodicamente** com novos atos

### 9.1 Inputs Esperados
- Arquivo PDF/DOC do Regimento Interno
- Lista de portarias (JSON ou CSV)
- Lista de deliberações (JSON ou CSV)
- Período de análise (data inicial e final)

### 9.2 Outputs Gerados
- Relatório HTML interativo
- JSON com detalhes de cada irregularidade
- CSV com resumo de conformidades
- Gráficos de análise temporal

---

## 10. Próximos Passos

1. ✅ Coletar Regimento Interno completo
2. ✅ Mapear todas as portarias e deliberações
3. ⏳ Estruturar base de conhecimento com regras
4. ⏳ Desenvolver motor de análise
5. ⏳ Criar interface de relatórios
6. ⏳ Testar com amostra de atos
7. ⏳ Integrar com Claude Code

---

## 11. Referências

- **Regimento Interno CAU-PR**: 6ª versão (DPOPR 0191-02/2025)
- **Lei nº 12.378/2010**: Cria o Conselho de Arquitetura e Urbanismo
- **Site CAU-PR**: https://www.caupr.gov.br
- **Projeto de Oposição**: https://oposicaocaubr.wordpress.com/

---

**Documento preparado para**: Regis Alessander Wilczek
**Data**: 22 de abril de 2026
**Status**: Especificação Técnica - Pronto para Desenvolvimento
