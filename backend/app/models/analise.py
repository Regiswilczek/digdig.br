import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, DateTime, Numeric, func
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
    resumo_executivo: Mapped[str | None] = mapped_column(Text, nullable=True)
    recomendacao_campanha: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Agentes: Piper (Gemini Pro), Bud (Sonnet), New (Opus)
    analisado_por_piper: Mapped[bool] = mapped_column(Boolean, default=False)
    analisado_por_bud: Mapped[bool] = mapped_column(Boolean, default=False)
    analisado_por_new: Mapped[bool] = mapped_column(Boolean, default=False)
    resultado_piper: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    resultado_bud: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    resultado_new: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tokens_piper: Mapped[int] = mapped_column(Integer, default=0)
    tokens_piper_cached: Mapped[int | None] = mapped_column(Integer, nullable=True)  # tokens com implicit cache hit
    tokens_bud: Mapped[int] = mapped_column(Integer, default=0)
    tokens_new: Mapped[int] = mapped_column(Integer, default=0)
    custo_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=Decimal("0"))
    # Breakdown de custo por agente — NULL em registros pré-2026-04-30; backfill
    # estima a partir de tokens_*. Soma de custo_piper+bud+new pode divergir de
    # custo_usd em alguns centavos por arredondamento, é esperado.
    custo_piper_usd: Mapped[Decimal | None] = mapped_column(Numeric(10, 6), nullable=True)
    custo_bud_usd: Mapped[Decimal | None] = mapped_column(Numeric(10, 6), nullable=True)
    custo_new_usd: Mapped[Decimal | None] = mapped_column(Numeric(10, 6), nullable=True)

    # CVSS-A — calculado deterministicamente pelo backend após extração do Piper
    cvss_score: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)
    cvss_vector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cvss_fi: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cvss_li: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cvss_ri: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cvss_av: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cvss_ac: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cvss_pr: Mapped[str | None] = mapped_column(String(20), nullable=True)

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

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
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    analise: Mapped["Analise"] = relationship(back_populates="irregularidades")
