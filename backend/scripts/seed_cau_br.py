#!/usr/bin/env python3
"""
Seed do tenant CAU-BR (Conselho de Arquitetura e Urbanismo do Brasil — Federal).

CAU-BR é a instância federal; CAU/PR é o conselho regional do Paraná.
São organizações distintas com dados separados — slugs diferentes, painéis diferentes.

O CAU-BR não tem portal normativo em WordPress como o CAU/PR, mas expõe uma API
Implanta completa com 35 endpoints (diárias, contratos, licitações, conselheiros, etc.)
acessível em https://cau-br.implanta.net.br/portaltransparencia/api

Uso:
    docker compose exec api python scripts/seed_cau_br.py
"""

import asyncio
import asyncpg
import os
import sys

ASYNCPG_URL = (os.environ.get("ASYNCPG_URL") or os.environ.get("DATABASE_URL") or "").replace("postgresql+asyncpg://", "postgresql://")
if not ASYNCPG_URL:
    print("ERRO: ASYNCPG_URL não definida")
    sys.exit(1)

CAU_BR = {
    "slug": "cau-br",
    "nome": "CAU-BR",
    "nome_completo": "Conselho de Arquitetura e Urbanismo do Brasil",
    "descricao": (
        "Conselho Federal que regula o exercício profissional da Arquitetura e Urbanismo no Brasil. "
        "Criado pela Lei 12.378/2010. Coordena os 27 conselhos regionais (CAU/UF)."
    ),
    "site_url": "https://caubr.gov.br",
    "estado": None,
    "tipo_orgao": "conselho_federal",
    "status": "coming_soon",
    "scraper_config": {
        "implanta_host": "https://cau-br.implanta.net.br/portaltransparencia/api",
        "implanta_endpoints": [
            "DiariasDeslocamentos", "PassagensAereas", "PassagensTerrestres",
            "Contratos", "Convenios", "Licitacoes",
            "Empenhos", "Pagamentos", "DespesasCentroCusto",
            "QuadrosPessoas", "Conselheiros", "AtasColegiados",
            "BensMoveis", "BensImoveis",
            "Balancete", "BalancoFinanceiro", "BalancoOrcamentario",
        ],
        "scraper_tipo": "implanta_api",
        "ano_inicio": 2018,
    },
}


async def main():
    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)

    existing = await conn.fetchrow("SELECT id FROM tenants WHERE slug = $1", CAU_BR["slug"])
    if existing:
        print(f"✓ Tenant '{CAU_BR['slug']}' já existe — id: {existing['id']}")
        await conn.close()
        return

    row = await conn.fetchrow("""
        INSERT INTO tenants (
            id, slug, nome, nome_completo, descricao,
            site_url, estado, tipo_orgao, status, scraper_config,
            total_atos, criado_em, atualizado_em
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4,
            $5, $6, $7, $8, $9::jsonb,
            0, NOW(), NOW()
        )
        RETURNING id, slug, nome
    """,
        CAU_BR["slug"],
        CAU_BR["nome"],
        CAU_BR["nome_completo"],
        CAU_BR["descricao"],
        CAU_BR["site_url"],
        CAU_BR["estado"],
        CAU_BR["tipo_orgao"],
        CAU_BR["status"],
        str(CAU_BR["scraper_config"]).replace("'", '"'),
    )

    await conn.close()
    print(f"✓ Tenant criado: {row['nome']} ({row['slug']}) — id: {row['id']}")
    print(f"\nPróximos passos:")
    print(f"  1. Rodar scraper: python scripts/scrape_implanta.py --tenant cau-br --categoria todas")
    print(f"  2. Ativar no painel: UPDATE tenants SET status='active' WHERE slug='cau-br';")


if __name__ == "__main__":
    asyncio.run(main())
