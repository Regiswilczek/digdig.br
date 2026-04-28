#!/usr/bin/env python3
"""
Gemini 2.5 Pro — Varredura completa com contexto Sonnet

Roda o Pro em TODOS os atos críticos com dados de Sonnet reais
+ Ata 167 (que tem Haiku mas não Sonnet JSON).

Prioridade: vermelho desc → laranja desc
Limite: $5 total (~50 atos a $0,10 cada)

Resultado salvo em: scripts/resultados_pro_all.json

Uso:
    cd backend
    python scripts/gemini_pro_all_test.py
"""
import asyncio
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from sqlalchemy import select, func
from openai import AsyncOpenAI

from app.database import async_session_factory
from app.models.ato import Ato, ConteudoAto
from app.models.analise import Analise
from app.models.tenant import Tenant, KnowledgeBase
from app.models.pessoa import AparicaoPessoa, Pessoa

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_PRO     = os.environ.get("GEMINI_PRO_MODEL", "models/gemini-2.5-pro")
TENANT_SLUG    = "cau-pr"
LIMITE_USD     = 5.00

# Ata 167 ID (confirmado no banco)
ATA_167_ID = "2c5880f5-773e-45a5-8a5a-6a5376534ac4"

PRECO_PRO = {"input": 1.25 / 1_000_000, "output": 10.00 / 1_000_000}

PROMPT_BASE = """\
Você é um auditor especializado em direito administrativo brasileiro e ética pública.

Sua missão é analisar atos administrativos do {nome_orgao} e identificar indícios \
de irregularidades legais, morais e éticas com base no Regimento Interno vigente.

═══════════════════════════════════════════════
REGIMENTO INTERNO — {nome_orgao}
{regimento}
═══════════════════════════════════════════════

NÍVEIS DE ALERTA:
- VERDE: ato conforme, sem irregularidades detectadas
- AMARELO: suspeito, requer atenção — possível irregularidade moral ou procedimental
- LARANJA: indício moderado-grave — possível irregularidade moral, ética ou legal
- VERMELHO: indício crítico — padrão altamente suspeito ou aparente violação legal direta

CRITÉRIOS DE ANÁLISE OBRIGATÓRIOS:

1. LEGAL: Violações diretas ao Regimento Interno e à Lei 12.378/2010
   - Autoridade incompetente para o ato
   - Violação de quórum, prazos excedidos, composição irregular de comissão

2. MORAL/ÉTICO (mesmo que "legal"):
   - Nepotismo, concentração de poder (Ad Referendum excessivo)
   - Perseguição política via comissões processantes
   - Cabide de empregos, gastos questionáveis, falta de transparência

3. EXTRAÇÃO ESTRUTURADA:
   - Nomes completos, cargos, valores monetários, referências a atos anteriores"""

SONNET_EXTRA = """

MODO: ANÁLISE PROFUNDA

Você está recebendo um ato que foi PRÉ-CLASSIFICADO como suspeito.
Use o histórico das pessoas envolvidas e os atos relacionados para:
1. Confirmar ou refutar a suspeita inicial do Haiku
2. Identificar padrões que só aparecem com contexto histórico
3. Construir uma narrativa política coerente
4. Gerar uma ficha de denúncia pronta para uso

Responda em JSON com esta estrutura:
{
  "nivel_alerta_confirmado": "verde|amarelo|laranja|vermelho",
  "score_risco_final": 0,
  "confirmacao_suspeita": true,
  "analise_aprofundada": {
    "indicios_legais": [{"tipo": "string", "descricao": "string", "artigo_violado": "string", "gravidade": "string"}],
    "indicios_morais": [{"tipo": "string", "descricao": "string", "impacto_politico": "string", "gravidade": "string"}],
    "padrao_identificado": "string|null",
    "narrativa_completa": "string"
  },
  "ficha_denuncia": {
    "titulo": "string",
    "fato": "string",
    "indicio_legal": "string",
    "indicio_moral": "string",
    "evidencias": ["string"],
    "impacto": "string",
    "recomendacao_campanha": "string"
  }
}"""


def custo(in_tok: int, out_tok: int) -> float:
    return in_tok * PRECO_PRO["input"] + out_tok * PRECO_PRO["output"]


def parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        import re
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
    return {"nivel_alerta_confirmado": "ERRO", "score_risco_final": -1}


def emoji(nivel: str) -> str:
    return {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}.get(
        nivel.lower(), "⚪"
    )


