"""user_panel_avatar_favoritos

Revision ID: d3e4f5a6b7c9
Revises: c2d3e4f5a6b8
Create Date: 2026-04-30 08:00:00.000000

Adiciona infra do painel do usuário:
- users.avatar_url — URL da foto de perfil (servida via Supabase Storage)
- atos_favoritos — tabela de favoritos do usuário (user_id + ato_id PK composta)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd3e4f5a6b7c9'
down_revision: Union[str, None] = 'c2d3e4f5a6b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Avatar URL no User
    op.add_column('users', sa.Column('avatar_url', sa.Text, nullable=True))

    # Tabela de favoritos
    op.create_table(
        'atos_favoritos',
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ato_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('atos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('nota', sa.Text, nullable=True),  # nota pessoal opcional
        sa.Column('criado_em', sa.DateTime(timezone=True),
                  server_default=sa.text('NOW()'), nullable=False),
        sa.PrimaryKeyConstraint('user_id', 'ato_id'),
    )

    op.create_index('idx_favoritos_user_criado', 'atos_favoritos',
                    ['user_id', 'criado_em'],
                    postgresql_ops={'criado_em': 'DESC'})
    op.create_index('idx_favoritos_ato', 'atos_favoritos', ['ato_id'])

    # RLS — usuário só lê/escreve os próprios favoritos
    op.execute("ALTER TABLE atos_favoritos ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY favoritos_owner_all ON atos_favoritos "
        "FOR ALL USING (user_id = auth.uid()::uuid) "
        "WITH CHECK (user_id = auth.uid()::uuid)"
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS favoritos_owner_all ON atos_favoritos")
    op.drop_index('idx_favoritos_ato', table_name='atos_favoritos')
    op.drop_index('idx_favoritos_user_criado', table_name='atos_favoritos')
    op.drop_table('atos_favoritos')
    op.drop_column('users', 'avatar_url')
