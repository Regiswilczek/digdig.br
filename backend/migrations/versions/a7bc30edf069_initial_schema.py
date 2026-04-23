"""initial_schema

Revision ID: a7bc30edf069
Revises:
Create Date: 2026-04-23 02:20:33.698355

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a7bc30edf069'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create all 29 tables
    op.create_table(
        'planos',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('nome', sa.String(50), nullable=False),
        sa.Column('preco_mensal', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('mercadopago_price_id', sa.String(100), nullable=True),
        sa.Column('limite_chat_mensal', sa.Integer(), nullable=True),
        sa.Column('max_orgaos', sa.Integer(), nullable=True),
        sa.Column('tem_exportacao', sa.Boolean(), nullable=False),
        sa.Column('tem_api', sa.Boolean(), nullable=False),
        sa.Column('max_assentos', sa.Integer(), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nome')
    )
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('nome', sa.String(255), nullable=True),
        sa.Column('plano_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mercadopago_customer_id', sa.String(100), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=False),
        sa.Column('email_verificado', sa.Boolean(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['plano_id'], ['planos.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_table(
        'assinaturas',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plano_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mercadopago_subscription_id', sa.String(100), nullable=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('periodo_inicio', sa.DateTime(timezone=True), nullable=False),
        sa.Column('periodo_fim', sa.DateTime(timezone=True), nullable=False),
        sa.Column('cancelado_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['plano_id'], ['planos.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('mercadopago_subscription_id')
    )
    op.create_table(
        'tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('nome_completo', sa.String(500), nullable=True),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.Text(), nullable=True),
        sa.Column('site_url', sa.Text(), nullable=True),
        sa.Column('estado', sa.CHAR(2), nullable=True),
        sa.Column('tipo_orgao', sa.String(100), nullable=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('scraper_config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ultima_analise', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_atos', sa.Integer(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_table(
        'user_tenant_acesso',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'tenant_id')
    )
    op.create_table(
        'knowledge_base',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo', sa.String(100), nullable=False),
        sa.Column('titulo', sa.String(500), nullable=False),
        sa.Column('conteudo', sa.Text(), nullable=False),
        sa.Column('versao', sa.String(50), nullable=True),
        sa.Column('vigente_desde', sa.Date(), nullable=True),
        sa.Column('url_original', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'tenant_regras',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('categoria', sa.String(100), nullable=False),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('palavras_chave', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('peso', sa.Integer(), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'atos',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('numero', sa.String(100), nullable=False),
        sa.Column('tipo', sa.String(100), nullable=False),
        sa.Column('subtipo', sa.String(100), nullable=True),
        sa.Column('titulo', sa.String(1000), nullable=True),
        sa.Column('data_publicacao', sa.Date(), nullable=True),
        sa.Column('ementa', sa.Text(), nullable=True),
        sa.Column('url_original', sa.Text(), nullable=True),
        sa.Column('url_pdf', sa.Text(), nullable=True),
        sa.Column('pdf_baixado', sa.Boolean(), nullable=False),
        sa.Column('pdf_path', sa.Text(), nullable=True),
        sa.Column('pdf_tamanho_bytes', sa.Integer(), nullable=True),
        sa.Column('pdf_paginas', sa.Integer(), nullable=True),
        sa.Column('processado', sa.Boolean(), nullable=False),
        sa.Column('erro_download', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'conteudo_ato',
        sa.Column('ato_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('texto_completo', sa.Text(), nullable=False),
        sa.Column('metodo_extracao', sa.String(50), nullable=False),
        sa.Column('qualidade', sa.String(20), nullable=False),
        sa.Column('tokens_estimados', sa.Integer(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['ato_id'], ['atos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('ato_id')
    )
    op.create_table(
        'rodadas_analise',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('total_atos', sa.Integer(), nullable=True),
        sa.Column('atos_scrapeados', sa.Integer(), nullable=True),
        sa.Column('atos_analisados_haiku', sa.Integer(), nullable=True),
        sa.Column('atos_analisados_sonnet', sa.Integer(), nullable=True),
        sa.Column('custo_haiku_usd', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('custo_sonnet_usd', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('custo_total_usd', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('erro_mensagem', sa.Text(), nullable=True),
        sa.Column('iniciado_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('concluido_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'analises',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ato_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('rodada_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('nivel_alerta', sa.String(20), nullable=False),
        sa.Column('score_risco', sa.Integer(), nullable=True),
        sa.Column('analisado_por_haiku', sa.Boolean(), nullable=False),
        sa.Column('analisado_por_sonnet', sa.Boolean(), nullable=False),
        sa.Column('resultado_haiku', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('resultado_sonnet', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('resumo_executivo', sa.Text(), nullable=True),
        sa.Column('recomendacao_campanha', sa.Text(), nullable=True),
        sa.Column('tokens_haiku', sa.Integer(), nullable=True),
        sa.Column('tokens_sonnet', sa.Integer(), nullable=True),
        sa.Column('custo_usd', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['ato_id'], ['atos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['rodada_id'], ['rodadas_analise.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'irregularidades',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('analise_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ato_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('categoria', sa.String(50), nullable=False),
        sa.Column('tipo', sa.String(255), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=False),
        sa.Column('artigo_violado', sa.String(500), nullable=True),
        sa.Column('gravidade', sa.String(20), nullable=False),
        sa.Column('impacto_politico', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['analise_id'], ['analises.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ato_id'], ['atos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'pessoas',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('nome_normalizado', sa.String(500), nullable=False),
        sa.Column('variantes_nome', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('cargo_mais_recente', sa.String(500), nullable=True),
        sa.Column('tipo', sa.String(50), nullable=False),
        sa.Column('total_aparicoes', sa.Integer(), nullable=True),
        sa.Column('primeiro_ato_data', sa.Date(), nullable=True),
        sa.Column('ultimo_ato_data', sa.Date(), nullable=True),
        sa.Column('score_concentracao', sa.Integer(), nullable=True),
        sa.Column('eh_suspeito', sa.Boolean(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'aparicoes_pessoa',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('pessoa_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ato_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo_aparicao', sa.String(100), nullable=False),
        sa.Column('cargo', sa.String(500), nullable=True),
        sa.Column('data_ato', sa.Date(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['ato_id'], ['atos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pessoa_id'], ['pessoas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'relacoes_pessoas',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('pessoa_a_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('pessoa_b_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo_relacao', sa.String(100), nullable=False),
        sa.Column('atos_em_comum', sa.Integer(), nullable=True),
        sa.Column('peso', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['pessoa_a_id'], ['pessoas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['pessoa_b_id'], ['pessoas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'padroes_detectados',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('rodada_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo_padrao', sa.String(100), nullable=False),
        sa.Column('titulo', sa.String(500), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('narrativa', sa.Text(), nullable=True),
        sa.Column('gravidade', sa.String(20), nullable=False),
        sa.Column('atos_envolvidos', postgresql.ARRAY(postgresql.UUID()), nullable=True),
        sa.Column('pessoas_envolvidas', postgresql.ARRAY(postgresql.UUID()), nullable=True),
        sa.Column('periodo_inicio', sa.Date(), nullable=True),
        sa.Column('periodo_fim', sa.Date(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['rodada_id'], ['rodadas_analise.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'chat_sessoes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('titulo', sa.String(500), nullable=True),
        sa.Column('ativa', sa.Boolean(), nullable=False),
        sa.Column('total_mensagens', sa.Integer(), nullable=True),
        sa.Column('custo_total_usd', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ultima_msg_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'chat_mensagens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sessao_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('conteudo', sa.Text(), nullable=False),
        sa.Column('tipo_pergunta', sa.String(50), nullable=True),
        sa.Column('contexto_usado', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('tokens_input', sa.Integer(), nullable=True),
        sa.Column('tokens_output', sa.Integer(), nullable=True),
        sa.Column('custo_usd', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('tempo_resposta_ms', sa.Integer(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['sessao_id'], ['chat_sessoes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'chat_feedback',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mensagem_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('util', sa.Boolean(), nullable=False),
        sa.Column('comentario', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['mensagem_id'], ['chat_mensagens.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'relatorios',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('rodada_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo', sa.String(50), nullable=False),
        sa.Column('titulo', sa.String(500), nullable=False),
        sa.Column('arquivo_path', sa.Text(), nullable=False),
        sa.Column('tamanho_bytes', sa.Integer(), nullable=True),
        sa.Column('publico', sa.Boolean(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['rodada_id'], ['rodadas_analise.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'campanhas_patrocinio',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('nome_orgao', sa.Text(), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('uf', sa.String(2), nullable=True),
        sa.Column('tipo_orgao', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('meta_valor', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('valor_arrecadado', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('total_doadores', sa.Integer(), nullable=True),
        sa.Column('total_votos', sa.Integer(), nullable=True),
        sa.Column('proposta_por', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('tenant_id_gerado', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('prazo_expiracao', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['proposta_por'], ['users.id'], ),
        sa.ForeignKeyConstraint(['tenant_id_gerado'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'doacoes_patrocinio',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campanha_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('valor', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('mercadopago_payment_id', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('mensagem_publica', sa.Text(), nullable=True),
        sa.Column('nome_exibicao', sa.Text(), nullable=True),
        sa.Column('votos_concedidos', sa.Integer(), nullable=True),
        sa.Column('acesso_antecipado_concedido', sa.Boolean(), nullable=False),
        sa.Column('acesso_antecipado_ate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['campanha_id'], ['campanhas_patrocinio.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'votos_patrocinio',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campanha_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mes_referencia', sa.String(7), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['campanha_id'], ['campanhas_patrocinio.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('nome', sa.Text(), nullable=False),
        sa.Column('chave_hash', sa.Text(), nullable=False),
        sa.Column('prefixo', sa.Text(), nullable=False),
        sa.Column('ultimo_uso', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ativa', sa.Boolean(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revogado_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'preferencias_alertas',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ativo', sa.Boolean(), nullable=False),
        sa.Column('niveis', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('frequencia', sa.String(20), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'logs_sessao',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ip_anonimizado', sa.Text(), nullable=False),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('tenant_slug', sa.Text(), nullable=True),
        sa.Column('iniciada_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('encerrada_em', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_acoes', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'logs_atividade',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sessao_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('acao', sa.Text(), nullable=False),
        sa.Column('tenant_slug', sa.Text(), nullable=True),
        sa.Column('recurso_tipo', sa.Text(), nullable=True),
        sa.Column('recurso_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['sessao_id'], ['logs_sessao.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'logs_erros_usuario',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo_erro', sa.Text(), nullable=False),
        sa.Column('contexto', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'logs_acesso_negado',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ip_anonimizado', sa.Text(), nullable=False),
        sa.Column('rota_tentada', sa.Text(), nullable=False),
        sa.Column('motivo', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('logs_acesso_negado')
    op.drop_table('logs_erros_usuario')
    op.drop_table('logs_atividade')
    op.drop_table('logs_sessao')
    op.drop_table('preferencias_alertas')
    op.drop_table('api_keys')
    op.drop_table('votos_patrocinio')
    op.drop_table('doacoes_patrocinio')
    op.drop_table('campanhas_patrocinio')
    op.drop_table('relatorios')
    op.drop_table('chat_feedback')
    op.drop_table('chat_mensagens')
    op.drop_table('chat_sessoes')
    op.drop_table('padroes_detectados')
    op.drop_table('relacoes_pessoas')
    op.drop_table('aparicoes_pessoa')
    op.drop_table('pessoas')
    op.drop_table('irregularidades')
    op.drop_table('analises')
    op.drop_table('rodadas_analise')
    op.drop_table('conteudo_ato')
    op.drop_table('atos')
    op.drop_table('tenant_regras')
    op.drop_table('knowledge_base')
    op.drop_table('user_tenant_acesso')
    op.drop_table('tenants')
    op.drop_table('assinaturas')
    op.drop_table('users')
    op.drop_table('planos')
