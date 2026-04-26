"""add unique constraint atos tenant numero tipo

Revision ID: 8aeb11453ab7
Revises: b89c055878e9
Create Date: 2026-04-26 02:36:41.119518

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8aeb11453ab7'
down_revision: Union[str, None] = 'b2c41fae9012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "uq_atos_tenant_numero_tipo",
        "atos",
        ["tenant_id", "numero", "tipo"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_atos_tenant_numero_tipo", table_name="atos")
