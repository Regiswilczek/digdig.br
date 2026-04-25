# Plano API & Dados — Documentação Técnica Completa

**Plataforma:** Dig Dig (digdig.com.br)  
**Base URL:** `https://api.digdig.com.br/v1`  
**Versão da API:** v1  
**Última atualização:** 2026-04-22  

> Este documento é entregue a clientes do plano **API & Dados**. Ele cobre autenticação,
> todos os endpoints disponíveis, webhooks, rate limiting, tratamento de erros e exemplos
> de integração em Python, JavaScript e curl.

---

## 1. O que o Plano API & Dados Inclui

O plano API & Dados (R$ 1.998/mês) é o nível mais completo da plataforma Dig Dig para integração técnica. Para monitoramento contínuo personalizado, consulte o plano Técnico (sob consulta).
Ele foi projetado para equipes técnicas que precisam integrar dados de auditoria em seus
próprios sistemas — dashboards de redação, ferramentas de campanha, sistemas de due
diligence ou pipelines de pesquisa.

| Recurso | Detalhe |
|---------|---------|
| **Assentos no dashboard** | 5 usuários com acesso ao painel web |
| **Chamadas API/mês** | 10.000 incluídas |
| **Excedente** | R$ 0,50 por 100 chamadas extras |
| **Webhooks** | Sim — até 10 endpoints configurados |
| **SLA de uptime** | 99,5% mensal |
| **Suporte** | Email prioritário, resposta em até 4h úteis |
| **Acesso antecipado** | Novas instituições disponíveis 48h antes do público geral |
| **Chat via API** | Sim — 1 chamada por pergunta |
| **Export completo** | JSON e CSV (consome 100 chamadas por export) |
| **Todos os órgãos ativos** | Sim, incluindo novos órgãos ao ativar |

### O que não está incluído

- Reprocessamento de atos sob demanda (usar endpoint `/admin/orgaos/{slug}/rodadas`, disponível apenas para admins internos)
- White-label ou acesso a dados brutos de terceiros
- SLA com crédito automático (disponível sob contrato Enterprise negociado)

---

## 2. Autenticação via API Key

O plano API & Dados utiliza **API Keys** ao invés de JWT de sessão. Isso permite integrar
em sistemas backend sem depender de login interativo.

### 2.1 Gerando uma API Key

1. Acesse o dashboard em `https://app.digdig.com.br`
2. Vá em **Configurações → API Keys**
3. Clique em **Gerar nova chave**
4. Dê um nome descritivo (ex.: `redacao-producao`, `sistema-advocacia`)
5. Copie e armazene a chave em local seguro — ela não será exibida novamente

Cada conta pode ter até **5 API Keys ativas** simultaneamente.

### 2.2 Enviando a API Key nas requisições

Use o header `X-API-Key` em todas as chamadas:

```
X-API-Key: sk_live_Tz8mX9...
```

Nunca use `Authorization: Bearer` com API Keys — esse header é reservado para sessões JWT
do dashboard. Misturar os dois mecanismos retorna `401 NAO_AUTENTICADO`.

### 2.3 Ambientes

| Prefixo | Ambiente | Base URL |
|---------|----------|----------|
| `sk_live_` | Produção | `https://api.digdig.com.br/v1` |
| `sk_test_` | Sandbox | `https://sandbox.digdig.com.br/v1` |

O ambiente sandbox contém um subconjunto dos dados do CAU/PR (últimos 90 dias) e não
consome cota de chamadas. Use-o para desenvolver e testar integrações antes de ir para
produção.

### 2.4 Rotação de Chaves

Ao suspeitar de vazamento de uma API Key:

1. Acesse **Configurações → API Keys** no dashboard
2. Clique em **Revogar** na chave comprometida — ela é invalidada imediatamente
3. Gere uma nova chave e atualize seus sistemas

Não existe período de carência: uma chave revogada para de funcionar em menos de 60
segundos.

### 2.5 Exemplos de autenticação

**curl:**
```bash
curl -X GET "https://api.digdig.com.br/v1/orgaos" \
  -H "X-API-Key: sk_live_Tz8mX9kLpQr4vW2nJsY7" \
  -H "Content-Type: application/json"
```

**Python (requests):**
```python
import requests

API_KEY = "sk_live_Tz8mX9kLpQr4vW2nJsY7"
BASE_URL = "https://api.digdig.com.br/v1"

session = requests.Session()
session.headers.update({
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
})

response = session.get(f"{BASE_URL}/orgaos")
data = response.json()
```

**JavaScript (fetch):**
```javascript
const API_KEY = "sk_live_Tz8mX9kLpQr4vW2nJsY7";
const BASE_URL = "https://api.digdig.com.br/v1";

async function digdig(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.error.code}: ${error.error.message}`);
  }

  return response.json();
}

const orgaos = await digdig("/orgaos");
```

---

## 3. Endpoints Completos da API

### Convenções gerais

- Todos os timestamps são UTC no formato ISO 8601: `2026-04-22T14:30:00Z`
- Datas sem horário usam o formato `YYYY-MM-DD`: `2026-04-02`
- UUIDs seguem o formato padrão RFC 4122
- Paginação usa `page` (base 1) e `limit` (padrão 50, máximo 200)
- Campos `null` são retornados explicitamente, não omitidos
- Todos os endpoints exigem `X-API-Key` válida

---

### 3.1 Instituições (Órgãos)

#### GET /orgaos

Lista todas as instituições disponíveis na plataforma.

```bash
curl "https://api.digdig.com.br/v1/orgaos" \
  -H "X-API-Key: sk_live_..."
```

**Resposta 200:**
```json
{
  "data": [
    {
      "slug": "cau-pr",
      "nome": "CAU/PR",
      "nome_completo": "Conselho de Arquitetura e Urbanismo do Paraná",
      "descricao": "Órgão federal de fiscalização do exercício profissional de arquitetos e urbanistas no Paraná.",
      "logo_url": "https://cdn.digdig.com.br/logos/cau-pr.png",
      "site_url": "https://www.caupr.gov.br",
      "estado": "PR",
      "tipo_orgao": "conselho_profissional",
      "status": "active",
      "total_atos": 1789,
      "ultima_analise": "2026-04-22T10:00:00Z",
      "estatisticas": {
        "vermelho": 12,
        "laranja": 45,
        "amarelo": 180,
        "verde": 1552,
        "total_irregularidades": 287,
        "total_pessoas_identificadas": 134
      }
    }
  ],
  "total": 1
}
```

**Campos do objeto de instituição:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `slug` | string | Identificador URL-safe único da instituição |
| `nome` | string | Nome curto |
| `nome_completo` | string | Nome completo oficial |
| `estado` | string | UF de 2 letras |
| `tipo_orgao` | string | `conselho_profissional`, `camara`, `autarquia`, `tribunal` |
| `status` | string | `active`, `coming_soon`, `processing`, `inactive` |
| `total_atos` | integer | Total de atos coletados e analisados |
| `ultima_analise` | string | Timestamp da última rodada de análise concluída |
| `estatisticas.vermelho` | integer | Atos com nível de alerta crítico |
| `estatisticas.laranja` | integer | Atos com alerta alto |
| `estatisticas.amarelo` | integer | Atos com alerta moderado |
| `estatisticas.verde` | integer | Atos sem irregularidades detectadas |

---

#### GET /orgaos/{slug}

Retorna os detalhes completos de uma instituição, incluindo estatísticas temporais.

```bash
curl "https://api.digdig.com.br/v1/orgaos/cau-pr" \
  -H "X-API-Key: sk_live_..."
