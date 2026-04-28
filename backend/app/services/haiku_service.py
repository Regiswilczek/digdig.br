"""
haiku_service.py — LEGADO

Este módulo foi substituído pelo piper_service.py (Gemini 2.5 Pro).
Mantido apenas para compatibilidade com scripts locais e tasks antigas
que ainda referenciam este nome.

Não use em código novo — importe diretamente do piper_service.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

# Re-exporta do piper_service para que imports antigos continuem funcionando
from app.services.piper_service import (
    NIVEIS_VALIDOS,
    SYSTEM_PROMPT_TEMPLATE,
    montar_system_prompt,
    parse_piper_response as parse_haiku_response,
    salvar_pessoas,  # re-exportado indiretamente via pessoas_service
)
from app.services.pessoas_service import salvar_pessoas  # noqa: F811

# ─── Funções legadas (Claude Haiku) ──────────────────────────────────────────
# Mantidas para scripts de re-análise local e testes comparativos.
# Em produção, o Piper as substitui completamente.

import logging
import json
import re

logger = logging.getLogger(__name__)

from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models.ato import Ato, ConteudoAto
from app.models.analise import Analise, Irregularidade

_anthropic_client = AsyncAnthropic()

PRECOS_HAIKU = {
    "input": 0.80 / 1_000_000,
    "output": 4.00 / 1_000_000,
    "cache_read": 0.08 / 1_000_000,
    "cache_write": 1.00 / 1_000_000,
}

MAX_PAGES_VISAO = 50


async def analisar_ato_haiku(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID | None,
    system_prompt: str,
) -> Analise:
    """LEGADO — usa Claude Haiku. Em produção, use analisar_ato_piper."""
    import base64

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
        f"TIPO: {ato.tipo}\nNÚMERO: {ato.numero}\n"
        f"DATA: {ato.data_publicacao or 'não informada'}\n"
        f"EMENTA: {ato.ementa or 'não informada'}\n\n"
        f"TEXTO COMPLETO:\n{texto}"
    )

    response = await _anthropic_client.messages.create(
        model=settings.claude_haiku_model,
        max_tokens=16000,
        system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user_prompt}],
    )

    resultado = parse_haiku_response(response.content[0].text)

    custo = (
        response.usage.input_tokens * PRECOS_HAIKU["input"]
        + response.usage.output_tokens * PRECOS_HAIKU["output"]
        + getattr(response.usage, "cache_read_input_tokens", 0) * PRECOS_HAIKU["cache_read"]
        + getattr(response.usage, "cache_creation_input_tokens", 0) * PRECOS_HAIKU["cache_write"]
    )

    analise_result = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
    analise = analise_result.scalar_one_or_none()
    if not analise:
        analise = Analise(id=uuid.uuid4(), ato_id=ato_id, tenant_id=ato.tenant_id, rodada_id=rodada_id)
        db.add(analise)

    analise.status = "haiku_completo"
    analise.nivel_alerta = resultado["nivel_alerta"]
    analise.score_risco = resultado.get("score_risco", 0)
    analise.analisado_por_haiku = True
    analise.resultado_haiku = resultado
    analise.resumo_executivo = resultado.get("resumo")
    analise.tokens_haiku = response.usage.input_tokens + response.usage.output_tokens
    analise.custo_usd = Decimal(str(custo))

    for indicio in resultado.get("indicios", []):
        db.add(Irregularidade(
            id=uuid.uuid4(), analise_id=analise.id, ato_id=ato_id, tenant_id=ato.tenant_id,
            categoria=indicio.get("categoria", "moral"), tipo=indicio.get("tipo", "desconhecido"),
            descricao=indicio.get("descricao", ""), artigo_violado=indicio.get("artigo_violado"),
            gravidade=indicio.get("gravidade", "media"),
        ))

    ato.processado = True
    await db.flush()
    await salvar_pessoas(db, ato_id, ato.tenant_id, resultado.get("pessoas_extraidas", []), data_ato=ato.data_publicacao)
    await db.commit()
    return analise


async def analisar_ato_haiku_visao(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID | None,
    system_prompt: str,
    pdf_bytes: bytes,
) -> Analise:
    """LEGADO — usa Claude Haiku Vision. Em produção, use analisar_ato_piper_visao."""
    import base64
    import fitz

    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    if ato.processado:
        existing = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
        analise = existing.scalar_one_or_none()
        if analise:
            return analise

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    paginas = list(doc)[:MAX_PAGES_VISAO]
    if not paginas:
        raise ValueError(f"PDF sem páginas renderizáveis: ato {ato_id}")

    image_blocks = []
    for page in paginas:
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_b64 = base64.b64encode(pix.tobytes("png")).decode()
        image_blocks.append({"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": img_b64}})

    aviso = f" (exibindo {MAX_PAGES_VISAO} de {len(doc)} páginas)" if len(doc) > MAX_PAGES_VISAO else ""
    user_text = (
        f"Analise o seguinte ato administrativo digitalizado{aviso}. "
        f"TIPO: {ato.tipo}\nNÚMERO: {ato.numero}\n"
        f"DATA: {ato.data_publicacao or 'não informada'}\nEMENTA: {ato.ementa or 'não informada'}"
    )
    content: list = image_blocks + [{"type": "text", "text": user_text}]

    response = await _anthropic_client.messages.create(
        model=settings.claude_haiku_model,
        max_tokens=16000,
        system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": content}],
    )

    resultado = parse_haiku_response(response.content[0].text)
    custo = (
        response.usage.input_tokens * PRECOS_HAIKU["input"]
        + response.usage.output_tokens * PRECOS_HAIKU["output"]
        + getattr(response.usage, "cache_read_input_tokens", 0) * PRECOS_HAIKU["cache_read"]
        + getattr(response.usage, "cache_creation_input_tokens", 0) * PRECOS_HAIKU["cache_write"]
    )

    analise_result = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
    analise = analise_result.scalar_one_or_none()
    if not analise:
        analise = Analise(id=uuid.uuid4(), ato_id=ato_id, tenant_id=ato.tenant_id, rodada_id=rodada_id)
        db.add(analise)

    analise.status = "haiku_completo"
    analise.nivel_alerta = resultado["nivel_alerta"]
    analise.score_risco = resultado.get("score_risco", 0)
    analise.analisado_por_haiku = True
    analise.resultado_haiku = resultado
    analise.resumo_executivo = resultado.get("resumo")
    analise.tokens_haiku = response.usage.input_tokens + response.usage.output_tokens
    analise.custo_usd = Decimal(str(custo))

    for indicio in resultado.get("indicios", []):
        db.add(Irregularidade(
            id=uuid.uuid4(), analise_id=analise.id, ato_id=ato_id, tenant_id=ato.tenant_id,
            categoria=indicio.get("categoria", "moral"), tipo=indicio.get("tipo", "desconhecido"),
            descricao=indicio.get("descricao", ""), artigo_violado=indicio.get("artigo_violado"),
            gravidade=indicio.get("gravidade", "media"),
        ))

    conteudo_existente = await db.execute(select(ConteudoAto).where(ConteudoAto.ato_id == ato_id))
    if not conteudo_existente.scalar_one_or_none():
        db.add(ConteudoAto(
            ato_id=ato_id,
            texto_completo=f"[Documento digitalizado — {len(paginas)} página(s) analisadas via Haiku Vision]",
            metodo_extracao="haiku_visao", qualidade="digitalizado",
            tokens_estimados=response.usage.input_tokens,
        ))

    ato.pdf_baixado = True
    ato.processado = True
    await db.flush()
    await salvar_pessoas(db, ato_id, ato.tenant_id, resultado.get("pessoas_extraidas", []), data_ato=ato.data_publicacao)
    await db.commit()
    return analise
