#!/usr/bin/env python3
"""
Teste de comparação: Haiku vs Gemini 2.5 Flash-Lite vs Gemini 2.5 Pro

Pega 5 atos já analisados pelo Haiku (mix de níveis) e reanalisa com
os dois modelos Gemini usando o TEXTO COMPLETO (sem truncamento em 8000 chars).

Uso:
    cd backend
    python scripts/gemini_comparison_test.py

Travas de custo:
    - Flash-Lite:  $0.10/1M input  + $0.40/1M output
    - Pro 2.5:     $1.25/1M input  + $10.00/1M output
    - Limite total do script: $3.00 (para automaticamente)

O script NÃO salva nada no banco — é somente leitura + chamadas de API.
"""
import asyncio
import json
import os
import sys
import time
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import uuid
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI

from app.database import async_session_factory
from app.models.ato import Ato
from app.models.analise import Analise
from app.models.tenant import Tenant, KnowledgeBase
from app.models.ato import ConteudoAto

# Lê direto do environ para funcionar sem rebuild da imagem Docker
GEMINI_API_KEY       = os.environ.get("GEMINI_API_KEY", "")
GEMINI_FLASH_LITE    = os.environ.get("GEMINI_FLASH_LITE_MODEL", "models/gemini-2.5-flash-lite")
GEMINI_PRO           = os.environ.get("GEMINI_PRO_MODEL", "models/gemini-2.5-pro")

# ── Preços por modelo (USD por token) ─────────────────────────────────────────
PRECOS = {
    "flash-lite": {
        "input":  0.10 / 1_000_000,
        "output": 0.40 / 1_000_000,
    },
    "pro": {
        "input":  1.25 / 1_000_000,
        "output": 10.00 / 1_000_000,
    },
}

LIMITE_CUSTO_USD = 3.00

# ── Tenant CAU/PR ──────────────────────────────────────────────────────────────
TENANT_SLUG = "cau-pr"