```

**Resposta 200:**
```json
{
  "slug": "cau-pr",
  "nome": "CAU/PR",
  "nome_completo": "Conselho de Arquitetura e Urbanismo do Paraná",
  "descricao": "Órgão federal de fiscalização do exercício profissional de arquitetos e urbanistas no Paraná.",
  "logo_url": "https://cdn.digdig.com.br/logos/cau-pr.png",
  "site_url": "https://www.caupr.gov.br",
  "estado": "PR",
  "tipo_orgao": "conselho_profissional",
  "status": "active",
  "total_atos": 1789,
  "ultima_analise": "2026-04-22T10:00:00Z",
  "estatisticas": {
    "vermelho": 12,
    "laranja": 45,
    "amarelo": 180,
    "verde": 1552,
    "total_irregularidades": 287,
    "por_categoria": {
      "legal": 45,
      "moral": 180,
      "etica": 62
    },
    "total_pessoas_identificadas": 134,
    "pessoas_suspeitas": 18,
    "padroes_detectados": 7
  },
  "linha_do_tempo": [
    {
      "mes": "2026-04",
      "total_atos": 38,
      "vermelho": 2,
      "laranja": 7,
      "amarelo": 14,
      "verde": 15
    },
    {
      "mes": "2026-03",
      "total_atos": 41,
      "vermelho": 1,
      "laranja": 6,
      "amarelo": 19,
      "verde": 15
    }
  ]
}
```

---

### 3.2 Atos Administrativos

#### GET /orgaos/{slug}/atos

Lista atos com filtros avançados. Retorna 50 atos por página por padrão.

**Query parameters:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | integer | 1 | Página atual |
| `limit` | integer | 50 | Resultados por página (máximo 200) |
| `tipo` | string | — | Filtrar por tipo: `portaria`, `portaria_normativa`, `deliberacao_plenaria`, `deliberacao_ad_referendum` |
| `nivel_alerta` | string | — | `vermelho`, `laranja`, `amarelo`, `verde` |
| `data_de` | string | — | Data de início no formato `YYYY-MM-DD` |
| `data_ate` | string | — | Data de fim no formato `YYYY-MM-DD` |
| `busca` | string | — | Full-text search em título e ementa |
| `pessoa` | string | — | Filtrar atos que envolvem uma pessoa pelo nome |
| `ordenar` | string | `data_desc` | `data_desc`, `data_asc`, `risco_desc` |

```bash
curl "https://api.digdig.com.br/v1/orgaos/cau-pr/atos?nivel_alerta=vermelho&data_de=2025-01-01&limit=10" \
  -H "X-API-Key: sk_live_..."
```

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "numero": "678",
      "tipo": "portaria",
      "subtipo": null,
      "titulo": "PORTARIA PRESIDENCIAL Nº 678",
      "data_publicacao": "2026-04-02",
      "ementa": "Prorroga o prazo da Comissão Processante instaurada pela Portaria Nº 601.",
      "nivel_alerta": "vermelho",
      "score_risco": 87,
      "url_pdf": "https://www.caupr.gov.br/wp-content/uploads/portaria-678.pdf",
      "url_original": "https://www.caupr.gov.br/portarias",
      "total_irregularidades": 3,
      "categorias_irregularidades": ["moral", "processual"],
      "pessoas_envolvidas_count": 4,
      "criado_em": "2026-04-22T10:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "pages": 2,
    "has_next": true,
    "has_prev": false
  }
}
```

**Campos do objeto de ato (listagem):**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único do ato |
| `numero` | string | Número oficial do ato (ex.: "678") |
| `tipo` | string | Tipo do ato administrativo |
| `titulo` | string | Título completo conforme o documento |
| `data_publicacao` | date | Data de publicação no formato `YYYY-MM-DD` |
| `ementa` | string | Resumo oficial do ato |
| `nivel_alerta` | string | Nível de risco detectado pela IA |
| `score_risco` | integer | Score de 0 a 100 (100 = máximo risco) |
| `total_irregularidades` | integer | Quantidade de irregularidades identificadas |
| `categorias_irregularidades` | array | Categorias presentes: `legal`, `moral`, `etica`, `processual` |
| `pessoas_envolvidas_count` | integer | Número de pessoas identificadas no ato |

---

#### GET /orgaos/{slug}/atos/{id}

Retorna o ato completo com análise detalhada, irregularidades e pessoas envolvidas.

```bash
curl "https://api.digdig.com.br/v1/orgaos/cau-pr/atos/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "X-API-Key: sk_live_..."
```

**Resposta 200:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "numero": "678",
  "tipo": "portaria",
  "subtipo": null,
  "titulo": "PORTARIA PRESIDENCIAL Nº 678",
  "data_publicacao": "2026-04-02",
  "ementa": "Prorroga o prazo da Comissão Processante instaurada pela Portaria Nº 601.",
  "texto_completo": "PORTARIA PRESIDENCIAL Nº 678, de 02 de abril de 2026. O PRESIDENTE DO CAU/PR, no uso das atribuições que lhe confere o art. 37 do Regimento Interno...",
  "url_pdf": "https://www.caupr.gov.br/wp-content/uploads/portaria-678.pdf",
  "url_original": "https://www.caupr.gov.br/portarias",
  "pdf_paginas": 2,
  "nivel_alerta": "vermelho",
  "score_risco": 87,
  "analise": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "status": "concluida",
    "analisado_por": ["haiku", "sonnet"],
    "analisado_em": "2026-04-22T10:30:00Z",
    "resumo_executivo": "A portaria prorroga pela terceira vez o prazo de uma comissão processante sem apresentar fundamentação legal para as prorrogações sucessivas. O art. 73 do Regimento Interno estabelece prazo máximo de 60 dias. A comissão já acumula 134 dias, ultrapassando o limite em 74 dias. O investigado é o mesmo vereador que votou contra a gestão atual em plenária de março/2026, configurando possível uso político do processo disciplinar.",
    "recomendacao_campanha": "Denunciar o uso do processo disciplinar como instrumento de perseguição política. Citar o art. 73 do RI e as datas de cada prorrogação. Solicitar ao Ministério Público que investigue a motivação política.",
    "irregularidades": [
      {
        "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "categoria": "processual",
        "tipo": "prazo_excedido",
        "descricao": "Prazo da comissão processante excedido em 74 dias. O art. 73 do Regimento Interno estabelece 60 dias prorrogáveis por mais 30, totalizando 90 dias máximos. A comissão está no 134º dia sem amparo legal.",
        "artigo_violado": "Art. 73, §2º do Regimento Interno do CAU/PR — 6ª versão, DPOPR 0191-02/2025",
        "gravidade": "alta"
      },
      {
        "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
        "categoria": "moral",
        "tipo": "perseguicao_politica",
        "descricao": "Investigado votou contra pautas da presidência em 3 das últimas 4 plenárias antes da abertura do processo. Padrão temporal sugere motivação política, não disciplinar.",
        "artigo_violado": null,
        "gravidade": "critica"
      },
      {
        "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
        "categoria": "processual",
        "tipo": "ausencia_fundamentacao",
        "descricao": "As três portarias de prorrogação (601, 634 e 678) não apresentam fundamentação de fato para a extensão do prazo — apenas linguagem genérica de 'necessidade de conclusão dos trabalhos'.",
        "artigo_violado": "Art. 50 da Lei 9.784/1999 — dever de motivação dos atos administrativos",
        "gravidade": "media"
      }
    ],
    "pessoas_envolvidas": [
      {
        "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
        "nome": "Carlos Alberto Mendes",
        "tipo_aparicao": "processado",
        "cargo": "Conselheiro Titular",
        "total_aparicoes_orgao": 12
      },
      {
        "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
        "nome": "Ricardo Ferreira Lima",
        "tipo_aparicao": "assina",
        "cargo": "Presidente do CAU/PR",
        "total_aparicoes_orgao": 89
      }
    ],
    "atos_relacionados": [
      {
        "id": "b8c9d0e1-f2a3-4567-bcde-678901234567",
        "numero": "601",
        "tipo": "portaria",
        "titulo": "PORTARIA PRESIDENCIAL Nº 601 — Instaura Comissão Processante",
        "data_publicacao": "2025-11-19",
        "nivel_alerta": "laranja"
      },
      {
        "id": "c9d0e1f2-a3b4-5678-cdef-789012345678",
        "numero": "634",
        "tipo": "portaria",
        "titulo": "PORTARIA PRESIDENCIAL Nº 634 — Prorroga prazo (1ª vez)",
        "data_publicacao": "2026-01-22",
        "nivel_alerta": "laranja"
      }
    ]
  }
}
```

---

### 3.3 Irregularidades

#### GET /orgaos/{slug}/irregularidades

Lista todas as irregularidades detectadas, com filtros por gravidade, categoria e pessoa.

**Query parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `gravidade` | string | `baixa`, `media`, `alta`, `critica` |
| `categoria` | string | `legal`, `moral`, `etica`, `processual` |
| `tipo` | string | Ex.: `nepotismo`, `perseguicao_politica`, `prazo_excedido` |
| `pessoa` | string | Nome parcial da pessoa envolvida no ato-pai |
| `data_de` | string | Data de publicação do ato pai (`YYYY-MM-DD`) |
| `data_ate` | string | Data de publicação do ato pai (`YYYY-MM-DD`) |
| `page`, `limit` | integer | Paginação padrão |

```bash
curl "https://api.digdig.com.br/v1/orgaos/cau-pr/irregularidades?gravidade=critica&categoria=moral" \
  -H "X-API-Key: sk_live_..."
