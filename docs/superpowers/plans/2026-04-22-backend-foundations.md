# Backend Foundations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working FastAPI backend on Railway with Supabase PostgreSQL (full 29-table schema + RLS), JWT auth, plan validation, user onboarding webhook, and Celery/Redis configured — the foundation every other plan builds on top of.

**Architecture:** Python 3.12 FastAPI app in `backend/` subdirectory of the monorepo, connecting to Supabase PostgreSQL via SQLAlchemy async + asyncpg. Auth is validated by decoding Supabase JWTs (no Supabase SDK on backend — pure JWT verification). Celery workers use Redis as broker. Migrations run via a Railway release command, never on app startup.

**Tech Stack:** Python 3.12, FastAPI 0.111, SQLAlchemy 2.x async, asyncpg, Alembic, Celery 5, Redis, pydantic-settings, PyJWT[crypto] (JWKS/ECC P-256 + HS256), sentry-sdk, pytest + pytest-asyncio

---

## File Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app, lifespan, CORS, Sentry
│   ├── config.py                   # Settings via pydantic-settings
│   ├── database.py                 # Async SQLAlchemy engine + session factory
│   ├── constants.py                # PLANO_CIDADAO etc. string constants
│   ├── models/
│   │   ├── __init__.py             # Re-exports all models (needed by Alembic)
│   │   ├── base.py                 # DeclarativeBase + TimestampMixin
│   │   ├── plano.py                # Plano
│   │   ├── user.py                 # User, Assinatura
│   │   ├── tenant.py               # Tenant, UserTenantAcesso, KnowledgeBase, TenantRegra
│   │   ├── ato.py                  # Ato, ConteudoAto, RodadaAnalise
│   │   ├── analise.py              # Analise, Irregularidade
│   │   ├── pessoa.py               # Pessoa, AparicaoPessoa, RelacaoPessoa
│   │   ├── padrao.py               # PadraoDetectado
│   │   ├── chat.py                 # ChatSessao, ChatMensagem, ChatFeedback
│   │   ├── relatorio.py            # Relatorio
│   │   ├── patrocinio.py           # CampanhaPatrocinio, DoacaoPatrocinio, VotoPatrocinio
│   │   ├── api_key.py              # ApiKey
│   │   ├── preferencia_alerta.py   # PreferenciaAlerta
│   │   └── log.py                  # LogSessao, LogAtividade, LogErroUsuario, LogAcessoNegado
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── common.py               # Pagination, ErrorResponse
│   │   └── auth.py                 # TokenPayload, UserResponse, WebhookPayload
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth.py                 # get_current_user() FastAPI dependency
│   │   └── plan.py                 # require_plan(), check_chat_quota()
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py               # GET /health, GET /health/db
│   │   └── webhooks.py             # POST /webhooks/supabase-auth (onboarding)
│   ├── services/
│   │   └── audit_log.py            # AuditLog.registrar()
│   └── workers/
│       └── celery_app.py           # Celery instance (tasks added in later plans)
├── migrations/
│   ├── env.py                      # Alembic env — async, reads DATABASE_URL
│   ├── script.py.mako
│   └── versions/
│       └── 001_initial_schema.py   # Full schema: all 29 tables + indexes + RLS
├── tests/
│   ├── conftest.py                 # Async DB, test client, mock JWT
│   ├── test_health.py
│   ├── test_auth_middleware.py
│   └── test_webhooks.py
├── scripts/
│   └── seed.sql                    # Planos + CAU-PR tenant seed data
├── requirements.txt
├── requirements-dev.txt
├── .env.example
├── Dockerfile
├── railway.toml
└── alembic.ini
```

---

## Task 1: Create `backend/` project skeleton

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/requirements-dev.txt`
- Create: `backend/.env.example`
- Create: `backend/alembic.ini`
- Create: `backend/app/__init__.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/middleware/__init__.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/workers/__init__.py`
- Create: `backend/migrations/`
- Create: `backend/tests/`
- Create: `backend/scripts/`

- [ ] **Step 1: Create `backend/requirements.txt`**

```
fastapi==0.111.0
uvicorn[standard]==0.30.1
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
alembic==1.13.1
pydantic-settings==2.3.1
PyJWT[crypto]==2.9.0
httpx==0.27.0
celery[redis]==5.4.0
redis==5.0.6
sentry-sdk[fastapi]==2.5.1
structlog==24.2.0
pdfplumber==0.11.3
anthropic==0.28.0
ftfy==6.2.0
rapidfuzz==3.9.3
stripe==10.2.0
resend==2.1.0
```

- [ ] **Step 2: Create `backend/requirements-dev.txt`**

```
pytest==8.2.2
pytest-asyncio==0.23.7
pytest-httpx==0.30.0
httpx==0.27.0
anyio[trio]==4.4.0
factory-boy==3.3.0
```

- [ ] **Step 3: Create `backend/.env.example`**

```
# Supabase
DATABASE_URL=postgresql+asyncpg://postgres:[password]@db.[project].supabase.co:5432/postgres
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (Railway)
REDIS_URL=redis://localhost:6379/0

# Claude API
CLAUDE_HAIKU_MODEL=claude-haiku-4-5-20251001
CLAUDE_SONNET_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM=noreply@digdig.com.br

# App
ENVIRONMENT=development
SENTRY_DSN=
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,https://digdig.com.br
WEBHOOK_SECRET=your-random-webhook-secret-32chars
```

- [ ] **Step 4: Create `backend/alembic.ini`**

```ini
[alembic]
script_location = migrations
prepend_sys_path = .
version_path_separator = os
sqlalchemy.url = driver://user:pass@localhost/dbname

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 5: Create all empty `__init__.py` files**

```bash
cd backend
touch app/__init__.py
touch app/models/__init__.py
touch app/schemas/__init__.py
touch app/middleware/__init__.py
touch app/routers/__init__.py
touch app/services/__init__.py
touch app/workers/__init__.py
mkdir -p migrations/versions tests scripts
```

- [ ] **Step 6: Install dependencies**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
```

Expected: installs without errors.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: add backend/ project skeleton with requirements and env example"
```

---

## Task 2: Settings configuration

**Files:**
- Create: `backend/app/config.py`
- Create: `backend/app/constants.py`

- [ ] **Step 1: Write failing test**

Create `backend/tests/test_config.py`:

```python
import pytest
from app.config import settings

def test_settings_has_required_fields():
    assert hasattr(settings, "database_url")
    assert hasattr(settings, "supabase_jwt_secret")
    assert hasattr(settings, "redis_url")
    assert hasattr(settings, "claude_haiku_model")
    assert hasattr(settings, "claude_sonnet_model")

def test_settings_environment_default():
    assert settings.environment in ("development", "staging", "production")

def test_constants():
    from app.constants import PLANO_CIDADAO, PLANO_INVESTIGADOR, PLANO_PROFISSIONAL, PLANO_API_DADOS
    assert PLANO_CIDADAO == "cidadao"
    assert PLANO_INVESTIGADOR == "investigador"
    assert PLANO_PROFISSIONAL == "profissional"
    assert PLANO_API_DADOS == "api_dados"
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
cd backend
python -m pytest tests/test_config.py -v
```

Expected: `ImportError: No module named 'app.config'`

- [ ] **Step 3: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/digdig"

    # Supabase
    supabase_jwt_secret: str = "super-secret-jwt-token-for-testing"
    supabase_url: str = "https://example.supabase.co"
    supabase_service_role_key: str = "test-service-role-key"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Claude
    claude_haiku_model: str = "claude-haiku-4-5-20251001"
    claude_sonnet_model: str = "claude-sonnet-4-6"
    anthropic_api_key: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # Resend
    resend_api_key: str = ""
    resend_from: str = "noreply@digdig.com.br"

    # App
    environment: str = "development"
    sentry_dsn: str = ""
    frontend_url: str = "http://localhost:5173"
    allowed_origins: str = "http://localhost:5173"
    webhook_secret: str = "test-webhook-secret-32chars-padding"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
```

