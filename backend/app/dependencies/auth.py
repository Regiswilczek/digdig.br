import uuid
import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings, Settings
from app.database import get_db
from app.models.user import User
from app.models.plano import Plano

bearer_scheme = HTTPBearer()

INVESTIGADOR_PLUS_PLANS = {"investigador", "profissional", "api & dados"}


def is_investigador_plus(plano_nome: str) -> bool:
    return plano_nome.strip().lower() in INVESTIGADOR_PLUS_PLANS


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    token = credentials.credentials
    try:
        payload = pyjwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=[settings.supabase_jwt_algorithm],
            options={"verify_aud": False},
        )
    except pyjwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Token sem subject")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido")

    result = await db.execute(
        select(User, Plano)
        .join(Plano, User.plano_id == Plano.id)
        .where(User.id == user_id, User.ativo == True)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    user, plano = row
    return {
        "id": str(user.id),
        "email": user.email,
        "nome": user.nome,
        "plano": plano.nome.strip().lower(),
    }