```

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "ato_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "ato_numero": "678",
      "ato_tipo": "portaria",
      "ato_data": "2026-04-02",
      "analise_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "categoria": "moral",
      "tipo": "perseguicao_politica",
      "descricao": "Investigado votou contra pautas da presidência em 3 das últimas 4 plenárias antes da abertura do processo.",
      "artigo_violado": null,
      "gravidade": "critica",
      "impacto_politico": "Uso do aparato administrativo para silenciar oposição interna. Padrão semelhante detectado em 2 outros processos abertos no mesmo período.",
      "criado_em": "2026-04-22T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 8,
    "pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

---

#### GET /orgaos/{slug}/irregularidades/{id}

Retorna a irregularidade completa com ficha de denúncia gerada pelo Sonnet.

```bash
curl "https://api.digdig.com.br/v1/orgaos/cau-pr/irregularidades/d4e5f6a7-b8c9-0123-defa-234567890123" \
  -H "X-API-Key: sk_live_..."
```

**Resposta 200:**
```json
{
  "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
  "ato_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "ato_numero": "678",
  "ato_tipo": "portaria",
  "ato_data": "2026-04-02",
  "ato_titulo": "PORTARIA PRESIDENCIAL Nº 678",
  "ato_url_pdf": "https://www.caupr.gov.br/wp-content/uploads/portaria-678.pdf",
  "analise_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "categoria": "moral",
  "tipo": "perseguicao_politica",
  "descricao": "Investigado votou contra pautas da presidência em 3 das últimas 4 plenárias antes da abertura do processo. Padrão temporal sugere motivação política, não disciplinar.",
  "artigo_violado": null,
  "gravidade": "critica",
  "impacto_politico": "Uso do aparato administrativo para silenciar oposição interna. Padrão semelhante detectado em 2 outros processos abertos no mesmo período.",
  "ficha_denuncia": {
    "titulo": "Indício de perseguição política através de processo disciplinar — CAU/PR",
    "resumo": "A Portaria Presidencial Nº 678 prorroga pela terceira vez um processo disciplinar contra o Conselheiro Carlos Alberto Mendes, que votou contra a gestão atual em 3 das 4 plenárias anteriores. O processo foi aberto 22 dias após o último voto dissidente, sem registro de fato disciplinar anterior. Há indícios de uso do instrumento administrativo como mecanismo de pressão política.",
    "linha_do_tempo": [
      {
        "data": "2025-10-28",
        "evento": "Plenária — Mendes vota contra pauta da presidência pela 3ª vez"
      },
      {
        "data": "2025-11-19",
        "evento": "Portaria 601 — Abertura do processo disciplinar contra Mendes"
      },
      {
        "data": "2026-01-22",
        "evento": "Portaria 634 — 1ª prorrogação do prazo (sem motivação específica)"
      },
      {
        "data": "2026-02-28",
        "evento": "Portaria 651 — 2ª prorrogação (prazo legal já esgotado)"
      },
      {
        "data": "2026-04-02",
        "evento": "Portaria 678 — 3ª prorrogação (134 dias, limite legal: 90 dias)"
      }
    ],
    "fundamentacao_legal": [
      "Art. 73, §2º do Regimento Interno do CAU/PR — prazo máximo de 90 dias para comissões processantes",
      "Art. 50 da Lei 9.784/1999 — obrigatoriedade de motivação dos atos administrativos",
      "Princípio da impessoalidade — art. 37, caput, da Constituição Federal"
    ],
    "recomendacoes": [
      "Notificar o Ministério Público Federal sobre o possível uso político do processo disciplinar",
      "Solicitar ao CAU Federal a revisão do ato por desvio de finalidade",
      "Divulgar a linha do tempo em material de campanha com links para os PDFs originais"
    ],
    "nota_juridica": "Este documento apresenta indícios e padrões identificados por análise de IA. A conclusão sobre a existência de crime ou ilícito administrativo depende de análise jurídica por advogado habilitado. Os documentos citados estão disponíveis nos links originais do CAU/PR."
  },
  "criado_em": "2026-04-22T10:30:00Z"
}
```

---

### 3.4 Pessoas

#### GET /orgaos/{slug}/pessoas

Lista pessoas identificadas nos atos administrativos do órgão.

**Query parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `busca` | string | Busca por nome (parcial, case-insensitive) |
| `suspeito` | boolean | `true` para retornar apenas pessoas sinalizadas |
| `tipo_aparicao` | string | `nomeado`, `exonerado`, `assina`, `membro_comissao`, `processado`, `fiscal_contrato`, `gestor_contrato` |
| `ordenar` | string | `aparicoes_desc` (padrão), `nome_asc`, `score_desc` |
| `page`, `limit` | integer | Paginação padrão |

```bash
curl "https://api.digdig.com.br/v1/orgaos/cau-pr/pessoas?suspeito=true&ordenar=aparicoes_desc" \
  -H "X-API-Key: sk_live_..."
