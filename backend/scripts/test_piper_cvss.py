#!/usr/bin/env python3
"""
Teste end-to-end do Piper com validação dos campos CVSS-A.

Seleciona 1–N atos com texto disponível, roda o Piper (Gemini Pro) e exibe:
  - Campos CVSS extraídos pelo LLM
  - Score calculado deterministicamente pelo backend
  - Nível de alerta resultante
  - JSON completo da resposta

Uso:
    cd backend
    python scripts/test_piper_cvss.py              # 3 atos pendentes
    python scripts/test_piper_cvss.py --count 1
    python scripts/test_piper_cvss.py --ato-id <uuid>
    python scripts/test_piper_cvss.py --forcado    # reprocesa atos já analisados

Custo estimado: ~$0.02–$0.05 por ato (Gemini Pro)
"""
import argparse
import asyncio
import json
import os
import sys
import uuid as _uuid
from pathlib import Path
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).parent.parent))

_env = Path(__file__).parent.parent / ".env"
if _env.exists():
    with open(_env) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

from sqlalchemy import select, update
from app.database import async_session_factory
from app.models.ato import Ato, ConteudoAto, RodadaAnalise
from app.models.analise import Analise
from app.models.tenant import Tenant
from app.services.piper_service import analisar_ato_piper, montar_system_prompt
from app.services.cvss_service import nivel_de_cvss

C = {
    "verde":    "\033[92m",
    "amarelo":  "\033[93m",
    "laranja":  "\033[33m",
    "vermelho": "\033[91m",
    "ok":       "\033[92m",
    "warn":     "\033[93m",
    "bold":     "\033[1m",
    "dim":      "\033[2m",
    "reset":    "\033[0m",
}


def _cor_nivel(nivel: str) -> str:
    return C.get(nivel, "") + nivel.upper() + C["reset"]


def _cor_cvss(score: Decimal | None) -> str:
    if score is None:
        return C["warn"] + "N/A" + C["reset"]
    nivel = nivel_de_cvss(score)
    return C.get(nivel, "") + str(score) + C["reset"]


CVSS_CAMPOS = ["cvss_fi", "cvss_li", "cvss_ri", "cvss_av", "cvss_ac", "cvss_pr"]
CVSS_VALORES = {
    "cvss_fi": ["nenhum", "baixo", "medio", "alto"],
    "cvss_li": ["formal", "grave", "crime"],
    "cvss_ri": ["interno", "publico", "sistemico"],
    "cvss_av": ["colegiado", "unilateral"],
    "cvss_ac": ["alta", "baixa"],
    "cvss_pr": ["baixo_escalao", "alto_escalao"],
}


def _validar_cvss(resultado: dict) -> list[str]:
    """Retorna lista de avisos de validação."""
    avisos = []
    for campo in CVSS_CAMPOS:
        valor = resultado.get(campo)
        if valor is None:
            avisos.append(f"  ⚠  {campo}: AUSENTE (LLM não preencheu)")
        elif valor not in CVSS_VALORES[campo]:
            validos = "|".join(CVSS_VALORES[campo])
            avisos.append(f"  ⚠  {campo}: valor inválido '{valor}' — esperado: {validos}")
    return avisos


async def _escolher_atos(
    db, tenant_id: _uuid.UUID, ato_id_arg: str | None, count: int, forcado: bool
) -> list[Ato]:
    if ato_id_arg:
        r = await db.execute(select(Ato).where(Ato.id == _uuid.UUID(ato_id_arg)))
        ato = r.scalar_one_or_none()
        return [ato] if ato else []

    # Atos com texto extraído (conteudo_ato com qualidade="boa")
    base_q = (
        select(Ato)
        .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tenant_id,
            ConteudoAto.qualidade == "boa",
        )
        .order_by(Ato.data_publicacao.desc().nullslast())
        .limit(count)
    )

    if not forcado:
        base_q = base_q.where(Ato.processado == False)

    r = await db.execute(base_q)
    return list(r.scalars().all())


