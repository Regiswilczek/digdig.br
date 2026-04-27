import asyncio, asyncpg, os

async def main():
    url = (os.environ.get("ASYNCPG_URL") or os.environ.get("DATABASE_URL") or "").replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url, statement_cache_size=0)

    tabelas = [
        ("diarias", "Diárias e deslocamentos"),
        ("contratos_pub", "Contratos"),
        ("licitacoes_pub", "Licitações"),
        ("despesas_pub", "Empenhos/Pagamentos"),
        ("pessoas_pub", "Conselheiros/Pessoal"),
        ("bens_pub", "Bens"),
    ]

    print("\n── Dados financeiros no banco ───────────────────────────")
    total_geral = 0
    for tabela, label in tabelas:
        row = await conn.fetchrow(f"SELECT COUNT(*) as n FROM {tabela}")
        n = row["n"]
        total_geral += n
        print(f"  {label:<28} {n:>6,}")

    print(f"  {'─'*36}")
    print(f"  {'TOTAL':<28} {total_geral:>6,}")

    # Detalhar diárias por fonte
    rows = await conn.fetch("SELECT fonte_sistema, COUNT(*) as n FROM diarias GROUP BY fonte_sistema ORDER BY n DESC")
    if rows:
        print("\n── Diárias por fonte ────────────────────────────────────")
        for r in rows:
            print(f"  {r['fonte_sistema']:<28} {r['n']:>6,}")

    # Range de datas das diárias
    row = await conn.fetchrow("SELECT MIN(data_pagamento) as min_dt, MAX(data_pagamento) as max_dt FROM diarias")
    if row["min_dt"]:
        print(f"\n── Período das diárias: {row['min_dt']} → {row['max_dt']}")

    # Categorias de despesas
    rows = await conn.fetch("SELECT tipo, COUNT(*) as n FROM despesas_pub GROUP BY tipo ORDER BY n DESC")
    if rows:
        print("\n── Despesas por tipo ────────────────────────────────────")
        for r in rows:
            print(f"  {r['tipo']:<28} {r['n']:>6,}")

    print()
    await conn.close()

asyncio.run(main())
