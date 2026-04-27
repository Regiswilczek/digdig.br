import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routers import health, webhooks
from app.routers.admin import router as admin_router
from app.routers.honeypot import router as honeypot_router
from app.routers.public import router as public_router
from app.routers.painel import router as painel_router
from app.routers.billing import router as billing_router
from app.routers.chat import router as chat_router


def create_app() -> FastAPI:
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            traces_sample_rate=0.1,
        )

    app = FastAPI(
        title="Dig Dig API",
        version="0.1.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Authorization", "Content-Type", "X-Admin-Secret"],
    )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=400,
            content={"detail": "Erro de validação nos dados enviados"},
        )

    app.include_router(health.router)
    app.include_router(webhooks.router, prefix="/webhooks")
    app.include_router(admin_router)
    app.include_router(honeypot_router)
    app.include_router(public_router)
    app.include_router(painel_router)
    app.include_router(billing_router)
    app.include_router(chat_router)

    return app


app = create_app()
