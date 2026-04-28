"""add_cvss_icp_metrics

Revision ID: f6a7b8c9d0e1
Revises: e1f2a3b4c5d6
Create Date: 2026-04-28 00:00:00.000000

Adiciona:
- Colunas CVSS-A na tabela analises (cvss_score, cvss_vector, cvss_fi/li/ri/av/ac/pr)
- Colunas ICP na tabela pessoas (icp_individual, icp_atualizado_em)
- Nova tabela icp_orgao (snapshots de concentração de poder por órgão)
- Índices para performance nas queries de métricas
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── CVSS-A: colunas na tabela analises ────────────────────────────────────
    op.add_column('analises', sa.Column('cvss_score', sa.Numeric(3, 1), nullable=True))
    op.add_column('analises', sa.Column('cvss_vector', sa.String(100), nullable=True))
    op.add_column('analises', sa.Column('cvss_fi', sa.String(20), nullable=True))
    op.add_column('analises', sa.Column('cvss_li', sa.String(20), nullable=True))
    op.add_column('analises', sa.Column('cvss_ri', sa.String(20), nullable=True))
    op.add_column('analises', sa.Column('cvss_av', sa.String(20), nullable=True))
    op.add_column('analises', sa.Column('cvss_ac', sa.String(20), nullable=True))
    op.add_column('analises', sa.Column('cvss_pr', sa.String(20), nullable=True))

    op.create_index(
        'idx_analises_cvss',
        'analises',
        ['cvss_score'],
        postgresql_where=sa.text('cvss_score IS NOT NULL'),
        postgresql_ops={'cvss_score': 'DESC'},
    )

    # ── ICP: colunas na tabela pessoas ────────────────────────────────────────
    op.add_column('pessoas', sa.Column('icp_individual', sa.Numeric(5, 2), nullable=True))
    op.add_column('pessoas', sa.Column('icp_atualizado_em', sa.DateTime(timezone=True), nullable=True))

    op.create_index(
        'idx_pessoas_icp',
        'pessoas',
        ['icp_individual'],
        postgresql_where=sa.text('icp_individual IS NOT NULL'),
        postgresql_ops={'icp_individual': 'DESC'},
    )

    # ── ICP: nova tabela icp_orgao ────────────────────────────────────────────
    op.create_table(
        'icp_orgao',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('calculado_em', sa.DateTime(timezone=True),
                  server_default=sa.text('NOW()'), nullable=False),
        sa.Column('icp_sistemico', sa.Numeric(5, 4), nullable=True),
        sa.Column('total_atos', sa.Integer, nullable=True),
        sa.Column('total_pessoas', sa.Integer, nullable=True),
        sa.Column('top_concentradores', postgresql.JSONB, nullable=True),
    )

    op.create_index(
        'idx_icp_orgao_tenant_data',
        'icp_orgao',
        ['tenant_id', 'calculado_em'],
        postgresql_ops={'calculado_em': 'DESC'},
    )


def downgrade() -> None:
    op.drop_index('idx_icp_orgao_tenant_data', table_name='icp_orgao')
    op.drop_table('icp_orgao')

    op.drop_index('idx_pessoas_icp', table_name='pessoas')
    op.drop_column('pessoas', 'icp_atualizado_em')
    op.drop_column('pessoas', 'icp_individual')

    op.drop_index('idx_analises_cvss', table_name='analises')
    op.drop_column('analises', 'cvss_pr')
    op.drop_column('analises', 'cvss_ac')
    op.drop_column('analises', 'cvss_av')
    op.drop_column('analises', 'cvss_ri')
    op.drop_column('analises', 'cvss_li')
    op.drop_column('analises', 'cvss_fi')
    op.drop_column('analises', 'cvss_vector')
    op.drop_column('analises', 'cvss_score')
