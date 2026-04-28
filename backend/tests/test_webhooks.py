import pytest
import hmac
import hashlib
from unittest.mock import AsyncMock, patch, MagicMock
import uuid


async def _mock_db():
    """Mock do banco para evitar dependência de PostgreSQL local nos testes de webhook."""
    db = AsyncMock()
    yield db


@pytest.mark.asyncio
async def test_webhook_missing_signature_returns_401(app):
    """Sem assinatura deve retornar 401 — requer webhook_secret configurado."""
    from httpx import AsyncClient, ASGITransport
    from app.database import get_db
    import app.routers.webhooks as wh_module
    app.dependency_overrides[get_db] = _mock_db
    # Garantir que o secret não é string vazia (que faria hmac.compare_digest("", "") == True)
    with patch.object(wh_module, "settings") as mock_settings:
        mock_settings.webhook_secret = "test-secret-abc123"
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
                payload = b'{"type": "INSERT", "table": "users", "record": {"id": "00000000-0000-0000-0000-000000000000", "email": "a@b.com"}}'
                response = await c.post(
                    "/webhooks/supabase-auth",
                    content=payload,
                    headers={"Content-Type": "application/json"},
                )
            assert response.status_code == 401
        finally:
            app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_webhook_invalid_signature_returns_401(app):
    """Assinatura errada deve retornar 401."""
    from httpx import AsyncClient, ASGITransport
    from app.database import get_db
    import app.routers.webhooks as wh_module
    app.dependency_overrides[get_db] = _mock_db
    with patch.object(wh_module, "settings") as mock_settings:
        mock_settings.webhook_secret = "test-secret-abc123"
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
                payload = b'{"type": "INSERT", "table": "users", "record": {"id": "00000000-0000-0000-0000-000000000000", "email": "a@b.com"}}'
                response = await c.post(
                    "/webhooks/supabase-auth",
                    content=payload,
                    headers={
                        "Content-Type": "application/json",
                        "X-Webhook-Secret": "wrong-secret",
                    },
                )
            assert response.status_code == 401
        finally:
            app.dependency_overrides.pop(get_db, None)