```

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
      "nome_normalizado": "Ricardo Ferreira Lima",
      "variantes_nome": ["RICARDO F. LIMA", "Ricardo Lima", "Dr. Ricardo Ferreira Lima"],
      "cargo_mais_recente": "Presidente do CAU/PR",
      "tipo": "pessoa_fisica",
      "total_aparicoes": 89,
      "primeiro_ato_data": "2022-03-01",
      "ultimo_ato_data": "2026-04-02",
      "score_concentracao": 7,
      "eh_suspeito": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 18,
    "pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

---

#### GET /orgaos/{slug}/pessoas/{id}

Retorna o perfil completo de uma pessoa com todo o histórico de aparições e relações.

```bash
curl "https://api.digdig.com.br/v1/orgaos/cau-pr/pessoas/a7b8c9d0-e1f2-3456-abcd-567890123456" \
  -H "X-API-Key: sk_live_..."
```

**Resposta 200:**
```json
{
  "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
  "nome_normalizado": "Ricardo Ferreira Lima",
  "variantes_nome": ["RICARDO F. LIMA", "Ricardo Lima", "Dr. Ricardo Ferreira Lima"],
  "cargo_mais_recente": "Presidente do CAU/PR",
  "tipo": "pessoa_fisica",
  "total_aparicoes": 89,
  "primeiro_ato_data": "2022-03-01",
  "ultimo_ato_data": "2026-04-02",
  "score_concentracao": 7,
  "eh_suspeito": true,
  "resumo_aparicoes": {
    "nomeado": 12,
    "exonerado": 3,
    "assina": 61,
    "membro_comissao": 8,
    "processado": 0,
    "fiscal_contrato": 5,
    "gestor_contrato": 0
  },
  "historico": [
    {
      "aparicao_id": "b8c9d0e1-f2a3-4567-bcde-678901234567",
      "ato_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "ato_numero": "678",
      "ato_tipo": "portaria",
      "ato_titulo": "PORTARIA PRESIDENCIAL Nº 678",
      "ato_data": "2026-04-02",
      "ato_nivel_alerta": "vermelho",
      "tipo_aparicao": "assina",
      "cargo": "Presidente do CAU/PR"
    }
  ],
  "relacoes": [
    {
      "pessoa_id": "c9d0e1f2-a3b4-5678-cdef-789012345678",
      "nome": "Ana Paula Rodrigues",
      "tipo_relacao": "nomeador_nomeado",
      "atos_em_comum": 14,
      "peso": 4.2
    },
    {
      "pessoa_id": "d0e1f2a3-b4c5-6789-defa-890123456789",
      "nome": "Carlos Alberto Mendes",
      "tipo_relacao": "processador_processado",
      "atos_em_comum": 3,
      "peso": 1.8
    }
  ]
}
```

**Campos do objeto de pessoa:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `nome_normalizado` | string | Nome canônico após deduplicação pela IA |
| `variantes_nome` | array | Grafias alternativas encontradas nos documentos |
| `score_concentracao` | integer | Número de comissões ou funções simultâneas — quanto maior, maior o risco de concentração de poder |
| `eh_suspeito` | boolean | `true` se a IA sinalizou padrão irregular relevante |
| `relacoes[].tipo_relacao` | string | `nomeador_nomeado`, `mesma_comissao`, `processador_processado` |
| `relacoes[].peso` | float | Força da relação (1.0 a 10.0), proporcional a atos em comum e gravidade |

---

### 3.5 Padrões Detectados

#### GET /orgaos/{slug}/padroes

Retorna os padrões globais identificados pelo Sonnet durante a síntese da rodada de análise.
Padrões representam comportamentos recorrentes que afetam múltiplos atos e pessoas —
diferente de irregularidades, que são pontuais.

```bash
curl "https://api.digdig.com.br/v1/orgaos/cau-pr/padroes" \
  -H "X-API-Key: sk_live_..."
```

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "e1f2a3b4-c5d6-7890-efab-901234567890",
      "tipo_padrao": "perseguicao_politica",
      "titulo": "Processo disciplinar usado como instrumento de pressão política",
      "descricao": "Quatro processos disciplinares abertos entre novembro/2025 e março/2026 têm em comum o fato de os investigados terem votado contra pautas da presidência nas plenárias imediatamente anteriores à abertura dos processos.",
      "narrativa": "A análise temporal dos processos disciplinares abertos pela presidência do CAU/PR nos últimos 18 meses revela um padrão preocupante: todos os conselheiros processados haviam manifestado oposição explícita à gestão atual em plenária entre 15 e 30 dias antes da abertura do processo. Nenhum dos processos apresenta fundamentação de fato sólida independente do contexto político. Dois dos processos foram encerrados sem punição após os conselheiros mudarem seu padrão de voto. Este conjunto de indícios configura uso do processo disciplinar como mecanismo de coerção política, em possível violação ao princípio da impessoalidade (art. 37 da CF) e ao devido processo legal administrativo.",
      "gravidade": "critica",
      "tipo_padrao_display": "Perseguição Política",
      "atos_envolvidos_count": 11,
      "pessoas_envolvidas_count": 6,
      "periodo": {
        "inicio": "2025-11-19",
        "fim": "2026-04-02"
      },
      "rodada_id": "f2a3b4c5-d6e7-8901-fabc-012345678901",
      "criado_em": "2026-04-22T10:45:00Z"
    },
    {
      "id": "a3b4c5d6-e7f8-9012-abcd-123456789012",
      "tipo_padrao": "concentracao_poder",
      "titulo": "Acúmulo de funções comissionadas por grupo restrito de pessoas",
      "descricao": "Seis pessoas acumulam entre 3 e 9 funções simultâneas em comissões e cargos comissionados, representando 71% das designações totais.",
      "narrativa": "...",
      "gravidade": "alta",
      "tipo_padrao_display": "Concentração de Poder",
      "atos_envolvidos_count": 34,
      "pessoas_envolvidas_count": 6,
      "periodo": {
        "inicio": "2023-01-01",
        "fim": "2026-04-02"
      },
      "rodada_id": "f2a3b4c5-d6e7-8901-fabc-012345678901",
      "criado_em": "2026-04-22T10:45:00Z"
    }
  ],
  "total": 7
}
```

**Valores possíveis de `tipo_padrao`:**

| Valor | Significado |
|-------|------------|
| `concentracao_poder` | Acúmulo de funções por grupo restrito |
| `perseguicao_politica` | Uso de instrumentos administrativos contra opositores |
| `nepotismo` | Favorecimento de familiares ou associados |
| `cabide_empregos` | Nomeações sem critério técnico aparente |
| `gastos_suspeitos` | Contratações ou pagamentos fora do padrão |
| `aparelhamento` | Substituição sistemática de quadros técnicos por indicados políticos |

---

### 3.6 Chat via API

#### POST /chat

Envia uma pergunta ao sistema conversacional e recebe a resposta completa (não streaming).
Cada chamada a este endpoint consome **1 chamada de API** da sua cota.

O chat usa RAG (Retrieval-Augmented Generation): a IA busca no banco os atos, análises,
irregularidades e pessoas relevantes para a pergunta antes de gerar a resposta. Nenhum
PDF é re-processado — toda a pesquisa é feita sobre dados já estruturados no banco.

**Body:**
```json
{
  "orgao_slug": "cau-pr",
  "pergunta": "Existe padrão de nomeações para comissões feitas logo antes de processos disciplinares?",
  "session_id": "sess_abc123"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `orgao_slug` | string | Sim | Slug do órgão a consultar |
| `pergunta` | string | Sim | Pergunta em linguagem natural (máximo 2.000 caracteres) |
| `session_id` | string | Não | ID de sessão para manter contexto entre perguntas. Se omitido, cada chamada é independente. |

```bash
curl -X POST "https://api.digdig.com.br/v1/chat" \
  -H "X-API-Key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "orgao_slug": "cau-pr",
    "pergunta": "Quem foram os conselheiros nomeados para mais de 3 comissões simultâneas?",
    "session_id": "sess_abc123"
  }'
