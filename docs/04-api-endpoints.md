# API Endpoints

> ## ⚠️ Atualização — Sprint Abril 2026
>
> **Base URL real em produção:** `https://digdig.com.br` (sem `/v1` — versionamento por URL nunca foi adotado). Routers FastAPI usam prefixos:
> - `/health` — healthcheck
> - `/public/*` — público (sem auth)
> - `/painel/*` — autenticado (Bearer JWT Supabase)
> - **`/me/*`** — painel do usuário (NOVO)
> - `/billing/*` — pagamentos (Mercado Pago)
> - `/chat/*` — chat com IA
> - `/admin/*` (host `pnl.digdig.com.br`) — admin
> - `/webhooks/*` — webhooks externos
>
> ### Endpoints `/me/*` (novos — painel da conta)
>
> | Método | Path | Descrição |
> |---|---|---|
> | GET | `/me` | perfil + plano + assinatura ativa |
> | PATCH | `/me` | altera nome do usuário |
> | POST | `/me/avatar` | upload de foto (multipart, ≤2MB, JPG/PNG/WebP/GIF) → Supabase Storage |
> | DELETE | `/me/avatar` | remove foto |
> | GET | `/me/assinatura` | detalhes da assinatura ativa |
> | POST | `/me/assinatura/cancelar` | cancela no MP + marca local como `cancelled` |
> | GET | `/me/favoritos` | lista atos favoritados (com info do ato) |
> | POST | `/me/favoritos/{ato_id}` | adiciona favorito (body opcional `{"nota": "..."}`) |
> | DELETE | `/me/favoritos/{ato_id}` | remove favorito |
>
> ### Mudanças nos endpoints existentes
>
> - `GET /painel/orgaos/{slug}/atos` — agora aceita `?tipo_atlas=licitacao` (filtra por categoria ATLAS) além de `?tipo=...` (tipo do scraper)
> - `GET /public/orgaos/{slug}/stats` — retorna **`por_categoria_atlas`** paralelo a `por_tipo`
> - `GET /pnl/admin/fila/{slug}?agente=bud` — itens incluem flag `legado: bool` (true se análise foi pelo Haiku antigo, tokens_piper=0)
> - `GET /painel/orgaos/{slug}/pipeline-status` — amostras das filas incluem `legado` para flagar reprocessamento
> - `GET /painel/orgaos/{slug}/atos/{id}` — bloco `auditoria` retorna `legado: bool` + agente "haiku_legado" no array `agentes` quando aplicável
> - `POST /pnl/admin/disparar-lote` e `GET /pnl/admin/fila/{slug}` — filtros de tipo aceitam `OR(tipo, tipo_atlas)` (mesmo dropdown atende scraper e ATLAS)
>
> ### nginx config (importante)
>
> O nginx do container frontend agora proxia `/me` (exact) e `/me/*` (prefix) para a API com `client_max_body_size 5M` (upload de avatar). Veja `nginx/nginx.conf`.
>
> ### Conteúdo histórico abaixo
>
> A documentação completa de cada endpoint segue. O cabeçalho com `/v1/` é histórico — a API real nunca usou prefixo de versão.

---

# (Conteúdo original)

**Base URL:** `https://api.digdig.com.br/v1` *(desatualizado — ver topo)*  
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

## 1.1. API Keys (Plano API & Dados)

```
GET    /conta/api-keys           → lista as API Keys do usuário (sem revelar a chave)
POST   /conta/api-keys           → gera nova API Key (retorna a chave UMA vez em texto claro)
DELETE /conta/api-keys/{id}      → revoga uma API Key
```

