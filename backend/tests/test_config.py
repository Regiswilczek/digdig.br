import pytest
from app.config import settings

def test_settings_has_required_fields():
    assert hasattr(settings, "database_url")
    assert hasattr(settings, "supabase_jwt_secret")
    assert hasattr(settings, "redis_url")
    assert hasattr(settings, "claude_haiku_model")
    assert hasattr(settings, "claude_sonnet_model")

def test_settings_environment_default():
    assert settings.environment in ("development", "staging", "production")

def test_constants():
    from app.constants import PLANO_CIDADAO, PLANO_INVESTIGADOR, PLANO_PROFISSIONAL, PLANO_API_DADOS
    assert PLANO_CIDADAO == "cidadao"
    assert PLANO_INVESTIGADOR == "investigador"
    assert PLANO_PROFISSIONAL == "profissional"
    assert PLANO_API_DADOS == "api & dados"

def test_allowed_origins_list():
    from app.config import Settings
    s = Settings(allowed_origins="http://localhost:5173,https://digdig.com.br")
    assert "http://localhost:5173" in s.allowed_origins_list
    assert "https://digdig.com.br" in s.allowed_origins_list

def test_is_production():
    from app.config import Settings
    prod = Settings(
        environment="production",
        supabase_jwt_secret="x",
        supabase_service_role_key="x",
        anthropic_api_key="x",
        webhook_secret="x",
    )
    assert prod.is_production is True
    assert Settings(environment="development").is_production is False

def test_database_module_imports():
    from app.database import engine, async_session_factory, get_db
    assert engine is not None
    assert async_session_factory is not None

def test_celery_app_creates():
    from app.workers.celery_app import celery_app
    assert celery_app.main == "digdig"
