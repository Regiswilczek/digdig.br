"""atos_metadata_extra

Revision ID: h7i8j9k0l1m2
Revises: g6h7i8j9k0l1
Create Date: 2026-04-30 22:00:00.000000

Cria tabela `atos_metadata` (1:1 com atos via FK) pra guardar colunas
dinâmicas dos diversos sub-itens do PTE (Licitações, Contratos, Dispensas,
Remuneração, etc.) sem alterar o schema canônico de `atos`.

Cada sub-item do PTE traz um conjunto diferente de campos (Modalidade,
Órgão Responsável, Valor Homologado, Situação, Protocolo, etc.) — esses
ficam todos em `atos_metadata.dados` JSONB. Os campos canônicos de `atos`
(numero, titulo, ementa, data_publicacao, url_pdf) recebem o melhor
mapeamento por best-effort.

Decisão: tabela separada em vez de ADD COLUMN porque o pooler do Supabase
estava bloqueando a operação ALTER (statement_timeout). CREATE TABLE não
toca em locks de tabelas existentes.

Coluna `coletado_em` permite rastrear quando o inventário foi feito —
diferente de `atos.criado_em` (que pode ser de quando o ato foi inserido
em qualquer outro pipeline).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "h7i8j9k0l1m2"
down_revision: Union[str, None] = "g6h7i8j9k0l1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "atos_metadata",
        sa.Column("ato_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dados", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "coletado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["ato_id"], ["atos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("ato_id"),
    )


def downgrade() -> None:
    op.drop_table("atos_metadata")