```

**Resposta 200:**
```json
{
  "resposta": "Identifiquei 6 conselheiros com 3 ou mais nomeações simultâneas para comissões no CAU/PR. Os mais expressivos são:\n\n1. **Ana Paula Rodrigues** — 9 funções entre 2024 e 2026, incluindo presidente de 3 comissões ao mesmo tempo (Portarias 589, 601, 612).\n2. **José Augusto Werneck** — 6 funções, com sobreposição de 4 cargos entre agosto e novembro/2025.\n\nEste padrão foi classificado como 'concentração de poder' na análise global do CAU/PR. Posso detalhar as portarias de cada um?",
  "tipo_pergunta": "investigacao",
  "session_id": "sess_abc123",
  "contexto_usado": {
    "atos_consultados": 34,
    "pessoas_consultadas": 8,
    "padroes_consultados": 2,
    "irregularidades_consultadas": 0
  },
  "chamadas_consumidas": 1,
  "custo_estimado_usd": 0.07,
  "criado_em": "2026-04-22T15:30:00Z"
}
```

**Sobre o `session_id`:**
- Gere um UUID v4 no seu sistema para criar uma sessão nova
- Envie o mesmo `session_id` em perguntas de acompanhamento para que a IA mantenha contexto
- O histórico da sessão é mantido por 30 dias de inatividade, depois é descartado
- Não há endpoint separado para criar/listar sessões via API — o gerenciamento é feito pelo `session_id`

---

### 3.7 Export de Dados

#### GET /orgaos/{slug}/export

Exporta todos os dados analisados do órgão em JSON ou CSV. Esta operação consome
**100 chamadas de API** da sua cota, independentemente do tamanho do resultado.

**Query parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `formato` | string | `json` (padrão) ou `csv` |
| `incluir` | string | Comma-separated: `atos`, `irregularidades`, `pessoas`, `padroes`. Padrão: todos |
| `nivel_alerta` | string | Filtrar atos por nível: `vermelho`, `laranja`, `amarelo`, `verde` |
| `data_de` | string | Filtrar por data de publicação do ato |
| `data_ate` | string | Filtrar por data de publicação do ato |

```bash
# Export completo em JSON
curl "https://api.digdig.com.br/v1/orgaos/cau-pr/export?formato=json" \
  -H "X-API-Key: sk_live_..." \
  -o cau-pr-export.json

# Export só de atos vermelhos e laranjas em CSV
curl "https://api.digdig.com.br/v1/orgaos/cau-pr/export?formato=csv&nivel_alerta=vermelho,laranja&incluir=atos,irregularidades" \
  -H "X-API-Key: sk_live_..." \
  -o alertas-criticos.csv
```

**Resposta 200 (formato JSON):**
```json
{
  "orgao": {
    "slug": "cau-pr",
    "nome": "CAU/PR",
    "exportado_em": "2026-04-22T16:00:00Z",
    "total_atos": 1789,
    "filtros_aplicados": {}
  },
  "atos": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "numero": "678",
      "tipo": "portaria",
      "titulo": "PORTARIA PRESIDENCIAL Nº 678",
      "data_publicacao": "2026-04-02",
      "ementa": "Prorroga o prazo da Comissão Processante...",
      "nivel_alerta": "vermelho",
      "score_risco": 87,
      "url_pdf": "https://www.caupr.gov.br/...",
      "total_irregularidades": 3,
      "resumo_executivo": "...",
      "irregularidades": ["perseguicao_politica", "prazo_excedido", "ausencia_fundamentacao"]
    }
  ],
  "irregularidades": [...],
  "pessoas": [...],
  "padroes": [...]
}
```

Para o formato CSV, o endpoint retorna um arquivo `.zip` contendo um CSV por entidade:
`atos.csv`, `irregularidades.csv`, `pessoas.csv`, `padroes.csv`.

---

## 4. Webhooks

Webhooks permitem que sua aplicação receba notificações em tempo real quando eventos
ocorrem no Dig Dig — sem necessidade de polling.

### 4.1 Configurando um Webhook

```bash
curl -X POST "https://api.digdig.com.br/v1/webhooks" \
  -H "X-API-Key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://sua-aplicacao.com.br/webhooks/digdig",
    "eventos": ["irregularidade.detectada", "analise.concluida"],
    "orgaos": ["cau-pr"],
    "ativo": true,
    "descricao": "Alertas para sistema da redação"
  }'
```

**Resposta 201:**
```json
{
  "id": "wh_a1b2c3d4e5f6",
  "url": "https://sua-aplicacao.com.br/webhooks/digdig",
  "eventos": ["irregularidade.detectada", "analise.concluida"],
  "orgaos": ["cau-pr"],
  "ativo": true,
  "secret": "whsec_Xk9mPqR7vT2nLsY4jW8cZ1",
  "criado_em": "2026-04-22T16:30:00Z"
}
```

Guarde o `secret` em local seguro — ele é usado para verificar a assinatura de cada
entrega e não será exibido novamente.

**Gerenciamento de webhooks:**
```
GET    /webhooks              → listar todos os webhooks configurados
GET    /webhooks/{id}         → detalhes de um webhook
PATCH  /webhooks/{id}         → atualizar URL, eventos ou status
DELETE /webhooks/{id}         → remover webhook
GET    /webhooks/{id}/entregas → histórico de entregas (últimas 100)
```

### 4.2 Eventos Disponíveis

| Evento | Disparado quando |
|--------|-----------------|
| `ato.publicado` | Um novo ato é coletado pelo scraper e salvo no banco |
| `irregularidade.detectada` | A IA identifica uma irregularidade em um ato |
| `analise.concluida` | Uma rodada completa de análise do órgão é finalizada |
| `padrao.atualizado` | Um padrão global é criado ou atualizado após nova rodada |

### 4.3 Payloads dos Eventos

**`ato.publicado`:**
```json
{
  "evento": "ato.publicado",
  "id": "evt_b2c3d4e5f6a7",
  "timestamp": "2026-04-22T14:00:00Z",
  "orgao_slug": "cau-pr",
  "dados": {
    "ato_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "numero": "679",
    "tipo": "portaria",
    "titulo": "PORTARIA PRESIDENCIAL Nº 679",
    "data_publicacao": "2026-04-22",
    "ementa": "Designa membros para Comissão de Ética.",
    "url_pdf": "https://www.caupr.gov.br/...",
    "status_analise": "pendente"
  }
}
```

**`irregularidade.detectada`:**
```json
{
  "evento": "irregularidade.detectada",
  "id": "evt_c3d4e5f6a7b8",
  "timestamp": "2026-04-22T14:05:00Z",
  "orgao_slug": "cau-pr",
  "dados": {
    "irregularidade_id": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "ato_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "ato_numero": "679",
    "ato_data": "2026-04-22",
    "categoria": "moral",
    "tipo": "nepotismo",
    "gravidade": "alta",
    "descricao": "Pessoa designada tem sobrenome coincidente com presidente do conselho...",
    "nivel_alerta_ato": "laranja"
  }
}
```

**`analise.concluida`:**
```json
{
  "evento": "analise.concluida",
  "id": "evt_d4e5f6a7b8c9",
  "timestamp": "2026-04-22T16:00:00Z",
  "orgao_slug": "cau-pr",
  "dados": {
    "rodada_id": "f2a3b4c5-d6e7-8901-fabc-012345678901",
    "total_atos_analisados": 42,
    "novos_alertas": {
      "vermelho": 2,
      "laranja": 5,
      "amarelo": 18,
      "verde": 17
    },
    "novas_irregularidades": 14,
    "novos_padroes": 0,
    "custo_total_usd": 0.93,
    "duracao_segundos": 1847
  }
}
```

**`padrao.atualizado`:**
```json
{
  "evento": "padrao.atualizado",
  "id": "evt_e5f6a7b8c9d0",
  "timestamp": "2026-04-22T16:01:00Z",
  "orgao_slug": "cau-pr",
  "dados": {
    "padrao_id": "e1f2a3b4-c5d6-7890-efab-901234567890",
    "tipo_padrao": "perseguicao_politica",
    "titulo": "Processo disciplinar usado como instrumento de pressão política",
    "gravidade": "critica",
    "acao": "atualizado",
    "atos_envolvidos_count": 11,
    "pessoas_envolvidas_count": 6
  }
}
```

### 4.4 Verificação de Assinatura

Cada entrega de webhook inclui o header `X-Dig-Signature` com uma assinatura HMAC-SHA256
do payload. Sempre verifique a assinatura antes de processar o evento.

```python
import hmac
import hashlib

