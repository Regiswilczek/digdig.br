-- ================================================================
-- Dig Dig — Seed Knowledge Base: CAU/PR Regimento Interno
-- Prefer running scripts/seed_regimento.py (extracts text automatically).
-- This SQL is a fallback — paste the extracted text in place of PLACEHOLDER.
-- Source: https://www.caupr.gov.br/wp-content/uploads/2026/03/Deliberacao-Ad-Referendum-09.2026-v.02-Com-Regimento.pdf
-- ================================================================

DELETE FROM knowledge_base
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'cau-pr')
  AND tipo = 'regimento';

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
    'Regimento Interno CAU/PR — 6ª versão (DPOPR 0191-02/2025 com alterações Deliberação Ad Referendum nº 09/2026)',
    'PLACEHOLDER — rode scripts/seed_regimento.py para preencher automaticamente',
    '6',
    '2026-03-01',
    'https://www.caupr.gov.br/wp-content/uploads/2026/03/Deliberacao-Ad-Referendum-09.2026-v.02-Com-Regimento.pdf',
    NOW()
FROM tenants t
WHERE t.slug = 'cau-pr';
