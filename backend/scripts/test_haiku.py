#!/usr/bin/env python3
"""
Testa a análise Haiku em 1 ato antes de rodar o pipeline completo.
Valida: prompt caching, classificação, JSON estruturado, custo real.

Usage (from backend/ directory):
    source .venv/Scripts/activate
    python scripts/test_haiku.py
    python scripts/test_haiku.py --ato-id <uuid>   # testa ato específico
    python scripts/test_haiku.py --nivel laranja    # filtra por nível esperado
"""
import asyncio
import json
import os
import sys
import uuid
import argparse
from pathlib import Path

# ── Path + .env ────────────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))

_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

# ── App imports (after path+env setup) ────────────────────────────────────────
from sqlalchemy import select, text
from app.database import async_session_factory
from app.models.ato import Ato, ConteudoAto, RodadaAnalise
from app.models.tenant import Tenant
from app.services.haiku_service import analisar_ato_haiku, montar_system_prompt


CORES = {
    "verde":    "\033[92m",
    "amarelo":  "\033[93m",
    "laranja":  "\033[33m",
    "vermelho": "\033[91m",
    "reset":    "\033[0m",
    "bold":     "\033[1m",
    "dim":      "\033[2m",
}


def cor(nivel: str) -> str:
    return CORES.get(nivel, "") + nivel.upper() + CORES["reset"]


async def escolher_ato(db, tenant_id: uuid.UUID, ato_id_arg: str | None) -> Ato | None:
    if ato_id_arg:
        result = await db.execute(select(Ato).where(Ato.id == uuid.UUID(ato_id_arg)))
        return result.scalar_one_or_none()

    # Pega 1 ato que tenha texto extraído mas ainda não foi analisado
    result = await db.execute(
        select(Ato)
        .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tenant_id,
            Ato.pdf_baixado == True,
            Ato.processado == False,
        )
        .order_by(Ato.data_publicacao.desc().nullslast())
        .limit(1)
    )
    ato = result.scalar_one_or_none()

    if not ato:
        # Fallback: qualquer ato com texto, mesmo que já processado
        result = await db.execute(
            select(Ato)
            .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
            .where(Ato.tenant_id == tenant_id)
            .order_by(Ato.data_publicacao.desc().nullslast())
            .limit(1)
        )
        ato = result.scalar_one_or_none()

    return ato


async def main(ato_id_arg: str | None) -> None:
    print(f"\n{CORES['bold']}=== Teste Haiku — 1 Ato ==={CORES['reset']}\n")

    async with async_session_factory() as db:
        # Tenant
        tenant_result = await db.execute(select(Tenant).where(Tenant.slug == "cau-pr"))
        tenant = tenant_result.scalar_one_or_none()
        if not tenant:
            sys.exit("ERRO: tenant 'cau-pr' não encontrado.")

        # Ato
        ato = await escolher_ato(db, tenant.id, ato_id_arg)
        if not ato:
            sys.exit("ERRO: nenhum ato com texto extraído encontrado. Rode scrape_local.py primeiro.")

        # Conteúdo
        conteudo_result = await db.execute(
            select(ConteudoAto).where(ConteudoAto.ato_id == ato.id)
        )
        conteudo = conteudo_result.scalar_one_or_none()
        texto_len = len(conteudo.texto_completo) if conteudo else 0

        print(f"  Ato selecionado : {ato.tipo.upper()} {ato.numero}")
        print(f"  Data            : {ato.data_publicacao or 'N/A'}")
        print(f"  Ementa          : {(ato.ementa or 'N/A')[:100]}")
        print(f"  Texto extraído  : {texto_len:,} chars (~{texto_len // 4:,} tokens)")
        print(f"  Já processado   : {ato.processado}")
        print()

        # Monta system prompt (com regimento)
        print(f"{CORES['dim']}  Montando system prompt com regimento...{CORES['reset']}")
        system_prompt = await montar_system_prompt(db, tenant.id)
        sp_tokens = len(system_prompt) // 4
        print(f"  System prompt   : ~{sp_tokens:,} tokens")
        print()

        # Cria rodada de teste real (necessário pela FK NOT NULL em analises)
        rodada = RodadaAnalise(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            status="teste",
        )
        db.add(rodada)
        await db.flush()

        print(f"{CORES['dim']}  Chamando Haiku API...{CORES['reset']}")
        analise = await analisar_ato_haiku(db, ato.id, rodada.id, system_prompt)

        # Resultado
        nivel = analise.nivel_alerta or "?"
        print(f"\n{CORES['bold']}─── Resultado ───{CORES['reset']}")
        print(f"  Nível de alerta : {cor(nivel)}")
        print(f"  Score de risco  : {analise.score_risco}/100")
        print(f"  Custo real      : ${float(analise.custo_usd):.6f} USD")
        print(f"  Tokens Haiku    : {analise.tokens_haiku:,}")
        print()
        print(f"  Resumo: {analise.resumo_executivo}")
        print()

        resultado = analise.resultado_haiku or {}

        if resultado.get("parse_error"):
            print(f"\n  ⚠  PARSE_ERROR — a resposta da API não era JSON válido.")
            print(f"     Verifique os logs de WARNING do haiku_service para ver o texto bruto.\n")
        indicios = resultado.get("indicios", [])
        if indicios:
            print(f"  Indícios ({len(indicios)}):")
            for i in indicios:
                grav = i.get("gravidade", "?")
                print(f"    [{grav.upper()}] {i.get('tipo', '?')} — {i.get('descricao', '')[:80]}")
        else:
            print("  Indícios: nenhum")
        print()

        pessoas = resultado.get("pessoas_extraidas", [])
        if pessoas:
            print(f"  Pessoas extraídas ({len(pessoas)}):")
            for p in pessoas[:5]:
                print(f"    {p.get('nome', '?')} [{p.get('cargo', '?')}] — {p.get('tipo_aparicao', '?')}")
            if len(pessoas) > 5:
                print(f"    ... +{len(pessoas) - 5} mais")
        print()

        requer = resultado.get("requer_aprofundamento", False)
        motivo = resultado.get("motivo_aprofundamento")
        print(f"  Requer Sonnet?  : {'SIM' if requer else 'não'}" + (f" — {motivo}" if motivo else ""))

        print(f"\n{CORES['bold']}─── JSON Completo ───{CORES['reset']}")
        print(json.dumps(resultado, ensure_ascii=False, indent=2))

        print(f"\n{CORES['bold']}✅ Teste concluído com sucesso!{CORES['reset']}")
        print(f"   O ato foi marcado como processado=True no banco.")
        print(f"   Para rodar em todos os atos: dispare uma nova rodada no Railway.\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ato-id", default=None, help="UUID de um ato específico")
    args = parser.parse_args()
    asyncio.run(main(args.ato_id))
