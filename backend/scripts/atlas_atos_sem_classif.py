#!/usr/bin/env python3
"""
atlas_atos_sem_classif.py — classifica os atos do CAU/PR (ou outro tenant)
que têm análise (Piper/Bud) mas estão com tipo_atlas=NULL.

Estratégia em 2 frentes:
  • atos com texto utilizável (boa/parcial/digitalizado_ocr) → roda ATLAS via Gemini
  • atos sem texto (ruim/digitalizado/vazio) → backfill pelo tipo do scraper
    (mapeamento 1-1: ata_plenaria→ata_plenaria, deliberacao→deliberacao_arquivo,
    portaria→portaria_arquivo). media_library sem texto fica como está (categoria
    incerta — exigiria revisão manual).

Uso (dentro do container api):
    python /app/scripts/atlas_atos_sem_classif.py --tenant cau-pr --dry-run
    python /app/scripts/atlas_atos_sem_classif.py --tenant cau-pr
"""
from __future__ import annotations

import argparse
import asyncio
import sys
import time
import uuid
from collections import Counter

sys.path.insert(0, "/app")

from sqlalchemy import select, text, update
from app.database import async_session_factory
from app.models.tenant import Tenant
from app.models.ato import Ato
from app.services.atlas_service import classificar_ato_atlas


MAPA_FALLBACK_TIPO = {
    "ata_plenaria": "ata_plenaria",
    "deliberacao": "deliberacao_arquivo",
    "portaria": "portaria_arquivo",
    "portaria_normativa": "portaria_arquivo",
}


async def _coletar(tenant_id: uuid.UUID) -> list[dict]:
    async with async_session_factory() as db:
        rows = await db.execute(text("""
            SELECT a.id, a.tipo, a.numero, a.data_publicacao,
                   c.qualidade,
                   COALESCE(length(c.texto_completo), 0) AS len_texto
            FROM atos a
            JOIN analises an ON an.ato_id = a.id
            LEFT JOIN conteudo_ato c ON c.ato_id = a.id
            WHERE a.tenant_id = :tid
              AND a.tipo_atlas IS NULL
              AND (an.analisado_por_piper = true OR an.analisado_por_bud = true)
            ORDER BY a.tipo, a.data_publicacao DESC NULLS LAST
        """), {"tid": str(tenant_id)})
        return [dict(r._mapping) for r in rows]


def _tem_texto_util(reg: dict) -> bool:
    qual = reg.get("qualidade")
    return bool(reg.get("len_texto") and qual in ("boa", "parcial", "digitalizado_ocr"))


async def _classificar_via_atlas(ato_id: uuid.UUID) -> tuple[str, float, float]:
    """Roda ATLAS num ato. Retorna (categoria, confianca, custo_usd)."""
    async with async_session_factory() as db:
        classif = await classificar_ato_atlas(db, ato_id)
        await db.commit()
        return (
            classif.categoria,
            float(classif.confianca_categoria or 0),
            float(classif.custo_usd or 0),
        )


async def _backfill_por_tipo(ato_id: uuid.UUID, categoria: str) -> None:
    async with async_session_factory() as db:
        await db.execute(
            update(Ato).where(Ato.id == ato_id).values(tipo_atlas=categoria)
        )
        await db.commit()


async def main(tenant_slug: str, dry_run: bool) -> None:
    async with async_session_factory() as db:
        tenant = (await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))).scalar_one()
    rows = await _coletar(tenant.id)

    print(f"\n=== ATLAS — atos sem tipo_atlas com análise ({tenant_slug}) ===")
    print(f"Total: {len(rows)}")

    via_atlas = [r for r in rows if _tem_texto_util(r)]
    via_fallback = [r for r in rows if not _tem_texto_util(r) and r["tipo"] in MAPA_FALLBACK_TIPO]
    sem_solucao = [r for r in rows if not _tem_texto_util(r) and r["tipo"] not in MAPA_FALLBACK_TIPO]

    print(f"  • Via ATLAS (texto utilizável): {len(via_atlas)}")
    print(f"  • Via fallback por tipo:         {len(via_fallback)}")
    print(f"  • Sem solução (fica NULL):       {len(sem_solucao)}")
    print()

    if dry_run:
        for r in rows:
            destino = "ATLAS" if _tem_texto_util(r) else (
                f"fallback→{MAPA_FALLBACK_TIPO.get(r['tipo'])}"
                if r["tipo"] in MAPA_FALLBACK_TIPO else "—"
            )
            print(f"  [{r['tipo']:18}] {str(r['numero'])[:30]:30} qual={r['qualidade']!r:22} len={r['len_texto']:>6} → {destino}")
        return

    # 1) Backfill direto (rápido)
    print(">>> Aplicando fallback por tipo...")
    for r in via_fallback:
        cat = MAPA_FALLBACK_TIPO[r["tipo"]]
        await _backfill_por_tipo(r["id"], cat)
        print(f"  ✓ {r['tipo']:18} {str(r['numero'])[:25]:25} → {cat}")

    # 2) ATLAS via IA
    print(f"\n>>> Rodando ATLAS em {len(via_atlas)} atos com texto...")
    contadores: Counter = Counter()
    custo_total = 0.0
    inicio = time.monotonic()
    for i, r in enumerate(via_atlas, 1):
        try:
            cat, conf, custo = await _classificar_via_atlas(r["id"])
            contadores[cat] += 1
            custo_total += custo
            print(f"  [{i:>2}/{len(via_atlas)}] {r['tipo']:18} {str(r['numero'])[:25]:25} → {cat:24} conf={conf:.2f} ${custo:.4f}")
        except Exception as exc:
            contadores["ERRO"] += 1
            print(f"  [{i:>2}/{len(via_atlas)}] {r['tipo']:18} {str(r['numero'])[:25]:25} ERRO: {type(exc).__name__}: {str(exc)[:100]}")
    elapsed = time.monotonic() - inicio
    print(f"\n>>> ATLAS: {sum(contadores.values()) - contadores['ERRO']} ok, {contadores['ERRO']} erros — ${custo_total:.4f} em {elapsed:.1f}s")

    # 3) Resumo distribuição
    print()
    print("Distribuição final dos atos processados via ATLAS:")
    for cat, qt in contadores.most_common():
        print(f"  {cat:30} {qt}")

    # 4) Confere se atas 11 e 21 receberam tipo_atlas
    async with async_session_factory() as db:
        r = await db.execute(text("""
            SELECT a.numero, a.tipo, a.tipo_atlas
            FROM atos a JOIN tenants t ON t.id=a.tenant_id
            WHERE t.slug=:slug AND a.tipo='ata_plenaria' AND a.numero IN ('11','21','15','4')
            ORDER BY a.numero
        """), {"slug": tenant_slug})
        print()
        print("Conferência (atas vermelhas que sumiram do painel):")
        for row in r:
            print(f"  ata {row.numero:5} tipo_atlas={row.tipo_atlas!r}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant", default="cau-pr")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.tenant, args.dry_run))
