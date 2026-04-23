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
