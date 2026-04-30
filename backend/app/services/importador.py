import json
import logging
import uuid
from datetime import datetime, date
from pathlib import Path
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.ato import Ato
from app.models.tenant import Tenant

logger = logging.getLogger(__name__)

# importador.py lives at backend/app/services/ → project root is 4 levels up
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
PORTARIAS_JSON = _PROJECT_ROOT / "extracted" / "agente_auditoria_caupr" / "portarias_completo.json"
DELIBERACOES_JSON = _PROJECT_ROOT / "extracted" / "agente_auditoria_caupr" / "deliberacoes_completo.json"

logger.info("importador_paths", extra={
    "project_root": str(_PROJECT_ROOT),
    "portarias_exists": PORTARIAS_JSON.exists(),
    "deliberacoes_exists": DELIBERACOES_JSON.exists(),
})


def parse_data_publicacao(data_str: Optional[str]) -> Optional[date]:
    if not data_str:
        return None
    try:
        return datetime.strptime(data_str.strip(), "%d/%m/%Y").date()
    except (ValueError, AttributeError):
        return None


def normalizar_tipo(fonte_tipo: str, subtipo: Optional[str]) -> str:
    return fonte_tipo.lower().strip()


async def importar_atos(db: AsyncSession, tenant_slug: str) -> dict:
    """
    Dispatcher genérico de importação de atos por tenant.

    Olha `tenant.scraper_config["fonte_principal"]` (ou cai no slug) pra
    decidir qual implementação usar. Hoje só CAU/PR tem implementação ativa
    (`_importar_atos_caupr_legacy`); GOV-PR e outros virão na Fase 1+.

    Tenants sem fonte conhecida retornam `{"importados": 0, "existentes": 0}`
    (não falha — só não importa nada). O orquestrador segue pro Piper
    com os atos que já estão no banco via outros caminhos (scrape direto).
    """
    if tenant_slug == "cau-pr":
        return await _importar_atos_caupr_legacy(db)
    # Fallback no-op: outros tenants não têm fonte de import legacy.
    # Atos chegam pelos scrapers locais que já gravam direto no banco.
    return {"importados": 0, "existentes": 0}


async def _importar_atos_caupr_legacy(db: AsyncSession) -> dict:
    """Importação legada do CAU/PR — lê os JSONs em extracted/."""
    result = await db.execute(select(Tenant).where(Tenant.slug == "cau-pr"))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise ValueError("Tenant 'cau-pr' not found in database. Run seed first.")

    fontes = [
        (PORTARIAS_JSON, "portaria"),
        (DELIBERACOES_JSON, "deliberacao"),
    ]

    total_importados = 0
    total_existentes = 0
    total_erros = 0

    for json_path, tipo in fontes:
        if not json_path.exists():
            continue

        with open(json_path, encoding="utf-8") as f:
            atos_json = json.load(f)

        for item in atos_json:
            try:
                numero = str(item.get("numero", "")).strip()
                if not numero:
                    continue

                existing = await db.execute(
                    select(Ato).where(
                        Ato.tenant_id == tenant.id,
                        Ato.numero == numero,
                        Ato.tipo == tipo,
                    )
                )
                if existing.scalar_one_or_none():
                    total_existentes += 1
                    continue

                links_pdf = item.get("links_pdf") or []
                url_pdf = links_pdf[0] if links_pdf else None

                ato = Ato(
                    id=uuid.uuid4(),
                    tenant_id=tenant.id,
                    numero=numero,
                    tipo=tipo,
                    subtipo=item.get("tipo") or None,
                    titulo=item.get("titulo"),
                    data_publicacao=parse_data_publicacao(item.get("data")),
                    ementa=item.get("ementa"),
                    url_pdf=url_pdf,
                )
                db.add(ato)
                total_importados += 1

            except Exception as exc:
                logger.warning("importacao_item_erro", extra={"item": str(item.get("numero")), "error": str(exc)})
                total_erros += 1
                continue

    await db.commit()
    return {
        "importados": total_importados,
        "existentes": total_existentes,
        "erros": total_erros,
    }
