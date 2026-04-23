from celery import Celery
from celery.signals import worker_process_init
from app.config import settings


@worker_process_init.connect
def _reset_db_pool(**kwargs):
    """
    Celery forks worker processes from the main process.
    The SQLAlchemy async engine holds connections bound to the main-process event loop.
    We recreate the engine with NullPool in each forked worker so asyncio.run() gets
    a clean engine with no cross-loop futures.
    """
    import app.database as _db
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy.pool import NullPool

    _db.engine = create_async_engine(
        settings.database_url,
        poolclass=NullPool,
        echo=False,
    )
    _db.async_session_factory = async_sessionmaker(
        _db.engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


celery_app = Celery(
    "digdig",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.workers.scraper_tasks",
        "app.workers.analise_tasks",
        "app.workers.orquestrador",
    ],
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
        "scraper.*": {"queue": "scraper"},
        "analise.*": {"queue": "analise"},
        "orquestrador.*": {"queue": "analise"},
    },
)
