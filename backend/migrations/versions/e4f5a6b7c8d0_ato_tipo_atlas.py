"""ato_tipo_atlas

Revision ID: e4f5a6b7c8d0
Revises: d3e4f5a6b7c9
Create Date: 2026-04-30 09:00:00.000000

Adiciona coluna `tipo_atlas` em atos — categoria ATLAS materializada na
linha do ato. Facilita queries (SELECT atos WHERE tipo_atlas='licitacao')
sem JOIN em classificacao_atlas, e permite a UI mostrar a quebra de
media_library nas 17 categorias do ATLAS.

Backfill é feito por script separado (`atlas_backfill_tipo.py`) e não
nesta migration — pra ser idempotente e re-rodável quando ATLAS for
reprocessado.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e4f5a6b7c8d0'
down_revision: Union[str, None] = 'd3e4f5a6b7c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('atos', sa.Column('tipo_atlas', sa.String(40), nullable=True))
    op.create_index(
        'idx_atos_tenant_tipo_atlas', 'atos',
        ['tenant_id', 'tipo_atlas'],
        postgresql_where=sa.text('tipo_atlas IS NOT NULL'),
    )


def downgrade() -> None:
    op.drop_index('idx_atos_tenant_tipo_atlas', table_name='atos')
    op.drop_column('atos', 'tipo_atlas')
