"""
new_service.py — New: análise de padrões sistêmicos via Claude Opus

Terceiro agente da pipeline. Recebe atos com histórico completo de um órgão
e identifica padrões que só aparecem em escala: séries temporais de irregularidades,
redes de pessoas, concentração de poder, padrões recorrentes entre diferentes atos.

Roda opcionalmente sobre atos já analisados pelo Bud (ou Sonnet legado).
Produz o campo resultado_new com padrões sistêmicos, revisa as tags finais.
"""
from __future__ import annotations

import json
import re
import uuid
from decimal import Decimal

from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.ato import Ato, ConteudoAto
from app.models.analise import Analise
from app.models.pessoa import AparicaoPessoa, Pessoa
from app.services.piper_service import NIVEIS_VALIDOS
from app.services.tag_service import (
    LISTA_TAGS_PROMPT,
    buscar_tags_ativas,
    revisar_tags_bud_new,
)

client = AsyncAnthropic()

PRECOS_NEW = {
    "input": 15.00 / 1_000_000,
    "output": 75.00 / 1_000_000,
    "cache_read": 1.50 / 1_000_000,
    "cache_write": 18.75 / 1_000_000,
}

NEW_EXTRA = f"""

MODO: ANÁLISE DE PADRÕES SISTÊMICOS (NEW)

Você está recebendo um ato com o contexto completo de análises anteriores.
Seu papel exclusivo é identificar padrões que só são visíveis em escala:

1. Padrões temporais — o mesmo tipo de ato se repete com periodicidade suspeita?
2. Redes de pessoas — há constelações de nomes que aparecem juntos sistematicamente?
3. Concentração de poder — um ou poucos agentes acumulam atos irregulares?
4. Padrões inter-atos — irregularidades em atos separados formam uma narrativa maior?
5. Evolução — o comportamento irregular piora ou melhora ao longo do tempo?

REVISÃO FINAL DE TAGS:
Revise as tags com a perspectiva sistêmica. Confirme, remova, adicione ou reclassifique.

TAGS DISPONÍVEIS:
{LISTA_TAGS_PROMPT}

Responda em JSON:
{{
  "nivel_alerta_final": "verde|amarelo|laranja|vermelho",
  "score_risco_sistemico": 0,
  "padroes_identificados": [
    {{"tipo": "string", "descricao": "string", "atos_relacionados": ["string"], "gravidade": "string"}}
  ],
  "redes_pessoas": [
    {{"papel": "string", "pessoas": ["string"], "descricao": "string"}}
  ],
  "narrativa_sistemica": "string",
  "recomendacao_investigacao": "string",
  "tags_revisadas": [
    {{"codigo": "<codigo_exato>", "acao": "confirmada|adicionada|removida|elevada|rebaixada", "gravidade": "baixa|media|alta|critica", "justificativa": "1 frase"}}
  ]
}}"""


