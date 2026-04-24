"""rodada_unique_active_per_tenant

Revision ID: b2c41fae9012
Revises: a7bc30edf069
Create Date: 2026-04-24

Prevents more than one active (em_progresso or pendente) rodada per tenant at the
database level. The partial unique index is the last line of defence — the API
endpoint already checks this in code, but the DB constraint ensures it even if
the check is bypassed (e.g. concurrent requests, direct SQL, future code paths).
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'b2c41fae9012'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE UNIQUE INDEX idx_rodada_uma_ativa_por_tenant
        ON rodadas_analise (tenant_id)
        WHERE status IN ('em_progresso', 'pendente')
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_rodada_uma_ativa_por_tenant")
