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
    metadados: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
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
