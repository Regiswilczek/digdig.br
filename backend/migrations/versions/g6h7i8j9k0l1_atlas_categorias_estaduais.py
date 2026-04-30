"""atlas_categorias_estaduais

Revision ID: g6h7i8j9k0l1
Revises: f5a6b7c8d0e2
Create Date: 2026-04-30 21:00:00.000000

Amplia a taxonomia ATLAS com categorias específicas de Executivo estadual
(GOV-PR e similares no futuro). Categorias novas:

- lei_estadual           — leis aprovadas pela Assembleia
- decreto_executivo      — decretos do Governador (rotineiros, vinculantes)
- decreto_calamidade     — decretos de calamidade pública / emergência
- parecer_pge            — pareceres da Procuradoria Geral do Estado
- convenio_estadual      — convênios firmados pelo Executivo
- mensagem_governamental — mensagens do Governador à Assembleia
- nomeacao_comissionado  — nomeações para cargos em comissão
- gratificacao           — concessão de gratificações funcionais

Atualiza o CHECK constraint de classificacao_atlas e popula
atlas_categoria_tipo_orgao com aplicabilidade pra 'executivo_estadual'.
Categorias compartilhadas (licitacao, contrato, financeiro_*, etc) também
recebem aplicabilidade nesse tipo_orgao.
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'g6h7i8j9k0l1'
down_revision: Union[str, None] = 'f5a6b7c8d0e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CATEGORIAS_ATUAIS = [
    'licitacao', 'contrato', 'aditivo_contratual',
    'financeiro_balanco', 'financeiro_orcamento', 'financeiro_demonstrativo',
    'auditoria_externa', 'deliberacao_arquivo', 'portaria_arquivo',
    'ata_plenaria', 'ata_pauta_comissao', 'relatorio_gestao',
    'processo_etico', 'recursos_humanos', 'juridico_parecer',
    'comunicacao_institucional', 'placa_certidao', 'outros',
]
CATEGORIAS_NOVAS = [
    'lei_estadual', 'decreto_executivo', 'decreto_calamidade',
    'parecer_pge', 'convenio_estadual', 'mensagem_governamental',
    'nomeacao_comissionado', 'gratificacao',
]
TODAS = CATEGORIAS_ATUAIS + CATEGORIAS_NOVAS

# Categorias compartilhadas (relevantes a ambos conselho e executivo_estadual)
COMPARTILHADAS_EXEC = [
    'licitacao', 'contrato', 'aditivo_contratual',
    'financeiro_balanco', 'financeiro_orcamento', 'financeiro_demonstrativo',
    'auditoria_externa', 'relatorio_gestao',
    'recursos_humanos', 'juridico_parecer', 'comunicacao_institucional',
    'placa_certidao', 'outros',
]

# Piper default por categoria (true = roda Piper por padrão; false = pula salvo override)
PIPER_DEFAULT_OFF = {'placa_certidao', 'comunicacao_institucional', 'gratificacao'}


def upgrade() -> None:
    # Drop + recriar CHECK constraint com novas categorias
    op.execute(
        "ALTER TABLE classificacao_atlas DROP CONSTRAINT IF EXISTS classificacao_atlas_categoria_check"
    )
    valores = ", ".join(f"'{c}'" for c in TODAS)
    op.execute(
        f"ALTER TABLE classificacao_atlas ADD CONSTRAINT classificacao_atlas_categoria_check "
        f"CHECK (categoria IN ({valores}))"
    )

    # Backfill de aplicabilidade pra executivo_estadual:
    # - Categorias novas (próprias do executivo)
    # - Categorias compartilhadas que também aplicam
    aplicaveis_exec = CATEGORIAS_NOVAS + COMPARTILHADAS_EXEC
    rows_sql = []
    for cat in aplicaveis_exec:
        piper = "FALSE" if cat in PIPER_DEFAULT_OFF else "TRUE"
        rows_sql.append(f"('{cat}', 'executivo_estadual', {piper})")
    op.execute(
        "INSERT INTO atlas_categoria_tipo_orgao (categoria, tipo_orgao, piper_default) "
        "VALUES " + ", ".join(rows_sql) +
        " ON CONFLICT (categoria, tipo_orgao) DO NOTHING"
    )


def downgrade() -> None:
    # Remove backfill executivo_estadual
    op.execute(
        "DELETE FROM atlas_categoria_tipo_orgao WHERE tipo_orgao = 'executivo_estadual'"
    )
    # Volta CHECK constraint pras 18 categorias originais
    op.execute(
        "ALTER TABLE classificacao_atlas DROP CONSTRAINT classificacao_atlas_categoria_check"
    )
    valores = ", ".join(f"'{c}'" for c in CATEGORIAS_ATUAIS)
    op.execute(
        f"ALTER TABLE classificacao_atlas ADD CONSTRAINT classificacao_atlas_categoria_check "
        f"CHECK (categoria IN ({valores}))"
    )
