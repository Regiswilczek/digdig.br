import uuid
import asyncio
from anthropic import RateLimitError, APIError
from celery import shared_task
from sqlalchemy import select, update
from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.ato import Ato, RodadaAnalise
from app.models.analise import Analise
from app.models.tenant import Tenant
from app.services.haiku_service import analisar_ato_haiku, montar_system_prompt
from app.services.sonnet_service import analisar_ato_sonnet


@celery_app.task(bind=True, max_retries=3, queue="analise", name="analise.haiku_lote")
def analisar_lote_haiku_task(self, ato_ids: list[str], rodada_id: str, tenant_id: str) -> dict:
    try:
        return asyncio.run(_analisar_lote_haiku(ato_ids, rodada_id, tenant_id))
    except RateLimitError as exc:
        raise self.retry(exc=exc, countdown=(2 ** self.request.retries) * 5)
    except APIError as exc:
        raise self.retry(exc=exc, countdown=5)


async def _analisar_lote_haiku(
    ato_ids: list[str], rodada_id_str: str, tenant_id_str: str
) -> dict:
    rodada_id = uuid.UUID(rodada_id_str)
    tenant_id = uuid.UUID(tenant_id_str)

    async with async_session_factory() as db:
        system_prompt = await montar_system_prompt(db, tenant_id)

        results = {"ok": 0, "erro": 0}
        for ato_id_str in ato_ids:
            ato_id = uuid.UUID(ato_id_str)
            try:
                await analisar_ato_haiku(db, ato_id, rodada_id, system_prompt)
                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == rodada_id)
                    .values(atos_analisados_haiku=RodadaAnalise.atos_analisados_haiku + 1)
                )
                await db.commit()
                results["ok"] += 1
            except Exception:
                results["erro"] += 1
                continue

        return results


@celery_app.task(bind=True, max_retries=3, queue="analise", name="analise.sonnet_criticos")
def analisar_criticos_sonnet_task(self, rodada_id: str, tenant_id: str) -> dict:
    try:
        return asyncio.run(_analisar_criticos_sonnet(rodada_id, tenant_id))
    except RateLimitError as exc:
        raise self.retry(exc=exc, countdown=(2 ** self.request.retries) * 10)
    except APIError as exc:
        raise self.retry(exc=exc, countdown=5)


async def _analisar_criticos_sonnet(rodada_id_str: str, tenant_id_str: str) -> dict:
    rodada_id = uuid.UUID(rodada_id_str)
    tenant_id = uuid.UUID(tenant_id_str)

    async with async_session_factory() as db:
        criticos_result = await db.execute(
            select(Analise).where(
                Analise.rodada_id == rodada_id,
                Analise.nivel_alerta.in_(["laranja", "vermelho"]),
                Analise.analisado_por_sonnet == False,
            )
        )
        criticos = criticos_result.scalars().all()

        if not criticos:
            return {"ok": 0, "motivo": "nenhum_critico"}

        system_prompt = await montar_system_prompt(db, tenant_id)
        results = {"ok": 0, "erro": 0}

        for analise in criticos:
            try:
                await analisar_ato_sonnet(db, analise.ato_id, rodada_id, system_prompt)
                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == rodada_id)
                    .values(atos_analisados_sonnet=RodadaAnalise.atos_analisados_sonnet + 1)
                )
                await db.commit()
                results["ok"] += 1
            except Exception:
                results["erro"] += 1
                continue

        return results
