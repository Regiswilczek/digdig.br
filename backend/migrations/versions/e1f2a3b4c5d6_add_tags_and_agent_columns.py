"""add_tags_and_agent_columns

Revision ID: e1f2a3b4c5d6
Revises: d3e4f5a6b7c8
Create Date: 2026-04-28 00:00:00.000000

Adiciona:
- Tabela ato_tags (tags de irregularidade por ato)
- Tabela tag_historico (audit trail de revisões de tags)
- Colunas piper/bud/new na tabela analises
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Novas colunas em analises ──────────────────────────────────────────
    op.add_column('analises', sa.Column('analisado_por_piper', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('analises', sa.Column('analisado_por_bud',   sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('analises', sa.Column('analisado_por_new',   sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('analises', sa.Column('resultado_piper', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('analises', sa.Column('resultado_bud',   postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('analises', sa.Column('resultado_new',   postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('analises', sa.Column('tokens_piper', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('analises', sa.Column('tokens_bud',   sa.Integer(), nullable=False, server_default='0'))
    op.add_column('analises', sa.Column('tokens_new',   sa.Integer(), nullable=False, server_default='0'))

    # ── Tabela ato_tags ────────────────────────────────────────────────────
    op.create_table(
        'ato_tags',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ato_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('analise_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('codigo', sa.String(100), nullable=False),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('categoria', sa.String(50), nullable=False),
        sa.Column('categoria_nome', sa.String(255), nullable=False),
        sa.Column('gravidade', sa.String(20), nullable=False),
        sa.Column('ativa', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('atribuido_por', sa.String(20), nullable=False),
        sa.Column('revisado_por', sa.String(20), nullable=True),
        sa.Column('justificativa', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['ato_id'], ['atos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['analise_id'], ['analises.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_ato_tags_ato_id',    'ato_tags', ['ato_id'])
    op.create_index('ix_ato_tags_codigo',    'ato_tags', ['codigo'])
    op.create_index('ix_ato_tags_tenant_id', 'ato_tags', ['tenant_id'])
    op.create_index('ix_ato_tags_ativa',     'ato_tags', ['ativa'])

    # ── Tabela tag_historico ───────────────────────────────────────────────
    op.create_table(
        'tag_historico',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ato_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('analise_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tag_codigo', sa.String(100), nullable=False),
        sa.Column('acao', sa.String(20), nullable=False),
        sa.Column('modelo', sa.String(20), nullable=False),
        sa.Column('justificativa', sa.Text(), nullable=True),
        sa.Column('gravidade_anterior', sa.String(20), nullable=True),
        sa.Column('gravidade_nova', sa.String(20), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['ato_id'], ['atos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['analise_id'], ['analises.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_tag_historico_ato_id', 'tag_historico', ['ato_id'])


def downgrade() -> None:
    op.drop_table('tag_historico')
    op.drop_table('ato_tags')
    op.drop_column('analises', 'tokens_new')
    op.drop_column('analises', 'tokens_bud')
    op.drop_column('analises', 'tokens_piper')
    op.drop_column('analises', 'resultado_new')
    op.drop_column('analises', 'resultado_bud')
    op.drop_column('analises', 'resultado_piper')
    op.drop_column('analises', 'analisado_por_new')
    op.drop_column('analises', 'analisado_por_bud')
    op.drop_column('analises', 'analisado_por_piper')
