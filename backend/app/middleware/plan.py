from typing import Callable
from fastapi import HTTPException, status, Depends
from app.models.user import User
from app.middleware.auth import get_current_user
from app.constants import (
    PLANO_CIDADAO, PLANO_INVESTIGADOR, PLANO_PROFISSIONAL, PLANO_API_DADOS
)

PLAN_HIERARCHY = [PLANO_CIDADAO, PLANO_INVESTIGADOR, PLANO_PROFISSIONAL, PLANO_API_DADOS]


def _plan_rank(nome: str) -> int:
    try:
        return PLAN_HIERARCHY.index(nome)
    except ValueError:
        return -1


def require_plan(minimum_plan: str) -> Callable[[User], User]:
    """Returns a FastAPI dependency that raises 403 if user's plan is below minimum."""
    def checker(user: User = Depends(get_current_user)) -> User:
        if _plan_rank(user.plano.nome) < _plan_rank(minimum_plan):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Esta funcionalidade requer o plano {minimum_plan} ou superior.",
            )
        return user
    return checker


def check_api_access(user: User = Depends(get_current_user)) -> User:
    if not user.plano.tem_api:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso à API REST requer o plano API & Dados.",
        )
    return user
