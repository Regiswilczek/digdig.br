import uuid
import asyncio
from decimal import Decimal
from anthropic import RateLimitError as AnthropicRateLimitError, APIError as AnthropicAPIError
from openai import RateLimitError as OpenAIRateLimitError, APIError as OpenAIAPIError
from sqlalchemy import select, update, func
from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.ato import Ato, RodadaAnalise
from app.models.analise import Analise
from app.models.tenant import Tenant
from app.services.piper_service import analisar_ato_piper, montar_system_prompt
from app.services.bud_service import analisar_ato_bud

CUSTO_LIMITE_USD = Decimal("5.00")


async def _rodada_esta_ativa(db, rodada_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(RodadaAnalise.status).where(RodadaAnalise.id == rodada_id)
    )
    status = result.scalar_one_or_none()
    return status in ("em_progresso", "pendente")


@celery_app.task(bind=True, max_retries=3, queue="analise", name="analise.piper_lote")
def analisar_lote_piper_task(self, ato_ids: list[str], rodada_id: str, tenant_id: str) -> dict:
    try:
        return asyncio.run(_analisar_lote_piper(ato_ids, rodada_id, tenant_id))
    except (OpenAIRateLimitError, AnthropicRateLimitError) as exc:
        raise self.retry(exc=exc, countdown=(2 ** self.request.retries) * 5)
    except (OpenAIAPIError, AnthropicAPIError) as exc:
        raise self.retry(exc=exc, countdown=5)


async def _analisar_lote_piper(
    ato_ids: list[str], rodada_id_str: str, tenant_id_str: str
) -> dict:
    rodada_id = uuid.UUID(rodada_id_str)
    tenant_id = uuid.UUID(tenant_id_str)

    async with async_session_factory() as db:
        system_prompt = await montar_system_prompt(db, tenant_id)

        results = {"ok": 0, "erro": 0, "pulados": 0, "cancelado": False}
        for ato_id_str in ato_ids:
            if not await _rodada_esta_ativa(db, rodada_id):
                results["cancelado"] = True
                break

            ato_id = uuid.UUID(ato_id_str)
            try:
                await analisar_ato_piper(db, ato_id, rodada_id, system_prompt)

                analise_result = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
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

            except (OpenAIRateLimitError, AnthropicRateLimitError, OpenAIAPIError, AnthropicAPIError):
                raise
            except Exception:
                results["erro"] += 1
                continue

        return results


@celery_app.task(bind=True, max_retries=3, queue="analise", name="analise.bud_criticos")
def analisar_criticos_bud_task(self, rodada_id: str, tenant_id: str) -> dict:
    try:
        return asyncio.run(_analisar_criticos_bud(rodada_id, tenant_id))
    except (AnthropicRateLimitError,) as exc:
        raise self.retry(exc=exc, countdown=(2 ** self.request.retries) * 10)
    except (AnthropicAPIError,) as exc:
        raise self.retry(exc=exc, countdown=5)


async def _analisar_criticos_bud(rodada_id_str: str, tenant_id_str: str) -> dict:
    rodada_id = uuid.UUID(rodada_id_str)
    tenant_id = uuid.UUID(tenant_id_str)

    async with async_session_factory() as db:
        if not await _rodada_esta_ativa(db, rodada_id):
            return {"ok": 0, "motivo": "rodada_cancelada"}

        criticos_result = await db.execute(
            select(Analise).where(
                Analise.rodada_id == rodada_id,
                Analise.nivel_alerta.in_(["vermelho", "laranja"]),
                Analise.analisado_por_bud == False,
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
                await analisar_ato_bud(db, analise.ato_id, rodada_id, system_prompt)
                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == rodada_id)
                    .values(atos_analisados_sonnet=RodadaAnalise.atos_analisados_sonnet + 1)
                )
                await db.commit()
                results["ok"] += 1
            except (AnthropicRateLimitError, AnthropicAPIError):
                raise
            except Exception:
                results["erro"] += 1
                continue

        return results