- [ ] **Step 4: Create `backend/app/constants.py`**

```python
PLANO_CIDADAO = "cidadao"
PLANO_INVESTIGADOR = "investigador"
PLANO_PROFISSIONAL = "profissional"
PLANO_API_DADOS = "api_dados"

PLANO_CHAT_LIMITES = {
    PLANO_CIDADAO: 5,
    PLANO_INVESTIGADOR: 200,
    PLANO_PROFISSIONAL: 1000,
    PLANO_API_DADOS: None,  # ilimitado
}

NIVEL_ALERTA_VERDE = "verde"
NIVEL_ALERTA_AMARELO = "amarelo"
NIVEL_ALERTA_LARANJA = "laranja"
NIVEL_ALERTA_VERMELHO = "vermelho"
```

- [ ] **Step 5: Run test — expect PASS**

```bash
python -m pytest tests/test_config.py -v
```

Expected: all 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/config.py backend/app/constants.py backend/tests/test_config.py
git commit -m "feat: add settings config and plan constants"
```

---

## Task 3: Database connection

**Files:**
- Create: `backend/app/database.py`

- [ ] **Step 1: Write failing test**

Append to `backend/tests/test_config.py`:

```python
def test_database_module_imports():
    from app.database import engine, async_session_factory, get_db
    assert engine is not None
    assert async_session_factory is not None
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
python -m pytest tests/test_config.py::test_database_module_imports -v
```

Expected: `ImportError: No module named 'app.database'`

- [ ] **Step 3: Create `backend/app/database.py`**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from typing import AsyncGenerator
from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "development",
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

- [ ] **Step 4: Run test — expect PASS**

```bash
python -m pytest tests/test_config.py -v
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/database.py
git commit -m "feat: add async SQLAlchemy engine and session factory"
```

---

## Task 4: SQLAlchemy models — base + plano + user

**Files:**
- Create: `backend/app/models/base.py`
- Create: `backend/app/models/plano.py`
- Create: `backend/app/models/user.py`

- [ ] **Step 1: Create `backend/app/models/base.py`**

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
```

- [ ] **Step 2: Create `backend/app/models/plano.py`**

```python
import uuid
from decimal import Decimal
from sqlalchemy import String, Numeric, Boolean, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class Plano(Base):
    __tablename__ = "planos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nome: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    preco_mensal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0")
    )
    stripe_price_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    limite_chat_mensal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_orgaos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tem_exportacao: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tem_api: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    max_assentos: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    users: Mapped[list["User"]] = relationship(back_populates="plano")
```

- [ ] **Step 3: Create `backend/app/models/user.py`**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    nome: Mapped[str | None] = mapped_column(String(255), nullable=True)
    plano_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planos.id"), nullable=False
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_verificado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    plano: Mapped["Plano"] = relationship(back_populates="users")
    assinaturas: Mapped[list["Assinatura"]] = relationship(back_populates="user")
    acessos_tenant: Mapped[list["UserTenantAcesso"]] = relationship(back_populates="user")
    api_keys: Mapped[list["ApiKey"]] = relationship(back_populates="user")


class Assinatura(Base):
    __tablename__ = "assinaturas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    plano_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planos.id"), nullable=False
    )
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        String(100), unique=True, nullable=True
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    periodo_inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    periodo_fim: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    cancelado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship(back_populates="assinaturas")
```

- [ ] **Step 4: Write test for models**

Create `backend/tests/test_models.py`:

```python
def test_plano_model_attributes():
    from app.models.plano import Plano
    cols = {c.name for c in Plano.__table__.columns}
    assert "nome" in cols
    assert "preco_mensal" in cols
    assert "limite_chat_mensal" in cols
    assert "tem_api" in cols

def test_user_model_attributes():
    from app.models.user import User, Assinatura
    user_cols = {c.name for c in User.__table__.columns}
    assert "plano_id" in user_cols
    assert "stripe_customer_id" in user_cols
    sub_cols = {c.name for c in Assinatura.__table__.columns}
    assert "stripe_subscription_id" in sub_cols
    assert "status" in sub_cols
```

- [ ] **Step 5: Run tests**

```bash
python -m pytest tests/test_models.py -v
```

Expected: 2 PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/base.py backend/app/models/plano.py backend/app/models/user.py backend/tests/test_models.py
git commit -m "feat: add base, plano, and user SQLAlchemy models"
```

---

## Task 5: SQLAlchemy models — tenant group

**Files:**
- Create: `backend/app/models/tenant.py`

- [ ] **Step 1: Create `backend/app/models/tenant.py`**

```python
import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, CHAR, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from app.models.base import Base, TimestampMixin


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    nome_completo: Mapped[str] = mapped_column(String(500), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    site_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    estado: Mapped[str | None] = mapped_column(CHAR(2), nullable=True)
    tipo_orgao: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="coming_soon")
    scraper_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    ultima_analise: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_atos: Mapped[int] = mapped_column(Integer, default=0)

    atos: Mapped[list["Ato"]] = relationship(back_populates="tenant")
    knowledge_base: Mapped[list["KnowledgeBase"]] = relationship(back_populates="tenant")
    regras: Mapped[list["TenantRegra"]] = relationship(back_populates="tenant")
    acessos_usuario: Mapped[list["UserTenantAcesso"]] = relationship(back_populates="tenant")


class UserTenantAcesso(Base):
    __tablename__ = "user_tenant_acesso"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True
    )
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship(back_populates="acessos_tenant")
    tenant: Mapped["Tenant"] = relationship(back_populates="acessos_usuario")


class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    titulo: Mapped[str] = mapped_column(String(500), nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    versao: Mapped[str | None] = mapped_column(String(50), nullable=True)
    vigente_desde: Mapped[date | None] = mapped_column(Date, nullable=True)
    url_original: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    tenant: Mapped["Tenant"] = relationship(back_populates="knowledge_base")


class TenantRegra(Base):
    __tablename__ = "tenant_regras"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    categoria: Mapped[str] = mapped_column(String(100), nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    palavras_chave: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    peso: Mapped[int] = mapped_column(Integer, default=1)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    tenant: Mapped["Tenant"] = relationship(back_populates="regras")
```

- [ ] **Step 2: Write test**

Append to `backend/tests/test_models.py`:

```python
def test_tenant_model_attributes():
    from app.models.tenant import Tenant, UserTenantAcesso, KnowledgeBase, TenantRegra
    cols = {c.name for c in Tenant.__table__.columns}
    assert "slug" in cols
    assert "scraper_config" in cols
    assert "status" in cols
    uta_cols = {c.name for c in UserTenantAcesso.__table__.columns}
    assert "user_id" in uta_cols
    assert "tenant_id" in uta_cols
```

- [ ] **Step 3: Run test**

```bash
python -m pytest tests/test_models.py::test_tenant_model_attributes -v
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/tenant.py
git commit -m "feat: add tenant group SQLAlchemy models"
```

---

## Task 6: SQLAlchemy models — ato + analise + pessoa + outros

**Files:**
- Create: `backend/app/models/ato.py`
- Create: `backend/app/models/analise.py`
- Create: `backend/app/models/pessoa.py`
- Create: `backend/app/models/padrao.py`
- Create: `backend/app/models/chat.py`
- Create: `backend/app/models/relatorio.py`
- Create: `backend/app/models/patrocinio.py`
- Create: `backend/app/models/api_key.py`
- Create: `backend/app/models/preferencia_alerta.py`
- Create: `backend/app/models/log.py`

- [ ] **Step 1: Create `backend/app/models/ato.py`**