# ── Prompt do sistema (mesma lógica do haiku_service.py) ──────────────────────
SYSTEM_PROMPT_TEMPLATE = """Você é um auditor especializado em direito administrativo brasileiro e ética pública.

Sua missão é analisar atos administrativos do {nome_orgao} e identificar indícios de irregularidades legais, morais e éticas com base no Regimento Interno vigente.

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


def custo_para(modelo_key: str, input_tokens: int, output_tokens: int) -> float:
    p = PRECOS[modelo_key]
    return input_tokens * p["input"] + output_tokens * p["output"]


def parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
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
    return {"nivel_alerta": "PARSE_ERROR", "score_risco": -1, "resumo": text[:200]}


async def chamar_gemini(
    client: AsyncOpenAI,
    model_id: str,
    model_key: str,
    system_prompt: str,
    user_prompt: str,
) -> tuple[dict, float, int, int]:
    """Retorna (resultado_dict, custo_usd, input_tokens, output_tokens)."""
    resp = await client.chat.completions.create(
        model=model_id,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=4096,
        temperature=0.1,
    )
    raw = resp.choices[0].message.content or ""
    input_tok = resp.usage.prompt_tokens if resp.usage else 0
    output_tok = resp.usage.completion_tokens if resp.usage else 0
    custo = custo_para(model_key, input_tok, output_tok)
    resultado = parse_json_response(raw)
    return resultado, custo, input_tok, output_tok


def nivel_emoji(nivel: str) -> str:
    return {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}.get(
        nivel.lower(), "⚪"
    )


async def main():
    if not GEMINI_API_KEY:
        print("ERRO: GEMINI_API_KEY não configurada no .env")
        sys.exit(1)

    gemini_client = AsyncOpenAI(
        api_key=GEMINI_API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )

    print("\n" + "=" * 70)
    print("  TESTE DE COMPARAÇÃO — Haiku vs Gemini 2.5 Flash-Lite vs Gemini Pro")
    print("=" * 70)
    print(f"  Flash-Lite : {GEMINI_FLASH_LITE}")
    print(f"  Pro        : {GEMINI_PRO}")
    print(f"  Limite $   : ${LIMITE_CUSTO_USD:.2f}")
    print("=" * 70)

    total_gasto = 0.0

    async with async_session_factory() as db:
        # 1. Carregar tenant + regimento
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

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            nome_orgao=tenant.nome_completo,
            regimento=regimento,
        )
        print(f"\nRegimento carregado: {len(regimento):,} chars")

        # 2. Selecionar 5 atos representativos (mix de níveis)
        #    1 vermelho, 1 laranja, 2 amarelo, 1 verde
        atos_selecionados = []
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
            rows = r.all()
            atos_selecionados.extend(rows)

        if not atos_selecionados:
            print("ERRO: Nenhum ato encontrado no banco.")
            sys.exit(1)

        print(f"Atos selecionados: {len(atos_selecionados)}")
        for ato, analise in atos_selecionados:
            print(f"  {nivel_emoji(analise.nivel_alerta)} {ato.tipo} {ato.numero} (score Haiku: {analise.score_risco})")

        # 3. Loop de comparação
        resultados = []
        print()

        for idx, (ato, analise_haiku) in enumerate(atos_selecionados, 1):
            print(f"\n{'─' * 70}")
            print(f"  [{idx}/{len(atos_selecionados)}] {ato.tipo} {ato.numero}")
            print(f"  Data: {ato.data_publicacao} | Ementa: {(ato.ementa or '')[:80]}...")
            print(f"{'─' * 70}")

            # Carregar texto completo (sem truncar)
            conteudo_r = await db.execute(
                select(ConteudoAto).where(ConteudoAto.ato_id == ato.id)
            )
            conteudo = conteudo_r.scalar_one_or_none()
            texto_completo = conteudo.texto_completo if conteudo else "(sem texto)"
            texto_chars = len(texto_completo)
            texto_haiku = texto_completo[:8000]

            print(f"  Texto: {texto_chars:,} chars total | Haiku viu: {len(texto_haiku):,} chars ({len(texto_haiku)*100//texto_chars}%)")

            user_prompt = f"""Analise o seguinte ato administrativo:

TIPO: {ato.tipo}
NÚMERO: {ato.numero}
DATA: {ato.data_publicacao or 'não informada'}
EMENTA: {ato.ementa or 'não informada'}

