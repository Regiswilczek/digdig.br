import uuid
import hmac
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.config import settings
from app.database import get_db
from app.models.ato import RodadaAnalise
from app.models.tenant import Tenant

router = APIRouter(prefix="/pnl", tags=["admin"])

STATUSES_ATIVOS = ("em_progresso", "pendente")


def verify_admin_secret(request: Request) -> None:
    secret = request.headers.get("X-Admin-Secret", "")
    if not secret or not hmac.compare_digest(secret, settings.webhook_secret):
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/orgaos/{slug}/rodadas")
async def iniciar_rodada(
    slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    verify_admin_secret(request)

    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail=f"Órgão '{slug}' não encontrado")

    # Guard: rejeita se já existe rodada ativa para este órgão
    ativa_result = await db.execute(
        select(RodadaAnalise).where(
            RodadaAnalise.tenant_id == tenant.id,
            RodadaAnalise.status.in_(STATUSES_ATIVOS),
        )
    )
    rodada_ativa = ativa_result.scalar_one_or_none()
    if rodada_ativa:
        raise HTTPException(
            status_code=409,
            detail={
                "erro": "rodada_ja_ativa",
                "mensagem": f"Já existe uma rodada {rodada_ativa.status} para '{slug}'. "
                            f"Cancele a rodada {rodada_ativa.id} antes de iniciar uma nova.",
                "rodada_id": str(rodada_ativa.id),
                "status": rodada_ativa.status,
            },
        )

    rodada = RodadaAnalise(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        status="pendente",
        criado_em=datetime.now(timezone.utc),
    )
    db.add(rodada)
    await db.commit()

    # Dispatch Celery task
    from app.workers.orquestrador import iniciar_rodada_task
    iniciar_rodada_task.delay(str(rodada.id), slug)

    return {
        "rodada_id": str(rodada.id),
        "tenant": slug,
        "status": "iniciada",
        "mensagem": "Pipeline iniciado. Acompanhe o status via GET /pnl/rodadas/{rodada_id}",
    }


@router.get("/rodadas/{rodada_id}")
async def status_rodada(
    rodada_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    verify_admin_secret(request)

    result = await db.execute(
        select(RodadaAnalise).where(RodadaAnalise.id == uuid.UUID(rodada_id))
    )
    rodada = result.scalar_one_or_none()
    if not rodada:
        raise HTTPException(status_code=404, detail="Rodada não encontrada")

    return _rodada_dict(rodada)


@router.get("/orgaos/{slug}/rodadas")
async def listar_rodadas(
    slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Lista todas as rodadas de um órgão (mais recentes primeiro)."""
    verify_admin_secret(request)

    tenant_result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail=f"Órgão '{slug}' não encontrado")

    result = await db.execute(
        select(RodadaAnalise)
        .where(RodadaAnalise.tenant_id == tenant.id)
        .order_by(RodadaAnalise.criado_em.desc())
        .limit(20)
    )
    rodadas = result.scalars().all()
    return [_rodada_dict(r) for r in rodadas]


@router.post("/rodadas/{rodada_id}/cancelar")
async def cancelar_rodada(
    rodada_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Cancela uma rodada ativa. Os workers vão parar na próxima verificação."""
    verify_admin_secret(request)

    result = await db.execute(
        select(RodadaAnalise).where(RodadaAnalise.id == uuid.UUID(rodada_id))
    )
    rodada = result.scalar_one_or_none()
    if not rodada:
        raise HTTPException(status_code=404, detail="Rodada não encontrada")

    if rodada.status not in STATUSES_ATIVOS:
        raise HTTPException(
            status_code=409,
            detail=f"Rodada já está com status '{rodada.status}' — não é possível cancelar.",
        )

    await db.execute(
        update(RodadaAnalise)
        .where(RodadaAnalise.id == uuid.UUID(rodada_id))
        .values(status="cancelada", concluido_em=datetime.now(timezone.utc))
    )
    await db.commit()

    return {
        "rodada_id": rodada_id,
        "status": "cancelada",
        "mensagem": "Rodada marcada como cancelada. Workers em andamento vão concluir o ato atual e parar.",
    }


def _rodada_dict(rodada: RodadaAnalise) -> dict:
    return {
        "rodada_id": str(rodada.id),
        "status": rodada.status,
        "total_atos": rodada.total_atos,
        "atos_scrapeados": rodada.atos_scrapeados,
        "atos_analisados_haiku": rodada.atos_analisados_haiku,
        "atos_analisados_sonnet": rodada.atos_analisados_sonnet,
        "custo_total_usd": float(rodada.custo_total_usd) if rodada.custo_total_usd else 0.0,
        "criado_em": rodada.criado_em.isoformat() if rodada.criado_em else None,
        "iniciado_em": rodada.iniciado_em.isoformat() if rodada.iniciado_em else None,
        "concluido_em": rodada.concluido_em.isoformat() if rodada.concluido_em else None,
        "erro_mensagem": rodada.erro_mensagem,
    }
