# Banco de Dados — Schema Completo

**Banco:** PostgreSQL 15 (via Supabase)  
**ORM:** SQLAlchemy 2.x  
**Migrações:** Alembic  

---

## 1. Diagrama de Relacionamentos

```
planos ──────────────────── assinaturas ──── users
                                               │
tenants ──┬──────────────────────────── user_tenant_acesso
          │
          ├── knowledge_base (regimento)
          ├── tenant_regras
          │
          ├── atos ──────────── conteudo_ato
          │     │
          │     ├── aparicoes_pessoa ──── pessoas
          │     │
          │     └── analises ──── irregularidades
          │           │
          │           └── rodadas_analise
          │
          ├── relatorios
          └── padroes_detectados
```

---

## 2. Tabelas

### 2.1 `planos`
Planos de acesso disponíveis na plataforma.

```sql
CREATE TABLE planos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(50) NOT NULL,          -- 'free', 'pro', 'enterprise'
    nome_display    VARCHAR(100) NOT NULL,          -- 'Gratuito', 'Pro', 'Enterprise'
    preco_mensal    DECIMAL(10,2) NOT NULL DEFAULT 0,
    stripe_price_id VARCHAR(100),                   -- ID do preço no Stripe
    limite_orgaos   INTEGER NOT NULL DEFAULT 1,     -- -1 = ilimitado
    tem_api         BOOLEAN NOT NULL DEFAULT FALSE,
    tem_alertas     BOOLEAN NOT NULL DEFAULT FALSE,
    tem_export_csv  BOOLEAN NOT NULL DEFAULT FALSE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 `users`
Usuários da plataforma (integrado com Supabase Auth).

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY,               -- mesmo ID do Supabase Auth
    email           VARCHAR(255) NOT NULL UNIQUE,
    nome            VARCHAR(255),
    plano_id        UUID NOT NULL REFERENCES planos(id),
    stripe_customer_id VARCHAR(100),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plano ON users(plano_id);
```

### 2.3 `assinaturas`
Histórico de assinaturas e estado atual de billing.

```sql
CREATE TABLE assinaturas (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plano_id                UUID NOT NULL REFERENCES planos(id),
    stripe_subscription_id  VARCHAR(100) UNIQUE,
    status                  VARCHAR(50) NOT NULL DEFAULT 'active',
    -- 'active' | 'past_due' | 'canceled' | 'trialing'
    periodo_inicio          TIMESTAMPTZ NOT NULL,
    periodo_fim             TIMESTAMPTZ NOT NULL,
    cancelado_em            TIMESTAMPTZ,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assinaturas_user ON assinaturas(user_id);
CREATE INDEX idx_assinaturas_stripe ON assinaturas(stripe_subscription_id);
```

### 2.4 `tenants`
Órgãos públicos cadastrados na plataforma.

```sql
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(100) NOT NULL UNIQUE, -- 'cau-pr', 'camara-curitiba'
    nome            VARCHAR(255) NOT NULL,         -- 'CAU/PR'
    nome_completo   VARCHAR(500) NOT NULL,         -- 'Conselho de Arq. e Urbanismo do PR'
    descricao       TEXT,
    logo_url        TEXT,
    site_url        TEXT,
    estado          CHAR(2),                       -- 'PR', 'SP', etc.
    tipo_orgao      VARCHAR(100),                  -- 'conselho_profissional', 'camara', etc.
    status          VARCHAR(50) NOT NULL DEFAULT 'coming_soon',
    -- 'active' | 'coming_soon' | 'processing' | 'inactive'
    scraper_config  JSONB NOT NULL DEFAULT '{}',  -- configuração do scraper
    ultima_analise  TIMESTAMPTZ,
    total_atos      INTEGER DEFAULT 0,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- scraper_config exemplo:
-- {
--   "fontes": [
--     {
--       "tipo": "portarias",
--       "url_base": "https://www.caupr.gov.br/portarias",
--       "paginacao": "wordpress",
--       "seletor_items": ".entry-content li a",
--       "formato_data": "%d/%m/%Y"
--     }
--   ],
--   "rate_limit_segundos": 1.5,
--   "user_agent": "Dig Dig/1.0"
-- }

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
```

### 2.5 `user_tenant_acesso`
Quais tenants um usuário pode acessar (baseado no plano).

```sql
CREATE TABLE user_tenant_acesso (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, tenant_id)
);
```

### 2.6 `knowledge_base`
Regimento interno e documentos de referência de cada órgão.

