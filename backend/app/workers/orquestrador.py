import uuid
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, update
from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.ato import Ato, RodadaAnalise
from app.models.tenant import Tenant
from app.services.importador import importar_atos_cau_pr
from app.workers.scraper_tasks import scrape_lote_async
from app.workers.analise_tasks import _analisar_lote_haiku, _analisar_criticos_sonnet

LOTE_SIZE = 50


@celery_app.task(queue="analise", name="orquestrador.iniciar_rodada")
def iniciar_rodada_task(rodada_id: str, tenant_slug: str) -> dict:
    return asyncio.run(_iniciar_rodada(rodada_id, tenant_slug))


async def _iniciar_rodada(rodada_id_str: str, tenant_slug: str) -> dict:
    rodada_id = uuid.UUID(rodada_id_str)

    async with async_session_factory() as db:
        await db.execute(
            update(RodadaAnalise)
            .where(RodadaAnalise.id == rodada_id)
            .values(status="em_progresso", iniciado_em=datetime.now(timezone.utc))
        )
        await db.commit()

        try:
            # Step 1: Import acts from JSONs (CAU/PR only for now)
            if tenant_slug == "cau-pr":
                import_result = await importar_atos_cau_pr(db)
            else:
                import_result = {"importados": 0, "existentes": 0}

            # Step 2: Get all acts without extracted text
            tenant_result = await db.execute(
                select(Tenant).where(Tenant.slug == tenant_slug)
            )
            tenant = tenant_result.scalar_one()

            atos_result = await db.execute(
                select(Ato).where(
                    Ato.tenant_id == tenant.id,
                    Ato.pdf_baixado == False,
                    Ato.url_pdf != None,
                ).limit(500)
            )
            atos_para_scrape = atos_result.scalars().all()
            ato_ids = [str(a.id) for a in atos_para_scrape]

            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == rodada_id)
                .values(total_atos=len(ato_ids))
            )
            await db.commit()

            # Step 3: Scrape PDFs in batches (direct async — no nested asyncio.run)
            for i in range(0, len(ato_ids), LOTE_SIZE):
                lote = ato_ids[i:i + LOTE_SIZE]
                await scrape_lote_async(lote, rodada_id_str)

            # Step 4: Haiku analysis — all acts with text
            atos_com_texto_result = await db.execute(
                select(Ato).where(
                    Ato.tenant_id == tenant.id,
                    Ato.pdf_baixado == True,
                    Ato.processado == False,
                ).limit(1000)
            )
            atos_com_texto = atos_com_texto_result.scalars().all()
            ids_para_haiku = [str(a.id) for a in atos_com_texto]

            for i in range(0, len(ids_para_haiku), LOTE_SIZE):
                lote = ids_para_haiku[i:i + LOTE_SIZE]
                await _analisar_lote_haiku(lote, rodada_id_str, str(tenant.id))

            # Step 5: Sonnet on critical acts
            await _analisar_criticos_sonnet(rodada_id_str, str(tenant.id))

            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == rodada_id)
                .values(
                    status="concluida",
                    concluido_em=datetime.now(timezone.utc),
                )
            )
            await db.commit()

            return {
                "status": "concluida",
                "importados": import_result.get("importados", 0),
                "scrapeados": len(ato_ids),
                "haiku": len(ids_para_haiku),
            }

        except Exception as exc:
            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == rodada_id)
                .values(status="erro", erro_mensagem=str(exc)[:1000])
            )
            await db.commit()
            raise
