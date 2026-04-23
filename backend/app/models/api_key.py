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
