"""fase0_multitenant_foundation

Revision ID: f5a6b7c8d0e2
Revises: e4f5a6b7c8d0
Create Date: 2026-05-01 09:00:00.000000

Fase 0 do plano de onboarding GOV-PR — refatoração de fundação multi-tenant.

Mudanças:
- `tenants.mindset_auditoria_md` (text) — mindset de auditoria por tenant,
  saindo do prompt hardcoded em piper_service.py
- `tenants.cor_tema` (varchar 7) — hex color pra tema do painel por órgão
- `tenants.descricao_curta` (varchar 200) — usado na sidebar dinâmica
- `pessoas.cpf_normalizado` (varchar 11) + index — preparação Fase 3 (cross-tenant)
- `atos.fonte_sistema` (varchar 50, default 'web') — distinguir DOE-PR vs Implanta etc
- nova tabela `atlas_categoria_tipo_orgao` — controla quais categorias ATLAS
  aplicam-se a quais tipos de órgão e se Piper roda por padrão

KnowledgeBase NÃO muda — cada tenant continua com KB própria fechada.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f5a6b7c8d0e2'
down_revision: Union[str, None] = 'e4f5a6b7c8d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Categorias ATLAS atuais (17) — todas aplicam-se a 'conselho' e o resto
# default true pra não quebrar comportamento existente
CATEGORIAS_INICIAIS = [
    'licitacao', 'contrato', 'aditivo_contratual',
    'financeiro_balanco', 'financeiro_orcamento', 'financeiro_demonstrativo',
    'auditoria_externa', 'deliberacao_arquivo', 'portaria_arquivo',
    'ata_plenaria', 'ata_pauta_comissao', 'relatorio_gestao',
    'processo_etico', 'recursos_humanos', 'juridico_parecer',
    'comunicacao_institucional', 'placa_certidao', 'outros',
]


def upgrade() -> None:
    # ── tenants: perfil ─────────────────────────────────────────────────
    op.add_column('tenants', sa.Column('mindset_auditoria_md', sa.Text, nullable=True))
    op.add_column('tenants', sa.Column('cor_tema', sa.String(7), nullable=True))
    op.add_column('tenants', sa.Column('descricao_curta', sa.String(200), nullable=True))

    # ── pessoas.cpf_normalizado ─────────────────────────────────────────
    op.add_column('pessoas', sa.Column('cpf_normalizado', sa.String(11), nullable=True))
    op.create_index('idx_pessoas_cpf_normalizado', 'pessoas', ['cpf_normalizado'],
                    postgresql_where=sa.text('cpf_normalizado IS NOT NULL'))

    # ── atos.fonte_sistema ──────────────────────────────────────────────
    op.add_column('atos', sa.Column('fonte_sistema', sa.String(50),
                                    nullable=False, server_default='web'))

    # ── atlas_categoria_tipo_orgao ──────────────────────────────────────
    op.create_table(
        'atlas_categoria_tipo_orgao',
        sa.Column('categoria', sa.String(40), nullable=False),
        sa.Column('tipo_orgao', sa.String(100), nullable=False),
        sa.Column('piper_default', sa.Boolean, nullable=False, server_default=sa.text('TRUE')),
        sa.PrimaryKeyConstraint('categoria', 'tipo_orgao'),
    )

    # Backfill: todas as categorias atuais aplicam-se a 'conselho'
    # placa_certidao não vai pro Piper por default (dado bobo)
    rows_sql = []
    for cat in CATEGORIAS_INICIAIS:
        piper = "FALSE" if cat == "placa_certidao" else "TRUE"
        rows_sql.append(f"('{cat}', 'conselho', {piper})")
    op.execute(
        "INSERT INTO atlas_categoria_tipo_orgao (categoria, tipo_orgao, piper_default) VALUES "
        + ", ".join(rows_sql)
    )


def downgrade() -> None:
    op.drop_table('atlas_categoria_tipo_orgao')
    op.drop_column('atos', 'fonte_sistema')
    op.drop_index('idx_pessoas_cpf_normalizado', table_name='pessoas')
    op.drop_column('pessoas', 'cpf_normalizado')
    op.drop_column('tenants', 'descricao_curta')
    op.drop_column('tenants', 'cor_tema')
    op.drop_column('tenants', 'mindset_auditoria_md')
