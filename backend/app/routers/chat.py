import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user, pode_usar_chat
from app.models.tenant import Tenant
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])

_CAU_PR_SLUG = "cau-pr"


async def _get_tenant(db: AsyncSession) -> Tenant:
    r = await db.execute(select(Tenant).where(Tenant.slug == _CAU_PR_SLUG))
    t = r.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Órgão não encontrado")
    return t


def _require_chat(user: dict) -> None:
    if not pode_usar_chat(user["plano"]):
        raise HTTPException(
            403,
            detail={
                "code": "PLANO_INSUFICIENTE",
                "message": "Chat disponível para planos Investigador ou superior.",
                "upgrade_url": "/precos",
            },
        )


class PerguntaInput(BaseModel):
    pergunta: str


@router.post("/sessoes", status_code=201)
async def criar_sessao(
    user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    _require_chat(user)
    tenant = await _get_tenant(db)
    sessao = await chat_service.criar_sessao(uuid.UUID(user["id"]), tenant.id, db)
    return {
        "id": str(sessao.id),
        "tenant_id": str(sessao.tenant_id),
        "criado_em": sessao.criado_em.isoformat(),
    }


@router.get("/sessoes")
async def listar_sessoes(
    user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    _require_chat(user)
    tenant = await _get_tenant(db)
    sessoes = await chat_service.listar_sessoes(uuid.UUID(user["id"]), tenant.id, db)
    return {
        "sessoes": [
            {
                "id": str(s.id),
                "titulo": s.titulo,
                "total_mensagens": s.total_mensagens,
                "custo_total_usd": float(s.custo_total_usd),
                "ultima_msg_em": s.ultima_msg_em.isoformat() if s.ultima_msg_em else None,
                "criado_em": s.criado_em.isoformat(),
            }
            for s in sessoes
        ]
    }


@router.get("/sessoes/{sessao_id}")
async def get_sessao(
    sessao_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    sessao = await chat_service.get_sessao(sessao_id, user["id"], db)
    if not sessao:
        raise HTTPException(404, "Sessão não encontrada")
    mensagens = await chat_service.get_mensagens(sessao_id, db)
    return {
        "id": str(sessao.id),
        "titulo": sessao.titulo,
        "total_mensagens": sessao.total_mensagens,
        "custo_total_usd": float(sessao.custo_total_usd),
        "mensagens": [
            {
                "id": str(m.id),
                "role": m.role,
                "conteudo": m.conteudo,
                "criado_em": m.criado_em.isoformat(),
            }
            for m in mensagens
        ],
    }


@router.delete("/sessoes/{sessao_id}")
async def deletar_sessao(
    sessao_id: str,
    user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    sessao = await chat_service.get_sessao(sessao_id, user["id"], db)
    if not sessao:
        raise HTTPException(404, "Sessão não encontrada")
    sessao.ativa = False
    await db.commit()
    return {"deletado": True}


@router.post("/sessoes/{sessao_id}/stream")
async def stream_mensagem(
    sessao_id: str,
    body: PerguntaInput,
    user: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    _require_chat(user)
    if not body.pergunta.strip():
        raise HTTPException(400, "Pergunta não pode ser vazia")
    sessao = await chat_service.get_sessao(sessao_id, user["id"], db)
    if not sessao:
        raise HTTPException(404, "Sessão não encontrada")

    return StreamingResponse(
        chat_service.stream_resposta(
            sessao_id=sessao_id,
            pergunta=body.pergunta.strip(),
            user_id=user["id"],
            tenant_id=sessao.tenant_id,
            db=db,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
