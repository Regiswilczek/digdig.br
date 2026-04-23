-- ================================================================
-- Dig Dig — Seed Data
-- Run once against your Supabase database after applying migrations
-- ================================================================

-- Planos
INSERT INTO planos (nome, preco_mensal, limite_chat_mensal, max_orgaos, tem_exportacao, tem_api, max_assentos, descricao, ativo) VALUES
  ('cidadao',      0.00,    5,    NULL, false, false, 1, 'Acesso gratuito de leitura a todos os órgãos', true),
  ('investigador', 197.00,  200,  NULL, true,  false, 1, 'Para jornalistas, candidatos e militantes', true),
  ('profissional', 597.00,  1000, NULL, true,  false, 2, 'Para escritórios jurídicos e assessorias políticas', true),
  ('api_dados',    1997.00, NULL, NULL, true,  true,  5, 'Acesso via API REST para integrações', true)
ON CONFLICT (nome) DO UPDATE
  SET preco_mensal = EXCLUDED.preco_mensal,
      limite_chat_mensal = EXCLUDED.limite_chat_mensal,
      tem_exportacao = EXCLUDED.tem_exportacao,
      tem_api = EXCLUDED.tem_api,
      max_assentos = EXCLUDED.max_assentos,
      descricao = EXCLUDED.descricao;

-- Tenant CAU/PR
INSERT INTO tenants (slug, nome, nome_completo, estado, tipo_orgao, status, scraper_config, total_atos, criado_em, atualizado_em) VALUES
(
  'cau-pr',
  'CAU/PR',
  'Conselho de Arquitetura e Urbanismo do Paraná',
  'PR',
  'conselho_profissional',
  'active',
  '{
    "fontes": [
      {
        "tipo": "portarias",
        "url_base": "https://www.caupr.gov.br/portarias",
        "paginacao": "wordpress",
        "seletor_items": ".entry-content li a",
        "formato_data": "%d/%m/%Y"
      },
      {
        "tipo": "deliberacoes",
        "url_base": "https://www.caupr.gov.br/?page_id=17916",
        "paginacao": "wordpress",
        "seletor_items": ".entry-content li a",
        "formato_data": "%d/%m/%Y"
      }
    ],
    "rate_limit_segundos": 1.5,
    "user_agent": "Dig Dig/1.0 (auditoria de atos publicos)"
  }',
  1789,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;
