#!/usr/bin/env python3
"""
atlas_amostra.py — calibração do agente ATLAS em ~30 atos aleatórios.

Roda ATLAS sobre uma amostra estratificada (5 atos de cada tipo principal),
NÃO persiste no banco — só imprime resultado pra calibrar prompt antes do
run grande.

Uso (cd backend/):
    python scripts/atlas_amostra.py
    python scripts/atlas_amostra.py --por-tipo 3   # 3 de cada tipo
"""
import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from sqlalchemy import select, func
from app.database import async_session_factory
from app.models.ato import Ato, ConteudoAto
from app.models.classificacao_atlas import ClassificacaoAtlas
from app.models.tenant import Tenant
from app.services.atlas_service import (
    _montar_input_atlas, _parse_atlas_response, _normalizar_resultado,
    _get_client, montar_prompt_atlas, ATLAS_PROMPT_VERSION, PRECO_ATLAS,
)
from app.config import settings

TENANT_SLUG = "cau-pr"
TIPOS = ["portaria", "deliberacao", "ata_plenaria", "media_library"]


async def coletar_amostra(db, por_tipo: int) -> list:
    tenant = (await db.execute(select(Tenant).where(Tenant.slug == TENANT_SLUG))).scalar_one()
    todos = []
    for tipo in TIPOS:
        rows = (await db.execute(
            select(Ato.id, Ato.tipo, Ato.numero, Ato.data_publicacao,
                   Ato.titulo, Ato.ementa,
                   ConteudoAto.qualidade, ConteudoAto.tokens_estimados)
            .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
            .where(
                Ato.tenant_id == tenant.id,
                Ato.tipo == tipo,
                ConteudoAto.qualidade.in_(["boa", "parcial"]),
                func.length(ConteudoAto.texto_completo) > 100,
            )
            .order_by(func.random())
            .limit(por_tipo)
        )).all()
        todos.extend(rows)
    return todos


def fmt_brl(v) -> str:
    if v is None:
        return "—"
    return f"R$ {float(v):,.2f}"


