import uuid
import asyncio
from decimal import Decimal
from anthropic import RateLimitError as AnthropicRateLimitError, APIError as AnthropicAPIError
from openai import RateLimitError as OpenAIRateLimitError, APIError as OpenAIAPIError
from sqlalchemy import select, update, func
from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.ato import Ato, ConteudoAto, RodadaAnalise
from app.models.analise import Analise
from app.models.tenant import Tenant
from app.services.piper_service import (
    analisar_ato_piper,
    analisar_ato_piper_visao,
    montar_system_prompt,
)
from app.services.bud_service import analisar_ato_bud

import httpx

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


_HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.caupr.gov.br/",
    "Accept": "application/pdf,*/*",
}


async def _baixar_pdf(url: str, timeout: float = 90.0) -> bytes:
    async with httpx.AsyncClient(headers=_HTTP_HEADERS, follow_redirects=True, timeout=timeout) as http:
        resp = await http.get(url)
        resp.raise_for_status()
        return resp.content


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
                # Decide entre Piper texto e Piper visão a partir da qualidade
                # do conteudo_ato. Atos sem texto ou só com PDF entram pela visão.
                conteudo_r = await db.execute(
                    select(ConteudoAto.qualidade, Ato.url_pdf)
                    .join(Ato, Ato.id == ConteudoAto.ato_id, isouter=True)
                    .where(ConteudoAto.ato_id == ato_id)
                )
                conteudo_row = conteudo_r.first()
                qualidade = conteudo_row[0] if conteudo_row else None
                url_pdf = conteudo_row[1] if conteudo_row else None

                if qualidade == "ruim" and url_pdf:
                    # PDF escaneado sem texto — usa visão
                    pdf_bytes = await _baixar_pdf(url_pdf)
                    await analisar_ato_piper_visao(
                        db, ato_id, rodada_id, system_prompt, pdf_bytes
                    )
                else:
                    # qualidade='boa' ou 'parcial' — texto direto
                    await analisar_ato_piper(db, ato_id, rodada_id, system_prompt)

                analise_result = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
                analise = analise_result.scalar_one_or_none()
                custo_ato = analise.custo_usd if analise else Decimal("0")

                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == rodada_id)
                    .values(
                        atos_analisados_piper=RodadaAnalise.atos_analisados_piper + 1,
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
                await db.rollback()
                continue

        # Marca rodada como concluída quando lista termina sem cancelamento
        if not results.get("cancelado"):
            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == rodada_id)
                .values(status="concluida", concluido_em=func.now())
            )
            await db.commit()

        return results


@celery_app.task(bind=True, max_retries=3, queue="analise", name="analise.bud_criticos")
def analisar_criticos_bud_task(self, rodada_id: str, tenant_id: str) -> dict:
    try:
        return asyncio.run(_analisar_criticos_bud(rodada_id, tenant_id))
    except (AnthropicRateLimitError,) as exc:
        raise self.retry(exc=exc, countdown=(2 ** self.request.retries) * 10)
    except (AnthropicAPIError,) as exc:
        raise self.retry(exc=exc, countdown=5)


@celery_app.task(bind=True, max_retries=3, queue="analise", name="analise.bud_lote")
def analisar_lote_bud_task(
    self, ato_ids: list[str], rodada_id: str, tenant_id: str
) -> dict:
    """
    Roda Bud em uma lista específica de ato_ids (disparado pelo painel admin).
    Cada ato é processado usando a rodada_id ORIGINAL da analise existente
    (porque analisar_ato_bud filtra por (ato_id, rodada_id) na hora de buscar).
    A rodada nova passada é usada apenas para contabilizar progresso e custo.
    """
    try:
        return asyncio.run(_analisar_lote_bud(ato_ids, rodada_id, tenant_id))
    except (AnthropicRateLimitError,) as exc:
        raise self.retry(exc=exc, countdown=(2 ** self.request.retries) * 10)
    except (AnthropicAPIError,) as exc:
        raise self.retry(exc=exc, countdown=5)


async def _analisar_lote_bud(
    ato_ids: list[str], rodada_nova_str: str, tenant_id_str: str
) -> dict:
    rodada_nova = uuid.UUID(rodada_nova_str)
    tenant_id = uuid.UUID(tenant_id_str)

    async with async_session_factory() as db:
        system_prompt = await montar_system_prompt(db, tenant_id)
        results = {"ok": 0, "erro": 0, "cancelado": False}

        for ato_id_str in ato_ids:
            if not await _rodada_esta_ativa(db, rodada_nova):
                results["cancelado"] = True
                break
            ato_id = uuid.UUID(ato_id_str)

            # Pega rodada_id ORIGINAL da analise existente do ato.
            r = await db.execute(
                select(Analise.id, Analise.rodada_id)
                .where(
                    Analise.ato_id == ato_id,
                    Analise.resultado_piper.isnot(None),
                    Analise.resultado_bud.is_(None),
                )
                .order_by(Analise.criado_em.desc())
                .limit(1)
            )
            row = r.first()
            if not row:
                results["erro"] += 1
                continue
            rodada_original = row[1]
            if rodada_original is None:
                results["erro"] += 1
                continue

            try:
                analise = await analisar_ato_bud(db, ato_id, rodada_original, system_prompt)
                custo_ato = analise.custo_usd or Decimal("0")
                # Contabiliza progresso na rodada NOVA (de teste/disparo)
                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == rodada_nova)
                    .values(
                        atos_analisados_bud=RodadaAnalise.atos_analisados_bud + 1,
                        custo_total_usd=func.coalesce(RodadaAnalise.custo_total_usd, 0) + custo_ato,
                    )
                )
                await db.commit()
                results["ok"] += 1

                # Cap de custo
                rodada_r = await db.execute(
                    select(RodadaAnalise.custo_total_usd).where(RodadaAnalise.id == rodada_nova)
                )
                custo_acum = rodada_r.scalar_one_or_none() or Decimal("0")
                if custo_acum > CUSTO_LIMITE_USD:
                    await db.execute(
                        update(RodadaAnalise)
                        .where(RodadaAnalise.id == rodada_nova)
                        .values(
                            status="cancelada",
                            erro_mensagem=f"Limite de custo atingido: USD {custo_acum}",
                        )
                    )
                    await db.commit()
                    results["cancelado"] = True
                    break
            except (AnthropicRateLimitError, AnthropicAPIError):
                raise
            except Exception:
                results["erro"] += 1
                await db.rollback()
                continue

        # Marca rodada como concluída no fim
        if not results.get("cancelado"):
            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == rodada_nova)
                .values(status="concluida", concluido_em=func.now())
            )
            await db.commit()

        return results


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
                    .values(atos_analisados_bud=RodadaAnalise.atos_analisados_bud + 1)
                )
                await db.commit()
                results["ok"] += 1
            except (AnthropicRateLimitError, AnthropicAPIError):
                raise
            except Exception:
                results["erro"] += 1
                continue

        return results
