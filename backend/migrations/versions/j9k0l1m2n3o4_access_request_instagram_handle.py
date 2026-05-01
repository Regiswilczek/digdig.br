"""access_request_instagram_handle

Revision ID: j9k0l1m2n3o4
Revises: i8j9k0l1m2n3
Create Date: 2026-05-01 08:30:00.000000

Adiciona coluna `instagram_handle` em access_requests (opcional). O @ é
usado pelo admin para verificação manual de identidade no momento da
aprovação — abrindo `https://instagram.com/<handle>` em outra aba e
julgando se o perfil é coerente com o que foi declarado.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "j9k0l1m2n3o4"
down_revision: Union[str, None] = "i8j9k0l1m2n3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "access_requests",
        sa.Column("instagram_handle", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("access_requests", "instagram_handle")
