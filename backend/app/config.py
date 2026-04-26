from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
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
    supabase_jwt_secret: str = ""
    supabase_url: str = "https://example.supabase.co"
    supabase_service_role_key: str = ""
    supabase_jwt_algorithm: str = "HS256"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Claude
    claude_haiku_model: str = "claude-haiku-4-5-20251001"
    claude_sonnet_model: str = "claude-sonnet-4-6"
    anthropic_api_key: str = ""

    # Mercado Pago (billing)
    mercadopago_access_token: str = ""
    mercadopago_public_key: str = ""
    mercadopago_webhook_secret: str = ""

    # Resend
    resend_api_key: str = ""
    resend_from: str = "noreply@digdig.com.br"

    # App
    environment: str = "development"
    sentry_dsn: str = ""
    frontend_url: str = "http://localhost:5173"
    allowed_origins: str = "http://localhost:5173"
    webhook_secret: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.is_production:
            required = {
                "supabase_jwt_secret": self.supabase_jwt_secret,
                "supabase_service_role_key": self.supabase_service_role_key,
                "anthropic_api_key": self.anthropic_api_key,
                "webhook_secret": self.webhook_secret,
            }
            missing = [k for k, v in required.items() if not v]
            if missing:
                raise ValueError(f"Required secrets missing in production: {missing}")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Module-level singleton for non-FastAPI contexts (workers, scripts).
# FastAPI routes should use Depends(get_settings) for testability.
settings = get_settings()
