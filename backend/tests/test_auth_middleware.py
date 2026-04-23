import pytest
import jwt as pyjwt
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from app.config import settings


def make_hs256_jwt(sub: str, email: str, expired: bool = False) -> str:
    exp_delta = timedelta(hours=-1) if expired else timedelta(hours=1)
    payload = {
        "sub": sub,
        "email": email,
        "role": "authenticated",
        "aud": "authenticated",
        "exp": datetime.now(timezone.utc) + exp_delta,
        "iat": datetime.now(timezone.utc),
        "app_metadata": {},
    }
    return pyjwt.encode(payload, "test-secret", algorithm="HS256")


def _mock_jwks_fail(token):
    from jwt import PyJWKClientError
    raise PyJWKClientError("no matching key")


@pytest.mark.asyncio
async def test_protected_route_without_token_returns_401(client):
    response = await client.get("/test-auth")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_with_invalid_token_returns_401(client):
    response = await client.get("/test-auth", headers={"Authorization": "Bearer invalid.token.here"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_decode_jwt_valid_hs256_via_fallback():
    """JWKS fails (mocked) → fallback to HS256 shared secret succeeds."""
    from app.middleware.auth import decode_jwt_payload

    token = pyjwt.encode(
        {
            "sub": "user-uuid-123",
            "email": "test@example.com",
            "role": "authenticated",
            "aud": "authenticated",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "iat": datetime.now(timezone.utc),
            "app_metadata": {},
        },
        "test-secret",
        algorithm="HS256",
    )

    with patch("app.middleware.auth._jwks_client") as mock_client:
        mock_client.return_value.get_signing_key_from_jwt.side_effect = _mock_jwks_fail
        with patch("app.middleware.auth.settings") as mock_settings:
            mock_settings.supabase_jwt_secret = "test-secret"
            mock_settings.supabase_url = "https://example.supabase.co"
            payload = decode_jwt_payload(token)

    assert payload.sub == "user-uuid-123"
    assert payload.email == "test@example.com"


@pytest.mark.asyncio
async def test_expired_token_raises_401():
    from app.middleware.auth import decode_jwt_payload
    from fastapi import HTTPException

    token = pyjwt.encode(
        {
            "sub": "user-uuid-123",
            "email": "test@example.com",
            "role": "authenticated",
            "aud": "authenticated",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
            "app_metadata": {},
        },
        "test-secret",
        algorithm="HS256",
    )

    with patch("app.middleware.auth._jwks_client") as mock_client:
        mock_client.return_value.get_signing_key_from_jwt.side_effect = _mock_jwks_fail
        with patch("app.middleware.auth.settings") as mock_settings:
            mock_settings.supabase_jwt_secret = "test-secret"
            mock_settings.supabase_url = "https://example.supabase.co"
            with pytest.raises(HTTPException) as exc_info:
                decode_jwt_payload(token)

    assert exc_info.value.status_code == 401