def verificar_assinatura_webhook(payload_bytes: bytes, signature_header: str, secret: str) -> bool:
    """
    payload_bytes: corpo da requisição em bytes (não decodificado)
    signature_header: valor do header X-Dig-Signature
    secret: o whsec_... recebido ao criar o webhook
    """
    assinatura_esperada = hmac.new(
        secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()

    assinatura_recebida = signature_header.replace("sha256=", "")

    return hmac.compare_digest(assinatura_esperada, assinatura_recebida)
```

```javascript
import crypto from "crypto";

function verificarAssinaturaWebhook(payloadBuffer, signatureHeader, secret) {
  const assinaturaEsperada = crypto
    .createHmac("sha256", secret)
    .update(payloadBuffer)
    .digest("hex");

  const assinaturaRecebida = signatureHeader.replace("sha256=", "");

  return crypto.timingSafeEqual(
    Buffer.from(assinaturaEsperada, "hex"),
    Buffer.from(assinaturaRecebida, "hex")
  );
}
```

### 4.5 Retry Policy

Se sua aplicação retornar um status HTTP diferente de `2xx`, o Dig Dig vai retentatar
a entrega seguindo backoff exponencial:

| Tentativa | Delay |
|-----------|-------|
| 1ª (inicial) | Imediata |
| 2ª | 5 minutos |
| 3ª | 30 minutos |

Após 3 tentativas sem sucesso, o evento é descartado e registrado como falha no
histórico de entregas (`GET /webhooks/{id}/entregas`).

Sua aplicação deve retornar `200 OK` (ou qualquer `2xx`) em no máximo **10 segundos**.
Para processamento mais lento, confirme recebimento imediatamente e processe em background.

---

## 5. Rate Limiting

### Cota mensal

| Plano | Chamadas incluídas/mês | Excedente |
|-------|----------------------|-----------|
| API & Dados | 10.000 | R$ 0,50 por 100 chamadas |

A cota reseta no 1º dia de cada mês às 00:00 BRT. Chamadas do ambiente sandbox
não consomem cota.

### Rate limit por minuto

Para proteger a estabilidade da API, existe um limite de **60 requisições por minuto**
por API Key, independentemente da cota mensal.

### Headers de rate limiting

Todas as respostas incluem os seguintes headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 1745535600
X-Quota-Limit: 10000
X-Quota-Remaining: 8743
X-Quota-Reset: 2026-05-01T00:00:00Z
```

| Header | Descrição |
|--------|-----------|
| `X-RateLimit-Limit` | Requisições permitidas por minuto |
| `X-RateLimit-Remaining` | Requisições restantes na janela atual |
| `X-RateLimit-Reset` | Unix timestamp de quando a janela reseta |
| `X-Quota-Limit` | Chamadas incluídas no mês |
| `X-Quota-Remaining` | Chamadas restantes no mês atual |
| `X-Quota-Reset` | Data/hora do próximo reset mensal |

### HTTP 429 — Too Many Requests

Quando o limite por minuto é excedido:

```json
{
  "error": {
    "code": "RATE_LIMIT",
    "message": "Limite de 60 requisições por minuto excedido.",
    "details": {
      "retry_after_seconds": 23,
      "reset_timestamp": 1745535600
    }
  }
}
```

O header `Retry-After` indica quantos segundos aguardar antes de tentar novamente.

Quando a cota mensal é excedida:

```json
{
  "error": {
    "code": "COTA_ESGOTADA",
    "message": "Cota de 10.000 chamadas mensais esgotada.",
    "details": {
      "quota_usada": 10000,
      "quota_limite": 10000,
      "reset_em": "2026-05-01T00:00:00Z",
      "overage_url": "https://app.digdig.com.br/billing/overage"
    }
  }
}
```

---

## 6. Códigos de Erro

Todas as respostas de erro seguem o mesmo formato:

```json
{
  "error": {
    "code": "CODIGO_DO_ERRO",
    "message": "Mensagem legível por humano.",
    "details": {}
  }
}
```

| HTTP | Código de erro | Significado | Ação sugerida |
|------|---------------|-------------|---------------|
| 400 | `VALIDACAO_ERRO` | Parâmetro inválido na requisição (tipo errado, fora do range, formato inválido) | Verificar a documentação dos parâmetros do endpoint |
| 401 | `NAO_AUTENTICADO` | Header `X-API-Key` ausente, inválido ou chave revogada | Verificar a chave no dashboard; gerar nova se necessário |
| 403 | `PLANO_INSUFICIENTE` | Endpoint disponível apenas em planos superiores | Fazer upgrade do plano |
| 403 | `ACESSO_NEGADO` | API Key válida, mas sem permissão para este recurso específico | Verificar escopo da API Key no dashboard |
| 403 | `ORGAO_NAO_ACESSIVEL` | Órgão com status `coming_soon` ou `inactive` | Aguardar ativação ou escolher órgão com status `active` |
| 404 | `NAO_ENCONTRADO` | Recurso (ato, pessoa, irregularidade) não existe | Confirmar o UUID ou slug enviado |
| 422 | `DADOS_INVALIDOS` | Estrutura do body incorreta (campo obrigatório ausente, JSON malformado) | Verificar o schema do body no endpoint correspondente |
| 429 | `RATE_LIMIT` | Mais de 60 requisições no último minuto | Aguardar o `retry_after_seconds` indicado no response |
| 429 | `COTA_ESGOTADA` | Cota mensal de 10.000 chamadas atingida | Aguardar reset mensal ou ativar overage no dashboard |
| 500 | `ERRO_INTERNO` | Erro inesperado no servidor | Tentar novamente em alguns minutos; se persistir, contatar suporte |
| 503 | `ANALISE_EM_CURSO` | Rodada de análise em andamento para o órgão solicitado | Aguardar conclusão (monitorar via `analise.concluida` no webhook) |

---

## 7. Casos de Uso Reais

### Caso de Uso 1 — Consultoria Política Monitorando 10 Órgãos com Webhooks

**Cenário:** Uma consultoria política acompanha 10 órgãos em tempo real para detectar
irregularidades e alimentar um sistema interno de alertas para os clientes.

**Arquitetura:**
1. Configura 1 webhook por órgão, escutando `irregularidade.detectada` e `analise.concluida`
2. O sistema interno recebe os payloads e filtra por `gravidade >= alta`
3. Alertas são enviados por WhatsApp/Telegram para o cliente responsável por cada órgão
4. Semanalmente, usa `GET /orgaos/{slug}/export?formato=csv` para atualizar planilhas internas

```python
from fastapi import FastAPI, Request, HTTPException
import hmac, hashlib, json

app = FastAPI()
WEBHOOK_SECRET = "whsec_Xk9mPqR7vT2nLsY4jW8cZ1"

@app.post("/webhooks/digdig")
async def receber_webhook(request: Request):
    payload_bytes = await request.body()
    signature = request.headers.get("X-Dig-Signature", "")

    # Verificar assinatura
    assinatura_esperada = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(assinatura_esperada, signature):
        raise HTTPException(status_code=401, detail="Assinatura inválida")

    evento = json.loads(payload_bytes)

    if evento["evento"] == "irregularidade.detectada":
        dados = evento["dados"]
        if dados["gravidade"] in ("alta", "critica"):
            # Disparar alerta para o cliente responsável pelo órgão
            await enviar_alerta(
                orgao=evento["orgao_slug"],
                tipo=dados["tipo"],
                gravidade=dados["gravidade"],
                descricao=dados["descricao"],
                ato_numero=dados["ato_numero"]
            )

    return {"status": "ok"}
```

**Cota estimada:** 10 órgãos × ~50 webhooks/mês = 500 chamadas para consultas adicionais
de detalhamento + 4 exports mensais (400 chamadas) = ~900 chamadas/mês, bem dentro do limite.

---

### Caso de Uso 2 — Jornal Integrando Alertas de Irregularidades na Redação

**Cenário:** Um veículo de mídia quer exibir no sistema interno da redação um feed
de irregularidades críticas detectadas pelo Dig Dig, com link direto para o PDF original.

**Integração via polling (alternativa ao webhook):**

```javascript
// Script executado a cada hora via cron
const BASE_URL = "https://api.digdig.com.br/v1";
const API_KEY = process.env.DIGDIG_API_KEY;

async function buscarNovasIrregularidades() {
  const hoje = new Date().toISOString().split("T")[0];
  const ontem = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const response = await fetch(
    `${BASE_URL}/orgaos/cau-pr/irregularidades?gravidade=critica&data_de=${ontem}&data_ate=${hoje}`,
    { headers: { "X-API-Key": API_KEY } }
  );

  const { data } = await response.json();

  for (const irregularidade of data) {
    // Buscar detalhes completos com ficha de denúncia
    const detalheResp = await fetch(
      `${BASE_URL}/orgaos/cau-pr/irregularidades/${irregularidade.id}`,
      { headers: { "X-API-Key": API_KEY } }
    );
    const detalhe = await detalheResp.json();

    // Inserir no sistema interno da redação
    await inserirNoSistemaRedacao({
      titulo: detalhe.ficha_denuncia.titulo,
      resumo: detalhe.ficha_denuncia.resumo,
      orgao: "CAU/PR",
      data: detalhe.ato_data,
      gravidade: detalhe.gravidade,
      pdf_url: detalhe.ato_url_pdf,
      link_digdig: `https://app.digdig.com.br/caupr/atos/${detalhe.ato_id}`
    });
  }
}
```

**Cota estimada:** 24 polls/dia × 30 dias = 720 chamadas para listagem + até 240 buscas
de detalhe em dias com movimento = ~960 chamadas/mês.

---

### Caso de Uso 3 — Escritório de Advocacia Exportando Dados para Due Diligence

**Cenário:** Um escritório de advocacia precisa fazer due diligence sobre um conselheiro
antes de aceitar um mandato. Quer levantar todas as aparições, processos e irregularidades.

```python
import requests
import json
from datetime import datetime

