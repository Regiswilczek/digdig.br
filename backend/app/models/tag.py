import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class AtoTag(Base):
    __tablename__ = "ato_tags"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ato_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("atos.id", ondelete="CASCADE"), nullable=False)
    analise_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("analises.id", ondelete="CASCADE"), nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)

    codigo: Mapped[str] = mapped_column(String(100), nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    categoria: Mapped[str] = mapped_column(String(50), nullable=False)
    categoria_nome: Mapped[str] = mapped_column(String(255), nullable=False)
    gravidade: Mapped[str] = mapped_column(String(20), nullable=False)

    ativa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    atribuido_por: Mapped[str] = mapped_column(String(20), nullable=False)  # piper | bud | new
    revisado_por: Mapped[str | None] = mapped_column(String(20), nullable=True)
    justificativa: Mapped[str | None] = mapped_column(Text, nullable=True)

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class TagHistorico(Base):
    __tablename__ = "tag_historico"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ato_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("atos.id", ondelete="CASCADE"), nullable=False)
    analise_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("analises.id", ondelete="CASCADE"), nullable=False)

    tag_codigo: Mapped[str] = mapped_column(String(100), nullable=False)
    acao: Mapped[str] = mapped_column(String(20), nullable=False)  # adicionada|confirmada|removida|elevada|rebaixada
    modelo: Mapped[str] = mapped_column(String(20), nullable=False)  # piper|bud|new
    justificativa: Mapped[str | None] = mapped_column(Text, nullable=True)
    gravidade_anterior: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gravidade_nova: Mapped[str | None] = mapped_column(String(20), nullable=True)

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
