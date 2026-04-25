import pytest
import uuid
import jwt as pyjwt
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

SECRET = "test-secret"
ALGORITHM = "HS256"


def make_token(sub: str, secret: str = SECRET) -> str:
    return pyjwt.encode({"sub": sub}, secret, algorithm=ALGORITHM)


@pytest.mark.asyncio
async def test_get_current_user_valid_token():
    from app.dependencies.auth import get_current_user

    user_id = uuid.uuid4()
    token = make_token(str(user_id))
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    mock_plano = MagicMock()
    mock_plano.nome = "Investigador"
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = "test@example.com"
    mock_user.nome = "Test User"

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.first.return_value = (mock_user, mock_plano)
    mock_db.execute.return_value = mock_result

    mock_settings = MagicMock()
    mock_settings.supabase_jwt_secret = SECRET
    mock_settings.supabase_jwt_algorithm = ALGORITHM

    result = await get_current_user(credentials, mock_db, mock_settings)

    assert result["email"] == "test@example.com"
    assert result["plano"] == "investigador"


@pytest.mark.asyncio
async def test_get_current_user_invalid_token():
    from app.dependencies.auth import get_current_user

    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer", credentials="bad.token.here"
    )
    mock_db = AsyncMock()
    mock_settings = MagicMock()
    mock_settings.supabase_jwt_secret = SECRET
    mock_settings.supabase_jwt_algorithm = ALGORITHM

    with pytest.raises(HTTPException) as exc:
        await get_current_user(credentials, mock_db, mock_settings)
    assert exc.value.status_code == 401


def test_is_investigador_plus():
    from app.dependencies.auth import is_investigador_plus

    assert is_investigador_plus("investigador") is True
    assert is_investigador_plus("Profissional") is True
    assert is_investigador_plus("api & dados") is True
    assert is_investigador_plus("cidadão") is False
    assert is_investigador_plus("cidadao") is False