API_KEY = "sk_live_..."
BASE_URL = "https://api.digdig.com.br/v1"

def due_diligence(orgao_slug: str, nome_pessoa: str) -> dict:
    session = requests.Session()
    session.headers.update({"X-API-Key": API_KEY})

    # 1. Buscar a pessoa
    resp = session.get(f"{BASE_URL}/orgaos/{orgao_slug}/pessoas", params={"busca": nome_pessoa})
    pessoas = resp.json()["data"]

    if not pessoas:
        return {"erro": f"Nenhuma pessoa encontrada com o nome '{nome_pessoa}'"}

    pessoa = pessoas[0]  # Pegar o match mais relevante

    # 2. Buscar perfil completo
    resp = session.get(f"{BASE_URL}/orgaos/{orgao_slug}/pessoas/{pessoa['id']}")
    perfil = resp.json()

    # 3. Buscar irregularidades dos atos em que ela aparece
    resp = session.get(
        f"{BASE_URL}/orgaos/{orgao_slug}/irregularidades",
        params={"pessoa": nome_pessoa, "gravidade": "alta"}
    )
    irregularidades = resp.json()["data"]

    # 4. Usar o chat para síntese em linguagem natural
    resp = session.post(f"{BASE_URL}/chat", json={
        "orgao_slug": orgao_slug,
        "pergunta": f"Faça um resumo executivo de todos os indícios de irregularidade envolvendo {nome_pessoa}, incluindo atos, cargos e padrões detectados."
    })
    sintese = resp.json()["resposta"]

    # 5. Montar relatório
    relatorio = {
        "data_geracao": datetime.now().isoformat(),
        "orgao": orgao_slug,
        "pessoa": perfil["nome_normalizado"],
        "cargo_atual": perfil["cargo_mais_recente"],
        "total_aparicoes": perfil["total_aparicoes"],
        "eh_suspeito": perfil["eh_suspeito"],
        "score_concentracao": perfil["score_concentracao"],
        "irregularidades_relevantes": irregularidades,
        "relacoes_principais": perfil["relacoes"][:5],
        "sintese_ia": sintese
    }

    with open(f"due-diligence-{nome_pessoa.lower().replace(' ', '-')}.json", "w", encoding="utf-8") as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=2)

    return relatorio

# Uso
resultado = due_diligence("cau-pr", "Ricardo Ferreira Lima")
print(f"Due diligence concluída: {resultado['total_aparicoes']} aparições, suspeito: {resultado['eh_suspeito']}")
```

**Cota estimada:** 4 chamadas por due diligence (pessoa, perfil, irregularidades, chat).
Um escritório que faz 50 due diligences/mês usa ~200 chamadas, com 9.800 restantes para
outras consultas.

---

## 8. SDKs e Referências de Código

### Python (requests) — wrapper completo

```python
import requests
from typing import Optional, Literal

