"""
piper_service.py — Piper: triagem de atos administrativos via Gemini Pro

Substitui o Haiku como agente de triagem. Usa o Gemini 2.5 Pro via endpoint
OpenAI-compatível. Mantém o mesmo contrato de saída JSON do haiku_service
(nivel_alerta, score_risco, resumo, indicios, pessoas_extraidas) e acrescenta
tags_identificadas usando a taxonomia padronizada.
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from decimal import Decimal

logger = logging.getLogger(__name__)

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.ato import Ato, ConteudoAto
from app.models.analise import Analise, Irregularidade
from app.services.haiku_service import (
    NIVEIS_VALIDOS,
    montar_system_prompt,
    salvar_pessoas as _salvar_pessoas,  # reutiliza lógica de pessoas
)
from app.services.tag_service import LISTA_TAGS_PROMPT, salvar_tags_piper

PRECO_PIPER = {
    "input": 1.25 / 1_000_000,
    "output": 10.00 / 1_000_000,
}

PIPER_EXTRA = f"""

MODO: TRIAGEM INTELIGENTE (PIPER)

Além da análise padrão, identifique quais tipos de irregularidade se aplicam a este ato
usando EXCLUSIVAMENTE os códigos da lista abaixo.

LISTA DE TAGS DISPONÍVEIS:
{LISTA_TAGS_PROMPT}

Acrescente ao JSON de resposta o campo:
"tags_identificadas": [
  {{"codigo": "<código_exato>", "gravidade": "baixa|media|alta|critica", "justificativa": "1 frase"}}
]

Use apenas códigos presentes na lista. Inclua somente tags com evidência real no texto.
"""


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=settings.gemini_api_key,
    )


def _parse_piper_response(raw_text: str) -> dict:
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

    if result.get("nivel_alerta") not in NIVEIS_VALIDOS:
        result["nivel_alerta"] = "amarelo"

    # Garante campos obrigatórios
    result.setdefault("score_risco", 0)
    result.setdefault("resumo", "")
    result.setdefault("indicios", [])
    result.setdefault("pessoas_extraidas", [])
    result.setdefault("valores_monetarios", [])
    result.setdefault("referencias_atos", [])
    result.setdefault("requer_aprofundamento", False)
    result.setdefault("motivo_aprofundamento", None)
    result.setdefault("tags_identificadas", [])
    return result


async def analisar_ato_piper(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID,
    system_prompt: str,
) -> Analise:
    """
    Executa triagem com Piper (Gemini Pro).
    Idempotente: pula se ato.processado já está True.
    Raises openai.RateLimitError / APIError no chamador para retry.
    """
    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    if ato.processado:
        existing = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
        analise = existing.scalar_one_or_none()
        if analise:
            return analise

    conteudo_result = await db.execute(
        select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
    )
    conteudo = conteudo_result.scalar_one_or_none()
    texto = conteudo.texto_completo[:32_000] if conteudo else "(texto não disponível)"

    user_prompt = (
        f"Analise o seguinte ato administrativo:\n\n"
        f"TIPO: {ato.tipo}\n"
        f"NÚMERO: {ato.numero}\n"
        f"DATA: {ato.data_publicacao or 'não informada'}\n"
        f"EMENTA: {ato.ementa or 'não informada'}\n\n"
        f"TEXTO COMPLETO:\n{texto}"
    )

    full_system = system_prompt + PIPER_EXTRA
    client = _get_client()

    response = await client.chat.completions.create(
        model=settings.gemini_pro_model,
        max_tokens=16000,
        messages=[
            {"role": "system", "content": full_system},
            {"role": "user", "content": user_prompt},
        ],
    )

    raw_text = response.choices[0].message.content or ""
    resultado = _parse_piper_response(raw_text)

    input_tokens = response.usage.prompt_tokens if response.usage else 0
    output_tokens = response.usage.completion_tokens if response.usage else 0
    custo = input_tokens * PRECO_PIPER["input"] + output_tokens * PRECO_PIPER["output"]

    # Upsert Analise
    analise_result = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
    analise = analise_result.scalar_one_or_none()

    if not analise:
        analise = Analise(
            id=uuid.uuid4(),
            ato_id=ato_id,
            tenant_id=ato.tenant_id,
            rodada_id=rodada_id,
        )
        db.add(analise)

    analise.status = "piper_completo"
    analise.nivel_alerta = resultado["nivel_alerta"]
    analise.score_risco = resultado.get("score_risco", 0)
    analise.analisado_por_piper = True
    analise.resultado_piper = resultado
    analise.resumo_executivo = resultado.get("resumo")
    analise.tokens_piper = input_tokens + output_tokens
    analise.custo_usd = Decimal(str(custo))

    # Irregularidades
    for indicio in resultado.get("indicios", []):
        irr = Irregularidade(
            id=uuid.uuid4(),
            analise_id=analise.id,
            ato_id=ato_id,
            tenant_id=ato.tenant_id,
            categoria=indicio.get("categoria", "moral"),
            tipo=indicio.get("tipo", "desconhecido"),
            descricao=indicio.get("descricao", ""),
            artigo_violado=indicio.get("artigo_violado"),
            gravidade=indicio.get("gravidade", "media"),
        )
        db.add(irr)

    ato.processado = True
    await db.flush()

    # Tags identificadas pelo Piper
    await salvar_tags_piper(
        db, ato_id, analise.id, ato.tenant_id,
        resultado.get("tags_identificadas", []),
    )

    # Pessoas
    from app.services.pessoas_service import salvar_pessoas
    await salvar_pessoas(
        db, ato_id, ato.tenant_id,
        resultado.get("pessoas_extraidas", []),
        data_ato=ato.data_publicacao,
    )

    await db.commit()
    return analise
