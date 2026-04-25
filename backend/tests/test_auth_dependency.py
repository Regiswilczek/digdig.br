import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import HTTPException


def test_is_investigador_plus():
    from app.dependencies.auth import is_investigador_plus

    assert is_investigador_plus("investigador") is True
    assert is_investigador_plus("Profissional") is True
    assert is_investigador_plus("api & dados") is True
    assert is_investigador_plus("cidadão") is False
    assert is_investigador_plus("cidadao") is False


@pytest.mark.asyncio
async def test_get_current_user_returns_dict():
    from app.dependencies.auth import get_current_user

    mock_plano = MagicMock()
    mock_plano.nome = "Investigador"
    mock_user = MagicMock()
    mock_user.id = "11111111-1111-1111-1111-111111111111"
    mock_user.email = "test@example.com"
    mock_user.nome = "Test User"
    mock_user.plano = mock_plano

    with patch("app.dependencies.auth._get_middleware_user", return_value=mock_user):
        result = await get_current_user(user=mock_user)

    assert result["email"] == "test@example.com"
    assert result["plano"] == "investigador"
    assert result["id"] == "11111111-1111-1111-1111-111111111111"


def test_is_investigador_plus_cidadao_variants():
    from app.dependencies.auth import is_investigador_plus

    assert is_investigador_plus("Cidadão") is False
    assert is_investigador_plus("CIDADÃO") is False
    assert is_investigador_plus("") is False
