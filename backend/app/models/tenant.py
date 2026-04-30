import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, CHAR, DateTime, Date, func
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
    descricao_curta: Mapped[str | None] = mapped_column(String(200), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    site_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    cor_tema: Mapped[str | None] = mapped_column(String(7), nullable=True)
    estado: Mapped[str | None] = mapped_column(CHAR(2), nullable=True)
    tipo_orgao: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="coming_soon")
    scraper_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    # Mindset de auditoria — prosa específica do tipo de órgão. Injetado no
    # SYSTEM_PROMPT_TEMPLATE via {mindset_auditoria}. Saiu de hardcode no piper.
    mindset_auditoria_md: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

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
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

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
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="regras")
