#!/usr/bin/env python3
"""
Teste de calibração de prompt — Gemini 2.5 Flash-Lite

Roda os MESMOS 5 atos em dois modos:
  - Flash-Lite com prompt ORIGINAL (igual ao Haiku atual)
  - Flash-Lite com prompt CALIBRADO (ajustes de score e falhas formais)

Referência: resultado do Haiku já no banco (texto truncado em 8.000 chars).

Objetivo: ver se o prompt calibrado alinha melhor com a calibração do Claude Haiku.

Uso:
    cd backend
    python scripts/gemini_calibracao_test.py

Custo estimado: ~$0.12 (10 chamadas Flash-Lite × ~$0.006 cada)
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
from app.models.ato import Ato
from app.models.analise import Analise
from app.models.tenant import Tenant, KnowledgeBase
from app.models.ato import ConteudoAto

GEMINI_API_KEY    = os.environ.get("GEMINI_API_KEY", "")
GEMINI_FLASH_LITE = os.environ.get("GEMINI_FLASH_LITE_MODEL", "models/gemini-2.5-flash-lite")
TENANT_SLUG       = "cau-pr"
LIMITE_CUSTO_USD  = 2.00

PRECO_FLASH = {"input": 0.10 / 1_000_000, "output": 0.40 / 1_000_000}

# ── Prompt ORIGINAL (mesmo usado no teste anterior) ───────────────────────────
PROMPT_ORIGINAL = """\
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
   - Nomes completos, cargos, valores monetários, referências a atos anteriores

Responda SEMPRE em JSON válido com esta estrutura exata:
{{
  "nivel_alerta": "verde|amarelo|laranja|vermelho",
  "score_risco": <inteiro de 0 a 100>,
  "resumo": "2-3 frases",
  "indicios": [{{"categoria": "legal|moral|etica|processual", "tipo": "string", "descricao": "string", "artigo_violado": "string|null", "gravidade": "baixa|media|alta|critica"}}],
  "pessoas_extraidas": [{{"nome": "string", "cargo": "string", "tipo_aparicao": "nomeado|exonerado|assina|membro_comissao|processado|mencionado"}}],
  "valores_monetarios": [],
  "referencias_atos": [],
  "requer_aprofundamento": false,
  "motivo_aprofundamento": "string|null"
}}"""

# ── Prompt CALIBRADO ───────────────────────────────────────────────────────────
PROMPT_CALIBRADO = """\
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
   - Nomes completos, cargos, valores monetários, referências a atos anteriores

══════════════════════════════════════════════════
CALIBRAÇÃO DE AUDITORIA — LEIA COM ATENÇÃO
══════════════════════════════════════════════════

PRINCÍPIO DA TRIAGEM PREVENTIVA:
Esta análise serve como triagem para fiscalização pública. Na dúvida entre dois
níveis, SEMPRE eleve para o nível mais grave. Um falso positivo pode ser corrigido
por revisão humana; um falso negativo oculta irregularidade real da população.

FALHAS FORMAIS SÃO INDÍCIOS — REGRA OBRIGATÓRIA:
As seguintes omissões em atos administrativos SEMPRE geram pelo menos um indício
(gravidade "baixa" ou "media"). Nunca as descarte como simples "pontos de atenção":

  • Ausência de prazo de duração em grupo de trabalho ou comissão temporária
  • Fundamentação jurídica ausente, incompleta ou genérica demais no ato
  • Substituição de membro de comissão sem motivação explicitamente registrada
  • Votação registrada apenas como "maioria aprovou" sem número de votos
  • Dotação orçamentária omitida ou marcada como "a verificar" / "a definir"
  • Abstenção em votação sem justificativa registrada no documento
  • Nomeação para cargo comissionado sem referência ao perfil exigido ou processo seletivo

PADRÕES SISTÊMICOS — reconheça mesmo em documento único:
  • Uso recorrente de Ad Referendum indica concentração de poder — classifique como LARANJA
  • Troca de membro de comissão processante sem fundamentação indica possível interferência
  • Unanimidade em julgamentos disciplinares merece registro como possível padrão
  • Ato assinado por autoridade substituta sem ato de delegação citado é vício de competência

ÂNCORAS DE SCORE (calibração obrigatória — use como referência):
  Verde    0–20:  ato completo, todos os requisitos formais presentes, sem inconsistências
  Amarelo 21–50:  1 a 3 falhas formais menores, ou 1 suspeita leve sem evidência direta
  Laranja 51–74:  vício de competência possível, composição irregular, padrão suspeito
  Vermelho 75–100: violação legal aparente, nepotismo, perseguição política documentada

