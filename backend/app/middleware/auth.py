import uuid
from functools import lru_cache
from typing import Annotated
import jwt
from jwt import PyJWKClient, PyJWKClientError, DecodeError, ExpiredSignatureError, InvalidAudienceError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import TokenPayload

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)


def decode_jwt_payload(token: str) -> TokenPayload:
    """Validate a Supabase JWT (supports both new ECC P-256 and legacy HS256)."""
    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        data = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256", "HS256"],
            audience="authenticated",
            options={"verify_exp": True},
        )
    except (PyJWKClientError, DecodeError):
        if not settings.supabase_jwt_secret:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            data = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True},
            )
        except (DecodeError, Exception) as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido ou expirado",
                headers={"WWW-Authenticate": "Bearer"},
            ) from e
    except (ExpiredSignatureError, InvalidAudienceError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    return TokenPayload(
        sub=data["sub"],
        email=data.get("email"),
        role=data.get("role", "authenticated"),
        app_metadata=data.get("app_metadata", {}),
    )


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_jwt_payload(credentials.credentials)
    user_id = uuid.UUID(payload.sub)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
        )

    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desativada",
        )

    return user


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acesso restrito a administradores",
    )
