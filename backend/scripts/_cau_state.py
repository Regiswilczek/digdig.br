import asyncio, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv('.env')
from sqlalchemy import select, func, text
from app.database import async_session_factory

async def main():
    async with async_session_factory() as db:
        # tenant
        r = await db.execute(text("SELECT id, slug, status FROM tenants WHERE slug='cau-pr'"))
        t = r.first(); print(f"TENANT: {t}")
        tid = str(t.id)
        
        print("\n=== ATOS POR TIPO ATLAS ===")
        r = await db.execute(text(f"""
            SELECT tipo_atlas, count(*) FROM atos 
            WHERE tenant_id='{tid}' AND tipo_atlas IS NOT NULL
            GROUP BY tipo_atlas ORDER BY count(*) DESC
        """))
        for row in r: print(f"  {row[0]:30} {row[1]:>6}")
        
        print("\n=== ANÁLISES ===")
        r = await db.execute(text(f"""
            SELECT count(*) total,
              count(*) FILTER (WHERE resultado_piper IS NOT NULL) piper,
              count(*) FILTER (WHERE resultado_bud IS NOT NULL) bud,
              count(*) FILTER (WHERE resultado_new IS NOT NULL) new
            FROM analises a JOIN atos x ON x.id=a.ato_id WHERE x.tenant_id='{tid}'
        """))
        for row in r: print(f"  total={row[0]} piper={row[1]} bud={row[2]} new={row[3]}")
        
        print("\n=== DISTRIBUIÇÃO PIPER ===")
        r = await db.execute(text(f"""
            SELECT nivel_alerta, count(*) FROM analises a 
            JOIN atos x ON x.id=a.ato_id WHERE x.tenant_id='{tid}' AND nivel_alerta IS NOT NULL
            GROUP BY nivel_alerta
        """))
        for row in r: print(f"  {row[0]:15} {row[1]:>5}")

        print("\n=== DISTRIBUIÇÃO BUD (vermelho/laranja recentes) ===")
        r = await db.execute(text(f"""
            SELECT nivel_alerta, count(*) FROM analises a 
            JOIN atos x ON x.id=a.ato_id 
            WHERE x.tenant_id='{tid}' AND resultado_bud IS NOT NULL
            GROUP BY nivel_alerta
        """))
        for row in r: print(f"  {row[0]:15} {row[1]:>5}")

        print("\n=== TOP 20 PESSOAS POR APARIÇÃO ===")
        r = await db.execute(text(f"""
            SELECT p.nome, count(*) c, p.tipo_pessoa
            FROM aparicao_pessoa ap
            JOIN pessoas p ON p.id=ap.pessoa_id
            JOIN atos x ON x.id=ap.ato_id
            WHERE x.tenant_id='{tid}'
            GROUP BY p.nome, p.tipo_pessoa ORDER BY c DESC LIMIT 25
        """))
        for row in r: print(f"  {row[0][:50]:50} {row[1]:>4} {row[2] or ''}")
        
        print("\n=== TAGS MAIS FREQUENTES ===")
        r = await db.execute(text(f"""
            SELECT t.tag, count(*) c
            FROM ato_tags at1
            JOIN atos x ON x.id=at1.ato_id
            JOIN tags t ON t.id=at1.tag_id
            WHERE x.tenant_id='{tid}'
            GROUP BY t.tag ORDER BY c DESC LIMIT 30
        """))
        for row in r: print(f"  {row[0][:60]:60} {row[1]:>4}")

        print("\n=== INDÍCIOS - CATEGORIAS ===")
        r = await db.execute(text(f"""
            SELECT categoria, gravidade, count(*) c
            FROM irregularidades i
            JOIN atos x ON x.id=i.ato_id
            WHERE x.tenant_id='{tid}'
            GROUP BY categoria, gravidade ORDER BY c DESC LIMIT 30
        """))
        for row in r: print(f"  {row[0][:35]:35} {row[1]:12} {row[2]:>4}")

        print("\n=== TOP CASOS POR SCORE ===")
        r = await db.execute(text(f"""
            SELECT x.numero, x.tipo, x.tipo_atlas, a.score_risco, a.nivel_alerta, a.resultado_piper->>'sintese_de_indicios' synt
            FROM analises a 
            JOIN atos x ON x.id=a.ato_id
            WHERE x.tenant_id='{tid}' AND a.score_risco IS NOT NULL
            ORDER BY a.score_risco DESC NULLS LAST LIMIT 15
        """))
        for row in r:
            print(f"  {(row[0] or '?')[:25]:25} {(row[2] or row[1] or '?')[:18]:18} score={row[3]:>3} {row[4]:8} | {(row[5] or '')[:90]}")

        print("\n=== CUSTO ACUMULADO ===")
        r = await db.execute(text(f"""SELECT sum(custo_usd) FROM analises a JOIN atos x ON x.id=a.ato_id WHERE x.tenant_id='{tid}'"""))
        for row in r: print(f"  US$ {row[0]:.4f}")

asyncio.run(main())