class DigDigClient:
    """Cliente Python para a API Dig Dig."""

    BASE_URL = "https://api.digdig.com.br/v1"

    def __init__(self, api_key: str, sandbox: bool = False):
        if sandbox:
            self.BASE_URL = "https://sandbox.digdig.com.br/v1"
        self.session = requests.Session()
        self.session.headers.update({
            "X-API-Key": api_key,
            "Content-Type": "application/json"
        })

    def _get(self, path: str, params: dict = None) -> dict:
        resp = self.session.get(f"{self.BASE_URL}{path}", params=params)
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, body: dict) -> dict:
        resp = self.session.post(f"{self.BASE_URL}{path}", json=body)
        resp.raise_for_status()
        return resp.json()

    # Instituições
    def listar_orgaos(self) -> dict:
        return self._get("/orgaos")

    def orgao(self, slug: str) -> dict:
        return self._get(f"/orgaos/{slug}")

    # Atos
    def listar_atos(self, slug: str, **filtros) -> dict:
        return self._get(f"/orgaos/{slug}/atos", params=filtros)

    def ato(self, slug: str, ato_id: str) -> dict:
        return self._get(f"/orgaos/{slug}/atos/{ato_id}")

    # Irregularidades
    def listar_irregularidades(self, slug: str, **filtros) -> dict:
        return self._get(f"/orgaos/{slug}/irregularidades", params=filtros)

    def irregularidade(self, slug: str, irr_id: str) -> dict:
        return self._get(f"/orgaos/{slug}/irregularidades/{irr_id}")

    # Pessoas
    def listar_pessoas(self, slug: str, **filtros) -> dict:
        return self._get(f"/orgaos/{slug}/pessoas", params=filtros)

    def pessoa(self, slug: str, pessoa_id: str) -> dict:
        return self._get(f"/orgaos/{slug}/pessoas/{pessoa_id}")

    # Padrões
    def padroes(self, slug: str) -> dict:
        return self._get(f"/orgaos/{slug}/padroes")

    # Chat
    def chat(self, orgao_slug: str, pergunta: str, session_id: Optional[str] = None) -> dict:
        body = {"orgao_slug": orgao_slug, "pergunta": pergunta}
        if session_id:
            body["session_id"] = session_id
        return self._post("/chat", body)

    # Export
    def export(self, slug: str, formato: Literal["json", "csv"] = "json", **filtros):
        params = {"formato": formato, **filtros}
        resp = self.session.get(f"{self.BASE_URL}/orgaos/{slug}/export", params=params, stream=True)
        resp.raise_for_status()
        return resp

    # Webhooks
    def criar_webhook(self, url: str, eventos: list[str], orgaos: list[str], descricao: str = "") -> dict:
        return self._post("/webhooks", {
            "url": url,
            "eventos": eventos,
            "orgaos": orgaos,
            "ativo": True,
            "descricao": descricao
        })


# Uso
client = DigDigClient(api_key="sk_live_...")

# Listar atos críticos
atos_criticos = client.listar_atos("cau-pr", nivel_alerta="vermelho", limit=20)

# Fazer uma pergunta
resp = client.chat("cau-pr", "Quem mais aparece em portarias de nomeação?")
print(resp["resposta"])

# Export completo
export = client.export("cau-pr", formato="json")
with open("cau-pr-completo.json", "wb") as f:
    for chunk in export.iter_content(chunk_size=8192):
        f.write(chunk)
```

---

### JavaScript/TypeScript (fetch)

```typescript
class DigDigClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, sandbox = false) {
    this.apiKey = apiKey;
    this.baseUrl = sandbox
      ? "https://sandbox.digdig.com.br/v1"
      : "https://api.digdig.com.br/v1";
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`[${error.error.code}] ${error.error.message}`);
    }

    return response.json() as Promise<T>;
  }

  // Instituições
  async listarOrgaos() {
    return this.request("/orgaos");
  }

  async orgao(slug: string) {
    return this.request(`/orgaos/${slug}`);
  }

  // Atos
  async listarAtos(slug: string, params: Record<string, string | number> = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/orgaos/${slug}/atos${query ? "?" + query : ""}`);
  }

  async ato(slug: string, atoId: string) {
    return this.request(`/orgaos/${slug}/atos/${atoId}`);
  }

  // Chat
  async chat(orgaoSlug: string, pergunta: string, sessionId?: string) {
    return this.request("/chat", {
      method: "POST",
      body: JSON.stringify({ orgao_slug: orgaoSlug, pergunta, session_id: sessionId }),
    });
  }

  // Padrões
  async padroes(slug: string) {
    return this.request(`/orgaos/${slug}/padroes`);
  }

  // Criar webhook
  async criarWebhook(url: string, eventos: string[], orgaos: string[]) {
    return this.request("/webhooks", {
      method: "POST",
      body: JSON.stringify({ url, eventos, orgaos, ativo: true }),
    });
  }
}

// Uso
const client = new DigDigClient(process.env.DIGDIG_API_KEY!);

const padroes = await client.padroes("cau-pr");
console.log(`${padroes.total} padrões detectados`);

const resposta = await client.chat(
  "cau-pr",
  "Há evidências de nepotismo nas comissões formadas em 2025?"
);
console.log(resposta.resposta);
```

---

### curl — referência rápida

```bash
# Configurar variável de ambiente
export DIGDIG_KEY="sk_live_..."

# Listar órgãos
curl -s "https://api.digdig.com.br/v1/orgaos" \
  -H "X-API-Key: $DIGDIG_KEY" | jq .

# Atos críticos do CAU/PR
curl -s "https://api.digdig.com.br/v1/orgaos/cau-pr/atos?nivel_alerta=vermelho&limit=5" \
  -H "X-API-Key: $DIGDIG_KEY" | jq '.data[] | {numero, titulo, score_risco}'

# Detalhe de um ato específico
curl -s "https://api.digdig.com.br/v1/orgaos/cau-pr/atos/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "X-API-Key: $DIGDIG_KEY" | jq '.analise.resumo_executivo'

# Irregularidades críticas
curl -s "https://api.digdig.com.br/v1/orgaos/cau-pr/irregularidades?gravidade=critica" \
  -H "X-API-Key: $DIGDIG_KEY" | jq '.data[] | {tipo, descricao, ato_numero}'

# Perfil completo de uma pessoa
curl -s "https://api.digdig.com.br/v1/orgaos/cau-pr/pessoas?busca=Ricardo+Ferreira" \
  -H "X-API-Key: $DIGDIG_KEY" | jq '.'

# Chat
curl -s -X POST "https://api.digdig.com.br/v1/chat" \
  -H "X-API-Key: $DIGDIG_KEY" \
  -H "Content-Type: application/json" \
  -d '{"orgao_slug":"cau-pr","pergunta":"Quais são os padrões mais graves detectados?"}' \
  | jq '.resposta'

# Export completo em JSON
curl -s "https://api.digdig.com.br/v1/orgaos/cau-pr/export?formato=json" \
  -H "X-API-Key: $DIGDIG_KEY" \
  -o cau-pr-completo.json

# Configurar webhook
curl -s -X POST "https://api.digdig.com.br/v1/webhooks" \
  -H "X-API-Key: $DIGDIG_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://meusite.com.br/webhook",
    "eventos": ["irregularidade.detectada"],
    "orgaos": ["cau-pr"],
    "descricao": "Alertas de irregularidades críticas"
  }' | jq '{id, secret}'
```

---

## Suporte e Limites

| Canal | Disponibilidade | SLA |
|-------|----------------|-----|
| Email prioritário (suporte@digdig.com.br) | Dias úteis | Resposta em até 4h úteis |
| Status da API | https://status.digdig.com.br | Tempo real |

Para dúvidas técnicas, inclua no email: o ID do erro (campo `request_id` nos headers de
resposta), o endpoint chamado, o payload enviado (sem a API Key) e o timestamp da chamada.

**Limites adicionais:**
- Tamanho máximo do campo `pergunta` no chat: 2.000 caracteres
- Máximo de 5 API Keys ativas por conta
- Máximo de 10 endpoints de webhook configurados por conta
- Requests com body acima de 1 MB são rejeitados com HTTP 413
