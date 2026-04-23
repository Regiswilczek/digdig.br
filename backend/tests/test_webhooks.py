import pytest
import hmac
import hashlib
from unittest.mock import AsyncMock, patch, MagicMock
import uuid


@pytest.mark.asyncio
async def test_webhook_missing_signature_returns_401(client):
    payload = b'{"type": "INSERT", "table": "users", "record": {"id": "abc", "email": "a@b.com"}}'
    response = await client.post(
        "/webhooks/supabase-auth",
        content=payload,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_webhook_invalid_signature_returns_401(client):
    payload = b'{"type": "INSERT", "table": "users", "record": {"id": "abc", "email": "a@b.com"}}'
    response = await client.post(
        "/webhooks/supabase-auth",
        content=payload,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Secret": "wrong-secret",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_webhook_valid_signature_processes_new_user(client):
    from app.config import settings

    user_id = str(uuid.uuid4())
    payload = (
        f'{{"type": "INSERT", "table": "users", '
        f'"record": {{"id": "{user_id}", "email": "newuser@example.com"}}, '
        f'"old_record": null}}'
    ).encode()

    with patch("app.routers.webhooks.create_user_from_auth") as mock_create:
        mock_create.return_value = None
        response = await client.post(
            "/webhooks/supabase-auth",
            content=payload,
            headers={
                "Content-Type": "application/json",
                "X-Webhook-Secret": settings.webhook_secret,
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    mock_create.assert_called_once()
