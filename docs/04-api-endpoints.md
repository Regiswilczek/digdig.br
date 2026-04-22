# API Endpoints

**Base URL:** `https://api.auditapublico.com.br/v1`  
**Autenticação:** Bearer token JWT (Supabase Auth)  
**Formato:** JSON  
**Versionamento:** URL path (`/v1/`)

---

## 1. Autenticação

Gerenciada pelo Supabase Auth. O backend valida o JWT em cada requisição.

```
POST   /auth/signup          → cadastro de novo usuário
POST   /auth/login           → login com email/senha
POST   /auth/logout          → invalidar sessão
POST   /auth/reset-password  → solicitar reset de senha
POST   /auth/refresh         → renovar access token
GET    /auth/me              → dados do usuário autenticado
```

### Headers obrigatórios (rotas protegidas)
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 2. Órgãos Públicos (Tenants)

### Listagem pública (sem auth)
```
GET /orgaos
```
**Resposta:**
```json
{
  "data": [
    {
      "slug": "cau-pr",
      "nome": "CAU/PR",
      "nome_completo": "Conselho de Arquitetura e Urbanismo do Paraná",
      "descricao": "...",
      "logo_url": "...",
      "estado": "PR",
      "tipo_orgao": "conselho_profissional",
      "status": "active",
      "total_atos": 1789,
      "ultima_analise": "2026-04-22T10:00:00Z",
      "estatisticas": {
        "vermelho": 12,
        "laranja": 45,
        "amarelo": 180,
        "verde": 934
      }
    }
  ],
  "total": 1
}
```

### Detalhe do órgão
```
GET /orgaos/{slug}
```

### Estatísticas do órgão
```
GET /orgaos/{slug}/estatisticas
```
**Resposta:**
```json
{
  "total_atos": 1789,
  "por_tipo": {"portaria": 551, "deliberacao": 1238},
  "por_nivel": {"vermelho": 12, "laranja": 45, "amarelo": 180, "verde": 934},
  "total_irregularidades": 287,
  "por_categoria": {"legal": 45, "moral": 180, "etica": 62},
  "pessoas_mais_frequentes": [
    {"nome": "...", "total_aparicoes": 45, "cargos": ["..."]},
  ],
  "linha_do_tempo": [
    {"mes": "2026-01", "vermelho": 2, "laranja": 5, "amarelo": 20}
  ]
}
```

---

## 3. Atos Administrativos

### Listar atos (protegido por plano)
```
GET /orgaos/{slug}/atos
```
**Query params:**
```
page         int     default=1
limit        int     default=50, max=200
tipo         string  portaria|deliberacao|portaria_normativa
nivel        string  vermelho|laranja|amarelo|verde
de           date    YYYY-MM-DD
ate          date    YYYY-MM-DD
busca        string  full-text search
pessoa       string  filtrar por nome de pessoa
ordenar      string  data_desc|data_asc|risco_desc
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "numero": "678",
      "tipo": "portaria",
      "titulo": "PORTARIA PRESIDENCIAL Nº 678",
      "data_publicacao": "2026-04-02",
      "ementa": "Prorroga o prazo da Comissão Processante...",
      "nivel_alerta": "vermelho",
      "score_risco": 87,
      "url_pdf": "https://...",
      "total_irregularidades": 3,
      "irregularidades_resumo": ["perseguicao_politica", "prazo_excedido"]
    }
  ],
  "pagination": {
    "page": 1, "limit": 50, "total": 1789, "pages": 36
  }
}
```

### Detalhe de um ato
```
GET /orgaos/{slug}/atos/{ato_id}
```
**Resposta completa:**
```json
{
  "id": "uuid",
  "numero": "678",
  "tipo": "portaria",
  "titulo": "...",
  "data_publicacao": "2026-04-02",
  "ementa": "...",
  "texto_completo": "...",
  "url_pdf": "...",
  "url_original": "...",
  "nivel_alerta": "vermelho",
  "score_risco": 87,
  "analise": {
    "resumo_executivo": "...",
    "irregularidades": [...],
    "pessoas_envolvidas": [...],
    "atos_relacionados": [...],
    "ficha_denuncia": {...},
    "analisado_por": ["haiku", "sonnet"],
    "analisado_em": "2026-04-22T10:30:00Z"
  }
}
```

---

## 4. Pessoas e Grafo de Relacionamentos

