from typing import Annotated
from fastapi import Depends
from app.middleware.auth import get_current_user as _get_middleware_user
from app.models.user import User

INVESTIGADOR_PLUS_PLANS = {"investigador", "profissional", "patrocinador", "api & dados", "tecnico"}

CHAT_ENABLED_PLANS = INVESTIGADOR_PLUS_PLANS


def is_investigador_plus(plano_nome: str) -> bool:
    return plano_nome.strip().lower() in INVESTIGADOR_PLUS_PLANS


def pode_usar_chat(plano_nome: str) -> bool:
    return plano_nome.strip().lower() in CHAT_ENABLED_PLANS


async def get_current_user(
    user: Annotated[User, Depends(_get_middleware_user)],
) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "nome": user.nome,
        "plano": user.plano.nome.strip().lower(),
    }
