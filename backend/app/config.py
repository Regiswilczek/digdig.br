from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/digdig"

    # Supabase
    supabase_jwt_secret: str = "super-secret-jwt-token-for-testing"
    supabase_url: str = "https://example.supabase.co"
    supabase_service_role_key: str = "test-service-role-key"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Claude
    claude_haiku_model: str = "claude-haiku-4-5-20251001"
    claude_sonnet_model: str = "claude-sonnet-4-6"
    anthropic_api_key: str = ""

    # Mercado Pago (billing)
    mercadopago_access_token: str = ""
    mercadopago_public_key: str = ""

    # Resend
    resend_api_key: str = ""
    resend_from: str = "noreply@digdig.com.br"

    # App
    environment: str = "development"
    sentry_dsn: str = ""
    frontend_url: str = "http://localhost:5173"
    allowed_origins: str = "http://localhost:5173"
    webhook_secret: str = "test-webhook-secret-32chars-padding"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
