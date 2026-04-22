# Logs, Auditoria e Analytics

**Objetivo:** Registrar tudo que acontece no sistema — erros, ações do usuário, movimentos no produto — para suporte, debugging e decisões de produto.

---

## 1. Três Camadas de Observabilidade

```
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 1 — LOGS DE APLICAÇÃO (Structlog + Sentry)         │
│  O que o sistema fez: erros, warnings, operações internas   │
├─────────────────────────────────────────────────────────────┤
│  CAMADA 2 — AUDITORIA DE USUÁRIO (PostgreSQL)               │
│  O que o usuário fez: cada ação significativa registrada    │
├─────────────────────────────────────────────────────────────┤
│  CAMADA 3 — ANALYTICS DE PRODUTO (PostHog)                  │
│  Como o usuário usa o produto: funis, retenção, features    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Camada 1 — Logs de Aplicação (Backend)

### 2.1 Configuração Structlog

```python
# backend/app/logging_config.py
import structlog
import logging
import sys

def configurar_logs(environment: str):
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_logger_name,
    ]

    if environment == "production":
        # JSON em produção — fácil de indexar no Railway/Datadog
        processors = shared_processors + [
            structlog.processors.JSONRenderer()
        ]
    else:
        # Colorido no terminal em desenvolvimento
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True)
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(sys.stdout),
        cache_logger_on_first_use=True,
    )

logger = structlog.get_logger()
```

### 2.2 Middleware de Log por Request

```python
# backend/app/middleware/logging_middleware.py
import time
import uuid
import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())[:8]
        inicio = time.time()

        # Injetar request_id no contexto de todos os logs desta request
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            ip=request.client.host if request.client else "unknown",
        )

        # Extrair user_id do token se presente
        try:
            token = request.headers.get("authorization", "").replace("Bearer ", "")
            if token:
                user = supabase.auth.get_user(token)
                structlog.contextvars.bind_contextvars(user_id=str(user.user.id))
        except Exception:
            pass

        response = await call_next(request)
        duracao_ms = round((time.time() - inicio) * 1000)

        nivel = "warning" if response.status_code >= 400 else "info"
        getattr(logger, nivel)(
            "request_concluida",
            status_code=response.status_code,
            duracao_ms=duracao_ms,
        )

        structlog.contextvars.clear_contextvars()
        response.headers["X-Request-ID"] = request_id
        return response
```

### 2.3 O que Logar (e o que NÃO logar)

**LOGAR sempre:**
```python
# Início/fim de operações longas
logger.info("scraping_iniciado", tenant_id=tenant_id, total_urls=len(urls))
logger.info("scraping_concluido", tenant_id=tenant_id, sucesso=ok, falhas=fail, duracao_s=dur)

# Erros com contexto completo
logger.error("erro_download_pdf", ato_id=ato_id, url=url, status_code=404, tentativa=2)

# Análises de IA (custo e resultado)
logger.info("haiku_concluido", ato_id=ato_id, nivel_alerta="vermelho",
            tokens_input=450, tokens_output=180, custo_usd=0.0009)

# Ações críticas do sistema
logger.warning("custo_rodada_alto", rodada_id=rodada_id, custo_usd=22.5, limite=20.0)
logger.warning("rate_limit_atingido", ip=ip, endpoint="/auth/login")
logger.error("pagamento_falhou", user_id=user_id, stripe_error="card_declined")
```

**NUNCA logar:**
```python
# Senhas, tokens, chaves de API
logger.info("login", senha=senha)        # ERRADO
logger.info("api_call", key=api_key)     # ERRADO

# Dados pessoais sensíveis
logger.info("usuario", cpf=cpf)          # ERRADO

