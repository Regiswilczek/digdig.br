import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, DateTime, Date, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from app.models.base import Base


class Pessoa(Base):
    __tablename__ = "pessoas"
    __table_args__ = (UniqueConstraint("tenant_id", "nome_normalizado"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    nome_normalizado: Mapped[str] = mapped_column(String(500), nullable=False)
    variantes_nome: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    cargo_mais_recente: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Preparação Fase 3 (cross-tenant). Quando preenchido, permite identificar a
    # mesma pessoa em órgãos diferentes via tabela pessoa_canonica (futura).
    cpf_normalizado: Mapped[str | None] = mapped_column(String(11), nullable=True)
    tipo: Mapped[str] = mapped_column(String(50), default="pessoa_fisica")
    total_aparicoes: Mapped[int] = mapped_column(Integer, default=0)
    primeiro_ato_data: Mapped[date | None] = mapped_column(Date, nullable=True)
    ultimo_ato_data: Mapped[date | None] = mapped_column(Date, nullable=True)
    score_concentracao: Mapped[int] = mapped_column(Integer, default=0)
    eh_suspeito: Mapped[bool] = mapped_column(Boolean, default=False)
    icp_individual: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    icp_atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

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
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

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
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class IcpOrgao(Base):
    __tablename__ = "icp_orgao"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    calculado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    icp_sistemico: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    total_atos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_pessoas: Mapped[int | None] = mapped_column(Integer, nullable=True)
    top_concentradores: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
