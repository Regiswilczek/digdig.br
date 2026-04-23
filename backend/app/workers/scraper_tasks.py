import uuid
import asyncio
from sqlalchemy import select, update
from app.workers.celery_app import celery_app
from app.database import async_session_factory
from app.models.ato import Ato, ConteudoAto, RodadaAnalise
from app.services.pdf_service import download_pdf, extract_text_pdfplumber, estimate_tokens


@celery_app.task(bind=True, max_retries=3, queue="scraper", name="scraper.scrape_ato")
def scrape_ato_task(self, ato_id: str, rodada_id: str) -> dict:
    try:
        return asyncio.run(_scrape_ato(ato_id, rodada_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=(2 ** self.request.retries) * 5)


async def _scrape_ato(ato_id_str: str, rodada_id_str: str) -> dict:
    ato_id = uuid.UUID(ato_id_str)
    rodada_id = uuid.UUID(rodada_id_str)

    async with async_session_factory() as db:
        result = await db.execute(select(Ato).where(Ato.id == ato_id))
        ato = result.scalar_one_or_none()
        if not ato:
            return {"status": "erro", "motivo": "ato_nao_encontrado"}

        if not ato.url_pdf:
            await db.execute(
                update(Ato).where(Ato.id == ato_id).values(erro_download="sem_url_pdf")
            )
            await db.commit()
            return {"status": "erro", "motivo": "sem_url"}

        # Check if already extracted
        conteudo_result = await db.execute(
            select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
        )
        if conteudo_result.scalar_one_or_none():
            return {"status": "existente", "ato_id": ato_id_str}

        try:
            pdf_bytes = await download_pdf(ato.url_pdf)
            text, pages = extract_text_pdfplumber(pdf_bytes)

            if not text:
                await db.execute(
                    update(Ato).where(Ato.id == ato_id).values(erro_download="texto_vazio")
                )
                await db.commit()
                return {"status": "erro", "motivo": "texto_vazio"}

            conteudo = ConteudoAto(
                ato_id=ato_id,
                texto_completo=text,
                metodo_extracao="pdfplumber",
                qualidade="boa",
                tokens_estimados=estimate_tokens(text),
            )
            db.add(conteudo)

            await db.execute(
                update(Ato).where(Ato.id == ato_id).values(
                    pdf_baixado=True,
                    pdf_paginas=pages,
                    pdf_tamanho_bytes=len(pdf_bytes),
                )
            )

            await db.execute(
                update(RodadaAnalise).where(RodadaAnalise.id == rodada_id).values(
                    atos_scrapeados=RodadaAnalise.atos_scrapeados + 1
                )
            )

            await db.commit()
            return {"status": "ok", "ato_id": ato_id_str, "pages": pages}

        except Exception as exc:
            await db.execute(
                update(Ato).where(Ato.id == ato_id).values(erro_download=str(exc)[:500])
            )
            await db.commit()
            raise


async def scrape_lote_async(ato_ids: list[str], rodada_id: str) -> dict:
    """Direct async version — used by orquestrador to avoid nested asyncio.run()."""
    results = {"ok": 0, "erro": 0, "existente": 0}
    for ato_id in ato_ids:
        try:
            result = await _scrape_ato(ato_id, rodada_id)
            status = result.get("status", "erro")
            results[status] = results.get(status, 0) + 1
        except Exception:
            results["erro"] += 1
    return results


@celery_app.task(queue="scraper", name="scraper.scrape_lote")
def scrape_lote_task(ato_ids: list[str], rodada_id: str) -> dict:
    return asyncio.run(scrape_lote_async(ato_ids, rodada_id))
