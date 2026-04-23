import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from app.constants import PLANO_CIDADAO, PLANO_INVESTIGADOR, PLANO_PROFISSIONAL, PLANO_API_DADOS


def make_user_with_plan(plan_name: str, chat_limit: int | None):
    user = MagicMock()
    user.plano.nome = plan_name
    user.plano.limite_chat_mensal = chat_limit
    user.plano.tem_api = (plan_name == PLANO_API_DADOS)
    user.plano.tem_exportacao = (plan_name in (PLANO_INVESTIGADOR, PLANO_PROFISSIONAL, PLANO_API_DADOS))
    return user


def test_require_plan_cidadao_blocks_investigador_route():
    from app.middleware.plan import require_plan
    user = make_user_with_plan(PLANO_CIDADAO, 5)
    checker = require_plan(PLANO_INVESTIGADOR)
    with pytest.raises(HTTPException) as exc:
        checker(user)
    assert exc.value.status_code == 403


def test_require_plan_investigador_allows_investigador_route():
    from app.middleware.plan import require_plan
    user = make_user_with_plan(PLANO_INVESTIGADOR, 200)
    checker = require_plan(PLANO_INVESTIGADOR)
    result = checker(user)
    assert result == user


def test_require_plan_profissional_allows_investigador_route():
    from app.middleware.plan import require_plan
    user = make_user_with_plan(PLANO_PROFISSIONAL, 1000)
    checker = require_plan(PLANO_INVESTIGADOR)
    result = checker(user)
    assert result == user


def test_require_plan_api_dados_allows_all():
    from app.middleware.plan import require_plan
    user = make_user_with_plan(PLANO_API_DADOS, None)
    for plan in (PLANO_CIDADAO, PLANO_INVESTIGADOR, PLANO_PROFISSIONAL):
        checker = require_plan(plan)
        result = checker(user)
        assert result == user
