-- ================================================================
-- Dig Dig — Seed Knowledge Base: CAU/PR Regimento Interno
-- Run in Supabase SQL Editor after applying migrations and seed.sql
-- Replace the PLACEHOLDER text with the actual regimento content
-- Source: https://www.caupr.gov.br/regimento/ (6ª versão — DPOPR 0191-02/2025)
-- ================================================================

INSERT INTO knowledge_base (
    id,
    tenant_id,
    tipo,
    titulo,
    conteudo,
    versao,
    vigente_desde,
    url_original,
    criado_em
)
SELECT
    gen_random_uuid(),
    t.id,
    'regimento',
    'Regimento Interno CAU/PR — 6ª versão (DPOPR 0191-02/2025)',
    'PLACEHOLDER — substitua este texto pelo conteúdo completo do Regimento Interno do CAU/PR disponível em https://www.caupr.gov.br/regimento/',
    '6',
    '2025-02-01',
    'https://www.caupr.gov.br/regimento/',
    NOW()
FROM tenants t
WHERE t.slug = 'cau-pr'
ON CONFLICT DO NOTHING;
