"""analises rodada_id nullable for standalone analysis

Revision ID: 443b24295270
Revises: 8aeb11453ab7
Create Date: 2026-04-26 03:02:56.051388

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '443b24295270'
down_revision: Union[str, None] = '8aeb11453ab7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("analises", "rodada_id", nullable=True)


def downgrade() -> None:
    op.alter_column("analises", "rodada_id", nullable=False)
