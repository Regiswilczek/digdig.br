#!/usr/bin/env python3
"""
atlas_pos_ocr.py — roda ATLAS em atos sem ClassificacaoAtlas com texto utilizável
(boa/parcial/digitalizado_ocr). Foco: atas plenárias que acabaram de ganhar texto
via OCR Flash Lite.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
import time
import uuid

sys.path.insert(0, "/app")

from sqlalchemy import select, text
from app.database import async_session_factory
from app.models.tenant import Tenant
from app.services.atlas_service import classificar_ato_atlas


async def main(tenant_slug: str, tipo: str | None) -> None:
    async with async_session_factory() as db:
        tenant = (await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))).scalar_one()

    async with async_session_factory() as db:
        sql = """
            SELECT a.id, a.tipo, a.numero, c.qualidade
            FROM atos a
            JOIN conteudo_ato c ON c.ato_id = a.id
            WHERE a.tenant_id = :tid
              AND c.qualidade IN ('boa', 'parcial', 'digitalizado_ocr')
              AND length(c.texto_completo) > 0
              AND NOT EXISTS (SELECT 1 FROM classificacao_atlas ca WHERE ca.ato_id=a.id)
        """
        params = {"tid": str(tenant.id)}
        if tipo:
            sql += " AND a.tipo = :tipo"
            params["tipo"] = tipo
        sql += " ORDER BY a.tipo, a.data_publicacao DESC NULLS LAST"
        rows = list((await db.execute(text(sql), params)).all())

    print(f"\n=== ATLAS pós-OCR — {tenant_slug} ===")
    print(f"Atos a classificar: {len(rows)}")
    if not rows:
        return

    custo_total = 0.0
    erros = 0
    inicio = time.monotonic()
    for i, row in enumerate(rows, 1):
        try:
            async with async_session_factory() as db:
                classif = await classificar_ato_atlas(db, row.id)
                # Atualiza Ato.tipo_atlas pra refletir
                await db.execute(
                    text("UPDATE atos SET tipo_atlas = :cat WHERE id = :id"),
                    {"cat": classif.categoria, "id": str(row.id)},
                )
                await db.commit()
                custo = float(classif.custo_usd or 0)
                custo_total += custo
            print(f"  [{i:>3}/{len(rows)}] {row.tipo:18} {str(row.numero)[:25]:25} → {classif.categoria:24} ${custo:.4f}")
        except Exception as exc:
            erros += 1
            print(f"  [{i:>3}/{len(rows)}] {row.tipo:18} {str(row.numero)[:25]:25} ERRO: {type(exc).__name__}: {str(exc)[:80]}")

    elapsed = time.monotonic() - inicio
    print(f"\n═══ TOTAL ═══")
    print(f"  Sucesso: {len(rows) - erros}/{len(rows)}")
    print(f"  Erros:   {erros}")
    print(f"  Custo:   US$ {custo_total:.4f}")
    print(f"  Tempo:   {elapsed:.0f}s")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant", default="cau-pr")
    parser.add_argument("--tipo", default=None, help="Filtrar por tipo do scraper")
    args = parser.parse_args()
    asyncio.run(main(args.tenant, args.tipo))
