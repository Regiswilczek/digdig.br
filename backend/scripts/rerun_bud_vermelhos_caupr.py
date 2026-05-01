#!/usr/bin/env python3
"""
rerun_bud_vermelhos_caupr.py — re-roda Bud em todos os 44 atos vermelhos do CAU/PR.

Antes de rodar:
  - Cria nova rodada dedicada
  - Para cada vermelho:
      * Apaga Irregularidade do Bud anterior (se existir)
      * Reset analise.resultado_bud=None, analisado_por_bud=False
      * Status -> piper_completo (pra Bud poder rodar)
  - Roda analisar_ato_bud sequencialmente
  - Reporta: sucesso/falha + custo total

Uso:
  python /app/scripts/rerun_bud_vermelhos_caupr.py
"""
from __future__ import annotations

import asyncio
import sys
import uuid
from datetime import datetime

sys.path.insert(0, "/app")

from sqlalchemy import select, text, delete, update
from app.database import async_session_factory
from app.models.tenant import Tenant
from app.models.ato import Ato, RodadaAnalise
from app.models.analise import Analise, Irregularidade
from app.services.bud_service import analisar_ato_bud
from app.services.piper_service import montar_system_prompt


CAU_SLUG = "cau-pr"


async def main() -> None:
    async with async_session_factory() as db:
        tenant_r = await db.execute(select(Tenant).where(Tenant.slug == CAU_SLUG))
        tenant = tenant_r.scalar_one()
        tid = tenant.id

        # 1. Pega os 44 vermelhos
        vermelhos_r = await db.execute(text("""
            SELECT a.id AS analise_id, a.ato_id, x.numero, x.tipo_atlas, a.score_risco,
              (a.resultado_bud IS NOT NULL) AS tinha_bud
            FROM analises a JOIN atos x ON x.id=a.ato_id
            WHERE x.tenant_id=:t AND a.nivel_alerta='vermelho'
            ORDER BY a.score_risco DESC NULLS LAST
        """), {"t": str(tid)})
        vermelhos = list(vermelhos_r.all())
        print(f"Encontrados {len(vermelhos)} atos vermelhos no CAU/PR")
        com_bud = sum(1 for v in vermelhos if v.tinha_bud)
        print(f"  • {com_bud} já tinham Bud (será limpo + re-rodado)")
        print(f"  • {len(vermelhos) - com_bud} ainda sem Bud (será rodado pela 1ª vez)")

        # 2. Cancela qualquer rodada ativa
        await db.execute(text("""
            UPDATE rodadas_analise SET status='cancelado', concluido_em=NOW()
            WHERE tenant_id=:t AND status IN ('em_progresso','pendente')
        """), {"t": str(tid)})
        await db.commit()

        # 3. Cria nova rodada
        rodada = RodadaAnalise(
            id=uuid.uuid4(),
            tenant_id=tid,
            status="em_progresso",
            agente="bud",
            iniciado_em=datetime.utcnow(),
        )
        db.add(rodada)
        await db.commit()
        print(f"\nRodada criada: {rodada.id}")

        # 4. Reset Bud nos que já tinham
        if com_bud > 0:
            analise_uuids = [v.analise_id for v in vermelhos if v.tinha_bud]
            # Apaga irregularidades só dessas analises
            await db.execute(
                delete(Irregularidade).where(Irregularidade.analise_id.in_(analise_uuids))
            )
            # Reset analises
            await db.execute(
                update(Analise)
                .where(Analise.id.in_(analise_uuids))
                .values(
                    resultado_bud=None,
                    analisado_por_bud=False,
                    status="piper_completo",
                    custo_bud_usd=0,
                )
            )
            await db.commit()
            print(f"Reset feito em {com_bud} análises (irregularidades antigas removidas)")

        # 5. Monta system prompt 1× (custo de leitura amortizado pelo cache)
        print("\nMontando system prompt do tenant...")
        system_prompt = await montar_system_prompt(db, tid)
        print(f"System prompt: {len(system_prompt):,} chars")

        # 6. Atualiza analise.rodada_id pra rodada nova
        await db.execute(
            update(Analise)
            .where(Analise.id.in_([v.analise_id for v in vermelhos]))
            .values(rodada_id=rodada.id)
        )
        await db.commit()

        # 7. Roda Bud em cada um, sequencial
        sucesso = falha = 0
        custo_total = 0.0
        print(f"\n{'#':>3} {'NUMERO':28} {'TIPO':22} {'NIVEL':10} {'SCORE':>5} {'CUSTO':>9}")
        print("-" * 90)
        for i, v in enumerate(vermelhos, 1):
            ato_id = v.ato_id
            num = (v.numero or "?")[:27]
            tipo = (v.tipo_atlas or "?")[:21]
            try:
                analise = await analisar_ato_bud(
                    db, ato_id, rodada.id, system_prompt,
                )
                custo_atual = float(analise.custo_bud_usd or 0)
                custo_total += custo_atual
                print(f"{i:>3} {num:28} {tipo:22} {analise.nivel_alerta:10} {analise.score_risco:>5} ${custo_atual:.4f}")
                sucesso += 1
            except Exception as exc:
                print(f"{i:>3} {num:28} {tipo:22} ERRO: {exc!s:.50}")
                falha += 1

        # 8. Conclui rodada
        rodada.status = "concluido"
        rodada.concluido_em = datetime.utcnow()
        rodada.atos_analisados_bud = sucesso
        rodada.custo_total_usd = custo_total
        await db.commit()

        # 9. Re-classifica score: novos níveis após Bud
        print("\n=== DISTRIBUIÇÃO PÓS-RERUN ===")
        r = await db.execute(
            select(Analise.nivel_alerta, text("count(*)"))
            .where(Analise.id.in_([v.analise_id for v in vermelhos]))
            .group_by(Analise.nivel_alerta)
        )
        for row in r:
            print(f"  {(row[0] or '?'):10} {row[1]:>4}")

        print()
        print(f"═══ TOTAL ═══")
        print(f"  Sucesso: {sucesso}/{len(vermelhos)}")
        print(f"  Falha:   {falha}")
        print(f"  Custo:   US$ {custo_total:.4f}")
        print(f"  Rodada:  {rodada.id}")


if __name__ == "__main__":
    asyncio.run(main())
