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
    mercadopago_payment_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
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
