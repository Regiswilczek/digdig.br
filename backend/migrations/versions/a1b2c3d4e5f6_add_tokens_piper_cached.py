"""add tokens_piper_cached para monitorar implicit caching do Gemini

Revision ID: a1b2c3d4e5f6
Revises: f6a7b8c9d0e1
Create Date: 2026-04-28 00:00:00.000000

Adiciona:
- Coluna tokens_piper_cached na tabela analises
  Registra quantos tokens do input foram servidos pelo implicit cache do Gemini 2.5 Pro.
  NULL = análise anterior à feature; 0 = sem cache hit; >0 = tokens cacheados.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'analises',
        sa.Column('tokens_piper_cached', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('analises', 'tokens_piper_cached')
