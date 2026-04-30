import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, Text, Integer, ForeignKey, DateTime, Date, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base


class Ato(Base):
    __tablename__ = "atos"
    __table_args__ = (UniqueConstraint("tenant_id", "numero", "tipo"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    numero: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo: Mapped[str] = mapped_column(String(100), nullable=False)
    subtipo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # tipo_atlas — categoria sugerida pelo agente ATLAS (mais específica que `tipo`,
    # principalmente útil pra docs vindos de `tipo='media_library'`). Materializado
    # a partir de classificacao_atlas.categoria.
    tipo_atlas: Mapped[str | None] = mapped_column(String(40), nullable=True)
    titulo: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    data_publicacao: Mapped[date | None] = mapped_column(Date, nullable=True)
    ementa: Mapped[str | None] = mapped_column(Text, nullable=True)
    url_original: Mapped[str | None] = mapped_column(Text, nullable=True)
    url_pdf: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_baixado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pdf_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_tamanho_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pdf_paginas: Mapped[int | None] = mapped_column(Integer, nullable=True)
    processado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    erro_download: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="atos")
    conteudo: Mapped["ConteudoAto | None"] = relationship(back_populates="ato", uselist=False)
    analises: Mapped[list["Analise"]] = relationship(back_populates="ato")
    aparicoes: Mapped[list["AparicaoPessoa"]] = relationship(back_populates="ato")
    classificacao_atlas: Mapped["ClassificacaoAtlas | None"] = relationship(
        back_populates="ato", uselist=False, foreign_keys="ClassificacaoAtlas.ato_id",
    )


class ConteudoAto(Base):
    __tablename__ = "conteudo_ato"

    ato_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("atos.id", ondelete="CASCADE"), primary_key=True)
    texto_completo: Mapped[str] = mapped_column(Text, nullable=False)
    metodo_extracao: Mapped[str] = mapped_column(String(50), nullable=False, default="pdfplumber")
    qualidade: Mapped[str | None] = mapped_column(String(20), default="boa")
    tokens_estimados: Mapped[int | None] = mapped_column(Integer, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    ato: Mapped["Ato"] = relationship(back_populates="conteudo")


class RodadaAnalise(Base):
    __tablename__ = "rodadas_analise"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pendente")
    total_atos: Mapped[int] = mapped_column(Integer, default=0)
    atos_scrapeados: Mapped[int] = mapped_column(Integer, default=0)
    atos_analisados_piper: Mapped[int] = mapped_column(Integer, default=0)
    atos_analisados_bud: Mapped[int] = mapped_column(Integer, default=0)
    custo_total_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=Decimal("0"))
    # Agente principal da rodada — usado pelo painel pra mostrar progress bar do agente certo.
    # Valores: 'piper' | 'bud' | 'new' | NULL (legado / orquestrador completo).
    agente: Mapped[str | None] = mapped_column(String(20), nullable=True)
    erro_mensagem: Mapped[str | None] = mapped_column(Text, nullable=True)
    iniciado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    concluido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
