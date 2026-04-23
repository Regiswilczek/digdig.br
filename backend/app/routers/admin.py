import uuid
import hmac
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.ato import RodadaAnalise
from app.models.tenant import Tenant

router = APIRouter(prefix="/pnl", tags=["admin"])


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

    return {
        "rodada_id": str(rodada.id),
        "status": rodada.status,
        "total_atos": rodada.total_atos,
        "atos_scrapeados": rodada.atos_scrapeados,
        "atos_analisados_haiku": rodada.atos_analisados_haiku,
        "atos_analisados_sonnet": rodada.atos_analisados_sonnet,
        "custo_total_usd": float(rodada.custo_total_usd) if rodada.custo_total_usd else 0.0,
        "iniciado_em": rodada.iniciado_em.isoformat() if rodada.iniciado_em else None,
        "concluido_em": rodada.concluido_em.isoformat() if rodada.concluido_em else None,
        "erro_mensagem": rodada.erro_mensagem,
    }
