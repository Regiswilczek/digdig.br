#!/usr/bin/env python3
"""
atlas_classificar.py — batch do agente ATLAS sobre todos os atos com texto.

Itera Ato JOIN ConteudoAto onde qualidade IN ('boa','parcial') AND texto != '',
chama ATLAS, persiste em classificacao_atlas. Idempotente: pula atos já
classificados a menos que --reprocessar.

Concorrência via asyncio.Semaphore + backoff exponencial em rate limits.

Uso (cd backend/):
    python scripts/atlas_classificar.py --dry-run           # só lista
    python scripts/atlas_classificar.py --limit 20          # smoke test
    python scripts/atlas_classificar.py --tipo media_library
    python scripts/atlas_classificar.py                     # tudo
    python scripts/atlas_classificar.py --concurrency 8
    python scripts/atlas_classificar.py --reprocessar --limit 50
"""
import argparse
import asyncio
import json
import sys
import time
import traceback
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from openai import RateLimitError as OpenAIRateLimitError, APIError as OpenAIAPIError
from sqlalchemy import select, func
from app.database import async_session_factory
from app.models.ato import Ato, ConteudoAto
from app.models.classificacao_atlas import ClassificacaoAtlas
from app.models.tenant import Tenant
from app.services.atlas_service import (
    classificar_ato_atlas, ATLAS_PROMPT_VERSION,
)
from app.config import settings

TENANT_SLUG_DEFAULT = "cau-pr"


async def coletar_atos(
    db, tenant_id, tipo: str | None, limit: int | None, reprocessar: bool,
    amostra_aleatoria: bool,
) -> list:
    q = (
        select(
            Ato.id, Ato.tipo, Ato.numero, Ato.data_publicacao,
            ConteudoAto.qualidade, ConteudoAto.tokens_estimados,
        )
        .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tenant_id,
            ConteudoAto.qualidade.in_(["boa", "parcial"]),
            func.length(ConteudoAto.texto_completo) > 0,
        )
    )
    if tipo:
        q = q.where(Ato.tipo == tipo)
    if not reprocessar:
        sub = select(ClassificacaoAtlas.ato_id).where(
            ClassificacaoAtlas.ato_id == Ato.id
        )
        q = q.where(~sub.exists())
    if amostra_aleatoria:
        q = q.order_by(func.random())
    else:
        q = q.order_by(Ato.tipo, Ato.data_publicacao.desc().nullslast())
    if limit:
        q = q.limit(limit)
    rows = (await db.execute(q)).all()
    return rows


async def processar_ato_com_retry(
    sem: asyncio.Semaphore, ato_id, tipo: str, numero: str,
    reprocessar: bool, log: list, contadores: dict,
):
    """Processa um ato com backoff exponencial em rate limits."""
    async with sem:
        for tentativa in range(4):  # 0,1,2,3 = até 3 retries
            try:
                async with async_session_factory() as db:
                    t0 = time.monotonic()
                    classif = await classificar_ato_atlas(
                        db, ato_id, reprocessar=reprocessar
                    )
                    await db.commit()
                    elapsed = time.monotonic() - t0

                cat = classif.categoria
                conf = float(classif.confianca_categoria)
                tokens_in = classif.tokens_input
                tokens_out = classif.tokens_output
                custo = float(classif.custo_usd)
                skip = "skip" if not classif.vai_para_piper else "→piper"
                contadores["ok"] += 1
                contadores["custo_total"] += custo
                contadores["por_categoria"][cat] += 1
                contadores["tokens_in_total"] += tokens_in
                contadores["tokens_out_total"] += tokens_out
                if not classif.vai_para_piper:
                    contadores["marcados_skip"] += 1
                if conf < 0.7:
                    contadores["baixa_confianca"] += 1

                log.append({
                    "ato_id": str(ato_id), "tipo": tipo, "numero": numero,
                    "categoria": cat, "subcategoria": classif.subcategoria,
                    "confianca": conf, "vai_para_piper": classif.vai_para_piper,
                    "tokens_in": tokens_in, "tokens_out": tokens_out,
                    "custo": custo, "elapsed_s": elapsed,
                })
                return f"cat={cat:24s} conf={conf:.2f} {skip:6s} {tokens_in}/{tokens_out}t {elapsed:.1f}s ${custo:.4f}"

            except (OpenAIRateLimitError, OpenAIAPIError) as exc:
                wait = 2 ** (tentativa + 2)  # 4, 8, 16, 32
                if tentativa < 3:
                    await asyncio.sleep(wait)
                    continue
                contadores["erro"] += 1
                log.append({
                    "ato_id": str(ato_id), "tipo": tipo, "numero": numero,
                    "erro": f"rate_limit_after_retries: {type(exc).__name__}",
                })
                return f"✗ rate_limit após retries"
            except Exception as exc:
                contadores["erro"] += 1
                log.append({
                    "ato_id": str(ato_id), "tipo": tipo, "numero": numero,
                    "erro": f"{type(exc).__name__}: {str(exc)[:300]}",
                    "trace": traceback.format_exc()[-1000:],
                })
                return f"✗ {type(exc).__name__}: {str(exc)[:80]}"


