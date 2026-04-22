# Design Spec — AuditaPublico SaaS

**Data:** 2026-04-22  
**Status:** Aprovado para implementação  
**Autor:** Regis Alessander Wilczek  

---

## Resumo

Plataforma SaaS de auditoria automatizada de atos administrativos públicos brasileiros usando IA (Claude API). Lançamento com CAU/PR como único órgão ativo, arquitetura multi-tenant pronta para expansão.

## Decisões de Arquitetura

- **Backend:** FastAPI + Celery + Redis (Railway)
- **Frontend:** Next.js 15 + Tailwind + shadcn/ui (Vercel)
- **Banco:** PostgreSQL via Supabase (Auth + Storage inclusos)
- **IA:** Haiku 4.5 (triagem em massa) + Sonnet 4.6 (análise crítica + síntese)
- **Billing:** Stripe
- **Multi-tenancy:** schema compartilhado com RLS por tenant_id

## Custo de IA por Rodada (CAU-PR)

~$10-12 para análise completa de 1.171 atos com PDF.

## Documentação Completa

- [00 — Visão Geral e Modelo Comercial](../../00-visao-geral-e-comercial.md)
- [01 — Arquitetura do Sistema](../../01-arquitetura.md)
- [02 — Banco de Dados](../../02-banco-de-dados.md)
- [03 — Pipeline de IA](../../03-pipeline-ia.md)
- [04 — API Endpoints](../../04-api-endpoints.md)
- [05 — Frontend](../../05-frontend.md)
- [06 — Segurança e LGPD](../../06-seguranca-e-lgpd.md)
- [07 — Scraper e Instituições](../../07-scraper-e-instituicoes.md)
- [08 — Testes](../../08-testes.md)
- [09 — Infraestrutura e Deploy](../../09-infraestrutura-e-deploy.md)
