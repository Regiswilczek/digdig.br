"""add_timestamp_defaults

Revision ID: b1c2d3e4f5a6
Revises: a7bc30edf069
Create Date: 2026-04-23 00:00:00.000000

Add DEFAULT NOW() to all criado_em / atualizado_em / created_at / updated_at
columns that were created nullable=False but without a server default.
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a7bc30edf069'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (table, column) pairs that need DEFAULT NOW()
_TIMESTAMP_COLUMNS = [
    ("planos", "criado_em"),
    ("planos", "atualizado_em"),
    ("users", "criado_em"),
    ("users", "atualizado_em"),
    ("assinaturas", "criado_em"),
    ("tenants", "criado_em"),
    ("tenants", "atualizado_em"),
    ("user_tenant_acesso", "criado_em"),
    ("knowledge_base", "criado_em"),
    ("tenant_regras", "criado_em"),
    ("atos", "criado_em"),
    ("atos", "atualizado_em"),
    ("conteudo_ato", "criado_em"),
    ("rodadas_analise", "criado_em"),
    ("analises", "criado_em"),
    ("analises", "atualizado_em"),
    ("irregularidades", "criado_em"),
    ("pessoas", "criado_em"),
    ("pessoas", "atualizado_em"),
    ("aparicoes_pessoa", "criado_em"),
    ("relacoes_pessoas", "criado_em"),
    ("padroes_detectados", "criado_em"),
    ("chat_sessoes", "criado_em"),
    ("chat_mensagens", "criado_em"),
    ("chat_feedback", "criado_em"),
    ("relatorios", "criado_em"),
    ("campanhas_patrocinio", "created_at"),
    ("campanhas_patrocinio", "updated_at"),
    ("doacoes_patrocinio", "created_at"),
    ("votos_patrocinio", "created_at"),
    ("api_keys", "criado_em"),
    ("preferencias_alertas", "criado_em"),
    ("preferencias_alertas", "atualizado_em"),
    ("logs_atividade", "criado_em"),
    ("logs_erros_usuario", "criado_em"),
    ("logs_acesso_negado", "criado_em"),
]


def upgrade() -> None:
    for table, column in _TIMESTAMP_COLUMNS:
        op.execute(
            f"ALTER TABLE {table} ALTER COLUMN {column} SET DEFAULT NOW()"
        )


def downgrade() -> None:
    for table, column in _TIMESTAMP_COLUMNS:
        op.execute(
            f"ALTER TABLE {table} ALTER COLUMN {column} DROP DEFAULT"
        )
