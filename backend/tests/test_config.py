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
    assert PLANO_API_DADOS == "api_dados"


def test_chat_limits_match_business_plan():
    from app.constants import PLANO_CHAT_LIMITES, PLANO_CIDADAO, PLANO_INVESTIGADOR, PLANO_PROFISSIONAL, PLANO_API_DADOS
    assert PLANO_CHAT_LIMITES[PLANO_CIDADAO] == 5
    assert PLANO_CHAT_LIMITES[PLANO_INVESTIGADOR] == 200
    assert PLANO_CHAT_LIMITES[PLANO_PROFISSIONAL] == 1000
    assert PLANO_CHAT_LIMITES[PLANO_API_DADOS] is None


def test_allowed_origins_list():
    from app.config import Settings
    s = Settings(allowed_origins="http://localhost:5173,https://digdig.com.br")
    assert s.allowed_origins_list == ["http://localhost:5173", "https://digdig.com.br"]


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
