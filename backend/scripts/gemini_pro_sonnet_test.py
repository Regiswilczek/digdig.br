#!/usr/bin/env python3
"""
Teste Pro vs Sonnet — mesmo contexto, dois modelos

Pega 5 atos que já têm análise do Sonnet (status=sonnet_completo) e roda
o Gemini 2.5 Pro com EXATAMENTE o mesmo sistema + contexto que o Sonnet usa:
  - system = prompt_base + SONNET_EXTRA
  - user   = texto do ato + análise prévia do Haiku + histórico das pessoas

Objetivo: ver se o Pro entrega análise profunda comparável ao Sonnet,
incluindo ficha de denúncia, narrativa política e padrões identificados.

Uso:
    cd backend
    python scripts/gemini_pro_sonnet_test.py

Custo estimado: ~$0.40 (5 atos Pro × ~$0.08 cada)
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
LIMITE_USD     = 2.00

PRECO_PRO = {"input": 1.25 / 1_000_000, "output": 10.00 / 1_000_000}

# ── Prompt base (mesmo do haiku_service.py) ───────────────────────────────────
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

# ── Sonnet Extra (modo análise profunda — exatamente igual ao sonnet_service.py) ─
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
            except:
                pass
    return {"nivel_alerta_confirmado": "ERRO", "score_risco_final": -1}


def emoji(nivel: str) -> str:
    return {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}.get(nivel.lower(), "⚪")


async def montar_contexto(db, ato_id, analise_haiku) -> str:
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
        f"{json.dumps(analise_haiku.resultado_haiku, ensure_ascii=False, indent=2)}\n\n"
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
    print("  GEMINI 2.5 PRO vs SONNET — contexto idêntico")
    print("  Atos: status=sonnet_completo (Haiku + Sonnet já no banco)")
    print("=" * 72)

    total_gasto = 0.0

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
        print(f"\n  System prompt: {len(system_prompt):,} chars (base + sonnet_extra)")

        # Atos com análise do Sonnet completa (para ter referência de comparação)
        atos = []
        for nivel, qtd in [("vermelho", 2), ("laranja", 2), ("vermelho", 1)]:
            r = await db.execute(
                select(Ato, Analise)
                .join(Analise, Analise.ato_id == Ato.id)
                .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
                .where(
                    Ato.tenant_id == tenant.id,
                    Analise.nivel_alerta == nivel,
                    Analise.analisado_por_sonnet == True,
                    ConteudoAto.texto_completo.isnot(None),
                )
                .order_by(func.random())
                .limit(qtd)
            )
            rows = r.all()
            atos.extend(rows)
            if len(atos) >= 5:
                break

        # Fallback: se não tiver suficientes com sonnet, pega só com haiku
        if len(atos) < 5:
            for nivel, qtd in [("vermelho", 1), ("laranja", 1), ("amarelo", 2), ("verde", 1)]:
                if len(atos) >= 5:
                    break
                r = await db.execute(
                    select(Ato, Analise)
                    .join(Analise, Analise.ato_id == Ato.id)
                    .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
                    .where(
                        Ato.tenant_id == tenant.id,
                        Analise.nivel_alerta == nivel,
                        Analise.analisado_por_haiku == True,
                        ConteudoAto.texto_completo.isnot(None),
                        ~Ato.id.in_([a.id for a, _ in atos]),
                    )
                    .order_by(func.random())
                    .limit(qtd)
                )
                atos.extend(r.all())

        atos = atos[:5]
        print(f"\n  Atos selecionados ({len(atos)}):")
        for ato, analise in atos:
            has_sonnet = "✅ tem Sonnet" if analise.analisado_por_sonnet else "⚠️ só Haiku"
            print(f"    {emoji(analise.nivel_alerta)} [{analise.nivel_alerta}/{analise.score_risco}] "
                  f"{ato.tipo} {ato.numero}  {has_sonnet}")

        resultados = []

        for idx, (ato, analise) in enumerate(atos, 1):
            print(f"\n{'─' * 72}")
            print(f"  [{idx}/{len(atos)}] {ato.tipo} {ato.numero}")

            # Referências do banco
            haiku_res = analise.resultado_haiku or {}
            sonnet_res = analise.resultado_sonnet or {}

            print(f"  HAIKU   → {emoji(analise.nivel_alerta)} {analise.nivel_alerta}/{analise.score_risco}"
                  f" | {len(haiku_res.get('indicios', []))} indícios")

            if sonnet_res:
                s_nivel = sonnet_res.get("nivel_alerta_confirmado", "?")
                s_score = sonnet_res.get("score_risco_final", "?")
                s_narrativa = sonnet_res.get("analise_aprofundada", {}).get("narrativa_completa", "")[:100]
                s_ficha_titulo = sonnet_res.get("ficha_denuncia", {}).get("titulo", "")
                print(f"  SONNET  → {emoji(s_nivel)} {s_nivel}/{s_score}")
                print(f"            Narrativa: {s_narrativa}")
                print(f"            Ficha: {s_ficha_titulo[:80]}")
            else:
                print(f"  SONNET  → não disponível para este ato")
            print(f"{'─' * 72}")

            if total_gasto >= LIMITE_USD:
                print("  🛑 Limite de custo atingido.")
                break

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
                p_narrativa = pro_res.get("analise_aprofundada", {}).get("narrativa_completa", "")[:100]
                p_ficha_titulo = pro_res.get("ficha_denuncia", {}).get("titulo", "")
                p_padrao = pro_res.get("analise_aprofundada", {}).get("padrao_identificado", "")

                print(f"\n  PRO     → {emoji(p_nivel)} {p_nivel}/{p_score} | ${c:.5f} | {elapsed:.1f}s")
                print(f"            Narrativa: {p_narrativa}")
                print(f"            Ficha: {p_ficha_titulo[:80]}")
                print(f"            Padrão: {str(p_padrao)[:80]}")
                print(f"            Tokens: {in_tok:,} in + {out_tok:,} out")

                # Concordância com Sonnet
                if sonnet_res:
                    nivel_match = p_nivel == sonnet_res.get("nivel_alerta_confirmado", "")
                    score_diff = abs(int(p_score or 0) - int(sonnet_res.get("score_risco_final", 0)))
                    print(f"\n  Concordância Sonnet: nível={'✅' if nivel_match else '❌'} "
                          f"| score Δ={score_diff:+d} pts")

                resultados.append({
                    "ato": f"{ato.tipo} {ato.numero}",
                    "haiku_nivel": analise.nivel_alerta,
                    "haiku_score": analise.score_risco,
                    "sonnet_nivel": sonnet_res.get("nivel_alerta_confirmado", "N/A"),
                    "sonnet_score": sonnet_res.get("score_risco_final", "N/A"),
                    "pro_nivel": p_nivel,
                    "pro_score": p_score,
                    "pro_ficha_titulo": p_ficha_titulo,
                    "pro_narrativa": pro_res.get("analise_aprofundada", {}).get("narrativa_completa", ""),
                    "pro_padrao": p_padrao,
                    "pro_indicios_legais": pro_res.get("analise_aprofundada", {}).get("indicios_legais", []),
                    "pro_indicios_morais": pro_res.get("analise_aprofundada", {}).get("indicios_morais", []),
                    "pro_ficha": pro_res.get("ficha_denuncia", {}),
                    "custo": c,
                    "elapsed": elapsed,
                })

            except Exception as e:
                err = str(e)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    print(f"  PRO → ⚠️ Rate limit/billing: {err[:100]}")
                else:
                    print(f"  PRO → ERRO: {err[:200]}")

        # ── Sumário ────────────────────────────────────────────────────────────
        print(f"\n\n{'=' * 72}")
        print("  SUMÁRIO — Pro vs Sonnet (contexto idêntico)")
        print(f"{'=' * 72}")
        print(f"  {'Ato':<30} {'Haiku':^12} {'Sonnet':^12} {'Pro':^12} {'Match':^8}")
        print(f"  {'-'*30} {'-'*12} {'-'*12} {'-'*12} {'-'*8}")

        for r in resultados:
            h = f"{emoji(r['haiku_nivel'])} {r['haiku_nivel'][:3]}/{r['haiku_score']}"
            s = f"{emoji(r['sonnet_nivel'])} {str(r['sonnet_nivel'])[:3]}/{r['sonnet_score']}"
            p = f"{emoji(r['pro_nivel'])} {str(r['pro_nivel'])[:3]}/{r['pro_score']}"
            match = "✅" if r["sonnet_nivel"] == r["pro_nivel"] else "❌"
            print(f"  {r['ato'][:29]:<30} {h:^14} {s:^14} {p:^14} {match:^8}")

        print(f"\n  Custo total: ${total_gasto:.5f}")

        print("\n=== JSON COMPLETO ===")
        print(json.dumps(resultados, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
