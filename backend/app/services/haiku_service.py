"""
haiku_service.py — shim de compatibilidade

Todas as funções aqui redirecionam para o piper_service (Gemini 2.5 Pro).
Mantido para que scripts locais e tasks antigas continuem funcionando sem alteração.

Não use em código novo — importe diretamente do piper_service.
"""
from __future__ import annotations

import uuid as _uuid

from app.services.piper_service import (
    NIVEIS_VALIDOS,
    SYSTEM_PROMPT_TEMPLATE,
    montar_system_prompt,
    parse_piper_response as parse_haiku_response,
    analisar_ato_piper,
    analisar_ato_piper_visao,
)
from app.services.pessoas_service import salvar_pessoas  # noqa: F401


async def analisar_ato_haiku(db, ato_id, rodada_id, system_prompt):
    """Wrapper de compatibilidade — delega ao Piper. Aceita rodada_id=None."""
    return await analisar_ato_piper(db, ato_id, rodada_id or _uuid.uuid4(), system_prompt)


async def analisar_ato_haiku_visao(db, ato_id, rodada_id, system_prompt, pdf_bytes):
    """Wrapper de compatibilidade — delega ao Piper Vision. Aceita rodada_id=None."""
    return await analisar_ato_piper_visao(
        db, ato_id, rodada_id or _uuid.uuid4(), system_prompt, pdf_bytes
    )
