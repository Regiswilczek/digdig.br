#!/usr/bin/env python3
"""
piper_vision_atas_ruim.py — roda Piper Vision em todas as atas plenárias do CAU/PR
com qualidade='ruim' (escaneadas pré-2018 sem texto extraído).

Efeitos:
  • OCR + análise via Gemini Pro Vision (texto vai pra conteudo_ato.texto_completo)
  • qualidade do conteudo_ato passa para 'digitalizado_ocr'
  • analise.resultado_piper sobrescrito (nas 13 que já tinham análise)
  • Atos ficam prontos pra ATLAS classificar pelo texto

Uso (dentro do container api):
    python /app/scripts/piper_vision_atas_ruim.py --tenant cau-pr --dry-run
    python /app/scripts/piper_vision_atas_ruim.py --tenant cau-pr --limit 3
    python /app/scripts/piper_vision_atas_ruim.py --tenant cau-pr
"""
from __future__ import annotations

import argparse
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
from app.models.ato import Ato, ConteudoAto, RodadaAnalise
from app.models.analise import Analise
from app.services.piper_service import (
    analisar_ato_piper_visao,
    montar_system_prompt,
)
from app.workers.analise_tasks import _baixar_pdf


CAU_SLUG_DEFAULT = "cau-pr"


async def _coletar(tenant_id: uuid.UUID, limit: int | None) -> list[dict]:
    async with async_session_factory() as db:
        sql = """
            SELECT a.id, a.numero, a.data_publicacao, a.url_pdf, a.processado,
                   (SELECT COUNT(*) FROM analises WHERE ato_id=a.id) AS qt_analises
            FROM atos a
            JOIN conteudo_ato c ON c.ato_id = a.id
            WHERE a.tenant_id = :tid
              AND a.tipo = 'ata_plenaria'
              AND c.qualidade = 'ruim'
              AND a.url_pdf IS NOT NULL
            ORDER BY a.data_publicacao NULLS LAST
        """
        if limit:
            sql += f" LIMIT {int(limit)}"
        rows = await db.execute(text(sql), {"tid": str(tenant_id)})
        return [dict(r._mapping) for r in rows]


async def _setup_rodada(tenant_id: uuid.UUID) -> tuple[uuid.UUID, str]:
    async with async_session_factory() as db:
        await db.execute(text("""
            UPDATE rodadas_analise SET status='cancelado', concluido_em=NOW()
            WHERE tenant_id=:t AND status IN ('em_progresso','pendente')
        """), {"t": str(tenant_id)})
        rodada = RodadaAnalise(
            id=uuid.uuid4(), tenant_id=tenant_id, status="em_progresso",
            agente="piper_visao_ocr", iniciado_em=datetime.now(timezone.utc),
        )
        db.add(rodada)
        await db.commit()
        sp = await montar_system_prompt(db, tenant_id)
        return rodada.id, sp


async def _processar_ata(ato_id: uuid.UUID, rodada_id: uuid.UUID, sp: str) -> dict:
    """Reset processado, baixa PDF, roda Piper Vision, retorna métricas."""
    async with async_session_factory() as db:
        # Reset processado pra Piper Vision não fazer early-return
        await db.execute(update(Ato).where(Ato.id == ato_id).values(processado=False))
        await db.commit()

        # Pega url_pdf
        ar = await db.execute(select(Ato.url_pdf).where(Ato.id == ato_id))
        url = ar.scalar_one()

    pdf_bytes = await _baixar_pdf(url, timeout=120)
    pdf_mb = len(pdf_bytes) / 1_000_000

    async with async_session_factory() as db:
        await analisar_ato_piper_visao(db, ato_id, rodada_id, sp, pdf_bytes)

        # Re-fetch pra reportar resultado
        ar = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
        analise = ar.scalar_one()
        cr = await db.execute(select(ConteudoAto).where(ConteudoAto.ato_id == ato_id))
        conteudo = cr.scalar_one_or_none()

    return {
        "pdf_mb": pdf_mb,
        "qualidade_apos": conteudo.qualidade if conteudo else None,
        "len_texto_apos": len(conteudo.texto_completo or "") if conteudo else 0,
        "nivel": analise.nivel_alerta,
        "score": analise.score_risco,
        "custo": float(analise.custo_piper_usd or 0),
    }


async def main(tenant_slug: str, limit: int | None, dry_run: bool) -> None:
    async with async_session_factory() as db:
        tenant = (await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))).scalar_one()
    rows = await _coletar(tenant.id, limit)

    print(f"\n=== Piper Vision — atas '{tenant_slug}' qualidade=ruim ===")
    print(f"Atas a processar: {len(rows)}")
    if not rows:
        print("Nada a fazer.")
        return

    if dry_run:
        for r in rows:
            print(f"  num={r['numero']!r:6} dt={r['data_publicacao']} processado={r['processado']} qt_analises={r['qt_analises']}")
        return

    rodada_id, sp = await _setup_rodada(tenant.id)
    print(f"Rodada criada: {rodada_id}")
    print(f"System prompt: {len(sp):,} chars\n")

    sucesso = falha = 0
    custo_total = 0.0
    inicio = time.monotonic()
    print(f"{'#':>3}  {'NUM':>6}  {'DATA':10}  {'PDF':>6}  {'NIVEL':10}  {'SCORE':>5}  {'QUAL_APOS':18}  {'CUSTO':>9}")
    print("-" * 95)
    for i, r in enumerate(rows, 1):
        num = r["numero"]
        dt = str(r["data_publicacao"]) if r["data_publicacao"] else "?"
        try:
            out = await _processar_ata(r["id"], rodada_id, sp)
            custo_total += out["custo"]
            print(f"{i:>3}  {num!r:>6}  {dt:10}  {out['pdf_mb']:>5.1f}M  {out['nivel']:10}  {out['score']:>5}  {out['qualidade_apos']!r:18}  ${out['custo']:.4f}")
            sucesso += 1
        except Exception as exc:
            print(f"{i:>3}  {num!r:>6}  {dt:10}  ERRO: {type(exc).__name__}: {str(exc)[:80]}")
            falha += 1

    elapsed = time.monotonic() - inicio
    async with async_session_factory() as db:
        await db.execute(
            update(RodadaAnalise).where(RodadaAnalise.id == rodada_id)
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
    print(f"  Sucesso: {sucesso}/{len(rows)}")
    print(f"  Falha:   {falha}")
    print(f"  Custo:   US$ {custo_total:.4f}")
    print(f"  Tempo:   {elapsed:.0f}s ({elapsed/60:.1f}min)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant", default=CAU_SLUG_DEFAULT)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.tenant, args.limit, args.dry_run))
