"""access_request_perfil_questions

Revision ID: i8j9k0l1m2n3
Revises: h7i8j9k0l1m2
Create Date: 2026-05-01 08:00:00.000000

Adiciona 3 campos obrigatórios em access_requests para qualificar o perfil
de quem solicita acesso ao Dig Dig:

  • filiado_partido_politico BOOL: se a pessoa é filiada a partido político
  • partido_politico TEXT (nullable): sigla/nome do partido (preenchido só
    quando filiado_partido_politico=true)
  • agente_publico BOOL: se a pessoa é agente público
  • como_encontrou TEXT: texto livre — como a pessoa descobriu o Dig Dig

Defaults nullable=True com server_default p/ não quebrar registros antigos;
constraint de aplicação fica no código (Pydantic do endpoint).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "i8j9k0l1m2n3"
down_revision: Union[str, None] = "h7i8j9k0l1m2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "access_requests",
        sa.Column("filiado_partido_politico", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "access_requests",
        sa.Column("partido_politico", sa.Text(), nullable=True),
    )
    op.add_column(
        "access_requests",
        sa.Column("agente_publico", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "access_requests",
        sa.Column("como_encontrou", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("access_requests", "como_encontrou")
    op.drop_column("access_requests", "agente_publico")
    op.drop_column("access_requests", "partido_politico")
    op.drop_column("access_requests", "filiado_partido_politico")
