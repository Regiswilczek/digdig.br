import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch


@pytest.fixture
def app():
    from app.main import create_app
    from fastapi import Depends
    from app.middleware.auth import get_current_user

    application = create_app()

    @application.get("/test-auth")
    async def _test_auth_route(user=Depends(get_current_user)):
        return {"user_id": str(user.id)}

    return application


@pytest_asyncio.fixture
async def client(app):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as c:
        yield c


@pytest.fixture
def mock_settings():
    """Override settings for tests — no real DB or external services needed."""
    with patch("app.config.settings") as mock:
        mock.environment = "test"
        mock.sentry_dsn = ""
        mock.allowed_origins_list = ["http://localhost:5173"]
        mock.database_url = "postgresql+asyncpg://postgres:postgres@localhost:5432/digdig_test"
        yield mock