async def main(por_tipo: int):
    print(f"\n{'=' * 78}")
    print(f"  ATLAS — CALIBRAÇÃO ({por_tipo} atos aleatórios por tipo)")
    print(f"  modelo: {settings.gemini_flash_lite_model}  prompt: {ATLAS_PROMPT_VERSION}")
    print(f"{'=' * 78}\n")

    async with async_session_factory() as db:
        amostra = await coletar_amostra(db, por_tipo)
        print(f"Amostra coletada: {len(amostra)} atos\n")

        # Resolve prompt do ATLAS pra esse tenant (taxonomia filtrada por tipo_orgao)
        tenant_full = (await db.execute(select(Tenant).where(Tenant.slug == TENANT_SLUG))).scalar_one()
        atlas_prompt = await montar_prompt_atlas(db, tenant_full.tipo_orgao)

        client = _get_client()
        custo_total = 0.0
        por_categoria: dict[str, int] = {}
        erros = 0
        log_calls: list = []

        for i, row in enumerate(amostra, 1):
            ato_id, tipo, numero, data, titulo, ementa, qual, toks = row

            # Lê texto completo
            conteudo_r = await db.execute(
                select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
            )
            conteudo = conteudo_r.scalar_one()

            # Constrói "ato simulado" pra reaproveitar _montar_input_atlas
            class _AtoFake:
                pass
            fake = _AtoFake()
            fake.id = ato_id
            fake.tipo = tipo
            fake.numero = numero
            fake.data_publicacao = data
            fake.titulo = titulo
            fake.ementa = ementa
            fake.tenant_id = None

            user_prompt = _montar_input_atlas(fake, conteudo)
            chars_input = len(atlas_prompt) + len(user_prompt)

            print(f"[{i:2d}/{len(amostra)}] {tipo:14s} {str(numero)[:14]:14s} {str(data)[:10]:10s} qual={qual:7s} {toks or 0:>6}t  ", end="", flush=True)

            t0 = time.monotonic()
            try:
                response = await client.chat.completions.create(
                    model=settings.gemini_flash_lite_model,
                    max_tokens=3000,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": atlas_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                )
                raw = response.choices[0].message.content or ""
                parsed = _parse_atlas_response(raw)
                norm = _normalizar_resultado(parsed)

                tokens_in = response.usage.prompt_tokens if response.usage else 0
                tokens_out = response.usage.completion_tokens if response.usage else 0
                custo = tokens_in * PRECO_ATLAS["input"] + tokens_out * PRECO_ATLAS["output"]
                elapsed = time.monotonic() - t0

                custo_total += custo
                cat = norm["categoria"]
                por_categoria[cat] = por_categoria.get(cat, 0) + 1

                conf = float(norm["confianca_categoria"])
                skip = "SKIP" if not norm["vai_para_piper"] else "→piper"
                print(f"cat={cat:24s} conf={conf:.2f}  {skip:6s}  {tokens_in}/{tokens_out}t  {elapsed:.1f}s  ${custo:.4f}")

                # Detalhe extra
                detalhes = []
                if norm.get("numero_oficial"):
                    detalhes.append(f"num={norm['numero_oficial']}")
                if norm.get("data_documento"):
                    detalhes.append(f"data={norm['data_documento']}")
                if norm.get("ano_referencia"):
                    detalhes.append(f"ano_ref={norm['ano_referencia']}")
                if norm.get("valor_envolvido_brl"):
                    detalhes.append(fmt_brl(norm["valor_envolvido_brl"]))
                if norm["dados_extras"].get("pessoas_mencionadas"):
                    detalhes.append(f"pessoas={len(norm['dados_extras']['pessoas_mencionadas'])}")
                if norm["dados_extras"].get("processos_referenciados"):
                    detalhes.append(f"procs={len(norm['dados_extras']['processos_referenciados'])}")
                if norm.get("subcategoria"):
                    detalhes.append(f"sub={norm['subcategoria']}")
                if norm.get("motivo_skip"):
                    detalhes.append(f"motivo={norm['motivo_skip'][:60]}")
                if detalhes:
                    print(f"        {' | '.join(detalhes)}")
                if norm.get("resumo_curto"):
                    print(f"        \"{norm['resumo_curto'][:140]}\"")

                log_calls.append({
                    "ato_id": str(ato_id), "tipo": tipo, "numero": numero,
                    "categoria": cat, "subcategoria": norm.get("subcategoria"),
                    "confianca": conf,
                    "vai_para_piper": norm["vai_para_piper"],
                    "motivo_skip": norm.get("motivo_skip"),
                    "tokens_in": tokens_in, "tokens_out": tokens_out, "custo": custo,
                    "elapsed_s": elapsed,
                    "norm": {k: (str(v) if hasattr(v, "isoformat") or hasattr(v, "quantize") else v)
                             for k, v in norm.items() if k != "dados_extras"},
                    "dados_extras": norm["dados_extras"],
                })
            except Exception as exc:
                erros += 1
                elapsed = time.monotonic() - t0
                print(f"✗ {type(exc).__name__}: {str(exc)[:80]}  ({elapsed:.1f}s)")
                log_calls.append({
                    "ato_id": str(ato_id), "tipo": tipo, "numero": numero,
                    "erro": f"{type(exc).__name__}: {str(exc)[:300]}",
                    "elapsed_s": elapsed,
                })

            await asyncio.sleep(0.5)  # rate limit gentil

        print(f"\n{'─' * 78}")
        print(f"DISTRIBUIÇÃO DE CATEGORIAS:")
        for cat, qtd in sorted(por_categoria.items(), key=lambda x: -x[1]):
            print(f"  {cat:30s} {qtd:>3d}")
        print(f"\nCusto total: ${custo_total:.4f}")
        print(f"Erros:       {erros}/{len(amostra)}")
        print(f"{'─' * 78}\n")

        # Salva log
        ts = time.strftime("%Y%m%d_%H%M%S")
        out_path = Path(f"/tmp/atlas_amostra_{ts}.json")
        out_path.write_text(json.dumps({
            "modelo": settings.gemini_flash_lite_model,
            "prompt_version": ATLAS_PROMPT_VERSION,
            "por_tipo": por_tipo,
            "custo_total_usd": custo_total,
            "distribuicao_categorias": por_categoria,
            "erros": erros,
            "calls": log_calls,
        }, indent=2, ensure_ascii=False, default=str))
        print(f"Log salvo em: {out_path}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--por-tipo", type=int, default=5,
                        help="Atos por tipo na amostra (default: 5 → 20 atos total)")
    args = parser.parse_args()
    asyncio.run(main(args.por_tipo))