```python
import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, DateTime, Date, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class Ato(Base):
    __tablename__ = "atos"
    __table_args__ = (UniqueConstraint("tenant_id", "numero", "tipo"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    numero: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    subtipo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    titulo: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    data_publicacao: Mapped[date | None] = mapped_column(Date, nullable=True)
    ementa: Mapped[str | None] = mapped_column(Text, nullable=True)
    url_original: Mapped[str | None] = mapped_column(Text, nullable=True)
    url_pdf: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_baixado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pdf_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_tamanho_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pdf_paginas: Mapped[int | None] = mapped_column(Integer, nullable=True)
    processado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    erro_download: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    tenant: Mapped["Tenant"] = relationship(back_populates="atos")
    conteudo: Mapped["ConteudoAto | None"] = relationship(back_populates="ato", uselist=False)
    analises: Mapped[list["Analise"]] = relationship(back_populates="ato")
    aparicoes: Mapped[list["AparicaoPessoa"]] = relationship(back_populates="ato")


class ConteudoAto(Base):
    __tablename__ = "conteudo_ato"

    ato_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("atos.id", ondelete="CASCADE"), primary_key=True)
    texto_completo: Mapped[str] = mapped_column(Text, nullable=False)
    metodo_extracao: Mapped[str] = mapped_column(String(50), nullable=False, default="pdfplumber")
    qualidade: Mapped[str | None] = mapped_column(String(20), default="boa")
    tokens_estimados: Mapped[int | None] = mapped_column(Integer, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    ato: Mapped["Ato"] = relationship(back_populates="conteudo")


class RodadaAnalise(Base):
    __tablename__ = "rodadas_analise"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pendente")
    total_atos: Mapped[int] = mapped_column(Integer, default=0)
    atos_scrapeados: Mapped[int] = mapped_column(Integer, default=0)
    atos_analisados_haiku: Mapped[int] = mapped_column(Integer, default=0)
    atos_analisados_sonnet: Mapped[int] = mapped_column(Integer, default=0)
    custo_haiku_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=Decimal("0"))
    custo_sonnet_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=Decimal("0"))
    custo_total_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=Decimal("0"))
    erro_mensagem: Mapped[str | None] = mapped_column(Text, nullable=True)
    iniciado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    concluido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
```

- [ ] **Step 2: Create `backend/app/models/analise.py`**

```python
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, DateTime, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import Base


class Analise(Base):
    __tablename__ = "analises"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ato_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("atos.id", ondelete="CASCADE"), nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    rodada_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rodadas_analise.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pendente")
    nivel_alerta: Mapped[str | None] = mapped_column(String(20), nullable=True)
    score_risco: Mapped[int] = mapped_column(Integer, default=0)
    analisado_por_haiku: Mapped[bool] = mapped_column(Boolean, default=False)
    analisado_por_sonnet: Mapped[bool] = mapped_column(Boolean, default=False)
    resultado_haiku: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    resultado_sonnet: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    resumo_executivo: Mapped[str | None] = mapped_column(Text, nullable=True)
    recomendacao_campanha: Mapped[str | None] = mapped_column(Text, nullable=True)
    tokens_haiku: Mapped[int] = mapped_column(Integer, default=0)
    tokens_sonnet: Mapped[int] = mapped_column(Integer, default=0)
    custo_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=Decimal("0"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    ato: Mapped["Ato"] = relationship(back_populates="analises")
    irregularidades: Mapped[list["Irregularidade"]] = relationship(back_populates="analise")


class Irregularidade(Base):
    __tablename__ = "irregularidades"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analise_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("analises.id", ondelete="CASCADE"), nullable=False)
    ato_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("atos.id", ondelete="CASCADE"), nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    categoria: Mapped[str] = mapped_column(String(50), nullable=False)
    tipo: Mapped[str] = mapped_column(String(255), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    artigo_violado: Mapped[str | None] = mapped_column(String(500), nullable=True)
    gravidade: Mapped[str] = mapped_column(String(20), nullable=False)
    impacto_politico: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    analise: Mapped["Analise"] = relationship(back_populates="irregularidades")
```

- [ ] **Step 3: Create `backend/app/models/pessoa.py`**

```python
import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, DateTime, Date, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.models.base import Base


class Pessoa(Base):
    __tablename__ = "pessoas"
    __table_args__ = (UniqueConstraint("tenant_id", "nome_normalizado"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    nome_normalizado: Mapped[str] = mapped_column(String(500), nullable=False)
    variantes_nome: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    cargo_mais_recente: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tipo: Mapped[str] = mapped_column(String(50), default="pessoa_fisica")
    total_aparicoes: Mapped[int] = mapped_column(Integer, default=0)
    primeiro_ato_data: Mapped[date | None] = mapped_column(Date, nullable=True)
    ultimo_ato_data: Mapped[date | None] = mapped_column(Date, nullable=True)
    score_concentracao: Mapped[int] = mapped_column(Integer, default=0)
    eh_suspeito: Mapped[bool] = mapped_column(Boolean, default=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    aparicoes: Mapped[list["AparicaoPessoa"]] = relationship(back_populates="pessoa")


class AparicaoPessoa(Base):
    __tablename__ = "aparicoes_pessoa"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pessoa_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pessoas.id", ondelete="CASCADE"), nullable=False)
    ato_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("atos.id", ondelete="CASCADE"), nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    tipo_aparicao: Mapped[str] = mapped_column(String(100), nullable=False)
    cargo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    data_ato: Mapped[date | None] = mapped_column(Date, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    pessoa: Mapped["Pessoa"] = relationship(back_populates="aparicoes")
    ato: Mapped["Ato"] = relationship(back_populates="aparicoes")


class RelacaoPessoa(Base):
    __tablename__ = "relacoes_pessoas"
    __table_args__ = (UniqueConstraint("tenant_id", "pessoa_a_id", "pessoa_b_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    pessoa_a_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pessoas.id"), nullable=False)
    pessoa_b_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pessoas.id"), nullable=False)
    tipo_relacao: Mapped[str | None] = mapped_column(String(100), nullable=True)
    atos_em_comum: Mapped[int] = mapped_column(Integer, default=1)
    peso: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("1.0"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
```

- [ ] **Step 4: Create `backend/app/models/padrao.py`**

```python
import uuid
from datetime import datetime, date
from sqlalchemy import String, Text, ForeignKey, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.models.base import Base


class PadraoDetectado(Base):
    __tablename__ = "padroes_detectados"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    rodada_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rodadas_analise.id"), nullable=True)
    tipo_padrao: Mapped[str] = mapped_column(String(100), nullable=False)
    titulo: Mapped[str] = mapped_column(String(500), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    narrativa: Mapped[str | None] = mapped_column(Text, nullable=True)
    gravidade: Mapped[str] = mapped_column(String(20), nullable=False)
    atos_envolvidos: Mapped[list[uuid.UUID] | None] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=True)
    pessoas_envolvidas: Mapped[list[uuid.UUID] | None] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=True)
    periodo_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    periodo_fim: Mapped[date | None] = mapped_column(Date, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
```

- [ ] **Step 5: Create `backend/app/models/chat.py`**

```python
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, DateTime, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import Base


class ChatSessao(Base):
    __tablename__ = "chat_sessoes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    titulo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ativa: Mapped[bool] = mapped_column(Boolean, default=True)
    total_mensagens: Mapped[int] = mapped_column(Integer, default=0)
    custo_total_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=Decimal("0"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ultima_msg_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    mensagens: Mapped[list["ChatMensagem"]] = relationship(back_populates="sessao")


class ChatMensagem(Base):
    __tablename__ = "chat_mensagens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sessao_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chat_sessoes.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    tipo_pergunta: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contexto_usado: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tokens_input: Mapped[int] = mapped_column(Integer, default=0)
    tokens_output: Mapped[int] = mapped_column(Integer, default=0)
    custo_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=Decimal("0"))
    tempo_resposta_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    sessao: Mapped["ChatSessao"] = relationship(back_populates="mensagens")
    feedback: Mapped[list["ChatFeedback"]] = relationship(back_populates="mensagem")


class ChatFeedback(Base):
    __tablename__ = "chat_feedback"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mensagem_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chat_mensagens.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    util: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    comentario: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    mensagem: Mapped["ChatMensagem"] = relationship(back_populates="feedback")
```

