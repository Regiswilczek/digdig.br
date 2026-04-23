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