```sql
CREATE TABLE knowledge_base (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo        VARCHAR(100) NOT NULL,  -- 'regimento', 'lei_organica', 'codigo_conduta'
    titulo      VARCHAR(500) NOT NULL,
    conteudo    TEXT NOT NULL,          -- texto completo do documento
    versao      VARCHAR(50),
    vigente_desde DATE,
    url_original TEXT,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_tenant ON knowledge_base(tenant_id);
```

### 2.7 `tenant_regras`
Regras específicas de detecção para cada órgão.

```sql
CREATE TABLE tenant_regras (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    categoria       VARCHAR(100) NOT NULL,
    -- 'legal', 'moral', 'padrao_suspeito'
    nome            VARCHAR(255) NOT NULL,
    descricao       TEXT NOT NULL,
    palavras_chave  TEXT[],             -- array de palavras/expressões
    peso            INTEGER DEFAULT 1,  -- 1=leve, 2=moderado, 3=grave, 4=crítico
    ativo           BOOLEAN DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_regras_tenant ON tenant_regras(tenant_id);
```

### 2.8 `atos`
Todos os atos administrativos coletados.

```sql
CREATE TABLE atos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    numero              VARCHAR(100) NOT NULL,
    tipo                VARCHAR(100) NOT NULL,
    -- 'portaria' | 'portaria_normativa' | 'deliberacao_plenaria' | 'deliberacao_ad_referendum'
    subtipo             VARCHAR(100),
    titulo              VARCHAR(1000),
    data_publicacao     DATE,
    ementa              TEXT,
    url_original        TEXT,
    url_pdf             TEXT,
    pdf_baixado         BOOLEAN NOT NULL DEFAULT FALSE,
    pdf_path            TEXT,           -- path no Supabase Storage
    pdf_tamanho_bytes   INTEGER,
    pdf_paginas         INTEGER,
    processado          BOOLEAN NOT NULL DEFAULT FALSE,
    erro_download       TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, numero, tipo)
);

CREATE INDEX idx_atos_tenant ON atos(tenant_id);
CREATE INDEX idx_atos_tipo ON atos(tenant_id, tipo);
CREATE INDEX idx_atos_data ON atos(tenant_id, data_publicacao DESC);
CREATE INDEX idx_atos_processado ON atos(processado) WHERE processado = FALSE;
```

### 2.9 `conteudo_ato`
Texto extraído do PDF (separado para não inflar a tabela principal).

