"""atlas_add_ata_plenaria

Revision ID: c2d3e4f5a6b8
Revises: b1c2d3e4f5a7
Create Date: 2026-04-30 07:50:00.000000

Adiciona 'ata_plenaria' na taxonomia do ATLAS — separando atas plenárias de
atas de comissões. Detectado durante calibração: as 5 atas plenárias da
amostra cairam todas em 'ata_pauta_comissao' apesar da definição excluir
plenárias. Substitui a CHECK constraint.
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'c2d3e4f5a6b8'
down_revision: Union[str, None] = 'b1c2d3e4f5a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE classificacao_atlas DROP CONSTRAINT classificacao_atlas_categoria_check"
    )
    op.execute(
        "ALTER TABLE classificacao_atlas ADD CONSTRAINT classificacao_atlas_categoria_check "
        "CHECK (categoria IN ("
        "'licitacao', 'contrato', 'aditivo_contratual', "
        "'financeiro_balanco', 'financeiro_orcamento', 'financeiro_demonstrativo', "
        "'auditoria_externa', 'deliberacao_arquivo', 'portaria_arquivo', "
        "'ata_plenaria', 'ata_pauta_comissao', 'relatorio_gestao', "
        "'processo_etico', 'recursos_humanos', 'juridico_parecer', "
        "'comunicacao_institucional', 'placa_certidao', 'outros'"
        "))"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE classificacao_atlas DROP CONSTRAINT classificacao_atlas_categoria_check"
    )
    op.execute(
        "ALTER TABLE classificacao_atlas ADD CONSTRAINT classificacao_atlas_categoria_check "
        "CHECK (categoria IN ("
        "'licitacao', 'contrato', 'aditivo_contratual', "
        "'financeiro_balanco', 'financeiro_orcamento', 'financeiro_demonstrativo', "
        "'auditoria_externa', 'deliberacao_arquivo', 'portaria_arquivo', "
        "'ata_pauta_comissao', 'relatorio_gestao', "
        "'processo_etico', 'recursos_humanos', 'juridico_parecer', "
        "'comunicacao_institucional', 'placa_certidao', 'outros'"
        "))"
    )