### Listar API Keys
```
GET /conta/api-keys
```
Auth: obrigatório (plano API & Dados)

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nome": "redacao-producao",
      "prefixo": "sk_live_Tz8m",
      "ativa": true,
      "ultimo_uso": "2026-04-20T14:32:00Z",
      "criado_em": "2026-03-01T10:00:00Z"
    }
  ]
}
```

### Gerar Nova API Key
```
POST /conta/api-keys
```
Auth: obrigatório (plano API & Dados)

**Body:**
```json
{ "nome": "sistema-advocacia" }
```

**Resposta 201:**
```json
{
  "id": "uuid",
  "nome": "sistema-advocacia",
  "chave": "sk_live_Tz8mX9...",
  "prefixo": "sk_live_Tz8m",
  "aviso": "Guarde esta chave agora. Ela não será exibida novamente."
}
```

**Erros:**
- 400 `LIMITE_API_KEYS`: usuário já tem 5 API Keys ativas
- 403 `PLANO_INSUFICIENTE`: requer plano API & Dados

### Revogar API Key
```
DELETE /conta/api-keys/{id}
```
Auth: obrigatório

**Resposta 200:**
```json
{ "revogado": true, "revogado_em": "2026-04-22T18:00:00Z" }
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

## 7. Patrocine uma Auditoria

Mecanismo de crowdfunding para financiar a análise de novas instituições públicas. Usuários nominam órgãos, votam nas propostas e podem fazer doações via Stripe para atingir a meta de R$ 3.000,00 que dispara a análise.

### Listar campanhas ativas
```
GET /campanhas
```
Auth: público