async def montar_contexto(db, ato_id, analise) -> str:
    conteudo_r = await db.execute(
        select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
    )
    conteudo = conteudo_r.scalar_one_or_none()
    texto = conteudo.texto_completo if conteudo else ""

    aparicoes_r = await db.execute(
        select(AparicaoPessoa).where(AparicaoPessoa.ato_id == ato_id).limit(10)
    )
    aparicoes = aparicoes_r.scalars().all()

    pessoa_ids = [ap.pessoa_id for ap in aparicoes]
    pessoas_by_id = {}
    if pessoa_ids:
        pessoas_r = await db.execute(select(Pessoa).where(Pessoa.id.in_(pessoa_ids)))
        pessoas_by_id = {p.id: p for p in pessoas_r.scalars().all()}

    historico = []
    for ap in aparicoes:
        p = pessoas_by_id.get(ap.pessoa_id)
        if p:
            historico.append({
                "nome": p.nome_normalizado,
                "cargo": ap.cargo,
                "total_aparicoes": p.total_aparicoes,
            })

    return (
        f"TEXTO DO ATO:\n{texto}\n\n"
        f"ANÁLISE PRÉVIA DO HAIKU:\n"
        f"{json.dumps(analise.resultado_haiku, ensure_ascii=False, indent=2)}\n\n"
        f"HISTÓRICO DAS PESSOAS ENVOLVIDAS:\n"
        f"{json.dumps(historico, ensure_ascii=False, indent=2)}"
    )


