"""
classificacao_atlas — saída do agente ATLAS (organização estrutural pré-Piper).

ATLAS classifica cada ato em uma taxonomia fechada antes do Piper rodar.
Não decide políticas de pipeline — é puro metadado estrutural.
Tabela separada de `analises` porque ATLAS roda 1x por ato (sem rodada),
evolui de prompt independente, e idempotência é simples.
"""
import uuid
from datetime import datetime, date
from decimal import Decimal

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Integer, Numeric, SmallInteger,
    String, Text, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ClassificacaoAtlas(Base):
    __tablename__ = "classificacao_atlas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ato_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("atos.id", ondelete="CASCADE"),
        nullable=False, unique=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )

    # Classificação principal
    categoria: Mapped[str] = mapped_column(String(40), nullable=False)
    subcategoria: Mapped[str | None] = mapped_column(String(120), nullable=True)
    confianca_categoria: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False)

    # Sinais crus (separados de política)
    densidade_textual: Mapped[str] = mapped_column(String(20), nullable=False)
    idioma: Mapped[str | None] = mapped_column(String(5), nullable=True)

    # Metadata estrutural
    numero_oficial: Mapped[str | None] = mapped_column(String(100), nullable=True)
    data_documento: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_documento_confianca: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    ano_referencia: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    valor_envolvido_brl: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)

    # Síntese
    resumo_curto: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Advisory (Fase 1 ignora)
    vai_para_piper: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    motivo_skip: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt_piper_sugerido: Mapped[str | None] = mapped_column(String(40), nullable=True)

    # JSONB: pessoas_mencionadas, orgaos_externos, processos_referenciados, tags
    dados_extras: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Duplicata — preenchido por SQL pós-Fase 1
    duplicado_de_ato_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("atos.id"), nullable=True
    )

    # Versionamento + custos
    atlas_prompt_version: Mapped[str] = mapped_column(String(20), nullable=False)
    atlas_model: Mapped[str] = mapped_column(String(80), nullable=False)
    tokens_input: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tokens_output: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    custo_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False, default=Decimal("0"))

    # Auditoria
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    processado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    ato: Mapped["Ato"] = relationship(
        back_populates="classificacao_atlas",
        foreign_keys=[ato_id],
    )
