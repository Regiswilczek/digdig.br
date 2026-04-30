"""add custo_piper_usd / custo_bud_usd / custo_new_usd em analises

Revision ID: c2d3e4f5a6b7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-30 04:10:00.000000

Antes: analises.custo_usd era a soma dos 3 agentes — sem breakdown.
Depois: cada agente grava seu custo isolado, custo_usd permanece como soma
para preservar APIs e dashboards já existentes.

Colunas novas são nullable para diferenciar análises antigas (NULL = não
medido na época do Piper/Bud/New) de novas (0 = agente rodou e custou 0).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Supabase impõe statement_timeout curto na role de migração; ADD COLUMN
    # NULL é metadata-only (rápido), mas se algum worker estiver com transação
    # aberta em analises o ALTER fica esperando o ACCESS EXCLUSIVE lock e
    # estoura. Subimos os timeouts só pra esta transação.
    op.execute("SET LOCAL lock_timeout = '5min'")
    op.execute("SET LOCAL statement_timeout = '6min'")
    op.add_column("analises", sa.Column("custo_piper_usd", sa.Numeric(10, 6), nullable=True))
    op.add_column("analises", sa.Column("custo_bud_usd", sa.Numeric(10, 6), nullable=True))
    op.add_column("analises", sa.Column("custo_new_usd", sa.Numeric(10, 6), nullable=True))


def downgrade() -> None:
    op.drop_column("analises", "custo_new_usd")
    op.drop_column("analises", "custo_bud_usd")
    op.drop_column("analises", "custo_piper_usd")