### Listar pessoas
```
GET /orgaos/{slug}/pessoas
```
**Query params:**
```
busca        string
suspeito     boolean
tipo_aparicao string  nomeado|processado|assina|...
ordenar      string  aparicoes_desc|nome_asc
page, limit
```

### Detalhe de uma pessoa
```
GET /orgaos/{slug}/pessoas/{pessoa_id}
```
**Resposta:**
```json
{
  "id": "uuid",
  "nome": "João da Silva",
  "cargo_atual": "Assessor Técnico",
  "total_aparicoes": 23,
  "tipos_aparicao": ["nomeado", "membro_comissao"],
  "score_concentracao": 4,
  "eh_suspeito": true,
  "historico": [
    {
      "ato_numero": "677",
      "tipo": "portaria",
      "data": "2026-03-19",
      "tipo_aparicao": "nomeado",
      "cargo": "Cargo em Comissão"
    }
  ],
  "relacoes": [
    {
      "pessoa": "Maria Souza",
      "tipo_relacao": "nomeador_nomeado",
      "atos_em_comum": 8,
      "peso": 3.5
    }
  ]
}
```

### Dados do grafo para visualização
```
GET /orgaos/{slug}/grafo
```
**Resposta (formato para D3.js/vis.js):**
```json
{
  "nodes": [
    {"id": "uuid", "label": "João da Silva", "score": 87, "grupo": "suspeito"}
  ],
  "edges": [
    {"from": "uuid1", "to": "uuid2", "weight": 3.5, "tipo": "nomeador_nomeado"}
  ]
}
```

---

## 5. Padrões Detectados