def _parse_new_response(raw_text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*\n?", "", raw_text.strip(), flags=re.MULTILINE)
    text = re.sub(r"\n?```\s*$", "", text.strip(), flags=re.MULTILINE)
    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                result = json.loads(m.group())
            except json.JSONDecodeError:
                result = {}
        else:
            result = {}

    if result.get("nivel_alerta_final") not in NIVEIS_VALIDOS:
        result["nivel_alerta_final"] = "laranja"

    result.setdefault("score_risco_sistemico", 60)
    result.setdefault("padroes_identificados", [])
    result.setdefault("redes_pessoas", [])
    result.setdefault("narrativa_sistemica", "")
    result.setdefault("recomendacao_investigacao", "")
    result.setdefault("tags_revisadas", [])
    return result


async def _montar_contexto_new(
    db: AsyncSession,
    ato_id: uuid.UUID,
    analise: Analise,
) -> str:
    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    conteudo_result = await db.execute(
        select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
    )
    conteudo = conteudo_result.scalar_one_or_none()
    texto = conteudo.texto_completo[:100_000] if conteudo else ""

    aparicoes_result = await db.execute(
        select(AparicaoPessoa).where(AparicaoPessoa.ato_id == ato_id).limit(50)
    )
    aparicoes = aparicoes_result.scalars().all()

    pessoa_ids = [ap.pessoa_id for ap in aparicoes]
    historico_pessoas = []
    if pessoa_ids:
        pessoas_result = await db.execute(
            select(Pessoa).where(Pessoa.id.in_(pessoa_ids))
        )
        pessoas_by_id = {p.id: p for p in pessoas_result.scalars().all()}
        historico_pessoas = [
            {
                "nome": pessoas_by_id[ap.pessoa_id].nome_normalizado,
                "cargo": ap.cargo,
                "total_aparicoes": pessoas_by_id[ap.pessoa_id].total_aparicoes,
            }
            for ap in aparicoes
            if ap.pessoa_id in pessoas_by_id
        ]

    analise_piper = analise.resultado_piper or analise.resultado_haiku or {}
    analise_bud = analise.resultado_bud or analise.resultado_sonnet or {}
    tags_atuais = await buscar_tags_ativas(db, ato_id)

    return (
        f"TEXTO DO ATO:\n{texto}\n\n"
        f"ANÁLISE DO PIPER (triagem):\n{json.dumps(analise_piper, ensure_ascii=False, indent=2)}\n\n"
        f"ANÁLISE DO BUD (profunda):\n{json.dumps(analise_bud, ensure_ascii=False, indent=2)}\n\n"
        f"TAGS ATUAIS (revisadas pelo Bud):\n{json.dumps(tags_atuais, ensure_ascii=False, indent=2)}\n\n"
        f"HISTÓRICO DAS PESSOAS ENVOLVIDAS:\n{json.dumps(historico_pessoas, ensure_ascii=False, indent=2)}"
    )


async def analisar_ato_new(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID,
    system_prompt_base: str,
) -> Analise:
    """
    Executa análise de padrões com New (Opus).
    Requer que Piper ou Bud já tenham rodado.
    Raises anthropic.RateLimitError / APIError no chamador.
    """
    analise_result = await db.execute(
        select(Analise).where(Analise.ato_id == ato_id, Analise.rodada_id == rodada_id)
    )
    analise = analise_result.scalar_one_or_none()
    if analise is None:
        raise ValueError(f"Analise não encontrada para ato_id={ato_id} — Piper deve rodar primeiro")

    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    contexto = await _montar_contexto_new(db, ato_id, analise)
    system_prompt = system_prompt_base + NEW_EXTRA

    response = await client.messages.create(
        model=settings.claude_opus_model,
        max_tokens=16000,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": contexto}],
    )

    resultado = _parse_new_response(response.content[0].text)

    custo = (
        response.usage.input_tokens * PRECOS_NEW["input"]
        + response.usage.output_tokens * PRECOS_NEW["output"]
        + getattr(response.usage, "cache_read_input_tokens", 0) * PRECOS_NEW["cache_read"]
        + getattr(response.usage, "cache_creation_input_tokens", 0) * PRECOS_NEW["cache_write"]
    )

    analise.status = "new_completo"
    # New pode elevar o nível, nunca rebaixa
    nivel_new = resultado["nivel_alerta_final"]
    ORDEM = ["verde", "amarelo", "laranja", "vermelho"]
    if ORDEM.index(nivel_new) > ORDEM.index(analise.nivel_alerta or "verde"):
        analise.nivel_alerta = nivel_new
    analise.score_risco = max(analise.score_risco, resultado.get("score_risco_sistemico", 0))

    analise.analisado_por_new = True
    analise.resultado_new = resultado
    analise.tokens_new = response.usage.input_tokens + response.usage.output_tokens
    analise.custo_usd = analise.custo_usd + Decimal(str(custo))

    # Revisão final de tags pelo New
    await revisar_tags_bud_new(
        db, ato_id, analise.id, ato.tenant_id,
        resultado.get("tags_revisadas", []),
        modelo="new",
    )

    await db.commit()
    return analise