async def main(ato_id_arg: str | None, count: int, forcado: bool) -> None:
    print(f"\n{C['bold']}=== Teste Piper — Validação CVSS-A ==={C['reset']}\n")

    async with async_session_factory() as db:
        tenant_r = await db.execute(select(Tenant).where(Tenant.slug == "cau-pr"))
        tenant = tenant_r.scalar_one_or_none()
        if not tenant:
            sys.exit("ERRO: tenant 'cau-pr' não encontrado.")

        atos = await _escolher_atos(db, tenant.id, ato_id_arg, count, forcado)

        if not atos:
            msg = "Nenhum ato pendente com texto disponível."
            if not forcado:
                msg += " Use --forcado para reprocessar atos já analisados."
            sys.exit(msg)

        print(f"Atos selecionados: {len(atos)}")
        for ato in atos:
            print(f"  → {ato.tipo} {ato.numero or '?':12s}  {str(ato.data_publicacao or '')[:10]}  processado={ato.processado}")
        print()

        print(f"{C['dim']}Carregando system prompt (regimento + KB)...{C['reset']}")
        system_prompt = await montar_system_prompt(db, tenant.id)
        print(f"System prompt: ~{len(system_prompt)//4:,} tokens\n")

        # Rodada de teste (status="teste" — não aparece como rodada ativa)
        rodada = RodadaAnalise(id=_uuid.uuid4(), tenant_id=tenant.id, status="teste")
        db.add(rodada)
        await db.flush()

        resultados_cvss = []

        for i, ato in enumerate(atos, 1):
            print(f"{C['bold']}{'─'*60}{C['reset']}")
            print(f"[{i}/{len(atos)}] {ato.tipo.upper()} {ato.numero or '?'} — {str(ato.data_publicacao or '')[:10]}")
            print(f"Ementa: {(ato.ementa or 'N/A')[:100]}")
            print()

            if forcado and ato.processado:
                await db.execute(
                    update(Ato).where(Ato.id == ato.id).values(processado=False)
                )
                await db.flush()

            try:
                print(f"{C['dim']}  Chamando Gemini Pro...{C['reset']}")
                analise = await analisar_ato_piper(db, ato.id, rodada.id, system_prompt)
                resultado = analise.resultado_piper or {}

                print(f"\n  {C['bold']}Resultado:{C['reset']}")
                print(f"  Nível de alerta : {_cor_nivel(analise.nivel_alerta or '?')}")
                print(f"  Score risco     : {analise.score_risco}/100")
                print(f"  Custo           : ${float(analise.custo_usd or 0):.5f} USD")
                print(f"  Tokens          : {analise.tokens_piper or 0:,}")

                print(f"\n  {C['bold']}CVSS-A:{C['reset']}")
                print(f"  cvss_fi         : {resultado.get('cvss_fi', C['warn']+'AUSENTE'+C['reset'])}")
                print(f"  cvss_li         : {resultado.get('cvss_li', C['warn']+'AUSENTE'+C['reset'])}")
                print(f"  cvss_ri         : {resultado.get('cvss_ri', C['warn']+'AUSENTE'+C['reset'])}")
                print(f"  cvss_av         : {resultado.get('cvss_av', C['warn']+'AUSENTE'+C['reset'])}")
                print(f"  cvss_ac         : {resultado.get('cvss_ac', C['warn']+'AUSENTE'+C['reset'])}")
                print(f"  cvss_pr         : {resultado.get('cvss_pr', C['warn']+'AUSENTE'+C['reset'])}")
                print(f"  ──────────────────────────────")
                print(f"  CVSS-A Score    : {_cor_cvss(analise.cvss_score)}")
                print(f"  CVSS-A Vector   : {analise.cvss_vector or 'N/A'}")
                print(f"  Nível CVSS      : {_cor_nivel(nivel_de_cvss(analise.cvss_score) if analise.cvss_score else 'verde')}")

                avisos = _validar_cvss(resultado)
                if avisos:
                    print(f"\n  {C['warn']}Avisos de validação:{C['reset']}")
                    for a in avisos:
                        print(f"  {a}")
                else:
                    print(f"\n  {C['ok']}✓ Todos os campos CVSS preenchidos corretamente{C['reset']}")

                resultados_cvss.append({
                    "ato": f"{ato.tipo} {ato.numero}",
                    "nivel": analise.nivel_alerta,
                    "cvss_score": str(analise.cvss_score),
                    "cvss_vector": analise.cvss_vector,
                    "fi": resultado.get("cvss_fi"),
                    "li": resultado.get("cvss_li"),
                    "ri": resultado.get("cvss_ri"),
                    "av": resultado.get("cvss_av"),
                    "ac": resultado.get("cvss_ac"),
                    "pr": resultado.get("cvss_pr"),
                    "avisos": len(avisos),
                })

                print(f"\n  {C['dim']}JSON completo (campos principais):{C['reset']}")
                campos_exibir = {
                    k: v for k, v in resultado.items()
                    if k in ("nivel_alerta", "score_risco", "resumo",
                             "cvss_fi", "cvss_li", "cvss_ri", "cvss_av", "cvss_ac", "cvss_pr",
                             "opacidade_linguistica", "requer_aprofundamento", "parse_error")
                }
                print(json.dumps(campos_exibir, ensure_ascii=False, indent=4))

            except Exception as e:
                print(f"  {C['warn']}✗ Erro: {e}{C['reset']}")
                resultados_cvss.append({"ato": f"{ato.tipo} {ato.numero}", "erro": str(e)})

        # Resumo final
        print(f"\n{C['bold']}{'='*60}")
        print(f"  RESUMO — {len(atos)} ATO(S) TESTADO(S)")
        print(f"{'='*60}{C['reset']}")
        total_avisos = sum(r.get("avisos", 0) for r in resultados_cvss)
        if total_avisos == 0:
            print(f"  {C['ok']}✓ CVSS-A: todos os campos preenchidos em todos os atos{C['reset']}")
        else:
            print(f"  {C['warn']}⚠  {total_avisos} campo(s) ausente(s) ou inválido(s) no total{C['reset']}")
            print(f"     → Revisar o prompt PIPER_EXTRA em piper_service.py")

        print()
        for r in resultados_cvss:
            if "erro" in r:
                print(f"  {r['ato']:30s}  {C['warn']}ERRO: {r['erro'][:60]}{C['reset']}")
            else:
                status = C['ok']+"OK"+C['reset'] if r['avisos'] == 0 else C['warn']+f"{r['avisos']} aviso(s)"+C['reset']
                print(f"  {r['ato']:30s}  CVSS={r['cvss_score']:4s}  [{r['nivel']:8s}]  {status}")
        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ato-id", default=None)
    parser.add_argument("--count", type=int, default=3)
    parser.add_argument("--forcado", action="store_true",
                        help="Reprocessa atos já analisados (ignora processado=True)")
    args = parser.parse_args()
    asyncio.run(main(args.ato_id, args.count, args.forcado))