```
GET /orgaos/{slug}/padroes
```
**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tipo": "perseguicao_politica",
      "titulo": "Processo disciplinar usado como arma política",
      "descricao": "...",
      "narrativa": "texto longo do Sonnet...",
      "gravidade": "critica",
      "atos_envolvidos": 4,
      "pessoas_envolvidas": 2,
      "periodo": {"inicio": "2025-04-07", "fim": "2026-04-02"}
    }
  ]
}
```

---

## 6. Relatórios

### Listar relatórios disponíveis
```
GET /orgaos/{slug}/relatorios
```

### Gerar relatório (async — retorna job_id)
```
POST /orgaos/{slug}/relatorios/gerar
```
**Body:**
```json
{
  "tipo": "dashboard_html|fichas_denuncia|executivo|dados_json",
  "filtros": {
    "nivel": ["vermelho", "laranja"],
    "de": "2026-01-01",
    "ate": "2026-04-30"
  }
}
```
**Resposta:**
```json
{"job_id": "uuid", "status": "processando", "estimativa_segundos": 30}
```

### Verificar status do job
```
GET /jobs/{job_id}
```

### Download do relatório
```
GET /orgaos/{slug}/relatorios/{relatorio_id}/download
```

### Gerar ficha de denúncia individual
```
GET /orgaos/{slug}/atos/{ato_id}/ficha-denuncia
Accept: text/html|application/pdf|text/plain
```

---

## 7. Chat com IA (RAG Conversacional)

### Criar nova sessão de chat
```
POST /orgaos/{slug}/chat/sessoes
```
**Resposta:**
```json
{"id": "uuid", "tenant_id": "uuid", "criado_em": "2026-04-22T14:30:00Z"}
```

### Listar sessões do usuário
```
GET /orgaos/{slug}/chat/sessoes
```

### Histórico de uma sessão
```
GET /orgaos/{slug}/chat/sessoes/{sessao_id}
```
**Resposta:**
```json
{
  "id": "uuid",
  "titulo": "Relação entre exonerações e processos",
  "total_mensagens": 8,
  "custo_total_usd": 0.34,
  "mensagens": [
    {"role": "user", "conteudo": "...", "criado_em": "..."},
    {"role": "assistant", "conteudo": "...", "tipo_pergunta": "investigacao", "criado_em": "..."}
  ]
}
```

### Enviar pergunta (resposta completa)
```
POST /orgaos/{slug}/chat/sessoes/{sessao_id}/mensagens
```
**Body:**
```json
{"pergunta": "Qual a relação entre as exonerações de 2025 e os processos abertos?"}
```
**Resposta:**
```json
{
  "resposta": "Ótima pergunta. Encontrei um padrão claro nos dados...",
  "tipo_pergunta": "investigacao",
  "custo_usd": 0.09,
  "contexto_usado": {
    "atos_consultados": 24,
    "pessoas_consultadas": 7,
    "padroes_consultados": 2
  }
}
```

### Enviar pergunta (streaming — para respostas longas)
```
POST /orgaos/{slug}/chat/sessoes/{sessao_id}/stream
```
Retorna `text/event-stream` com o texto sendo gerado em tempo real.

### Dar feedback em uma resposta
```
POST /orgaos/{slug}/chat/mensagens/{mensagem_id}/feedback
```
**Body:**
```json
{"util": true, "comentario": "Resposta muito clara e bem citada"}
```

### Deletar sessão
```
DELETE /orgaos/{slug}/chat/sessoes/{sessao_id}
```

### Cota de uso do chat
```
GET /orgaos/{slug}/chat/cota
```
**Resposta:**
```json
{
  "plano": "pro",
  "perguntas_usadas_mes": 47,
  "limite_mes": 300,
  "reset_em": "2026-05-01T00:00:00Z",
  "custo_mes_usd": 1.89
}
```

---

## 8. Planos e Billing

### Listar planos disponíveis (público)
```
GET /planos
```

### Assinar plano
```
POST /assinaturas
```
**Body:**
```json
{"plano_id": "uuid", "payment_method_id": "pm_stripe_..."}
```

### Cancelar assinatura
```
DELETE /assinaturas/atual
```

### Portal do cliente (Stripe Customer Portal)
```
POST /billing/portal
```
**Resposta:**
```json
{"url": "https://billing.stripe.com/session/..."}
```

---

## 8. Admin (apenas usuários com role = admin)

### Listar órgãos com detalhes internos
```
GET /admin/orgaos
```

### Adicionar novo órgão
```
POST /admin/orgaos
```
**Body:**
```json
{
  "slug": "camara-curitiba",
  "nome": "Câmara Municipal de Curitiba",
  "nome_completo": "...",
  "estado": "PR",
  "tipo_orgao": "camara",
  "scraper_config": {
    "fontes": [{"tipo": "resolucoes", "url_base": "...", "paginacao": "wordpress"}]
  },
  "regimento": "texto completo..."
}
```

### Disparar nova rodada de análise
```
POST /admin/orgaos/{slug}/rodadas
```
**Body:**
```json
{
  "modo": "completo|incremental",
  "max_atos": null,
  "forcar_reanalise": false
}
```

### Status das rodadas
```
GET /admin/orgaos/{slug}/rodadas
GET /admin/rodadas/{rodada_id}
```

### Dashboard de custos
```
GET /admin/custos
```
**Resposta:**
```json
{
  "mes_atual": {"haiku_usd": 4.31, "sonnet_usd": 6.39, "total_usd": 10.70},
  "por_orgao": [
    {"orgao": "CAU-PR", "total_usd": 10.70, "ultima_rodada": "2026-04-22"}
  ],
  "historico_mensal": [...]
}
```

---

## 9. Webhooks

### Stripe (billing events)
```
POST /webhooks/stripe
```
Eventos tratados:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## 10. Códigos de Erro

```json
{
  "error": {
    "code": "PLANO_INSUFICIENTE",
    "message": "Seu plano Free não permite acesso a este órgão.",
    "details": {
      "plano_atual": "free",
      "plano_necessario": "pro",
      "upgrade_url": "/planos"
    }
  }
}
```

| Código HTTP | Código de Erro | Descrição |
|------------|----------------|-----------|
| 400 | `VALIDACAO_ERRO` | Dados inválidos na requisição |
| 401 | `NAO_AUTENTICADO` | Token ausente ou inválido |
| 403 | `PLANO_INSUFICIENTE` | Plano não permite esta ação |
| 403 | `ACESSO_NEGADO` | Sem permissão para este recurso |
| 404 | `NAO_ENCONTRADO` | Recurso não existe |
| 422 | `DADOS_INVALIDOS` | Payload com estrutura incorreta |
| 429 | `RATE_LIMIT` | Muitas requisições |
| 500 | `ERRO_INTERNO` | Erro no servidor |
| 503 | `ANALISE_EM_CURSO` | Rodada de análise em andamento |

---

## 11. Rate Limiting

| Endpoint | Limite | Janela |
|----------|--------|--------|
| `/auth/*` | 10 req | 1 minuto |
| `GET /orgaos/*/atos` | 100 req | 1 minuto |
| `POST /relatorios/gerar` | 5 req | 1 hora |
| `GET /grafo` | 20 req | 1 minuto |
| API pública (Free) | 60 req | 1 hora |
| API (Pro/Enterprise) | sem limite | — |
