import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Text, ForeignKey, DateTime, Date, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import Base


class Diaria(Base):
    __tablename__ = "diarias"
    __table_args__ = (
        UniqueConstraint("tenant_id", "codigo_processo", "periodo_ref", name="uq_diaria_processo_periodo"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    fonte_sistema: Mapped[str] = mapped_column(String(50), nullable=False, default="implanta")
    periodo_ref: Mapped[str | None] = mapped_column(String(7), nullable=True)  # 'MM/AAAA'

    codigo_processo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    nome_despesa_padrao: Mapped[str | None] = mapped_column(String(300), nullable=True)
    nome_passageiro: Mapped[str | None] = mapped_column(String(300), nullable=True)
    cpf_mascarado: Mapped[str | None] = mapped_column(String(20), nullable=True)
    origem_passageiro: Mapped[str | None] = mapped_column(String(100), nullable=True)
    valor_unitario: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    quantidade: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    valor_total: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    data_pagamento: Mapped[date | None] = mapped_column(Date, nullable=True)
    periodo_deslocamento: Mapped[str | None] = mapped_column(String(200), nullable=True)
    nome_evento: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(200), nullable=True)

    payload_raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    tenant: Mapped["Tenant"] = relationship()


class ContratoPub(Base):
    __tablename__ = "contratos_pub"
    __table_args__ = (
        UniqueConstraint("tenant_id", "numero_contrato", "fonte_sistema", name="uq_contrato_numero_fonte"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    fonte_sistema: Mapped[str] = mapped_column(String(50), nullable=False, default="implanta")
    periodo_ref: Mapped[str | None] = mapped_column(String(7), nullable=True)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False, default="contrato")  # contrato, aditivo, convenio

    numero_contrato: Mapped[str | None] = mapped_column(String(100), nullable=True)
    objeto: Mapped[str | None] = mapped_column(Text, nullable=True)
    contratado_nome: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contratado_cnpj: Mapped[str | None] = mapped_column(String(20), nullable=True)
    valor_total: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    data_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_fim: Mapped[date | None] = mapped_column(Date, nullable=True)
    situacao: Mapped[str | None] = mapped_column(String(100), nullable=True)

    payload_raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    tenant: Mapped["Tenant"] = relationship()


class LicitacaoPub(Base):
    __tablename__ = "licitacoes_pub"
    __table_args__ = (
        UniqueConstraint("tenant_id", "numero_licitacao", "fonte_sistema", name="uq_licitacao_numero_fonte"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    fonte_sistema: Mapped[str] = mapped_column(String(50), nullable=False, default="implanta")
    periodo_ref: Mapped[str | None] = mapped_column(String(7), nullable=True)

    numero_licitacao: Mapped[str | None] = mapped_column(String(100), nullable=True)
    modalidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    objeto: Mapped[str | None] = mapped_column(Text, nullable=True)
    valor_estimado: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    valor_homologado: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    data_abertura: Mapped[date | None] = mapped_column(Date, nullable=True)
    situacao: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vencedor_nome: Mapped[str | None] = mapped_column(String(500), nullable=True)
    vencedor_cnpj: Mapped[str | None] = mapped_column(String(20), nullable=True)

    payload_raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    tenant: Mapped["Tenant"] = relationship()


class DespesaPub(Base):
    __tablename__ = "despesas_pub"
    __table_args__ = (
        UniqueConstraint("tenant_id", "tipo", "numero", "periodo_ref", name="uq_despesa_tipo_numero_periodo"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    fonte_sistema: Mapped[str] = mapped_column(String(50), nullable=False, default="implanta")
    periodo_ref: Mapped[str | None] = mapped_column(String(7), nullable=True)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)  # empenho, pagamento, movimentacao

    numero: Mapped[str | None] = mapped_column(String(100), nullable=True)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    credor_nome: Mapped[str | None] = mapped_column(String(500), nullable=True)
    credor_cnpj: Mapped[str | None] = mapped_column(String(20), nullable=True)
    valor: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    data_lancamento: Mapped[date | None] = mapped_column(Date, nullable=True)
    centro_custo: Mapped[str | None] = mapped_column(String(300), nullable=True)
    categoria: Mapped[str | None] = mapped_column(String(300), nullable=True)

    payload_raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    tenant: Mapped["Tenant"] = relationship()


class PessoaPub(Base):
    __tablename__ = "pessoas_pub"
    __table_args__ = (
        UniqueConstraint("tenant_id", "nome", "cargo", "periodo_ref", name="uq_pessoa_nome_cargo_periodo"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    fonte_sistema: Mapped[str] = mapped_column(String(50), nullable=False, default="implanta")
    periodo_ref: Mapped[str | None] = mapped_column(String(7), nullable=True)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)  # conselheiro, servidor, colaborador

    nome: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cpf_mascarado: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cargo: Mapped[str | None] = mapped_column(String(300), nullable=True)
    categoria: Mapped[str | None] = mapped_column(String(300), nullable=True)
    remuneracao: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    data_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_fim: Mapped[date | None] = mapped_column(Date, nullable=True)

    payload_raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    tenant: Mapped["Tenant"] = relationship()


class BemPub(Base):
    __tablename__ = "bens_pub"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    fonte_sistema: Mapped[str] = mapped_column(String(50), nullable=False, default="implanta")
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)  # movel, imovel

    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    valor_aquisicao: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    data_aquisicao: Mapped[date | None] = mapped_column(Date, nullable=True)
    localizacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    situacao: Mapped[str | None] = mapped_column(String(100), nullable=True)

    payload_raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    tenant: Mapped["Tenant"] = relationship()
