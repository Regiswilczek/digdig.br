import uuid
import hmac
import hashlib
from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.plano import Plano
from app.constants import PLANO_CIDADAO

router = APIRouter(tags=["webhooks"])


def verify_webhook_secret(request: Request) -> None:
    secret = request.headers.get("X-Webhook-Secret", "")
    if not hmac.compare_digest(secret, settings.webhook_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook secret inválido",
        )


async def create_user_from_auth(
    user_id: str,
    email: str,
    db: AsyncSession,
) -> None:
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    if result.scalar_one_or_none():
        return  # already exists — idempotent

    plano_result = await db.execute(
        select(Plano).where(Plano.nome == PLANO_CIDADAO)
    )
    plano = plano_result.scalar_one_or_none()
    if not plano:
        raise RuntimeError(f"Plano '{PLANO_CIDADAO}' not found in database — run seed.sql first")

    user = User(
        id=uuid.UUID(user_id),
        email=email,
        plano_id=plano.id,
        ativo=True,
        email_verificado=False,
    )
    db.add(user)
    await db.flush()


@router.post("/supabase-auth")
async def supabase_auth_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    verify_webhook_secret(request)

    body = await request.json()
    event_type = body.get("type")
    record = body.get("record", {})

    if event_type == "INSERT" and record.get("id") and record.get("email"):
        await create_user_from_auth(
            user_id=record["id"],
            email=record["email"],
            db=db,
        )

    return {"ok": True}