Responda SEMPRE em JSON válido com esta estrutura exata:
{{
  "nivel_alerta": "verde|amarelo|laranja|vermelho",
  "score_risco": <inteiro de 0 a 100>,
  "resumo": "2-3 frases",
  "indicios": [{{"categoria": "legal|moral|etica|processual", "tipo": "string", "descricao": "string", "artigo_violado": "string|null", "gravidade": "baixa|media|alta|critica"}}],
  "pessoas_extraidas": [{{"nome": "string", "cargo": "string", "tipo_aparicao": "nomeado|exonerado|assina|membro_comissao|processado|mencionado"}}],
  "valores_monetarios": [],
  "referencias_atos": [],
  "requer_aprofundamento": false,
  "motivo_aprofundamento": "string|null"
}}"""


def custo(in_tok: int, out_tok: int) -> float:
    return in_tok * PRECO_FLASH["input"] + out_tok * PRECO_FLASH["output"]


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
            except json.JSONDecodeError:
                pass
    return {"nivel_alerta": "ERRO", "score_risco": -1, "resumo": text[:200]}


def emoji(nivel: str) -> str:
    return {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}.get(nivel.lower(), "⚪")


async def chamar(client, model, system, user) -> tuple[dict, float, int, int, float]:
    t0 = time.time()
    resp = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=8192,
        temperature=0.1,
    )
    elapsed = time.time() - t0
    raw = resp.choices[0].message.content or ""
    in_tok = resp.usage.prompt_tokens if resp.usage else 0
    out_tok = resp.usage.completion_tokens if resp.usage else 0
    return parse_json(raw), custo(in_tok, out_tok), in_tok, out_tok, elapsed


async def main():
    if not GEMINI_API_KEY:
        print("ERRO: GEMINI_API_KEY não configurada no .env")
        sys.exit(1)

    client = AsyncOpenAI(
        api_key=GEMINI_API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )

    print("\n" + "=" * 72)
    print("  CALIBRAÇÃO DE PROMPT — Flash-Lite: Original vs Calibrado")
    print("  Referência: Haiku (banco de produção, texto truncado 8k)")
    print("=" * 72)

    total_gasto = 0.0

    async with async_session_factory() as db:
        # Carregar tenant + regimento
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

        prompt_orig = PROMPT_ORIGINAL.format(nome_orgao=tenant.nome_completo, regimento=regimento)
        prompt_cal  = PROMPT_CALIBRADO.format(nome_orgao=tenant.nome_completo, regimento=regimento)

        print(f"\n  Regimento: {len(regimento):,} chars")
        print(f"  Prompt original:  {len(prompt_orig):,} chars")
        print(f"  Prompt calibrado: {len(prompt_cal):,} chars "
              f"(+{len(prompt_cal)-len(prompt_orig):,} chars de calibração)")

        # Selecionar 5 atos (mix de níveis)
        atos = []
        for nivel, qtd in [("vermelho", 1), ("laranja", 1), ("amarelo", 2), ("verde", 1)]:
            r = await db.execute(
                select(Ato, Analise)
                .join(Analise, Analise.ato_id == Ato.id)
                .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
                .where(
                    Ato.tenant_id == tenant.id,
                    Analise.nivel_alerta == nivel,
                    Analise.analisado_por_haiku == True,
                    ConteudoAto.texto_completo.isnot(None),
                )
                .order_by(func.random())
                .limit(qtd)
            )
            atos.extend(r.all())

        print(f"\n  Atos selecionados ({len(atos)}):")
        for ato, analise in atos:
            print(f"    {emoji(analise.nivel_alerta)} [{analise.nivel_alerta}/{analise.score_risco}] "
                  f"{ato.tipo} {ato.numero}")

        # Resultados para o sumário final
        resultados = []

        for idx, (ato, haiku) in enumerate(atos, 1):
            print(f"\n{'─' * 72}")
            print(f"  [{idx}/{len(atos)}] {ato.tipo} {ato.numero}")
            print(f"  Haiku referência: {emoji(haiku.nivel_alerta)} {haiku.nivel_alerta}/{haiku.score_risco} "
                  f"| {len(haiku.resultado_haiku.get('indicios',[]))} indícios "
                  f"| {len(haiku.resultado_haiku.get('pessoas_extraidas',[]))} pessoas")
            print(f"{'─' * 72}")

            conteudo_r = await db.execute(
                select(ConteudoAto).where(ConteudoAto.ato_id == ato.id)
            )
            conteudo = conteudo_r.scalar_one_or_none()
            texto = conteudo.texto_completo if conteudo else "(sem texto)"

            user_prompt = (
                f"Analise o seguinte ato administrativo:\n\n"
                f"TIPO: {ato.tipo}\nNÚMERO: {ato.numero}\n"
                f"DATA: {ato.data_publicacao or 'não informada'}\n"
                f"EMENTA: {ato.ementa or 'não informada'}\n\n"
                f"TEXTO COMPLETO:\n{texto}"
            )

            if total_gasto >= LIMITE_CUSTO_USD:
                print("  🛑 Limite de custo atingido — interrompendo.")
                break

            # Flash ORIGINAL
            try:
                res_orig, c_orig, in_orig, out_orig, t_orig = await chamar(
                    client, GEMINI_FLASH_LITE, prompt_orig, user_prompt
                )
                total_gasto += c_orig
                print(f"  ORIGINAL  → {emoji(res_orig.get('nivel_alerta','?'))} "
                      f"{res_orig.get('nivel_alerta','?')}/{res_orig.get('score_risco','?')} "
                      f"| {len(res_orig.get('indicios',[]))} indícios "
                      f"| ${c_orig:.5f} | {t_orig:.1f}s")
                print(f"             {res_orig.get('resumo','')[:100]}")
            except Exception as e:
                print(f"  ORIGINAL  → ERRO: {e}")
                res_orig = {}

            # Flash CALIBRADO
            try:
                res_cal, c_cal, in_cal, out_cal, t_cal = await chamar(
                    client, GEMINI_FLASH_LITE, prompt_cal, user_prompt
                )
                total_gasto += c_cal
                print(f"  CALIBRADO → {emoji(res_cal.get('nivel_alerta','?'))} "
                      f"{res_cal.get('nivel_alerta','?')}/{res_cal.get('score_risco','?')} "
                      f"| {len(res_cal.get('indicios',[]))} indícios "
                      f"| ${c_cal:.5f} | {t_cal:.1f}s")
                print(f"             {res_cal.get('resumo','')[:100]}")
            except Exception as e:
                print(f"  CALIBRADO → ERRO: {e}")
                res_cal = {}

            # Diferença de score em relação ao Haiku
            score_orig = res_orig.get("score_risco", 0)
            score_cal  = res_cal.get("score_risco", 0)
            haiku_score = haiku.score_risco
            delta_orig = score_orig - haiku_score
            delta_cal  = score_cal  - haiku_score
            melhorou = abs(delta_cal) < abs(delta_orig)

            print(f"\n  Δ vs Haiku: original={delta_orig:+d}  calibrado={delta_cal:+d}  "
                  f"{'✅ melhorou' if melhorou else '❌ não melhorou'}")

            resultados.append({
                "ato": f"{ato.tipo} {ato.numero}",
                "haiku": {"nivel": haiku.nivel_alerta, "score": haiku_score,
                          "indicios": len(haiku.resultado_haiku.get("indicios", []))},
                "orig":  {"nivel": res_orig.get("nivel_alerta", "?"), "score": score_orig,
                          "indicios": len(res_orig.get("indicios", []))},
                "cal":   {"nivel": res_cal.get("nivel_alerta", "?"), "score": score_cal,
                          "indicios": len(res_cal.get("indicios", []))},
                "delta_orig": delta_orig,
                "delta_cal": delta_cal,
            })

        # ── Sumário ────────────────────────────────────────────────────────────
        print(f"\n\n{'=' * 72}")
        print("  SUMÁRIO DE CALIBRAÇÃO")
        print(f"{'=' * 72}")
        print(f"  {'Ato':<32} {'Haiku':^14} {'Original':^14} {'Calibrado':^14}")
        print(f"  {'-'*32} {'-'*14} {'-'*14} {'-'*14}")

        melhorias = 0
        for r in resultados:
            h = f"{emoji(r['haiku']['nivel'])} {r['haiku']['nivel']}/{r['haiku']['score']}"
            o = f"{emoji(r['orig']['nivel'])} {r['orig']['nivel']}/{r['orig']['score']}"
            c_r = f"{emoji(r['cal']['nivel'])} {r['cal']['nivel']}/{r['cal']['score']}"
            melhora = "✅" if abs(r["delta_cal"]) < abs(r["delta_orig"]) else "❌"
            if abs(r["delta_cal"]) < abs(r["delta_orig"]):
                melhorias += 1
            print(f"  {r['ato'][:31]:<32} {h:^16} {o:^16} {c_r:^16} {melhora}")

        print(f"\n  Custo total: ${total_gasto:.5f}")
        print(f"  Alinhamento com Haiku: {melhorias}/{len(resultados)} casos melhorados "
              f"com prompt calibrado")
        print()

        # JSON para atualizar a página
        print("=== JSON PARA PÁGINA ===")
        print(json.dumps(resultados, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