# Conteúdo completo de PDFs (muito grande, sem valor)
logger.info("pdf", texto=texto_completo) # ERRADO
```

---

## 3. Camada 2 — Auditoria de Usuário (Banco de Dados)

Toda ação significativa do usuário é gravada em PostgreSQL para suporte, segurança e análise.

### 3.1 Tabelas de Auditoria

```sql
-- Sessões de usuário
CREATE TABLE logs_sessao (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip              VARCHAR(45),
    user_agent      TEXT,
    evento          VARCHAR(50) NOT NULL,
    -- 'login' | 'logout' | 'token_renovado' | 'login_falhou'
    detalhes        JSONB DEFAULT '{}',
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessao_user ON logs_sessao(user_id, criado_em DESC);
CREATE INDEX idx_sessao_evento ON logs_sessao(evento, criado_em DESC);


-- Atividade do usuário no produto
CREATE TABLE logs_atividade (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
    sessao_id       UUID REFERENCES logs_sessao(id) ON DELETE SET NULL,
    acao            VARCHAR(100) NOT NULL,
    -- Ver lista completa de ações na seção 3.2
    recurso_tipo    VARCHAR(100),   -- 'ato', 'pessoa', 'relatorio', 'orgao'
    recurso_id      UUID,           -- ID do recurso acessado
    recurso_detalhe VARCHAR(500),   -- ex: "Portaria 678" ou "João da Silva"
    detalhes        JSONB DEFAULT '{}',  -- contexto adicional (filtros usados, etc.)
    ip              VARCHAR(45),
    duracao_ms      INTEGER,        -- quanto tempo levou (para ações longas)
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_atividade_user ON logs_atividade(user_id, criado_em DESC);
CREATE INDEX idx_atividade_acao ON logs_atividade(acao, criado_em DESC);
CREATE INDEX idx_atividade_tenant ON logs_atividade(tenant_id, criado_em DESC);
CREATE INDEX idx_atividade_recurso ON logs_atividade(recurso_tipo, recurso_id);


-- Erros encontrados pelo usuário (o que ele viu quebrado)
CREATE TABLE logs_erros_usuario (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    tipo_erro       VARCHAR(100) NOT NULL,
    -- 'acesso_negado' | 'recurso_nao_encontrado' | 'erro_exportacao' | 'timeout'
    endpoint        VARCHAR(500),
    status_code     INTEGER,
    mensagem        TEXT,
    stack_trace     TEXT,          -- apenas em erros 500
    contexto        JSONB DEFAULT '{}',
    sentry_id       VARCHAR(100),  -- ID do evento no Sentry para correlação
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_erros_user ON logs_erros_usuario(user_id, criado_em DESC);
CREATE INDEX idx_erros_tipo ON logs_erros_usuario(tipo_erro, criado_em DESC);


-- Tentativas de acesso negado (segurança)
CREATE TABLE logs_acesso_negado (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    recurso_tentado VARCHAR(500) NOT NULL,
    motivo          VARCHAR(100) NOT NULL,
    -- 'plano_insuficiente' | 'tenant_sem_acesso' | 'role_insuficiente'
    plano_atual     VARCHAR(50),
    ip              VARCHAR(45),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_acesso_negado_user ON logs_acesso_negado(user_id, criado_em DESC);
```

### 3.2 Catálogo Completo de Ações

```python
# backend/app/logging_config.py
class Acao:
    # Navegação
    DASHBOARD_ACESSADO          = "dashboard_acessado"
    ORGAO_ACESSADO              = "orgao_acessado"
    ATO_VISUALIZADO             = "ato_visualizado"
    PESSOA_VISUALIZADA          = "pessoa_visualizada"
    GRAFO_ACESSADO              = "grafo_acessado"
    PADROES_ACESSADOS           = "padroes_acessados"
    RELATORIOS_ACESSADOS        = "relatorios_acessados"

    # Busca e Filtros
    BUSCA_REALIZADA             = "busca_realizada"
    FILTRO_APLICADO             = "filtro_aplicado"
    PAGINACAO_NAVEGADA          = "paginacao_navegada"

    # Exportação
    FICHA_DENUNCIA_GERADA       = "ficha_denuncia_gerada"
    FICHA_DENUNCIA_COPIADA      = "ficha_denuncia_copiada"
    FICHA_DENUNCIA_BAIXADA      = "ficha_denuncia_baixada"
    RELATORIO_SOLICITADO        = "relatorio_solicitado"
    RELATORIO_BAIXADO           = "relatorio_baixado"
    PDF_ORIGINAL_ACESSADO       = "pdf_original_acessado"

    # Conta
    CONTA_CRIADA                = "conta_criada"
    LOGIN_REALIZADO             = "login_realizado"
    LOGOUT_REALIZADO            = "logout_realizado"
    SENHA_ALTERADA              = "senha_alterada"
    CONTA_DELETADA              = "conta_deletada"

    # Billing
    PAGINA_PLANOS_ACESSADA      = "pagina_planos_acessada"
    UPGRADE_INICIADO            = "upgrade_iniciado"     # clicou em "Assinar Pro"
    CHECKOUT_CONCLUIDO          = "checkout_concluido"
    ASSINATURA_CANCELADA        = "assinatura_cancelada"
    PAYWALL_ATINGIDO            = "paywall_atingido"     # tentou acessar e não pôde

    # Admin
    RODADA_DISPARADA            = "rodada_disparada"
    ORGAO_ADICIONADO            = "orgao_adicionado"
    ORGAO_PUBLICADO             = "orgao_publicado"
```

### 3.3 Service de Log de Atividade

```python
# backend/app/services/audit_log.py
from app.models import LogAtividade, LogAcessoNegado, LogErroUsuario

class AuditLog:

    @staticmethod
    def registrar(
        acao: str,
        user_id: str = None,
        tenant_id: str = None,
        recurso_tipo: str = None,
        recurso_id: str = None,
        recurso_detalhe: str = None,
        detalhes: dict = None,
        ip: str = None,
        duracao_ms: int = None,
        db: Session = None
    ):
        log = LogAtividade(
            user_id=user_id,
            tenant_id=tenant_id,
            acao=acao,
            recurso_tipo=recurso_tipo,
            recurso_id=recurso_id,
            recurso_detalhe=recurso_detalhe,
            detalhes=detalhes or {},
            ip=ip,
            duracao_ms=duracao_ms,
        )
        db.add(log)
        db.commit()

    @staticmethod
    def acesso_negado(user_id: str, recurso: str, motivo: str, plano: str, ip: str, db):
        db.add(LogAcessoNegado(
            user_id=user_id,
            recurso_tentado=recurso,
            motivo=motivo,
            plano_atual=plano,
            ip=ip
        ))
        db.commit()

    @staticmethod
    def erro_usuario(user_id: str, tipo: str, endpoint: str,
                     status_code: int, mensagem: str, sentry_id: str = None, db = None):
        db.add(LogErroUsuario(
            user_id=user_id,
            tipo_erro=tipo,
            endpoint=endpoint,
            status_code=status_code,
            mensagem=mensagem,
            sentry_id=sentry_id
        ))
        db.commit()
```

### 3.4 Uso nos Endpoints

```python
# backend/app/routers/atos.py

@router.get("/orgaos/{slug}/atos/{ato_id}")
async def ver_ato(
    slug: str,
    ato_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ato = db.query(Ato).filter_by(id=ato_id, tenant_id=tenant.id).first()
    if not ato:
        raise HTTPException(404)

    # Registrar visualização
    AuditLog.registrar(
        acao=Acao.ATO_VISUALIZADO,
        user_id=str(user.id),
        tenant_id=str(tenant.id),
        recurso_tipo="ato",
        recurso_id=ato_id,
        recurso_detalhe=f"{ato.tipo.title()} {ato.numero}",
        detalhes={"nivel_alerta": ato.analise.nivel_alerta if ato.analise else None},
        ip=request.client.host,
        db=db
    )

    return ato


@router.get("/orgaos/{slug}/atos")
async def listar_atos(
    slug: str,
    filtros: FiltroAtos = Depends(),
    request: Request = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Logar busca com os filtros usados
    if filtros.busca or filtros.nivel or filtros.tipo:
        AuditLog.registrar(
            acao=Acao.BUSCA_REALIZADA if filtros.busca else Acao.FILTRO_APLICADO,
            user_id=str(user.id),
            tenant_id=str(tenant.id),
            detalhes={
                "busca": filtros.busca,
                "nivel": filtros.nivel,
                "tipo": filtros.tipo,
                "periodo": {"de": str(filtros.de), "ate": str(filtros.ate)},
            },
            ip=request.client.host,
            db=db
        )

    return paginar_atos(filtros, tenant.id, db)


# Logar paywall quando usuário Free tenta acessar órgão premium
def verificar_acesso(user, tenant, request, db):
    if not tem_acesso(user, tenant):
        AuditLog.acesso_negado(
            user_id=str(user.id),
            recurso=f"/orgaos/{tenant.slug}",
            motivo="plano_insuficiente",
            plano=user.plano.nome,
            ip=request.client.host,
            db=db
        )
        raise HTTPException(403, detail={"code": "PLANO_INSUFICIENTE"})
```

---

## 4. Camada 3 — Analytics de Produto (PostHog)

PostHog é open-source, tem SDK para Next.js e Python, e permite ver funis, retenção e feature flags.

### 4.1 Configuração Frontend

```typescript
// frontend/lib/analytics.ts
import posthog from "posthog-js";

export function initAnalytics() {
  if (typeof window === "undefined") return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "https://app.posthog.com",
    autocapture: false,    // controle manual — não capturar tudo automaticamente
    capture_pageview: true,
    persistence: "localStorage",
    opt_out_capturing_by_default: false,
  });
}

export function identificarUsuario(userId: string, props: {
  email: string;
  plano: string;
  criado_em: string;
}) {
  posthog.identify(userId, {
    email: props.email,
    plano: props.plano,
    $created_at: props.criado_em,
  });
}

export function track(evento: string, propriedades?: Record<string, unknown>) {
  posthog.capture(evento, propriedades);
}

export function resetarUsuario() {
  posthog.reset();  // ao fazer logout
}
```

### 4.2 Eventos de Analytics por Página

```typescript
// frontend/app/(app)/[orgao]/atos/[id]/page.tsx

"use client";
import { track } from "@/lib/analytics";
import { useEffect } from "react";

export default function DetalheAtoPage({ params, ato }) {
  useEffect(() => {
    track("ato_visualizado", {
      orgao: params.orgao,
      ato_numero: ato.numero,
      ato_tipo: ato.tipo,
      nivel_alerta: ato.nivel_alerta,
      score_risco: ato.score_risco,
    });
  }, []);

  function handleFichaDenuncia() {
    track("ficha_denuncia_aberta", {
      orgao: params.orgao,
      ato_numero: ato.numero,
      nivel_alerta: ato.nivel_alerta,
    });
  }

  function handleCopiarFicha() {
    track("ficha_denuncia_copiada", {
      orgao: params.orgao,
      ato_numero: ato.numero,
    });
  }

  // ...
}
```

### 4.3 Catálogo de Eventos PostHog

```typescript
// Eventos de produto para análise de funil e retenção
const EVENTOS = {
  // Aquisição
  "pagina_landing_vista":     { orgao?: string },
  "pagina_planos_vista":      {},
  "cadastro_iniciado":        {},
  "cadastro_concluido":       { plano: string },

  // Ativação (primeira vez que viu valor)
  "primeiro_orgao_acessado":  { orgao: string, plano: string },
  "primeiro_ato_critico_visto": { orgao: string, nivel: string },
  "primeira_ficha_gerada":    { orgao: string },

  // Engajamento
  "busca_realizada":          { orgao: string, termo: string, resultados: number },
  "filtro_nivel_aplicado":    { orgao: string, nivel: string },
  "grafo_explorado":          { orgao: string, nos_visiveis: number },
  "padrao_visualizado":       { orgao: string, tipo_padrao: string },

  // Retenção / Valor
  "ficha_copiada":            { orgao: string, ato: string },
  "ficha_baixada":            { orgao: string, ato: string },
  "relatorio_solicitado":     { orgao: string, tipo: string },

  // Monetização
  "paywall_atingido":         { orgao: string, plano_atual: string },
  "upgrade_clicado":          { plano_atual: string, plano_destino: string },
  "checkout_concluido":       { plano: string, valor: number },
  "assinatura_cancelada":     { plano: string, meses_ativo: number },
};
```

---

## 5. Painel de Suporte (Admin)

Para quando um usuário reportar um problema, o admin consegue investigar rapidamente.

### 5.1 API de Suporte

```python
# backend/app/routers/admin.py

@router.get("/admin/usuarios/{user_id}/atividade")
async def atividade_usuario(user_id: str, ultimas_horas: int = 24, db = Depends()):
    """Ver o que um usuário fez nas últimas N horas."""
    desde = datetime.now() - timedelta(hours=ultimas_horas)

    atividade = db.query(LogAtividade)\
        .filter(LogAtividade.user_id == user_id)\
        .filter(LogAtividade.criado_em >= desde)\
        .order_by(LogAtividade.criado_em.desc())\
        .all()

    erros = db.query(LogErroUsuario)\
        .filter(LogErroUsuario.user_id == user_id)\
        .filter(LogErroUsuario.criado_em >= desde)\
        .all()

    paywalls = db.query(LogAcessoNegado)\
        .filter(LogAcessoNegado.user_id == user_id)\
        .filter(LogAcessoNegado.criado_em >= desde)\
        .all()

    return {
        "user_id": user_id,
        "periodo": f"últimas {ultimas_horas}h",
        "total_acoes": len(atividade),
        "total_erros": len(erros),
        "paywalls_atingidos": len(paywalls),
        "linha_do_tempo": [
            {
                "momento": log.criado_em.isoformat(),
                "acao": log.acao,
                "recurso": log.recurso_detalhe,
                "detalhes": log.detalhes
            }
            for log in atividade
        ],
        "erros_encontrados": [
            {
                "momento": e.criado_em.isoformat(),
                "tipo": e.tipo_erro,
                "endpoint": e.endpoint,
                "status_code": e.status_code,
                "mensagem": e.mensagem,
                "sentry_id": e.sentry_id
            }
            for e in erros
        ]
    }


@router.get("/admin/dashboard-suporte")
async def dashboard_suporte(db = Depends()):
    """Visão geral do sistema para suporte."""
    agora = datetime.now()
    ultima_hora = agora - timedelta(hours=1)
    hoje = agora.replace(hour=0, minute=0, second=0)

    return {
        "erros_ultima_hora": db.query(LogErroUsuario)\
            .filter(LogErroUsuario.criado_em >= ultima_hora).count(),

        "usuarios_ativos_hoje": db.query(LogAtividade.user_id)\
            .filter(LogAtividade.criado_em >= hoje)\
            .distinct().count(),

        "paywalls_hoje": db.query(LogAcessoNegado)\
            .filter(LogAcessoNegado.criado_em >= hoje).count(),

        "buscas_mais_comuns": db.query(
                func.jsonb_extract_path_text(LogAtividade.detalhes, 'busca').label('termo'),
                func.count().label('total')
            )\
            .filter(LogAtividade.acao == Acao.BUSCA_REALIZADA)\
            .filter(LogAtividade.criado_em >= hoje)\
            .group_by('termo')\
            .order_by(desc('total'))\
            .limit(10).all(),

        "acoes_mais_comuns_hoje": db.query(
                LogAtividade.acao,
                func.count().label('total')
            )\
            .filter(LogAtividade.criado_em >= hoje)\
            .group_by(LogAtividade.acao)\
            .order_by(desc('total'))\
            .all(),
    }
```

### 5.2 Exemplo de Investigação de Problema

Cenário: usuário reclama que "tentou baixar um relatório e não funcionou".

```bash
# Admin consulta a atividade das últimas 2h
GET /admin/usuarios/uuid-do-usuario/atividade?ultimas_horas=2

# Resposta revela:
{
  "linha_do_tempo": [
    {"momento": "14:32", "acao": "relatorio_solicitado", "detalhes": {"tipo": "fichas_denuncia"}},
    {"momento": "14:32", "acao": "dashboard_acessado"},
    {"momento": "14:35", "acao": "relatorio_baixado"}  # ← funcionou depois
  ],
  "erros_encontrados": [
    {"momento": "14:32", "tipo": "timeout", "endpoint": "/relatorios/gerar", 
     "mensagem": "Worker timeout após 30s", "sentry_id": "abc123"}
  ]
}
# Conclusão: timeout no worker Celery, o relatório foi gerado depois e ele baixou
# Investigar: sentry_id "abc123" para ver o stack trace completo
```

---

## 6. Retenção e Limpeza de Logs

Logs ficam grandes. Política de retenção:

| Tabela | Retenção | Motivo |
|--------|----------|--------|
| `logs_atividade` | 6 meses | Análise de produto e suporte |
| `logs_sessao` | 3 meses | Segurança |
| `logs_erros_usuario` | 12 meses | Debugging e auditoria |
| `logs_acesso_negado` | 6 meses | Segurança |
| Logs de aplicação (Railway) | 30 dias | Railway limita por padrão |

### Job de limpeza automática (Celery Beat)

```python
# backend/app/workers/tasks_manutencao.py
from celery import shared_task
from datetime import datetime, timedelta

@shared_task
def limpar_logs_antigos():
    db = get_db_session()
    cutoffs = {
        LogAtividade:      timedelta(days=180),
        LogSessao:         timedelta(days=90),
        LogErroUsuario:    timedelta(days=365),
        LogAcessoNegado:   timedelta(days=180),
    }
    for Model, retention in cutoffs.items():
        db.query(Model)\
          .filter(Model.criado_em < datetime.now() - retention)\
          .delete()
    db.commit()

# Agendar via Celery Beat: todo domingo às 2h da manhã
CELERY_BEAT_SCHEDULE = {
    "limpar-logs-antigos": {
        "task": "app.workers.tasks_manutencao.limpar_logs_antigos",
        "schedule": crontab(day_of_week=0, hour=2, minute=0),
    },
    "descobrir-novos-atos": {
        "task": "app.workers.tasks_scraper.descobrir_novos_atos_todos_tenants",
        "schedule": crontab(day_of_week=1, hour=3, minute=0),  # segunda às 3h
    },
}
```

---

## 7. Privacidade nos Logs (LGPD)

- IPs são armazenados em hash após 30 dias: `SHA256(ip + salt)` — mantém unicidade sem revelar IP
- Emails nunca aparecem nos logs de atividade — apenas `user_id`
- Ao deletar conta: `logs_atividade.user_id = NULL` (preserva padrões agregados, remove vínculo pessoal)
- Logs de sessão com IP são deletados após 90 dias

```python
def anonimizar_usuario_nos_logs(user_id: str, db: Session):
    db.query(LogAtividade)\
        .filter(LogAtividade.user_id == user_id)\
        .update({"user_id": None})
    db.query(LogSessao)\
        .filter(LogSessao.user_id == user_id)\
        .delete()
    db.query(LogAcessoNegado)\
        .filter(LogAcessoNegado.user_id == user_id)\
        .update({"user_id": None})
    db.commit()
```

---

## 8. Adições ao Schema (Tabelas Novas)

Adicionar ao documento `02-banco-de-dados.md`:

- `logs_sessao` — eventos de autenticação
- `logs_atividade` — ações do usuário no produto
- `logs_erros_usuario` — erros que o usuário encontrou
- `logs_acesso_negado` — tentativas de acesso sem permissão

Todos com `CREATE INDEX` nos campos mais consultados (`user_id`, `criado_em`, `acao`).