**Query params:**
```
status       string  ativa|concluida|cancelada|em_analise  (default: ativa)
uf           string  PR|SP|...
tipo_orgao   string  conselho_profissional|camara_municipal|autarquia
ordenar      string  votos_desc|valor_desc|recente  (default: votos_desc)
page         int     default=1
limit        int     default=20, max=100
```

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "nome_orgao": "Câmara Municipal de Curitiba",
      "descricao": "Auditoria das deliberações de 2020-2026",
      "uf": "PR",
      "tipo_orgao": "camara_municipal",
      "status": "ativa",
      "meta_valor": 3000.00,
      "valor_arrecadado": 1250.00,
      "percentual_meta": 41.7,
      "total_doadores": 12,
      "total_votos": 87,
      "prazo_expiracao": "2026-07-31T23:59:59Z",
      "created_at": "2026-04-10T14:00:00Z"
    }
  ],
  "pagination": {
    "page": 1, "limit": 20, "total": 5, "pages": 1
  }
}
```

---

### Detalhe de uma campanha
```
GET /campanhas/{id}
```
Auth: público

**Resposta 200:**
```json
{
  "id": "uuid",
  "nome_orgao": "Câmara Municipal de Curitiba",
  "descricao": "Auditoria das deliberações de 2020-2026",
  "uf": "PR",
  "tipo_orgao": "camara_municipal",
  "status": "ativa",
  "meta_valor": 3000.00,
  "valor_arrecadado": 1250.00,
  "percentual_meta": 41.7,
  "total_doadores": 12,
  "total_votos": 87,
  "proposta_por": {"id": "uuid", "nome": "João da Silva"},
  "tenant_id_gerado": null,
  "prazo_expiracao": "2026-07-31T23:59:59Z",
  "created_at": "2026-04-10T14:00:00Z",
  "updated_at": "2026-04-22T09:15:00Z"
}
```

**Erros:**
- 404 `NAO_ENCONTRADO`: campanha não existe

---

### Nominar Nova Instituição
```
POST /campanhas
```
Auth: obrigatório

**Body:**
```json
{
  "nome_orgao": "Câmara Municipal de Curitiba",
  "descricao": "Auditoria das deliberações de 2020-2026",
  "uf": "PR",
  "tipo_orgao": "camara_municipal"
}
```

**Resposta 201:**
```json
{
  "id": "uuid",
  "nome_orgao": "Câmara Municipal de Curitiba",
  "descricao": "Auditoria das deliberações de 2020-2026",
  "uf": "PR",
  "tipo_orgao": "camara_municipal",
  "status": "ativa",
  "meta_valor": 3000.00,
  "valor_arrecadado": 0.00,
  "total_doadores": 0,
  "total_votos": 0,
  "created_at": "2026-04-22T15:00:00Z"
}
```

**Erros:**
- 400 `CAMPANHA_DUPLICADA`: instituição já tem campanha ativa
- 401 `NAO_AUTENTICADO`

---

### Lista pública de apoiadores
```
GET /campanhas/{id}/doadores
```
Auth: público

**Query params:**
```
page    int   default=1
limit   int   default=20, max=100
```

**Resposta 200:**
```json
{
  "data": [
    {
      "nome_exibicao": "Maria Souza",
      "valor": 100.00,
      "mensagem_publica": "Transparência sempre!",
      "created_at": "2026-04-15T10:30:00Z"
    },
    {
      "nome_exibicao": "Anônimo",
      "valor": 50.00,
      "mensagem_publica": null,
      "created_at": "2026-04-16T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1, "limit": 20, "total": 12, "pages": 1
  }
}
```

**Erros:**
- 404 `NAO_ENCONTRADO`: campanha não existe

---

### Iniciar doação
```
POST /campanhas/{id}/doacoes
```
Auth: obrigatório

**Body:**
```json
{
  "valor": 100.00,
  "nome_exibicao": "Maria Souza",
  "mensagem_publica": "Transparência sempre!"
}
```
- `nome_exibicao` opcional — omitir ou passar `null` para exibir como "Anônimo"
- `mensagem_publica` opcional

**Resposta 201:**
```json
{
  "doacao_id": "uuid",
  "stripe_payment_intent": "pi_3...",
  "client_secret": "pi_3..._secret_...",
  "valor": 100.00,
  "status": "pendente"
}
```

**Erros:**
- 400 `DOACAO_MINIMA`: valor abaixo do mínimo de R$ 25,00
- 400 `CAMPANHA_NAO_ATIVA`: campanha não está com status `ativa`
- 401 `NAO_AUTENTICADO`
- 404 `NAO_ENCONTRADO`: campanha não existe

---

### Confirmar pagamento (webhook Stripe)
```
POST /campanhas/{id}/doacoes/confirmar
```
Auth: assinatura HMAC do Stripe (header `Stripe-Signature`)

Atualiza o status da doação para `confirmada`, incrementa `valor_arrecadado` e `total_doadores` na campanha. Se `valor_arrecadado >= meta_valor`, a campanha passa para `em_analise` e dispara a criação do tenant.

**Body:** payload bruto do evento Stripe `payment_intent.succeeded`

**Resposta 200:**
```json
{"received": true}
```

**Erros:**
- 400 `ASSINATURA_INVALIDA`: header `Stripe-Signature` não confere

---

### Registrar voto gratuito
```
POST /campanhas/{id}/votos
```
Auth: obrigatório

Cada usuário autenticado tem direito a **3 votos gratuitos por mês**, distribuíveis entre quaisquer campanhas ativas. Doações confirmadas concedem votos extras proporcionais ao valor (`votos_concedidos` em `doacoes_patrocinio`).

**Body:** vazio `{}`

**Resposta 201:**
```json
{
  "voto_id": "uuid",
  "campanha_id": "uuid",
  "mes_referencia": "2026-04",
  "votos_gratuitos_restantes": 2,
  "created_at": "2026-04-22T15:05:00Z"
}
```

**Erros:**
- 400 `COTA_VOTOS_ESGOTADA`: 3 votos gratuitos do mês já utilizados
- 400 `CAMPANHA_NAO_ATIVA`: campanha não está com status `ativa`
- 409 `VOTO_DUPLICADO`: usuário já votou nesta campanha neste mês
- 401 `NAO_AUTENTICADO`
- 404 `NAO_ENCONTRADO`: campanha não existe

---

### Saldo de votos gratuitos do mês
```
GET /campanhas/{id}/votos/saldo
```
Auth: obrigatório

**Resposta 200:**
```json
{
  "mes_referencia": "2026-04",
  "votos_gratuitos_limite": 3,
  "votos_gratuitos_usados": 1,
  "votos_gratuitos_restantes": 2,
  "ja_votou_nesta_campanha": false
}
```

**Erros:**
- 401 `NAO_AUTENTICADO`
- 404 `NAO_ENCONTRADO`: campanha não existe

---

## 8. Chat com IA (RAG Conversacional)

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

## 9. Planos e Billing

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

## 10. Admin (apenas usuários com role = admin)

> **Segurança:** As rotas de admin reais ficam em `/pnl/*` (prefixo obscurecido).
> A rota `/admin/*` é um **honeypot** — qualquer acesso é logado como sinal de varredura ou ataque.
> Autenticação via header `X-Admin-Secret`.

### Honeypot (decoy)
```
/* /admin/*  →  sempre retorna 404, mas loga IP + user-agent + path
```

### Disparar nova rodada de análise
```
POST /pnl/orgaos/{slug}/rodadas
```
Header obrigatório: `X-Admin-Secret: <webhook_secret>`

### Status de rodada
```
GET /pnl/rodadas/{rodada_id}
```
Header obrigatório: `X-Admin-Secret: <webhook_secret>`

### Listar órgãos com detalhes internos (futuro)
```
GET /pnl/orgaos
```

### Adicionar novo órgão (futuro)
```
POST /pnl/orgaos
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

### Dashboard de custos (futuro)
```
GET /pnl/custos
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

## 11. Webhooks

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
- `payment_intent.succeeded` → confirma doação de patrocínio, concede 1 mês de Investigador ao doador (primeira doação), atualiza `valor_arrecadado` da campanha, verifica se meta foi atingida (dispara análise se sim)

### Onboarding de novo usuário
```
POST /webhooks/auth/novo-usuario
```
Auth: `Authorization: Bearer SERVICE_ROLE_KEY` (verificado para garantir que só o Supabase pode chamar)

Chamado pelo Supabase Auth via Database Webhook quando um novo usuário é criado em `auth.users`. Cria o registro correspondente na tabela `users` com `plano_id` do plano Cidadão.

**Body (enviado pelo Supabase):**
```json
{
  "type": "INSERT",
  "table": "users",
  "record": {
    "id": "uuid-do-supabase-auth",
    "email": "usuario@exemplo.com"
  }
}
```

**Resposta 200:**
```json
{ "user_id": "uuid", "plano": "cidadao" }
```

---

## 12. Códigos de Erro

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
| 400 | `CAMPANHA_DUPLICADA` | Instituição já tem campanha ativa |
| 400 | `CAMPANHA_NAO_ATIVA` | Campanha não está com status `ativa` |
| 400 | `DOACAO_MINIMA` | Valor de doação abaixo do mínimo (R$ 25,00) |
| 400 | `COTA_VOTOS_ESGOTADA` | Os 3 votos gratuitos mensais já foram utilizados |
| 400 | `ASSINATURA_INVALIDA` | Assinatura HMAC do webhook Stripe não confere |
| 409 | `VOTO_DUPLICADO` | Usuário já votou nesta campanha neste mês |

---

## 13. Rate Limiting

| Contexto | Limite | Janela | Comportamento ao exceder |
|---|---|---|---|
| Público (sem auth) | 30 req | por minuto por IP | HTTP 429, retry após 60s |
| Cidadão (autenticado) | 60 req | por minuto | HTTP 429 |
| Investigador / Profissional | 120 req | por minuto | HTTP 429 |
| API & Dados (API Key) | 60 req | por minuto | HTTP 429, header X-RateLimit-Remaining |
| Chat — Cidadão | 5 perguntas | por mês | HTTP 429, código COTA_CHAT_ESGOTADA |
| Chat — Investigador | 200 perguntas | por mês | idem |
| Chat — Profissional | 1.000 perguntas | por mês | idem |
| Chat — API & Dados | ilimitado via API | — | sem limite de cota |
| POST /campanhas | 3 req | por hora por usuário | previne spam de campanhas |
| POST /campanhas/*/doacoes | 5 req | por hora por usuário | — |
| POST /campanhas/*/votos | 3 req | por mês por usuário | limite de votos gratuitos |
