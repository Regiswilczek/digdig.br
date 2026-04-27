"""add_financial_tables

Revision ID: d3e4f5a6b7c8
Revises: b2c41fae9012
Create Date: 2026-04-27

Cria 6 tabelas de dados financeiros estruturados:
  diarias, contratos_pub, licitacoes_pub, despesas_pub, pessoas_pub, bens_pub

Cada tabela tem tenant_id (isolamento multi-tenant), fonte_sistema (qual portal
forneceu o dado), periodo_ref (MM/AAAA para APIs mensais como Implanta),
payload_raw JSONB (dados brutos completos) e os campos principais extraídos
para indexação e busca.

RLS habilitado em todas as tabelas com política de leitura pública por tenant.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = '443b24295270'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── diarias ──────────────────────────────────────────────────────────────
    op.create_table(
        'diarias',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('fonte_sistema', sa.String(50), nullable=False, server_default='implanta'),
        sa.Column('periodo_ref', sa.String(7), nullable=True),
        sa.Column('codigo_processo', sa.String(100), nullable=True),
        sa.Column('nome_despesa_padrao', sa.String(300), nullable=True),
        sa.Column('nome_passageiro', sa.String(300), nullable=True),
        sa.Column('cpf_mascarado', sa.String(20), nullable=True),
        sa.Column('origem_passageiro', sa.String(100), nullable=True),
        sa.Column('valor_unitario', sa.Numeric(15, 2), nullable=True),
        sa.Column('quantidade', sa.Numeric(10, 2), nullable=True),
        sa.Column('valor_total', sa.Numeric(15, 2), nullable=True),
        sa.Column('data_pagamento', sa.Date, nullable=True),
        sa.Column('periodo_deslocamento', sa.String(200), nullable=True),
        sa.Column('nome_evento', sa.String(500), nullable=True),
        sa.Column('cidade', sa.String(200), nullable=True),
        sa.Column('payload_raw', postgresql.JSONB, nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'codigo_processo', 'periodo_ref', name='uq_diaria_processo_periodo'),
    )
    op.create_index('ix_diarias_tenant_id', 'diarias', ['tenant_id'])
    op.create_index('ix_diarias_data_pagamento', 'diarias', ['data_pagamento'])
    op.create_index('ix_diarias_nome_passageiro', 'diarias', ['nome_passageiro'])

    # ── contratos_pub ─────────────────────────────────────────────────────────
    op.create_table(
        'contratos_pub',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('fonte_sistema', sa.String(50), nullable=False, server_default='implanta'),
        sa.Column('periodo_ref', sa.String(7), nullable=True),
        sa.Column('tipo', sa.String(50), nullable=False, server_default='contrato'),
        sa.Column('numero_contrato', sa.String(100), nullable=True),
        sa.Column('objeto', sa.Text, nullable=True),
        sa.Column('contratado_nome', sa.String(500), nullable=True),
        sa.Column('contratado_cnpj', sa.String(20), nullable=True),
        sa.Column('valor_total', sa.Numeric(15, 2), nullable=True),
        sa.Column('data_inicio', sa.Date, nullable=True),
        sa.Column('data_fim', sa.Date, nullable=True),
        sa.Column('situacao', sa.String(100), nullable=True),
        sa.Column('payload_raw', postgresql.JSONB, nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'numero_contrato', 'fonte_sistema', name='uq_contrato_numero_fonte'),
    )
    op.create_index('ix_contratos_pub_tenant_id', 'contratos_pub', ['tenant_id'])
    op.create_index('ix_contratos_pub_contratado_cnpj', 'contratos_pub', ['contratado_cnpj'])

    # ── licitacoes_pub ────────────────────────────────────────────────────────
    op.create_table(
        'licitacoes_pub',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('fonte_sistema', sa.String(50), nullable=False, server_default='implanta'),
        sa.Column('periodo_ref', sa.String(7), nullable=True),
        sa.Column('numero_licitacao', sa.String(100), nullable=True),
        sa.Column('modalidade', sa.String(100), nullable=True),
        sa.Column('objeto', sa.Text, nullable=True),
        sa.Column('valor_estimado', sa.Numeric(15, 2), nullable=True),
        sa.Column('valor_homologado', sa.Numeric(15, 2), nullable=True),
        sa.Column('data_abertura', sa.Date, nullable=True),
        sa.Column('situacao', sa.String(100), nullable=True),
        sa.Column('vencedor_nome', sa.String(500), nullable=True),
        sa.Column('vencedor_cnpj', sa.String(20), nullable=True),
        sa.Column('payload_raw', postgresql.JSONB, nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'numero_licitacao', 'fonte_sistema', name='uq_licitacao_numero_fonte'),
    )
    op.create_index('ix_licitacoes_pub_tenant_id', 'licitacoes_pub', ['tenant_id'])

    # ── despesas_pub ──────────────────────────────────────────────────────────
    op.create_table(
        'despesas_pub',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('fonte_sistema', sa.String(50), nullable=False, server_default='implanta'),
        sa.Column('periodo_ref', sa.String(7), nullable=True),
        sa.Column('tipo', sa.String(50), nullable=False),
        sa.Column('numero', sa.String(100), nullable=True),
        sa.Column('descricao', sa.Text, nullable=True),
        sa.Column('credor_nome', sa.String(500), nullable=True),
        sa.Column('credor_cnpj', sa.String(20), nullable=True),
        sa.Column('valor', sa.Numeric(15, 2), nullable=True),
        sa.Column('data_lancamento', sa.Date, nullable=True),
        sa.Column('centro_custo', sa.String(300), nullable=True),
        sa.Column('categoria', sa.String(300), nullable=True),
        sa.Column('payload_raw', postgresql.JSONB, nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'tipo', 'numero', 'periodo_ref', name='uq_despesa_tipo_numero_periodo'),
    )
    op.create_index('ix_despesas_pub_tenant_id', 'despesas_pub', ['tenant_id'])
    op.create_index('ix_despesas_pub_credor_cnpj', 'despesas_pub', ['credor_cnpj'])

    # ── pessoas_pub ───────────────────────────────────────────────────────────
    op.create_table(
        'pessoas_pub',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('fonte_sistema', sa.String(50), nullable=False, server_default='implanta'),
        sa.Column('periodo_ref', sa.String(7), nullable=True),
        sa.Column('tipo', sa.String(50), nullable=False),
        sa.Column('nome', sa.String(500), nullable=True),
        sa.Column('cpf_mascarado', sa.String(20), nullable=True),
        sa.Column('cargo', sa.String(300), nullable=True),
        sa.Column('categoria', sa.String(300), nullable=True),
        sa.Column('remuneracao', sa.Numeric(15, 2), nullable=True),
        sa.Column('data_inicio', sa.Date, nullable=True),
        sa.Column('data_fim', sa.Date, nullable=True),
        sa.Column('payload_raw', postgresql.JSONB, nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'nome', 'cargo', 'periodo_ref', name='uq_pessoa_nome_cargo_periodo'),
    )
    op.create_index('ix_pessoas_pub_tenant_id', 'pessoas_pub', ['tenant_id'])
    op.create_index('ix_pessoas_pub_nome', 'pessoas_pub', ['nome'])

    # ── bens_pub ──────────────────────────────────────────────────────────────
    op.create_table(
        'bens_pub',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('fonte_sistema', sa.String(50), nullable=False, server_default='implanta'),
        sa.Column('tipo', sa.String(20), nullable=False),
        sa.Column('descricao', sa.Text, nullable=True),
        sa.Column('valor_aquisicao', sa.Numeric(15, 2), nullable=True),
        sa.Column('data_aquisicao', sa.Date, nullable=True),
        sa.Column('localizacao', sa.String(500), nullable=True),
        sa.Column('situacao', sa.String(100), nullable=True),
        sa.Column('payload_raw', postgresql.JSONB, nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_bens_pub_tenant_id', 'bens_pub', ['tenant_id'])

    # ── RLS em todas as tabelas ───────────────────────────────────────────────
    for tabela in ('diarias', 'contratos_pub', 'licitacoes_pub', 'despesas_pub', 'pessoas_pub', 'bens_pub'):
        op.execute(f'ALTER TABLE {tabela} ENABLE ROW LEVEL SECURITY')
        op.execute(f'''
            CREATE POLICY "{tabela}_public_read"
            ON {tabela} FOR SELECT
            USING (true)
        ''')
        op.execute(f'''
            CREATE POLICY "{tabela}_service_write"
            ON {tabela} FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true)
        ''')


def downgrade() -> None:
    for tabela in ('bens_pub', 'pessoas_pub', 'despesas_pub', 'licitacoes_pub', 'contratos_pub', 'diarias'):
        op.drop_table(tabela)
