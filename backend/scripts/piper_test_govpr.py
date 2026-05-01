#!/usr/bin/env python3
"""
piper_test_govpr.py — roda Piper nos 10 convênios estratégicos do GOV-PR.

Cria 1 rodada nova, dispara Piper sincronamente em cada um dos 10 atos,
imprime o resultado parseado (nivel + indícios + tags).

Uso:
    python scripts/piper_test_govpr.py
"""
import asyncio
import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from sqlalchemy import select
from app.database import async_session_factory
from app.models.tenant import Tenant
from app.models.ato import Ato, RodadaAnalise
from app.services.piper_service import analisar_ato_piper, montar_system_prompt


async def main():
    items = json.load(open("/tmp/govpr_test_10.json"))
    print(f"Rodando Piper em {len(items)} atos do GOV-PR...\n")

    async with async_session_factory() as db:
        tenant_r = await db.execute(select(Tenant).where(Tenant.slug == "gov-pr"))
        tenant = tenant_r.scalar_one()

        # criar rodada de teste
        rodada = RodadaAnalise(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            status="em_progresso",
            agente="piper",
            iniciado_em=datetime.utcnow(),
        )
        db.add(rodada)
        await db.commit()
        print(f"Rodada criada: {rodada.id}")

        # montar system prompt 1× (custoso)
        print("Montando system prompt (lê KB + mindset do tenant)...")
        system_prompt = await montar_system_prompt(db, tenant.id)
        print(f"System prompt: {len(system_prompt):,} chars\n")

        sucesso = falha = 0
        custo_total = 0.0
        for i, item in enumerate(items, 1):
            ato_id = uuid.UUID(item["id"])
            numero = item["numero"][:30]
            print(f"[{i:2d}/{len(items)}] {numero:30} ", end="", flush=True)
            try:
                analise = await analisar_ato_piper(
                    db, ato_id, rodada.id, system_prompt,
                )
                await db.commit()
                custo = float(analise.custo_usd or 0)
                custo_total += custo
                print(f"✓ {analise.nivel_alerta:>10} score={analise.score_risco or 0} ${custo:.4f}")
                # extrair indícios resumidos
                if analise.resultado_piper:
                    res = analise.resultado_piper
                    indicios = res.get("indicios", []) if isinstance(res, dict) else []
                    if indicios:
                        for ind in indicios[:2]:
                            cat = ind.get("categoria", "?")
                            tipo = ind.get("tipo", "?")
                            grav = ind.get("gravidade", "?")
                            print(f"           → [{grav:>7}] {cat}/{tipo}")
                sucesso += 1
            except Exception as exc:
                print(f"✗ {exc!s:.100}")
                falha += 1

        rodada.status = "concluido"
        rodada.concluido_em = datetime.utcnow()
        rodada.atos_analisados_piper = sucesso
        rodada.custo_total_usd = custo_total
        await db.commit()
        print()
        print(f"═══ TOTAL ═══")
        print(f"  Sucesso: {sucesso}")
        print(f"  Falha:   {falha}")
        print(f"  Custo:   US$ {custo_total:.4f}")


if __name__ == "__main__":
    asyncio.run(main())