async def main():
    if not GEMINI_API_KEY:
        print("ERRO: GEMINI_API_KEY não configurada")
        sys.exit(1)

    client = AsyncOpenAI(
        api_key=GEMINI_API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )

    print("\n" + "=" * 72)
    print("  GEMINI 2.5 PRO — varredura completa com contexto Sonnet")
    print(f"  Limite: ${LIMITE_USD:.2f}")
    print("=" * 72)

    total_gasto = 0.0
    resultados = []

    async with async_session_factory() as db:
        tenant_r = await db.execute(select(Tenant).where(Tenant.slug == TENANT_SLUG))
        tenant = tenant_r.scalar_one()

        kb_r = await db.execute(
            select(KnowledgeBase)
            .where(KnowledgeBase.tenant_id == tenant.id, KnowledgeBase.tipo == "regimento")
            .order_by(KnowledgeBase.criado_em.desc())
            .limit(1)
        )
        kb = kb_r.scalar_one_or_none()
        regimento = kb.conteudo if kb else "Regimento não cadastrado."
        system_prompt = (
            PROMPT_BASE.format(nome_orgao=tenant.nome_completo, regimento=regimento)
            + SONNET_EXTRA
        )
        print(f"\n  System prompt: {len(system_prompt):,} chars")

        # ── 1. Atos com Sonnet real (resultado_sonnet não nulo com conteúdo)
        r = await db.execute(
            select(Ato, Analise)
            .join(Analise, Analise.ato_id == Ato.id)
            .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
            .where(
                Ato.tenant_id == tenant.id,
                Analise.analisado_por_sonnet == True,
                Analise.resultado_sonnet.isnot(None),
                ConteudoAto.texto_completo.isnot(None),
            )
            .order_by(Analise.score_risco.desc())
        )
        todos_com_sonnet = r.all()

        # Filtra apenas os que têm resultado_sonnet real (não vazio/sem nivel)
        rows_com_sonnet = [
            (a, an) for a, an in todos_com_sonnet
            if an.resultado_sonnet and an.resultado_sonnet.get("nivel_alerta_confirmado")
        ]

        # ── 2. Ata 167 separada (tem Haiku mas não Sonnet JSON)
        ata167_rows = []
        for a, an in todos_com_sonnet:
            if str(a.id) == ATA_167_ID:
                ata167_rows = [(a, an)]
                break
        if not ata167_rows:
            r2 = await db.execute(
                select(Ato, Analise)
                .join(Analise, Analise.ato_id == Ato.id)
                .where(Ato.id == ATA_167_ID)
            )
            row = r2.first()
            if row:
                ata167_rows = [row]

        # Remove duplicata da ata 167 em rows_com_sonnet se presente
        rows_com_sonnet = [(a, an) for a, an in rows_com_sonnet if str(a.id) != ATA_167_ID]

        # ── 3. Montar lista final: Ata 167 primeiro, depois os demais
        fila = ata167_rows + rows_com_sonnet

        print(f"\n  Ata 167 na fila: {'✅' if ata167_rows else '❌'}")
        print(f"  Atos com Sonnet real: {len(rows_com_sonnet)}")
        print(f"  Total na fila: {len(fila)}")
        print(f"\n  Iniciando (para no limite ${LIMITE_USD:.2f})...\n")

        for idx, (ato, analise) in enumerate(fila, 1):
            if total_gasto >= LIMITE_USD:
                print(f"\n  🛑 Limite ${LIMITE_USD:.2f} atingido após {idx-1} atos.")
                break

            sonnet_res = analise.resultado_sonnet or {}
            s_nivel = sonnet_res.get("nivel_alerta_confirmado", "N/A")
            s_score = sonnet_res.get("score_risco_final", "N/A")

            print(
                f"  [{idx:>3}] {ato.tipo} {ato.numero:<25} "
                f"H={analise.nivel_alerta}/{analise.score_risco}  "
                f"S={s_nivel}/{s_score}  "
                f"(acumulado ${total_gasto:.4f})"
            )

            contexto = await montar_contexto(db, ato.id, analise)

            try:
                t0 = time.time()
                resp = await client.chat.completions.create(
                    model=GEMINI_PRO,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": contexto},
                    ],
                    max_tokens=32768,
                    temperature=0.1,
                )
                elapsed = time.time() - t0
                raw = resp.choices[0].message.content or ""
                in_tok = resp.usage.prompt_tokens if resp.usage else 0
                out_tok = resp.usage.completion_tokens if resp.usage else 0
                c = custo(in_tok, out_tok)
                total_gasto += c

                pro_res = parse_json(raw)
                p_nivel = pro_res.get("nivel_alerta_confirmado", "?")
                p_score = pro_res.get("score_risco_final", "?")
                p_ficha = pro_res.get("ficha_denuncia", {})
                p_analise = pro_res.get("analise_aprofundada", {})

                nivel_match = (p_nivel == s_nivel) if s_nivel != "N/A" else None
                score_diff = (
                    abs(int(p_score or 0) - int(s_score or 0))
                    if s_nivel != "N/A" and p_score != "?" else None
                )

                match_str = ""
                if nivel_match is not None:
                    match_str = f" | match={'✅' if nivel_match else '❌'} Δ={score_diff:+d}"

                print(
                    f"        → PRO {emoji(p_nivel)} {p_nivel}/{p_score} "
                    f"${c:.5f} {elapsed:.1f}s{match_str}"
                )

                resultados.append({
                    "ato": f"{ato.tipo} {ato.numero}",
                    "ato_id": str(ato.id),
                    "tipo": ato.tipo,
                    "numero": ato.numero,
                    "haiku_nivel": analise.nivel_alerta,
                    "haiku_score": analise.score_risco,
                    "sonnet_nivel": s_nivel,
                    "sonnet_score": s_score,
                    "pro_nivel": p_nivel,
                    "pro_score": p_score,
                    "pro_ficha_titulo": p_ficha.get("titulo", ""),
                    "pro_fato": p_ficha.get("fato", ""),
                    "pro_indicio_legal": p_ficha.get("indicio_legal", ""),
                    "pro_indicio_moral": p_ficha.get("indicio_moral", ""),
                    "pro_evidencias": p_ficha.get("evidencias", []),
                    "pro_impacto": p_ficha.get("impacto", ""),
                    "pro_recomendacao": p_ficha.get("recomendacao_campanha", ""),
                    "pro_narrativa": p_analise.get("narrativa_completa", ""),
                    "pro_padrao": p_analise.get("padrao_identificado", ""),
                    "pro_indicios_legais": p_analise.get("indicios_legais", []),
                    "pro_indicios_morais": p_analise.get("indicios_morais", []),
                    "custo": c,
                    "elapsed": elapsed,
                    "nivel_match": nivel_match,
                    "score_diff": score_diff,
                })

            except Exception as e:
                err = str(e)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    print(f"        → ⚠️ Rate limit: {err[:100]}")
                    print("        Aguardando 60s...")
                    await asyncio.sleep(60)
                else:
                    print(f"        → ERRO: {err[:200]}")

    # ── Salvar resultados
    output_path = ROOT / "scripts" / "resultados_pro_all.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)

    print(f"\n\n{'=' * 72}")
    print("  SUMÁRIO FINAL")
    print(f"{'=' * 72}")
    print(f"  Atos processados : {len(resultados)}")
    print(f"  Custo total      : ${total_gasto:.5f}")
    print(f"  Custo médio/ato  : ${total_gasto/max(len(resultados),1):.5f}")

    # Concordância com Sonnet
    com_sonnet = [r for r in resultados if r["nivel_match"] is not None]
    if com_sonnet:
        matches = sum(1 for r in com_sonnet if r["nivel_match"])
        print(f"\n  Concordância com Sonnet ({len(com_sonnet)} atos com referência):")
        print(f"    Nível correto: {matches}/{len(com_sonnet)} ({100*matches//len(com_sonnet)}%)")
        diffs = [r["score_diff"] for r in com_sonnet if r["score_diff"] is not None]
        if diffs:
            print(f"    Score Δ médio: {sum(diffs)/len(diffs):.1f} pts")

    # Distribuição Pro
    from collections import Counter
    dist = Counter(r["pro_nivel"] for r in resultados)
    print(f"\n  Distribuição Pro: {dict(dist)}")

    print(f"\n  Resultados salvos em: {output_path}")
    print("\n=== JSON COMPLETO (primeiros 3) ===")
    print(json.dumps(resultados[:3], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
