from celery import Celery
from app.config import settings

celery_app = Celery(
    "digdig",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.workers.tasks_scraper.*": {"queue": "scraper"},
        "app.workers.tasks_analise.*": {"queue": "analise"},
        "app.workers.tasks_relatorio.*": {"queue": "relatorio"},
        "app.workers.tasks_alertas.*": {"queue": "alertas"},
    },
)
