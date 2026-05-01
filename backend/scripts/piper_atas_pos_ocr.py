#!/usr/bin/env python3
"""
piper_atas_pos_ocr.py — roda Piper (texto) em atas plenárias sem análise
que ganharam texto via OCR Flash Lite. Pula atas com texto vazio.
"""
from __future__ import annotations

import asyncio
import sys
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal

sys.path.insert(0, "/app")

from sqlalchemy import select, text, update
from app.database import async_session_factory
from app.models.tenant import Tenant
from app.models.ato import Ato, RodadaAnalise
from app.models.analise import Analise
from app.services.piper_service import analisar_ato_piper, montar_system_prompt


CAU_SLUG = "cau-pr"


async def main() -> None:
    async with async_session_factory() as db:
        tenant = (await db.execute(select(Tenant).where(Tenant.slug == CAU_SLUG))).scalar_one()
        tid = tenant.id
        sp = await montar_system_prompt(db, tid)

        # Cria rodada nova
        await db.execute(text("""
            UPDATE rodadas_analise SET status='cancelado', concluido_em=NOW()
            WHERE tenant_id=:t AND status IN ('em_progresso','pendente')
        """), {"t": str(tid)})
        rodada = RodadaAnalise(
            id=uuid.uuid4(), tenant_id=tid, status="em_progresso",
            agente="piper", iniciado_em=datetime.now(timezone.utc),
        )
        db.add(rodada)
        await db.commit()

        # Coleta atas sem analise com texto utilizável (>200 chars)
        rows = await db.execute(text("""
            SELECT a.id, a.numero, a.data_publicacao, length(c.texto_completo) AS txt_len
            FROM atos a
            JOIN conteudo_ato c ON c.ato_id = a.id
            LEFT JOIN analises an ON an.ato_id = a.id
            WHERE a.tenant_id = :tid
              AND a.tipo = 'ata_plenaria'
              AND an.id IS NULL
              AND c.qualidade IN ('boa','parcial','digitalizado_ocr')
              AND length(c.texto_completo) > 200
            ORDER BY a.data_publicacao NULLS LAST
        """), {"tid": str(tid)})
        atas = list(rows.all())
        print(f"\n=== Piper em atas pós-OCR — {CAU_SLUG} ===")
        print(f"Rodada: {rodada.id}")
        print(f"Atas a processar: {len(atas)}\n")

    sucesso = falha = 0
    custo_total = 0.0
    inicio = time.monotonic()
    print(f"{'#':>3}  {'NUM':>5}  {'DT':10}  {'TXT':>7}  {'NIVEL':10}  {'SCORE':>5}  {'CUSTO':>9}")
    print("-" * 70)
    for i, r in enumerate(atas, 1):
        num = str(r.numero)[:5]
        dt = str(r.data_publicacao)[:10] if r.data_publicacao else "?"
        try:
            async with async_session_factory() as db:
                analise = await analisar_ato_piper(db, r.id, rodada.id, sp)
                custo = float(analise.custo_piper_usd or 0)
                custo_total += custo
            print(f"{i:>3}  {num:>5}  {dt:10}  {r.txt_len:>7}  {analise.nivel_alerta:10}  {analise.score_risco:>5}  ${custo:.4f}")
            sucesso += 1
        except Exception as exc:
            print(f"{i:>3}  {num:>5}  {dt:10}  ERRO: {type(exc).__name__}: {str(exc)[:100]}")
            falha += 1

    elapsed = time.monotonic() - inicio
    async with async_session_factory() as db:
        await db.execute(
            update(RodadaAnalise).where(RodadaAnalise.id == rodada.id)
            .values(
                status="concluido",
                concluido_em=datetime.now(timezone.utc),
                atos_analisados_piper=sucesso,
                custo_total_usd=Decimal(str(custo_total)),
            )
        )
        await db.commit()

    print()
    print(f"═══ TOTAL ═══")
    print(f"  Sucesso: {sucesso}/{len(atas)}")
    print(f"  Falha:   {falha}")
    print(f"  Custo:   US$ {custo_total:.4f}")
    print(f"  Tempo:   {elapsed:.0f}s")


if __name__ == "__main__":
    asyncio.run(main())