async def worker(idx: int, total: int, row, sem, reprocessar, log, contadores):
    ato_id, tipo, numero, data, qual, toks = row
    prefix = f"[{idx:4d}/{total}] {tipo:14s} {str(numero)[:14]:14s} {str(data)[:10]:10s}"
    msg = await processar_ato_com_retry(
        sem, ato_id, tipo, str(numero), reprocessar, log, contadores
    )
    print(f"{prefix}  {msg}", flush=True)


async def main(args):
    print(f"\n{'=' * 80}")
    print(f"  ATLAS — CLASSIFICAÇÃO BATCH")
    print(f"  modelo: {settings.gemini_flash_lite_model}  prompt: {ATLAS_PROMPT_VERSION}")
    print(f"  tenant: {args.tenant}  tipo: {args.tipo or 'todos'}  concurrency: {args.concurrency}")
    print(f"  reprocessar: {args.reprocessar}  limit: {args.limit or 'sem limite'}")
    print(f"{'=' * 80}\n")

    async with async_session_factory() as db:
        tenant = (await db.execute(select(Tenant).where(Tenant.slug == args.tenant))).scalar_one()
        atos = await coletar_atos(
            db, tenant.id, args.tipo, args.limit, args.reprocessar, args.amostra_aleatoria,
        )

    print(f"Atos a processar: {len(atos)}")
    if not atos:
        print("Nada a fazer.\n")
        return
    # Distribuição por tipo
    por_tipo = defaultdict(int)
    for r in atos:
        por_tipo[r[1]] += 1
    for t, q in sorted(por_tipo.items(), key=lambda x: -x[1]):
        print(f"  {t:20s} {q:>5d}")
    print()

    if args.dry_run:
        print("DRY RUN — nada será processado.\n")
        return

    sem = asyncio.Semaphore(args.concurrency)
    log: list = []
    contadores = {
        "ok": 0, "erro": 0, "marcados_skip": 0, "baixa_confianca": 0,
        "custo_total": 0.0, "tokens_in_total": 0, "tokens_out_total": 0,
        "por_categoria": defaultdict(int),
    }

    inicio = time.monotonic()
    tasks = [
        worker(i, len(atos), row, sem, args.reprocessar, log, contadores)
        for i, row in enumerate(atos, 1)
    ]
    await asyncio.gather(*tasks)
    elapsed = time.monotonic() - inicio

    # Resumo
    print(f"\n{'─' * 80}")
    print(f"RESUMO")
    print(f"{'─' * 80}")
    print(f"  Processados:       {contadores['ok']}/{len(atos)}")
    print(f"  Erros:             {contadores['erro']}")
    print(f"  Marcados skip:     {contadores['marcados_skip']}")
    print(f"  Baixa confiança:   {contadores['baixa_confianca']} (<0.70)")
    print(f"  Tokens in:         {contadores['tokens_in_total']:,}")
    print(f"  Tokens out:        {contadores['tokens_out_total']:,}")
    print(f"  Custo total:       ${contadores['custo_total']:.4f}")
    print(f"  Tempo total:       {elapsed:.1f}s ({elapsed/60:.1f}min)")
    if contadores['ok']:
        print(f"  Custo médio/ato:   ${contadores['custo_total']/contadores['ok']:.6f}")
        print(f"  Tempo médio/ato:   {elapsed/contadores['ok']:.2f}s")
    print(f"\n  Distribuição por categoria:")
    for cat, qtd in sorted(contadores["por_categoria"].items(), key=lambda x: -x[1]):
        print(f"    {cat:30s} {qtd:>5d}")
    print()

    # Log
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = Path(f"/tmp/atlas_classificar_{ts}.json")
    out_path.write_text(json.dumps({
        "modelo": settings.gemini_flash_lite_model,
        "prompt_version": ATLAS_PROMPT_VERSION,
        "tenant": args.tenant, "tipo_filtro": args.tipo,
        "concurrency": args.concurrency, "reprocessar": args.reprocessar,
        "duracao_segundos": elapsed,
        "totais": {
            **{k: v for k, v in contadores.items() if k != "por_categoria"},
            "por_categoria": dict(contadores["por_categoria"]),
        },
        "calls": log,
    }, indent=2, ensure_ascii=False, default=str))
    print(f"Log: {out_path}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant", default=TENANT_SLUG_DEFAULT)
    parser.add_argument("--tipo", default=None,
                        help="portaria | deliberacao | ata_plenaria | media_library")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--concurrency", type=int, default=5)
    parser.add_argument("--reprocessar", action="store_true",
                        help="Reclassifica mesmo se já existe registro")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--amostra-aleatoria", action="store_true",
                        help="Embaralha em vez de ordem temporal")
    args = parser.parse_args()
    asyncio.run(main(args))