```sql
CREATE TABLE conteudo_ato (
    ato_id          UUID PRIMARY KEY REFERENCES atos(id) ON DELETE CASCADE,
    texto_completo  TEXT NOT NULL,
    metodo_extracao VARCHAR(50) NOT NULL DEFAULT 'pdfplumber',
    -- 'pdfplumber' | 'tesseract_ocr' | 'ementa_only'
    qualidade       VARCHAR(20) DEFAULT 'boa',
    -- 'boa' | 'parcial' | 'ruim'
    tokens_estimados INTEGER,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.10 `rodadas_analise`
Controla cada execução completa de análise de um órgão.

```sql
CREATE TABLE rodadas_analise (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    status              VARCHAR(50) NOT NULL DEFAULT 'pendente',
    -- 'pendente' | 'rodando' | 'concluida' | 'erro'
    total_atos          INTEGER DEFAULT 0,
    atos_scrapeados     INTEGER DEFAULT 0,
    atos_analisados_haiku INTEGER DEFAULT 0,
    atos_analisados_sonnet INTEGER DEFAULT 0,
    custo_haiku_usd     DECIMAL(10,6) DEFAULT 0,
    custo_sonnet_usd    DECIMAL(10,6) DEFAULT 0,
    custo_total_usd     DECIMAL(10,6) DEFAULT 0,
    erro_mensagem       TEXT,
    iniciado_em         TIMESTAMPTZ,
    concluido_em        TIMESTAMPTZ,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rodadas_tenant ON rodadas_analise(tenant_id);
```

### 2.11 `analises`
Resultado da análise de IA para cada ato.

```sql
CREATE TABLE analises (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ato_id              UUID NOT NULL REFERENCES atos(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    rodada_id           UUID REFERENCES rodadas_analise(id),
    status              VARCHAR(50) NOT NULL DEFAULT 'pendente',
    -- 'pendente' | 'processando_haiku' | 'processando_sonnet' | 'concluida' | 'erro'
    nivel_alerta        VARCHAR(20),
    -- 'verde' | 'amarelo' | 'laranja' | 'vermelho'
    score_risco         INTEGER DEFAULT 0,  -- 0-100
    analisado_por_haiku BOOLEAN DEFAULT FALSE,
    analisado_por_sonnet BOOLEAN DEFAULT FALSE,
    resultado_haiku     JSONB,
    resultado_sonnet    JSONB,
    resumo_executivo    TEXT,
    recomendacao_campanha TEXT,
    tokens_haiku        INTEGER DEFAULT 0,
    tokens_sonnet       INTEGER DEFAULT 0,
    custo_usd           DECIMAL(10,6) DEFAULT 0,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analises_ato ON analises(ato_id);
CREATE INDEX idx_analises_tenant ON analises(tenant_id);
CREATE INDEX idx_analises_nivel ON analises(tenant_id, nivel_alerta);
CREATE INDEX idx_analises_rodada ON analises(rodada_id);
```

### 2.12 `irregularidades`
Irregularidades individuais detectadas (extraídas do JSONB para consultas rápidas).

```sql
CREATE TABLE irregularidades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analise_id      UUID NOT NULL REFERENCES analises(id) ON DELETE CASCADE,
    ato_id          UUID NOT NULL REFERENCES atos(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    categoria       VARCHAR(50) NOT NULL,
    -- 'legal' | 'moral' | 'etica' | 'processual'
    tipo            VARCHAR(255) NOT NULL,
    descricao       TEXT NOT NULL,
    artigo_violado  VARCHAR(500),
    gravidade       VARCHAR(20) NOT NULL,
    -- 'baixa' | 'media' | 'alta' | 'critica'
    impacto_politico TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_irregularidades_ato ON irregularidades(ato_id);
CREATE INDEX idx_irregularidades_tenant ON irregularidades(tenant_id);
CREATE INDEX idx_irregularidades_categoria ON irregularidades(tenant_id, categoria);
CREATE INDEX idx_irregularidades_gravidade ON irregularidades(tenant_id, gravidade);
```

### 2.13 `pessoas`
Pessoas e entidades detectadas nos atos.

```sql
CREATE TABLE pessoas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome_normalizado    VARCHAR(500) NOT NULL,
    variantes_nome      TEXT[],
    cargo_mais_recente  VARCHAR(500),
    tipo                VARCHAR(50) DEFAULT 'pessoa_fisica',
    -- 'pessoa_fisica' | 'empresa' | 'orgao'
    total_aparicoes     INTEGER DEFAULT 0,
    primeiro_ato_data   DATE,
    ultimo_ato_data     DATE,
    score_concentracao  INTEGER DEFAULT 0,  -- quantas comissões simultâneas
    eh_suspeito         BOOLEAN DEFAULT FALSE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, nome_normalizado)
);

CREATE INDEX idx_pessoas_tenant ON pessoas(tenant_id);
CREATE INDEX idx_pessoas_suspeito ON pessoas(tenant_id, eh_suspeito);
```

### 2.14 `aparicoes_pessoa`
Cada vez que uma pessoa aparece em um ato administrativo.

```sql
CREATE TABLE aparicoes_pessoa (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pessoa_id       UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
    ato_id          UUID NOT NULL REFERENCES atos(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    tipo_aparicao   VARCHAR(100) NOT NULL,
    -- 'nomeado' | 'exonerado' | 'assina' | 'membro_comissao'
    -- 'processado' | 'fiscal_contrato' | 'gestor_contrato'
    cargo           VARCHAR(500),
    data_ato        DATE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aparicoes_pessoa ON aparicoes_pessoa(pessoa_id);
CREATE INDEX idx_aparicoes_ato ON aparicoes_pessoa(ato_id);
CREATE INDEX idx_aparicoes_tipo ON aparicoes_pessoa(tenant_id, tipo_aparicao);
```

### 2.15 `relacoes_pessoas`
Grafo de relacionamentos entre pessoas (co-aparições em atos).

```sql
CREATE TABLE relacoes_pessoas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pessoa_a_id     UUID NOT NULL REFERENCES pessoas(id),
    pessoa_b_id     UUID NOT NULL REFERENCES pessoas(id),
    tipo_relacao    VARCHAR(100),
    -- 'nomeador_nomeado' | 'mesma_comissao' | 'processador_processado'
    atos_em_comum   INTEGER DEFAULT 1,
    peso            DECIMAL(5,2) DEFAULT 1.0,   -- força da relação
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, pessoa_a_id, pessoa_b_id)
);

CREATE INDEX idx_relacoes_tenant ON relacoes_pessoas(tenant_id);
CREATE INDEX idx_relacoes_pessoa_a ON relacoes_pessoas(pessoa_a_id);
CREATE INDEX idx_relacoes_pessoa_b ON relacoes_pessoas(pessoa_b_id);
```

### 2.16 `padroes_detectados`
Padrões globais identificados pelo Sonnet durante a síntese.

```sql
CREATE TABLE padroes_detectados (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rodada_id       UUID REFERENCES rodadas_analise(id),
    tipo_padrao     VARCHAR(100) NOT NULL,
    -- 'concentracao_poder' | 'perseguicao_politica' | 'nepotismo'
    -- 'cabide_empregos' | 'gastos_suspeitos' | 'aparelhamento'
    titulo          VARCHAR(500) NOT NULL,
    descricao       TEXT NOT NULL,
    narrativa       TEXT,                    -- texto narrativo do Sonnet
    gravidade       VARCHAR(20) NOT NULL,
    atos_envolvidos UUID[],                  -- array de ato_ids
    pessoas_envolvidas UUID[],               -- array de pessoa_ids
    periodo_inicio  DATE,
    periodo_fim     DATE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_padroes_tenant ON padroes_detectados(tenant_id);
CREATE INDEX idx_padroes_tipo ON padroes_detectados(tenant_id, tipo_padrao);
```

### 2.17 `chat_sessoes`
Sessões de conversa do usuário com a IA conversacional.

```sql
CREATE TABLE chat_sessoes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    titulo          VARCHAR(500),       -- gerado da 1ª pergunta automaticamente
    ativa           BOOLEAN DEFAULT TRUE,
    total_mensagens INTEGER DEFAULT 0,
    custo_total_usd DECIMAL(10,6) DEFAULT 0,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultima_msg_em   TIMESTAMPTZ
);

CREATE INDEX idx_chat_sessoes_user ON chat_sessoes(user_id, ultima_msg_em DESC);
CREATE INDEX idx_chat_sessoes_tenant ON chat_sessoes(tenant_id);
```

### 2.18 `chat_mensagens`
Mensagens individuais trocadas no chat.

```sql
CREATE TABLE chat_mensagens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id       UUID NOT NULL REFERENCES chat_sessoes(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,   -- 'user' | 'assistant'
    conteudo        TEXT NOT NULL,
    tipo_pergunta   VARCHAR(50),
    -- 'factual' | 'analise' | 'sintese' | 'investigacao'
    contexto_usado  JSONB,              -- quais registros do banco foram incluídos
    tokens_input    INTEGER DEFAULT 0,
    tokens_output   INTEGER DEFAULT 0,
    custo_usd       DECIMAL(10,6) DEFAULT 0,
    tempo_resposta_ms INTEGER,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_msgs_sessao ON chat_mensagens(sessao_id, criado_em ASC);
```

### 2.19 `chat_feedback`
Feedback do usuário sobre qualidade das respostas.

```sql
CREATE TABLE chat_feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mensagem_id     UUID NOT NULL REFERENCES chat_mensagens(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    util            BOOLEAN,            -- true = 👍, false = 👎
    comentario      TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.20 `relatorios`
Relatórios gerados (dashboard e fichas de denúncia).

```sql
CREATE TABLE relatorios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rodada_id       UUID REFERENCES rodadas_analise(id),
    tipo            VARCHAR(50) NOT NULL,
    -- 'dashboard_html' | 'ficha_denuncia' | 'executivo_pdf' | 'dados_json'
    titulo          VARCHAR(500),
    arquivo_path    TEXT,                   -- path no Supabase Storage
    tamanho_bytes   INTEGER,
    publico         BOOLEAN DEFAULT FALSE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_relatorios_tenant ON relatorios(tenant_id);
```

### 2.21 `campanhas_patrocinio`
Campanhas de crowdfunding para financiar a análise de novas instituições públicas.

```sql
CREATE TABLE campanhas_patrocinio (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_orgao      TEXT NOT NULL,
  descricao       TEXT,
  uf              CHAR(2),
  tipo_orgao      TEXT, -- conselho_profissional, camara_municipal, autarquia, etc.
  status          TEXT NOT NULL DEFAULT 'ativa'
                    CHECK (status IN ('ativa', 'concluida', 'cancelada', 'em_analise')),
  meta_valor      NUMERIC(10,2) NOT NULL DEFAULT 3000.00,
  valor_arrecadado NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_doadores  INTEGER NOT NULL DEFAULT 0,
  total_votos     INTEGER NOT NULL DEFAULT 0,
  proposta_por    UUID REFERENCES users(id) ON DELETE SET NULL,
  tenant_id_gerado UUID REFERENCES tenants(id) ON DELETE SET NULL, -- preenchido ao concluir
  prazo_expiracao TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campanhas_status ON campanhas_patrocinio(status);
```

### 2.22 `doacoes_patrocinio`
Doações individuais feitas a uma campanha de patrocínio.

```sql
CREATE TABLE doacoes_patrocinio (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id             UUID NOT NULL REFERENCES campanhas_patrocinio(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  valor                   NUMERIC(10,2) NOT NULL CHECK (valor >= 25.00),
  stripe_payment_intent   TEXT UNIQUE,
  status                  TEXT NOT NULL DEFAULT 'pendente'
                            CHECK (status IN ('pendente', 'confirmada', 'estornada', 'falhou')),
  mensagem_publica        TEXT,
  nome_exibicao           TEXT, -- NULL = "Anônimo"
  votos_concedidos        INTEGER NOT NULL DEFAULT 0, -- votos extras por doação
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doacoes_campanha ON doacoes_patrocinio(campanha_id);
CREATE INDEX idx_doacoes_user ON doacoes_patrocinio(user_id);
```

### 2.23 `votos_patrocinio`
Votos gratuitos mensais que usuários autenticados podem dar a campanhas.

```sql
CREATE TABLE votos_patrocinio (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campanha_id     UUID NOT NULL REFERENCES campanhas_patrocinio(id) ON DELETE CASCADE,
  mes_referencia  CHAR(7) NOT NULL, -- formato: '2026-04' — controle do limite mensal
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, campanha_id, mes_referencia) -- 1 voto por usuário por campanha por mês (gratuito)
);

CREATE INDEX idx_votos_user_mes ON votos_patrocinio(user_id, mes_referencia);
```

---

## 3. Row Level Security (RLS)

Todas as tabelas com `tenant_id` têm RLS ativo para garantir isolamento entre órgãos.

```sql
-- Habilitar RLS
ALTER TABLE atos ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE irregularidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE padroes_detectados ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;

-- Política: usuário só vê tenants aos quais tem acesso
CREATE POLICY "tenant_isolation" ON atos
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_acesso
            WHERE user_id = auth.uid()
        )
    );

-- Mesma política replicada para todas as tabelas sensíveis
-- Admin bypassa com service_role key
```

### RLS — Patrocínio

```sql
-- campanhas_patrocinio: leitura pública, insert por autenticados, update/delete só admin
ALTER TABLE campanhas_patrocinio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campanhas_leitura_publica" ON campanhas_patrocinio
    FOR SELECT USING (true);

CREATE POLICY "campanhas_insert_autenticado" ON campanhas_patrocinio
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "campanhas_update_admin" ON campanhas_patrocinio
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "campanhas_delete_admin" ON campanhas_patrocinio
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- doacoes_patrocinio: insert pelo próprio usuário, leitura pública de campos públicos,
-- leitura completa apenas do próprio usuário ou admin
ALTER TABLE doacoes_patrocinio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doacoes_insert_proprio" ON doacoes_patrocinio
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "doacoes_leitura_publica" ON doacoes_patrocinio
    FOR SELECT USING (true);
-- Campos sensíveis (stripe_payment_intent, status completo) filtrados na camada de API;
-- leitura completa do próprio usuário ou admin é enforced no backend.

-- votos_patrocinio: insert pelo próprio usuário, leitura pública
ALTER TABLE votos_patrocinio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votos_insert_proprio" ON votos_patrocinio
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "votos_leitura_publica" ON votos_patrocinio
    FOR SELECT USING (true);
```

---

## 4. Indexes e Performance

```sql
-- Full-text search em ementas e texto completo
CREATE INDEX idx_atos_fts ON atos
    USING GIN(to_tsvector('portuguese', coalesce(ementa, '') || ' ' || coalesce(titulo, '')));

CREATE INDEX idx_conteudo_fts ON conteudo_ato
    USING GIN(to_tsvector('portuguese', texto_completo));

-- Busca por pessoa
CREATE INDEX idx_pessoas_nome ON pessoas
    USING GIN(variantes_nome);
```

---

## 5. Dados Iniciais (Seed)

```sql
-- Planos
INSERT INTO planos (nome, nome_display, preco_mensal, limite_orgaos, tem_api, tem_alertas, tem_export_csv) VALUES
('free',       'Gratuito',   0,      1,  FALSE, FALSE, FALSE),
('pro',        'Pro',        297,   -1,  FALSE, TRUE,  TRUE),
('enterprise', 'Enterprise', 997,   -1,  TRUE,  TRUE,  TRUE);

-- Tenant CAU-PR
INSERT INTO tenants (slug, nome, nome_completo, estado, tipo_orgao, status, scraper_config) VALUES
('cau-pr', 'CAU/PR', 'Conselho de Arquitetura e Urbanismo do Paraná', 'PR', 
 'conselho_profissional', 'active',
 '{"fontes": [{"tipo": "portarias", "url_base": "https://www.caupr.gov.br/portarias"}]}');
```
