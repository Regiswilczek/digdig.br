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