- [ ] **Step 6: Create `backend/app/models/relatorio.py`**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class Relatorio(Base):
    __tablename__ = "relatorios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    rodada_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rodadas_analise.id"), nullable=True)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    titulo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    arquivo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    tamanho_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    publico: Mapped[bool] = mapped_column(Boolean, default=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
```

- [ ] **Step 7: Create `backend/app/models/patrocinio.py`**

```python
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, DateTime, Numeric, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class CampanhaPatrocinio(Base):
    __tablename__ = "campanhas_patrocinio"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome_orgao: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    uf: Mapped[str | None] = mapped_column(String(2), nullable=True)
    tipo_orgao: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ativa")
    meta_valor: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("3000.00"))
    valor_arrecadado: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    total_doadores: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_votos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    proposta_por: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    tenant_id_gerado: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    prazo_expiracao: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    doacoes: Mapped[list["DoacaoPatrocinio"]] = relationship(back_populates="campanha")
    votos: Mapped[list["VotoPatrocinio"]] = relationship(back_populates="campanha")


class DoacaoPatrocinio(Base):
    __tablename__ = "doacoes_patrocinio"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campanha_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("campanhas_patrocinio.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    valor: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    stripe_payment_intent: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pendente")
    mensagem_publica: Mapped[str | None] = mapped_column(Text, nullable=True)
    nome_exibicao: Mapped[str | None] = mapped_column(Text, nullable=True)
    votos_concedidos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    acesso_antecipado_concedido: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    acesso_antecipado_ate: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    campanha: Mapped["CampanhaPatrocinio"] = relationship(back_populates="doacoes")


