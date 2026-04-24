import uuid
import asyncio
from decimal import Decimal
from anthropic import RateLimitError, APIError
from sqlalchemy import select, update, func
from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.ato import Ato, RodadaAnalise
from app.models.analise import Analise
from app.models.tenant import Tenant
from app.services.haiku_service import analisar_ato_haiku, montar_system_prompt
from app.services.sonnet_service import analisar_ato_sonnet

CUSTO_LIMITE_USD = Decimal("15.00")


async def _rodada_esta_ativa(db, rodada_id: uuid.UUID) -> bool:
    """Returns False if the rodada was cancelled externally — workers must stop."""
    result = await db.execute(
        select(RodadaAnalise.status).where(RodadaAnalise.id == rodada_id)
    )
    status = result.scalar_one_or_none()
    return status in ("em_progresso", "pendente")


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

        results = {"ok": 0, "erro": 0, "pulados": 0, "cancelado": False}
        for ato_id_str in ato_ids:
            # Check cancellation before each ato to stop quickly after cancel
            if not await _rodada_esta_ativa(db, rodada_id):
                results["cancelado"] = True
                break

            ato_id = uuid.UUID(ato_id_str)
            try:
                await analisar_ato_haiku(db, ato_id, rodada_id, system_prompt)

                # Only increment counter for newly analyzed atos (not idempotency hits)
                ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
                ato = ato_result.scalar_one()

                analise_result = await db.execute(
                    select(Analise).where(Analise.ato_id == ato_id)
                )
                analise = analise_result.scalar_one_or_none()
                custo_ato = analise.custo_usd if analise else Decimal("0")

                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == rodada_id)
                    .values(
                        atos_analisados_haiku=RodadaAnalise.atos_analisados_haiku + 1,
                        custo_total_usd=func.coalesce(RodadaAnalise.custo_total_usd, 0) + custo_ato,
                    )
                )
                await db.commit()
                results["ok"] += 1

                # Cost threshold: abort if rodada is burning too much money
                rodada_result = await db.execute(
                    select(RodadaAnalise.custo_total_usd).where(RodadaAnalise.id == rodada_id)
                )
                custo_acumulado = rodada_result.scalar_one_or_none() or Decimal("0")
                if custo_acumulado > CUSTO_LIMITE_USD:
                    await db.execute(
                        update(RodadaAnalise)
                        .where(RodadaAnalise.id == rodada_id)
                        .values(
                            status="cancelada",
                            erro_mensagem=f"Limite de custo atingido: USD {custo_acumulado}",
                        )
                    )
                    await db.commit()
                    results["cancelado"] = True
                    break

            except (RateLimitError, APIError):
                raise  # bubble up to task wrapper for retry
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
        if not await _rodada_esta_ativa(db, rodada_id):
            return {"ok": 0, "motivo": "rodada_cancelada"}

        criticos_result = await db.execute(
            select(Analise).where(
                Analise.rodada_id == rodada_id,
                Analise.nivel_alerta.in_(["vermelho"]),
                Analise.analisado_por_sonnet == False,
            )
        )
        criticos = criticos_result.scalars().all()

        if not criticos:
            return {"ok": 0, "motivo": "nenhum_critico"}

        system_prompt = await montar_system_prompt(db, tenant_id)
        results = {"ok": 0, "erro": 0}

        for analise in criticos:
            if not await _rodada_esta_ativa(db, rodada_id):
                break
            try:
                await analisar_ato_sonnet(db, analise.ato_id, rodada_id, system_prompt)
                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == rodada_id)
                    .values(atos_analisados_sonnet=RodadaAnalise.atos_analisados_sonnet + 1)
                )
                await db.commit()
                results["ok"] += 1
            except (RateLimitError, APIError):
                raise
            except Exception:
                results["erro"] += 1
                continue

        return results