TEXTO COMPLETO:
{texto_completo}"""

            # Resultado Haiku (já no banco)
            haiku_resultado = analise_haiku.resultado_haiku or {}
            haiku_indicios = len(haiku_resultado.get("indicios", []))
            haiku_pessoas = len(haiku_resultado.get("pessoas_extraidas", []))
            print(f"\n  HAIKU (referência — texto truncado)")
            print(f"    Nível  : {nivel_emoji(analise_haiku.nivel_alerta)} {analise_haiku.nivel_alerta}  |  Score: {analise_haiku.score_risco}")
            print(f"    Indícios extraídos: {haiku_indicios}  |  Pessoas: {haiku_pessoas}")
            print(f"    Resumo : {(analise_haiku.resumo_executivo or '')[:120]}")

            # Guardrail antes de cada modelo
            if total_gasto >= LIMITE_CUSTO_USD:
                print(f"\n  🛑 LIMITE DE CUSTO ATINGIDO (${total_gasto:.4f}) — interrompendo.")
                break

            # Flash-Lite
            print(f"\n  GEMINI FLASH-LITE (texto completo — {texto_chars:,} chars)")
            try:
                t0 = time.time()
                fl_res, fl_custo, fl_in, fl_out = await chamar_gemini(
                    gemini_client, GEMINI_FLASH_LITE,
                    "flash-lite", system_prompt, user_prompt
                )
                fl_elapsed = time.time() - t0
                total_gasto += fl_custo
                fl_indicios = len(fl_res.get("indicios", []))
                fl_pessoas = len(fl_res.get("pessoas_extraidas", []))
                print(f"    Nível  : {nivel_emoji(fl_res.get('nivel_alerta','?'))} {fl_res.get('nivel_alerta','?')}  |  Score: {fl_res.get('score_risco','?')}")
                print(f"    Indícios extraídos: {fl_indicios}  |  Pessoas: {fl_pessoas}")
                print(f"    Resumo : {fl_res.get('resumo','')[:120]}")
                print(f"    Tokens : {fl_in:,} in + {fl_out:,} out  |  Custo: ${fl_custo:.5f}  |  {fl_elapsed:.1f}s")
            except Exception as e:
                print(f"    ERRO Flash-Lite: {e}")
                fl_res, fl_custo, fl_in, fl_out = {}, 0.0, 0, 0

            if total_gasto >= LIMITE_CUSTO_USD:
                print(f"\n  🛑 LIMITE ATINGIDO após Flash-Lite (${total_gasto:.4f}) — pulando Pro.")
                resultados.append((ato, analise_haiku, fl_res, fl_custo, None, 0.0))
                continue

            # Pro
            print(f"\n  GEMINI PRO (texto completo — {texto_chars:,} chars)")
            try:
                t0 = time.time()
                pro_res, pro_custo, pro_in, pro_out = await chamar_gemini(
                    gemini_client, GEMINI_PRO,
                    "pro", system_prompt, user_prompt
                )
                pro_elapsed = time.time() - t0
                total_gasto += pro_custo
                pro_indicios = len(pro_res.get("indicios", []))
                pro_pessoas = len(pro_res.get("pessoas_extraidas", []))
                print(f"    Nível  : {nivel_emoji(pro_res.get('nivel_alerta','?'))} {pro_res.get('nivel_alerta','?')}  |  Score: {pro_res.get('score_risco','?')}")
                print(f"    Indícios extraídos: {pro_indicios}  |  Pessoas: {pro_pessoas}")
                print(f"    Resumo : {pro_res.get('resumo','')[:120]}")
                print(f"    Tokens : {pro_in:,} in + {pro_out:,} out  |  Custo: ${pro_custo:.5f}  |  {pro_elapsed:.1f}s")
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "free_tier" in err_str:
                    print(f"    ⚠️  PRO requer billing ativo no Google AI Studio (free tier = 0 req/dia)")
                    print(f"       Ative em: https://aistudio.google.com/apikey → Add billing")
                else:
                    print(f"    ERRO Pro: {e}")
                pro_res, pro_custo = {}, 0.0

            resultados.append((ato, analise_haiku, fl_res, fl_custo, pro_res, pro_custo))

        # 4. Sumário final
        print(f"\n\n{'=' * 70}")
        print("  SUMÁRIO")
        print(f"{'=' * 70}")
        print(f"  {'Ato':<30} {'Haiku':^12} {'Flash-Lite':^12} {'Pro':^12}")
        print(f"  {'-'*30} {'-'*12} {'-'*12} {'-'*12}")
        for row in resultados:
            ato, ah, fl, _fl_c, pr, _pr_c = row
            label = f"{ato.tipo[:15]} {ato.numero or ''}"[:29]
            h_lvl  = f"{nivel_emoji(ah.nivel_alerta)} {ah.nivel_alerta}"
            fl_lvl = f"{nivel_emoji(fl.get('nivel_alerta','?'))} {fl.get('nivel_alerta','?')}" if fl else "—"
            pr_lvl = f"{nivel_emoji(pr.get('nivel_alerta','?'))} {pr.get('nivel_alerta','?')}" if pr else "—"
            print(f"  {label:<30} {h_lvl:^14} {fl_lvl:^14} {pr_lvl:^14}")

        print(f"\n  Custo total do teste: ${total_gasto:.5f}")
        print(f"  (Limite era: ${LIMITE_CUSTO_USD:.2f})")
        print("=" * 70)
        print("\nResultados completos gravados apenas em memória — banco não foi alterado.\n")


if __name__ == "__main__":
    asyncio.run(main())