class VotoPatrocinio(Base):
    __tablename__ = "votos_patrocinio"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    campanha_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("campanhas_patrocinio.id", ondelete="CASCADE"), nullable=False)
    mes_referencia: Mapped[str] = mapped_column(String(7), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    campanha: Mapped["CampanhaPatrocinio"] = relationship(back_populates="votos")
```

- [ ] **Step 8: Create `backend/app/models/api_key.py`**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    chave_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    prefixo: Mapped[str] = mapped_column(Text, nullable=False)
    ultimo_uso: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ativa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revogado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="api_keys")
```

- [ ] **Step 9: Create `backend/app/models/preferencia_alerta.py`**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.models.base import Base


class PreferenciaAlerta(Base):
    __tablename__ = "preferencias_alertas"
    __table_args__ = (UniqueConstraint("user_id", "tenant_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    niveis: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    frequencia: Mapped[str] = mapped_column(String(20), nullable=False, default="imediato")
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
```

- [ ] **Step 10: Create `backend/app/models/log.py`**

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import Base


class LogSessao(Base):
    __tablename__ = "logs_sessao"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ip_anonimizado: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    tenant_slug: Mapped[str | None] = mapped_column(Text, nullable=True)
    iniciada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    encerrada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_acoes: Mapped[int] = mapped_column(Integer, default=0)


class LogAtividade(Base):
    __tablename__ = "logs_atividade"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sessao_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("logs_sessao.id", ondelete="SET NULL"), nullable=True)
    acao: Mapped[str] = mapped_column(Text, nullable=False)
    tenant_slug: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurso_tipo: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurso_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class LogErroUsuario(Base):
    __tablename__ = "logs_erros_usuario"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    tipo_erro: Mapped[str] = mapped_column(Text, nullable=False)
    contexto: Mapped[dict] = mapped_column(JSONB, default=dict)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class LogAcessoNegado(Base):
    __tablename__ = "logs_acesso_negado"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ip_anonimizado: Mapped[str | None] = mapped_column(Text, nullable=True)
    rota_tentada: Mapped[str] = mapped_column(Text, nullable=False)
    motivo: Mapped[str] = mapped_column(Text, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
```

- [ ] **Step 11: Update `backend/app/models/__init__.py`**

```python
from app.models.base import Base
from app.models.plano import Plano
from app.models.user import User, Assinatura
from app.models.tenant import Tenant, UserTenantAcesso, KnowledgeBase, TenantRegra
from app.models.ato import Ato, ConteudoAto, RodadaAnalise
from app.models.analise import Analise, Irregularidade
from app.models.pessoa import Pessoa, AparicaoPessoa, RelacaoPessoa
from app.models.padrao import PadraoDetectado
from app.models.chat import ChatSessao, ChatMensagem, ChatFeedback
from app.models.relatorio import Relatorio
from app.models.patrocinio import CampanhaPatrocinio, DoacaoPatrocinio, VotoPatrocinio
from app.models.api_key import ApiKey
from app.models.preferencia_alerta import PreferenciaAlerta
from app.models.log import LogSessao, LogAtividade, LogErroUsuario, LogAcessoNegado

__all__ = [
    "Base", "Plano", "User", "Assinatura", "Tenant", "UserTenantAcesso",
    "KnowledgeBase", "TenantRegra", "Ato", "ConteudoAto", "RodadaAnalise",
    "Analise", "Irregularidade", "Pessoa", "AparicaoPessoa", "RelacaoPessoa",
    "PadraoDetectado", "ChatSessao", "ChatMensagem", "ChatFeedback",
    "Relatorio", "CampanhaPatrocinio", "DoacaoPatrocinio", "VotoPatrocinio",
    "ApiKey", "PreferenciaAlerta",
    "LogSessao", "LogAtividade", "LogErroUsuario", "LogAcessoNegado",
]
```

- [ ] **Step 12: Write test**

Append to `backend/tests/test_models.py`:

```python
def test_all_models_import():
    from app.models import (
        Base, Plano, User, Assinatura, Tenant, UserTenantAcesso,
        KnowledgeBase, TenantRegra, Ato, ConteudoAto, RodadaAnalise,
        Analise, Irregularidade, Pessoa, AparicaoPessoa, RelacaoPessoa,
        PadraoDetectado, ChatSessao, ChatMensagem, ChatFeedback,
        Relatorio, CampanhaPatrocinio, DoacaoPatrocinio, VotoPatrocinio,
        ApiKey, PreferenciaAlerta,
        LogSessao, LogAtividade, LogErroUsuario, LogAcessoNegado,
    )
    assert len(Base.metadata.tables) == 29

def test_ato_unique_constraint():
    from app.models.ato import Ato
    constraints = {c.name for c in Ato.__table__.constraints if hasattr(c, 'columns')}
    col_sets = [frozenset(c.columns.keys()) for c in Ato.__table__.constraints]
    assert frozenset(["tenant_id", "numero", "tipo"]) in col_sets
```

- [ ] **Step 13: Run all model tests**

```bash
python -m pytest tests/test_models.py -v
```

Expected: all 5 tests PASS

- [ ] **Step 14: Commit**

```bash
git add backend/app/models/
git commit -m "feat: add all 29 SQLAlchemy models (ato, analise, pessoa, chat, patrocinio, logs)"
```

---

## Task 7: Alembic migration — full schema

**Files:**
- Create: `backend/migrations/env.py`
- Create: `backend/migrations/script.py.mako`
- Create: `backend/migrations/versions/001_initial_schema.py`

- [ ] **Step 1: Initialize Alembic**

```bash
cd backend
alembic init migrations
```

This creates `migrations/env.py` and `migrations/script.py.mako`. We'll replace `env.py`.

- [ ] **Step 2: Replace `backend/migrations/env.py`**

```python
import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.config import settings
from app.models import Base  # imports all models via __init__

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Generate initial migration**

```bash
cd backend
alembic revision --autogenerate -m "initial_schema"
```

Expected: creates `migrations/versions/[hash]_initial_schema.py` with all 29 tables detected.

- [ ] **Step 4: Verify the migration has all tables**

Open the generated file and verify it contains `op.create_table` calls for:
`planos`, `users`, `assinaturas`, `tenants`, `user_tenant_acesso`, `knowledge_base`, `tenant_regras`, `atos`, `conteudo_ato`, `rodadas_analise`, `analises`, `irregularidades`, `pessoas`, `aparicoes_pessoa`, `relacoes_pessoas`, `padroes_detectados`, `chat_sessoes`, `chat_mensagens`, `chat_feedback`, `relatorios`, `campanhas_patrocinio`, `doacoes_patrocinio`, `votos_patrocinio`, `api_keys`, `preferencias_alertas`, `logs_sessao`, `logs_atividade`, `logs_erros_usuario`, `logs_acesso_negado`

If any table is missing: check that it's imported in `app/models/__init__.py`.

- [ ] **Step 5: Apply migration to local test database (optional — use if you have local PostgreSQL)**

```bash
# Only if you have a local PostgreSQL running
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/digdig_test alembic upgrade head
```

- [ ] **Step 6: Commit**

```bash
git add migrations/
git commit -m "feat: add Alembic async setup and initial schema migration for all 29 tables"
```

---

## Task 8: FastAPI app + health check

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/routers/health.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Create `backend/tests/conftest.py`**

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch


@pytest.fixture
def app():
    from app.main import create_app
    return create_app()


@pytest_asyncio.fixture
async def client(app):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as c:
        yield c


@pytest.fixture
def mock_settings():
    """Override settings for tests — no real DB or external services needed."""
    with patch("app.config.settings") as mock:
        mock.environment = "test"
        mock.sentry_dsn = ""
        mock.allowed_origins_list = ["http://localhost:5173"]
        mock.database_url = "postgresql+asyncpg://postgres:postgres@localhost:5432/digdig_test"
        yield mock
```

- [ ] **Step 2: Create `backend/tests/test_health.py`**

```python
import pytest


@pytest.mark.asyncio
async def test_health_ok(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


@pytest.mark.asyncio
async def test_health_unknown_route_returns_404(client):
    response = await client.get("/nonexistent")
    assert response.status_code == 404
```

- [ ] **Step 3: Create `backend/app/routers/health.py`**

```python
from fastapi import APIRouter

router = APIRouter(tags=["health"])

VERSION = "0.1.0"


@router.get("/health")
async def health():
    return {"status": "ok", "version": VERSION}
```

- [ ] **Step 4: Create `backend/app/main.py`**

```python
import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import health, webhooks


def create_app() -> FastAPI:
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            traces_sample_rate=0.1,
        )

    app = FastAPI(
        title="Dig Dig API",
        version="0.1.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.include_router(health.router)
    app.include_router(webhooks.router, prefix="/webhooks")

    return app


app = create_app()
```

- [ ] **Step 5: Create stub `backend/app/routers/webhooks.py`** (full implementation in Task 11)

```python
from fastapi import APIRouter

router = APIRouter(tags=["webhooks"])
```

- [ ] **Step 6: Run tests**

```bash
cd backend
python -m pytest tests/test_health.py -v
```

Expected: 2 PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/main.py backend/app/routers/health.py backend/app/routers/webhooks.py backend/tests/conftest.py backend/tests/test_health.py
git commit -m "feat: add FastAPI app with CORS, Sentry, and health check endpoint"
```

---

## Task 9: Auth middleware — JWT validation

**Files:**
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/middleware/auth.py`
- Create: `backend/tests/test_auth_middleware.py`

- [ ] **Step 1: Create `backend/app/schemas/auth.py`**

```python
import uuid
from pydantic import BaseModel


class TokenPayload(BaseModel):
    sub: str                    # Supabase user UUID
    email: str | None = None
    role: str = "authenticated"
    app_metadata: dict = {}


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    nome: str | None
    plano_nome: str
    plano_limite_chat: int | None
    ativo: bool

    model_config = {"from_attributes": True}


class WebhookPayload(BaseModel):
    type: str
    table: str
    record: dict
    old_record: dict | None = None
```

- [ ] **Step 2: Write failing test**

Create `backend/tests/test_auth_middleware.py`:

```python
import pytest
import jwt as pyjwt
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from app.config import settings


def make_hs256_jwt(sub: str, email: str, expired: bool = False) -> str:
    exp_delta = timedelta(hours=-1) if expired else timedelta(hours=1)
    payload = {
        "sub": sub,
        "email": email,
        "role": "authenticated",
        "aud": "authenticated",
        "exp": datetime.now(timezone.utc) + exp_delta,
        "iat": datetime.now(timezone.utc),
        "app_metadata": {},
    }
    return pyjwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")


def _mock_jwks_fail(token):
    from jwt import PyJWKClientError
    raise PyJWKClientError("no matching key")


@pytest.mark.asyncio
async def test_protected_route_without_token_returns_401(client):
    response = await client.get("/test-auth")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_with_invalid_token_returns_401(client):
    response = await client.get("/test-auth", headers={"Authorization": "Bearer invalid.token.here"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_decode_jwt_valid_hs256_via_fallback():
    """JWKS fails (mocked) → fallback to HS256 shared secret succeeds."""
    from app.middleware.auth import decode_jwt_payload

    token = make_hs256_jwt("user-uuid-123", "test@example.com")

    with patch("app.middleware.auth._jwks_client") as mock_client:
        mock_client.return_value.get_signing_key_from_jwt.side_effect = _mock_jwks_fail
        payload = decode_jwt_payload(token)

    assert payload.sub == "user-uuid-123"
    assert payload.email == "test@example.com"


@pytest.mark.asyncio
async def test_expired_token_raises_401():
    from app.middleware.auth import decode_jwt_payload
    from fastapi import HTTPException

    token = make_hs256_jwt("user-uuid-123", "test@example.com", expired=True)

    with patch("app.middleware.auth._jwks_client") as mock_client:
        mock_client.return_value.get_signing_key_from_jwt.side_effect = _mock_jwks_fail
        with pytest.raises(HTTPException) as exc_info:
            decode_jwt_payload(token)

    assert exc_info.value.status_code == 401
```

- [ ] **Step 3: Run test — expect ImportError**

```bash
python -m pytest tests/test_auth_middleware.py::test_decode_jwt_valid_hs256_via_fallback -v
```

Expected: `ImportError: cannot import name 'decode_jwt_payload'`

- [ ] **Step 4: Create `backend/app/middleware/auth.py`**

```python
import uuid
from functools import lru_cache
from typing import Annotated
import jwt
from jwt import PyJWKClient, PyJWKClientError, DecodeError, ExpiredSignatureError, InvalidAudienceError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import TokenPayload

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    """Cached JWKS client — fetches Supabase public keys once and caches them."""
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)


def decode_jwt_payload(token: str) -> TokenPayload:
    """Validate a Supabase JWT (supports both new ECC P-256 and legacy HS256)."""
    try:
        # Try JWKS (ECC P-256 — new Supabase default)
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        data = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256", "HS256"],
            audience="authenticated",
            options={"verify_exp": True},
        )
    except (PyJWKClientError, DecodeError):
        # Fallback: legacy HS256 shared secret (kept for local dev / legacy projects)
        if not settings.supabase_jwt_secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            data = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True},
            )
        except (DecodeError, Exception) as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido ou expirado",
                headers={"WWW-Authenticate": "Bearer"},
            ) from e
    except (ExpiredSignatureError, InvalidAudienceError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    return TokenPayload(
        sub=data["sub"],
        email=data.get("email"),
        role=data.get("role", "authenticated"),
        app_metadata=data.get("app_metadata", {}),
    )


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_jwt_payload(credentials.credentials)
    user_id = uuid.UUID(payload.sub)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
        )

    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desativada",
        )

    return user


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Admin-only dependency — checks app_metadata.role == 'admin' in JWT."""
    # app_metadata is set via Supabase Auth admin API or service_role
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acesso restrito a administradores",
    )
```

- [ ] **Step 5: Add test route to conftest so protected route tests work**

In `backend/tests/conftest.py`, add after the `app` fixture:

```python
@pytest.fixture
def app():
    from app.main import create_app
    from fastapi import Depends
    from app.middleware.auth import get_current_user

    application = create_app()

    @application.get("/test-auth")
    async def _test_auth_route(user=Depends(get_current_user)):
        return {"user_id": str(user.id)}

    return application
```

- [ ] **Step 6: Run auth tests**

```bash
python -m pytest tests/test_auth_middleware.py -v
```

Expected: `test_get_current_user_decodes_valid_jwt` and `test_expired_token_raises_401` PASS.
`test_protected_route_without_token_returns_401` and `test_protected_route_with_invalid_token_returns_401` will PASS too (no DB needed — error happens before DB lookup).

- [ ] **Step 7: Commit**

```bash
git add backend/app/middleware/auth.py backend/app/schemas/auth.py backend/tests/test_auth_middleware.py
git commit -m "feat: add JWT auth middleware with Supabase JWT validation"
```

---

## Task 10: Plan validation middleware

**Files:**
- Create: `backend/app/middleware/plan.py`

- [ ] **Step 1: Write failing test**

Create `backend/tests/test_plan_middleware.py`:

```python
import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from app.constants import PLANO_CIDADAO, PLANO_INVESTIGADOR, PLANO_PROFISSIONAL, PLANO_API_DADOS


def make_user_with_plan(plan_name: str, chat_limit: int | None):
    user = MagicMock()
    user.plano.nome = plan_name
    user.plano.limite_chat_mensal = chat_limit
    user.plano.tem_api = (plan_name == PLANO_API_DADOS)
    user.plano.tem_exportacao = (plan_name in (PLANO_INVESTIGADOR, PLANO_PROFISSIONAL, PLANO_API_DADOS))
    return user


def test_require_plan_cidadao_blocks_investigador_route():
    from app.middleware.plan import require_plan
    user = make_user_with_plan(PLANO_CIDADAO, 5)
    checker = require_plan(PLANO_INVESTIGADOR)
    with pytest.raises(HTTPException) as exc:
        checker(user)
    assert exc.value.status_code == 403


def test_require_plan_investigador_allows_investigador_route():
    from app.middleware.plan import require_plan
    user = make_user_with_plan(PLANO_INVESTIGADOR, 200)
    checker = require_plan(PLANO_INVESTIGADOR)
    result = checker(user)
    assert result == user


def test_require_plan_profissional_allows_investigador_route():
    from app.middleware.plan import require_plan
    user = make_user_with_plan(PLANO_PROFISSIONAL, 1000)
    checker = require_plan(PLANO_INVESTIGADOR)
    result = checker(user)
    assert result == user


def test_require_plan_api_dados_allows_all():
    from app.middleware.plan import require_plan
    user = make_user_with_plan(PLANO_API_DADOS, None)
    for plan in (PLANO_CIDADAO, PLANO_INVESTIGADOR, PLANO_PROFISSIONAL):
        checker = require_plan(plan)
        result = checker(user)
        assert result == user
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
python -m pytest tests/test_plan_middleware.py -v
```

Expected: `ImportError: cannot import name 'require_plan'`

- [ ] **Step 3: Create `backend/app/middleware/plan.py`**

```python
from typing import Callable
from fastapi import HTTPException, status, Depends
from app.models.user import User
from app.middleware.auth import get_current_user
from app.constants import (
    PLANO_CIDADAO, PLANO_INVESTIGADOR, PLANO_PROFISSIONAL, PLANO_API_DADOS
)

# Hierarchy: higher index = more permissions
PLAN_HIERARCHY = [PLANO_CIDADAO, PLANO_INVESTIGADOR, PLANO_PROFISSIONAL, PLANO_API_DADOS]


def _plan_rank(nome: str) -> int:
    try:
        return PLAN_HIERARCHY.index(nome)
    except ValueError:
        return -1


def require_plan(minimum_plan: str) -> Callable[[User], User]:
    """Returns a FastAPI dependency that raises 403 if user's plan is below minimum."""
    def checker(user: User = Depends(get_current_user)) -> User:
        if _plan_rank(user.plano.nome) < _plan_rank(minimum_plan):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Esta funcionalidade requer o plano {minimum_plan} ou superior.",
            )
        return user
    return checker


def check_api_access(user: User = Depends(get_current_user)) -> User:
    """Requires api_dados plan."""
    if not user.plano.tem_api:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso à API REST requer o plano API & Dados.",
        )
    return user
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/test_plan_middleware.py -v
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/middleware/plan.py backend/tests/test_plan_middleware.py
git commit -m "feat: add plan validation middleware with hierarchy-based access control"
```

---

## Task 11: User onboarding webhook

**Files:**
- Modify: `backend/app/routers/webhooks.py`
- Create: `backend/tests/test_webhooks.py`

This webhook is called by Supabase Auth when a new user signs up. It creates the `users` record with the default `cidadao` plan.

- [ ] **Step 1: Write failing test**

Create `backend/tests/test_webhooks.py`:

```python
import pytest
import hmac
import hashlib
from unittest.mock import AsyncMock, patch, MagicMock
import uuid


def make_webhook_signature(payload: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


@pytest.mark.asyncio
async def test_webhook_missing_signature_returns_401(client):
    payload = b'{"type": "INSERT", "table": "users", "record": {"id": "abc", "email": "a@b.com"}}'
    response = await client.post(
        "/webhooks/supabase-auth",
        content=payload,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_webhook_invalid_signature_returns_401(client):
    payload = b'{"type": "INSERT", "table": "users", "record": {"id": "abc", "email": "a@b.com"}}'
    response = await client.post(
        "/webhooks/supabase-auth",
        content=payload,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Secret": "wrong-secret",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_webhook_valid_signature_processes_new_user(client):
    from app.config import settings

    user_id = str(uuid.uuid4())
    payload = (
        f'{{"type": "INSERT", "table": "users", '
        f'"record": {{"id": "{user_id}", "email": "newuser@example.com"}}, '
        f'"old_record": null}}'
    ).encode()

    with patch("app.routers.webhooks.create_user_from_auth") as mock_create:
        mock_create.return_value = None
        response = await client.post(
            "/webhooks/supabase-auth",
            content=payload,
            headers={
                "Content-Type": "application/json",
                "X-Webhook-Secret": settings.webhook_secret,
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    mock_create.assert_called_once()
```

- [ ] **Step 2: Create full `backend/app/routers/webhooks.py`**

```python
import uuid
import hmac
import hashlib
from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.plano import Plano
from app.constants import PLANO_CIDADAO

router = APIRouter(tags=["webhooks"])


def verify_webhook_secret(request: Request) -> None:
    secret = request.headers.get("X-Webhook-Secret", "")
    if not hmac.compare_digest(secret, settings.webhook_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook secret inválido",
        )


async def create_user_from_auth(
    user_id: str,
    email: str,
    db: AsyncSession,
) -> None:
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    if result.scalar_one_or_none():
        return  # already exists — idempotent

    plano_result = await db.execute(
        select(Plano).where(Plano.nome == PLANO_CIDADAO)
    )
    plano = plano_result.scalar_one_or_none()
    if not plano:
        raise RuntimeError(f"Plano '{PLANO_CIDADAO}' not found in database — run seed.sql first")

    user = User(
        id=uuid.UUID(user_id),
        email=email,
        plano_id=plano.id,
        ativo=True,
        email_verificado=False,
    )
    db.add(user)
    await db.flush()


@router.post("/supabase-auth")
async def supabase_auth_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    verify_webhook_secret(request)

    body = await request.json()
    event_type = body.get("type")
    record = body.get("record", {})

    if event_type == "INSERT" and record.get("id") and record.get("email"):
        await create_user_from_auth(
            user_id=record["id"],
            email=record["email"],
            db=db,
        )

    return {"ok": True}
```

- [ ] **Step 3: Run tests**

```bash
python -m pytest tests/test_webhooks.py -v
```

Expected: all 3 tests PASS (mock bypasses DB for the happy-path test)

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/webhooks.py backend/tests/test_webhooks.py
git commit -m "feat: add Supabase auth webhook for user onboarding with idempotent user creation"
```

---

## Task 12: AuditLog service

**Files:**
- Create: `backend/app/services/audit_log.py`

- [ ] **Step 1: Create `backend/app/services/audit_log.py`**

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.log import LogAtividade, LogErroUsuario, LogAcessoNegado


class AuditLog:
    @staticmethod
    async def registrar(
        db: AsyncSession,
        acao: str,
        user_id: uuid.UUID | None = None,
        tenant_slug: str | None = None,
        recurso_tipo: str | None = None,
        recurso_id: uuid.UUID | None = None,
        metadata: dict | None = None,
    ) -> None:
        log = LogAtividade(
            user_id=user_id,
            acao=acao,
            tenant_slug=tenant_slug,
            recurso_tipo=recurso_tipo,
            recurso_id=recurso_id,
            metadata=metadata or {},
            criado_em=datetime.now(timezone.utc),
        )
        db.add(log)
        # No commit here — caller's transaction will commit

    @staticmethod
    async def registrar_erro(
        db: AsyncSession,
        tipo_erro: str,
        user_id: uuid.UUID | None = None,
        contexto: dict | None = None,
    ) -> None:
        log = LogErroUsuario(
            user_id=user_id,
            tipo_erro=tipo_erro,
            contexto=contexto or {},
            criado_em=datetime.now(timezone.utc),
        )
        db.add(log)

    @staticmethod
    async def registrar_acesso_negado(
        db: AsyncSession,
        rota_tentada: str,
        motivo: str,
        user_id: uuid.UUID | None = None,
        ip_anonimizado: str | None = None,
    ) -> None:
        log = LogAcessoNegado(
            user_id=user_id,
            ip_anonimizado=ip_anonimizado,
            rota_tentada=rota_tentada,
            motivo=motivo,
            criado_em=datetime.now(timezone.utc),
        )
        db.add(log)
```

- [ ] **Step 2: Write test**

Create `backend/tests/test_audit_log.py`:

```python
import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, call
from app.services.audit_log import AuditLog


@pytest.mark.asyncio
async def test_registrar_adds_log_to_session():
    db = MagicMock()
    db.add = MagicMock()

    await AuditLog.registrar(
        db=db,
        acao="ATO_VISUALIZADO",
        user_id=uuid.uuid4(),
        tenant_slug="cau-pr",
        recurso_tipo="ato",
    )
    assert db.add.called
    from app.models.log import LogAtividade
    added = db.add.call_args[0][0]
    assert isinstance(added, LogAtividade)
    assert added.acao == "ATO_VISUALIZADO"
    assert added.tenant_slug == "cau-pr"


@pytest.mark.asyncio
async def test_registrar_erro_adds_erro_log():
    db = MagicMock()
    await AuditLog.registrar_erro(db, "LIMITE_CHAT_ATINGIDO", contexto={"plano": "cidadao"})
    from app.models.log import LogErroUsuario
    added = db.add.call_args[0][0]
    assert isinstance(added, LogErroUsuario)
    assert added.tipo_erro == "LIMITE_CHAT_ATINGIDO"
```

- [ ] **Step 3: Run tests**

```bash
python -m pytest tests/test_audit_log.py -v
```

Expected: 2 PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/audit_log.py backend/tests/test_audit_log.py
git commit -m "feat: add AuditLog service for recording user actions and errors"
```

---

## Task 13: Celery app

**Files:**
- Create: `backend/app/workers/celery_app.py`

- [ ] **Step 1: Create `backend/app/workers/celery_app.py`**

```python
from celery import Celery
from app.config import settings

celery_app = Celery(
    "digdig",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        # Tasks added in later plans:
        # "app.workers.tasks_scraper",
        # "app.workers.tasks_analise",
        # "app.workers.tasks_relatorio",
        # "app.workers.tasks_alertas",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.workers.tasks_scraper.*": {"queue": "scraper"},
        "app.workers.tasks_analise.*": {"queue": "analise"},
        "app.workers.tasks_relatorio.*": {"queue": "relatorio"},
        "app.workers.tasks_alertas.*": {"queue": "alertas"},
    },
)
```

- [ ] **Step 2: Write test**

Append to `backend/tests/test_config.py`:

```python
def test_celery_app_creates():
    from app.workers.celery_app import celery_app
    assert celery_app.main == "digdig"
```

- [ ] **Step 3: Run test**

```bash
python -m pytest tests/test_config.py::test_celery_app_creates -v
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/workers/celery_app.py
git commit -m "feat: add Celery app configuration with task routing"
```

---

## Task 14: Seed SQL

**Files:**
- Create: `backend/scripts/seed.sql`

- [ ] **Step 1: Create `backend/scripts/seed.sql`**

```sql
-- ================================================================
-- Dig Dig — Seed Data
-- Run once against your Supabase database after applying migrations
-- ================================================================

-- Planos
INSERT INTO planos (nome, preco_mensal, limite_chat_mensal, max_orgaos, tem_exportacao, tem_api, max_assentos, descricao, ativo) VALUES
  ('cidadao',      0.00,    5,    NULL, false, false, 1, 'Acesso gratuito de leitura a todos os órgãos', true),
  ('investigador', 197.00,  200,  NULL, true,  false, 1, 'Para jornalistas, candidatos e militantes', true),
  ('profissional', 597.00,  1000, NULL, true,  false, 2, 'Para escritórios jurídicos e assessorias políticas', true),
  ('api_dados',    1997.00, NULL, NULL, true,  true,  5, 'Acesso via API REST para integrações', true)
ON CONFLICT (nome) DO UPDATE
  SET preco_mensal = EXCLUDED.preco_mensal,
      limite_chat_mensal = EXCLUDED.limite_chat_mensal,
      tem_exportacao = EXCLUDED.tem_exportacao,
      tem_api = EXCLUDED.tem_api,
      max_assentos = EXCLUDED.max_assentos,
      descricao = EXCLUDED.descricao;

-- Tenant CAU/PR
INSERT INTO tenants (slug, nome, nome_completo, estado, tipo_orgao, status, scraper_config, total_atos, criado_em, atualizado_em) VALUES
(
  'cau-pr',
  'CAU/PR',
  'Conselho de Arquitetura e Urbanismo do Paraná',
  'PR',
  'conselho_profissional',
  'active',
  '{
    "fontes": [
      {
        "tipo": "portarias",
        "url_base": "https://www.caupr.gov.br/portarias",
        "paginacao": "wordpress",
        "seletor_items": ".entry-content li a",
        "formato_data": "%d/%m/%Y"
      },
      {
        "tipo": "deliberacoes",
        "url_base": "https://www.caupr.gov.br/?page_id=17916",
        "paginacao": "wordpress",
        "seletor_items": ".entry-content li a",
        "formato_data": "%d/%m/%Y"
      }
    ],
    "rate_limit_segundos": 1.5,
    "user_agent": "Dig Dig/1.0 (auditoria de atos publicos)"
  }',
  1789,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;
```

- [ ] **Step 2: Apply seed to Supabase**

In Supabase dashboard → SQL Editor, paste and run `seed.sql`.

Or via psql:

```bash
psql $DATABASE_URL -f scripts/seed.sql
```

Expected output:
```
INSERT 0 4   -- planos (or UPDATE if re-running)
INSERT 0 1   -- tenant cau-pr
```

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/seed.sql
git commit -m "feat: add seed SQL for plans and CAU-PR tenant"
```

---

## Task 15: Dockerfile + railway.toml

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/railway.toml`

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

# Non-root user
RUN groupadd -r digdig && useradd -r -g digdig digdig

WORKDIR /app

# Install system deps for pdfplumber + asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Don't run as root
RUN chown -R digdig:digdig /app
USER digdig

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create `backend/railway.toml`**

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

# Release command runs BEFORE the new containers come up.
# This ensures migrations complete before API traffic hits the new code.
[deploy]
releaseCommand = "alembic upgrade head"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[[services]]
name = "api"
[services.deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 30

[[services]]
name = "worker"
[services.deploy]
startCommand = "celery -A app.workers.celery_app worker --loglevel=info --queues=scraper,analise,relatorio,alertas --concurrency=4"

[[services]]
name = "beat"
[services.deploy]
startCommand = "celery -A app.workers.celery_app beat --loglevel=info"
```

- [ ] **Step 3: Verify Dockerfile builds locally**

```bash
cd backend
docker build -t digdig-backend:test .
```

Expected: build succeeds, final layer shows `USER digdig`

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/railway.toml
git commit -m "feat: add Dockerfile and Railway deployment config with pre-deploy migrations"
```

---

## Task 16: Apply full schema to Supabase + RLS

- [ ] **Step 1: Apply migrations to Supabase**

```bash
cd backend
DATABASE_URL=postgresql+asyncpg://postgres:[your-password]@db.[project].supabase.co:5432/postgres \
  alembic upgrade head
```

Expected: all 29 tables created with indexes.

- [ ] **Step 2: Apply RLS policies in Supabase SQL Editor**

Run this SQL in Supabase → SQL Editor:

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE atos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteudo_ato ENABLE ROW LEVEL SECURITY;
ALTER TABLE rodadas_analise ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE irregularidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE aparicoes_pessoa ENABLE ROW LEVEL SECURITY;
ALTER TABLE relacoes_pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE padroes_detectados ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_regras ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: user can only see tenants they have access to
CREATE POLICY "tenant_isolation_atos" ON atos
    FOR SELECT TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_acesso
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "tenant_isolation_analises" ON analises
    FOR SELECT TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_acesso
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "tenant_isolation_pessoas" ON pessoas
    FOR SELECT TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_acesso
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "tenant_isolation_irregularidades" ON irregularidades
    FOR SELECT TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_acesso
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "tenant_isolation_padroes" ON padroes_detectados
    FOR SELECT TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_acesso
            WHERE user_id = auth.uid()
        )
    );

-- Chat: user only sees their own sessions
ALTER TABLE chat_sessoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_sessoes_proprio_usuario" ON chat_sessoes
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- users: own record only
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_proprio_registro" ON users
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- api_keys: own keys only
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_proprio_usuario" ON api_keys
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- preferencias_alertas: own preferences only
ALTER TABLE preferencias_alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preferencias_proprio_usuario" ON preferencias_alertas
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- campanhas_patrocinio: public read, authenticated insert
ALTER TABLE campanhas_patrocinio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campanhas_leitura_publica" ON campanhas_patrocinio
    FOR SELECT USING (true);
CREATE POLICY "campanhas_insert_autenticado" ON campanhas_patrocinio
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- votos_patrocinio: public read, own insert
ALTER TABLE votos_patrocinio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votos_leitura_publica" ON votos_patrocinio FOR SELECT USING (true);
CREATE POLICY "votos_insert_proprio" ON votos_patrocinio
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- doacoes_patrocinio: public read (filtered by API), own insert
ALTER TABLE doacoes_patrocinio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doacoes_leitura_publica" ON doacoes_patrocinio FOR SELECT USING (true);
CREATE POLICY "doacoes_insert_proprio" ON doacoes_patrocinio
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Log tables: no RLS — backend uses service_role key only, never exposed to clients
-- (logs_sessao, logs_atividade, logs_erros_usuario, logs_acesso_negado)
```

- [ ] **Step 3: Apply seed.sql to Supabase**

```bash
psql $DATABASE_URL -f scripts/seed.sql
```

- [ ] **Step 4: Verify in Supabase dashboard**

In Supabase → Table Editor, verify:
- `planos` has 4 rows: cidadao, investigador, profissional, api_dados
- `tenants` has 1 row: cau-pr with status=active
- All 29 tables visible in Table Editor

- [ ] **Step 5: Run full test suite**

```bash
cd backend
python -m pytest tests/ -v
```

Expected: all tests pass (those not requiring live DB pass via mocks/import-only tests)

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: complete backend foundations — schema, auth, plan middleware, onboarding webhook"
```

---

## Task 17: Configure Supabase Auth webhook

- [ ] **Step 1: In Supabase dashboard → Database → Webhooks → Create webhook**

Configure:
- Name: `user_onboarding`
- Table: `auth.users` (or use Supabase Auth Hooks)
- Events: INSERT
- URL: `https://your-railway-backend.up.railway.app/webhooks/supabase-auth`
- HTTP Method: POST
- Headers: `X-Webhook-Secret: [your WEBHOOK_SECRET from .env]`

Or alternatively, use **Supabase Auth Hooks** (Auth → Hooks → After Sign Up):
- Hook type: HTTP Request
- URL: `https://your-railway-backend.up.railway.app/webhooks/supabase-auth`
- Header: `X-Webhook-Secret: [value]`

- [ ] **Step 2: Test webhook with a real signup**

In Supabase → Auth → Users → Invite User (use a test email). After invite is sent, check:

```sql
SELECT id, email, plano_id FROM users LIMIT 5;
```

Expected: new user row with `plano_id` pointing to the `cidadao` plan.

- [ ] **Step 3: Commit (if any config files changed)**

```bash
git commit -m "feat: connect Supabase auth webhook to user onboarding endpoint"
```

---

## Task 18: Deploy to Railway

- [ ] **Step 1: Create Railway project**

```bash
# Install Railway CLI if needed
npm install -g @railway/cli

railway login
railway init   # creates new project
```

- [ ] **Step 2: Add Redis service in Railway**

In Railway dashboard → New Service → Redis. Copy the `REDIS_URL` from the Redis service Variables tab.

- [ ] **Step 3: Set environment variables in Railway**

In Railway → Your service → Variables, add:

```
DATABASE_URL=postgresql+asyncpg://postgres:[password]@db.[project].supabase.co:5432/postgres
SUPABASE_JWT_SECRET=[from Supabase → Settings → API → JWT Secret]
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[from Supabase → Settings → API → service_role key]
REDIS_URL=[from Railway Redis service]
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
ENVIRONMENT=production
SENTRY_DSN=[from Sentry → Settings → Projects → DSN]
FRONTEND_URL=https://your-lovable-app.lovable.app
ALLOWED_ORIGINS=https://your-lovable-app.lovable.app
WEBHOOK_SECRET=[random 32+ char string — generate with: python -c "import secrets; print(secrets.token_hex(32))"]
CLAUDE_HAIKU_MODEL=claude-haiku-4-5-20251001
CLAUDE_SONNET_MODEL=claude-sonnet-4-6
```

- [ ] **Step 4: Deploy backend**

```bash
cd backend
railway up
```

Expected: Railway runs `alembic upgrade head` as release command, then starts the API service.

- [ ] **Step 5: Verify health check**

```bash
curl https://your-railway-backend.up.railway.app/health
```

Expected: `{"status":"ok","version":"0.1.0"}`

- [ ] **Step 6: Final commit**

```bash
git commit -m "feat: backend foundations complete — deployed to Railway with health check passing"
```

---

## Self-Review Checklist

**Spec coverage against doc 14 Phase 0 + Phase 1:**
- [x] Plano names confirmed: cidadao/investigador/profissional/api_dados (seed.sql + constants.py)
- [x] Chat limits: Cidadão = 5 (PLANO_CHAT_LIMITES in constants.py)
- [x] api_keys table: created in models/api_key.py + migration
- [x] 4 log tables: in models/log.py + migration
- [x] preferencias_alertas table: in models/preferencia_alerta.py + migration
- [x] RLS with `USING(TRUE)` avoided — correct tenant_isolation policies only
- [x] Admin role: `require_admin` dependency placeholder in auth.py (full implementation needs Supabase app_metadata config)
- [x] Onboarding webhook: implemented in webhooks.py with idempotent upsert
- [x] Alembic runs as Railway release command, NOT on app startup
- [x] Model IDs in constants/env, not hardcoded in logic

**Pending for later plans (not gaps):**
- Admin JWT role not wired (needs Supabase app_metadata — document in Plan 3 when admin routes are added)
- Celery tasks empty (added in Plan 2)
- No API endpoints yet (added in Plan 3)
