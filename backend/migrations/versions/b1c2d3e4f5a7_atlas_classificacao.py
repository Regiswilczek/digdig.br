"""atlas_classificacao

Revision ID: b1c2d3e4f5a7
Revises: c2d3e4f5a6b7
Create Date: 2026-04-30 07:30:00.000000

Cria a tabela `classificacao_atlas` — saída do agente ATLAS, que classifica
estruturalmente cada ato antes do Piper.

Decisões:
- Tabela separada (não coluna em analises): ATLAS roda 1x por ato, sem rodada.
- Versionamento de prompt/modelo embutido (atlas_prompt_version, atlas_model)
  pra comparar runs entre iterações de prompt.
- Categoria fechada via CHECK constraint — taxonomia inicial de 17 valores.
- vai_para_piper / motivo_skip são *advisory* na Fase 1; orquestrador ignora.
- Campo `dados_extras` JSONB pra pessoas, órgãos, processos, tags (não inflar colunas).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b1c2d3e4f5a7'
down_revision: Union[str, None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'classificacao_atlas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('ato_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('atos.id', ondelete='CASCADE'),
                  nullable=False, unique=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id'), nullable=False),

        # Classificação principal
        sa.Column('categoria', sa.String(40), nullable=False),
        sa.Column('subcategoria', sa.String(120), nullable=True),
        sa.Column('confianca_categoria', sa.Numeric(3, 2), nullable=False),

        # Sinais crus (separados de política)
        sa.Column('densidade_textual', sa.String(20), nullable=False),
        sa.Column('idioma', sa.String(5), nullable=True),

        # Metadata estrutural extraída
        sa.Column('numero_oficial', sa.String(100), nullable=True),
        sa.Column('data_documento', sa.Date, nullable=True),
        sa.Column('data_documento_confianca', sa.Boolean, nullable=True),
        sa.Column('ano_referencia', sa.SmallInteger, nullable=True),
        sa.Column('valor_envolvido_brl', sa.Numeric(15, 2), nullable=True),

        # Síntese textual
        sa.Column('resumo_curto', sa.Text, nullable=True),

        # Recomendação advisory (Fase 1: ninguém honra)
        sa.Column('vai_para_piper', sa.Boolean, nullable=False, server_default=sa.text('TRUE')),
        sa.Column('motivo_skip', sa.Text, nullable=True),
        sa.Column('prompt_piper_sugerido', sa.String(40), nullable=True),

        # Dados auxiliares
        sa.Column('dados_extras', postgresql.JSONB, nullable=False,
                  server_default=sa.text("'{}'::jsonb")),

        # Detecção de duplicata — preenchido por SQL pós-Fase 1
        sa.Column('duplicado_de_ato_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('atos.id'), nullable=True),

        # Versionamento e custos
        sa.Column('atlas_prompt_version', sa.String(20), nullable=False),
        sa.Column('atlas_model', sa.String(80), nullable=False),
        sa.Column('tokens_input', sa.Integer, nullable=False, server_default=sa.text('0')),
        sa.Column('tokens_output', sa.Integer, nullable=False, server_default=sa.text('0')),
        sa.Column('custo_usd', sa.Numeric(10, 6), nullable=False, server_default=sa.text('0')),

        # Auditoria
        sa.Column('criado_em', sa.DateTime(timezone=True),
                  server_default=sa.text('NOW()'), nullable=False),
        sa.Column('processado_em', sa.DateTime(timezone=True),
                  server_default=sa.text('NOW()'), nullable=False),

        # CHECK constraints
        sa.CheckConstraint(
            "categoria IN ("
            "'licitacao', 'contrato', 'aditivo_contratual', "
            "'financeiro_balanco', 'financeiro_orcamento', 'financeiro_demonstrativo', "
            "'auditoria_externa', 'deliberacao_arquivo', 'portaria_arquivo', "
            "'ata_pauta_comissao', 'relatorio_gestao', "
            "'processo_etico', 'recursos_humanos', 'juridico_parecer', "
            "'comunicacao_institucional', 'placa_certidao', 'outros'"
            ")",
            name='classificacao_atlas_categoria_check',
        ),
        sa.CheckConstraint(
            "densidade_textual IN ("
            "'texto_corrido', 'tabular', 'titulo_so', 'ocr_sujo', 'lista_numeros'"
            ")",
            name='classificacao_atlas_densidade_check',
        ),
        sa.CheckConstraint(
            "(vai_para_piper = TRUE) OR (vai_para_piper = FALSE AND motivo_skip IS NOT NULL)",
            name='classificacao_atlas_skip_motivo_check',
        ),
    )

    # Índices — queries são sempre tenant-scoped
    op.create_index('idx_atlas_tenant_categoria', 'classificacao_atlas',
                    ['tenant_id', 'categoria'])
    op.create_index('idx_atlas_tenant_ano_categoria', 'classificacao_atlas',
                    ['tenant_id', 'ano_referencia', 'categoria'])
    op.create_index('idx_atlas_tenant_skip', 'classificacao_atlas',
                    ['tenant_id'],
                    postgresql_where=sa.text('vai_para_piper = FALSE'))
    op.create_index('idx_atlas_categoria_baixa_confianca', 'classificacao_atlas',
                    ['categoria', 'confianca_categoria'],
                    postgresql_where=sa.text('confianca_categoria < 0.7'))

    # RLS — leitura pública por tenant (consistente com outras tabelas do projeto)
    op.execute("ALTER TABLE classificacao_atlas ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY classificacao_atlas_tenant_read ON classificacao_atlas "
        "FOR SELECT USING (true)"
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS classificacao_atlas_tenant_read ON classificacao_atlas")
    op.drop_index('idx_atlas_categoria_baixa_confianca', table_name='classificacao_atlas')
    op.drop_index('idx_atlas_tenant_skip', table_name='classificacao_atlas')
    op.drop_index('idx_atlas_tenant_ano_categoria', table_name='classificacao_atlas')
    op.drop_index('idx_atlas_tenant_categoria', table_name='classificacao_atlas')
    op.drop_table('classificacao_atlas')
