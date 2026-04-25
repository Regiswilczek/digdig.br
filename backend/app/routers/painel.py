from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case, extract
from app.database import get_db
from app.models.tenant import Tenant
from app.models.ato import Ato, RodadaAnalise
from app.models.analise import Analise
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/painel", tags=["painel"])


async def _get_tenant(slug: str, db: AsyncSession) -> Tenant:
    r = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = r.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Órgão não encontrado")
    return tenant


def _latest_analise_subq(tenant_id):
    return (
        select(Analise.ato_id, func.max(Analise.criado_em).label("max_dt"))
        .where(Analise.tenant_id == tenant_id)
        .group_by(Analise.ato_id)
        .subquery()
    )


@router.get("/orgaos/{slug}/atos")
async def list_atos(
    slug: str,
    tipo: str | None = Query(None),
    nivel: str | None = Query(None),
    ano: int | None = Query(None),
    busca: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tenant = await _get_tenant(slug, db)
    latest_subq = _latest_analise_subq(tenant.id)

    q = (
        select(Ato, Analise)
        .outerjoin(latest_subq, Ato.id == latest_subq.c.ato_id)
        .outerjoin(
            Analise,
            and_(
                Analise.ato_id == Ato.id,
                Analise.criado_em == latest_subq.c.max_dt,
            ),
        )
        .where(Ato.tenant_id == tenant.id)
    )

    if tipo:
        q = q.where(Ato.tipo == tipo)
    if nivel:
        q = q.where(Analise.nivel_alerta == nivel)
    if ano:
        q = q.where(extract("year", Ato.data_publicacao) == ano)
    if busca:
        busca_like = f"%{busca}%"
        q = q.where(
            or_(Ato.numero.ilike(busca_like), Ato.ementa.ilike(busca_like))
        )

    count_q = select(func.count()).select_from(q.subquery())
    total_r = await db.execute(count_q)
    total = total_r.scalar_one()

    nivel_case = case(
        (Analise.nivel_alerta == "vermelho", 0),
        (Analise.nivel_alerta == "laranja", 1),
        (Analise.nivel_alerta == "amarelo", 2),
        (Analise.nivel_alerta == "verde", 3),
        else_=4,
    )
    q = q.order_by(nivel_case, Analise.score_risco.desc().nulls_last())
    q = q.offset((page - 1) * limit).limit(limit)

    rows = await db.execute(q)
    atos = []
    for ato, analise in rows:
        atos.append(
            {
                "id": str(ato.id),
                "numero": ato.numero,
                "tipo": ato.tipo,
                "titulo": ato.titulo,
                "ementa": ato.ementa,
                "data_publicacao": (
                    ato.data_publicacao.isoformat() if ato.data_publicacao else None
                ),
                "url_pdf": ato.url_pdf,
                "url_original": ato.url_original,
                "nivel_alerta": analise.nivel_alerta if analise else None,
                "score_risco": analise.score_risco if analise else 0,
                "resumo_executivo": analise.resumo_executivo if analise else None,
                "resultado_sonnet": None,
                "recomendacao_campanha": None,
            }
        )

    return {
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "limit": limit,
        "atos": atos,
    }


@router.get("/orgaos/{slug}/atos/{ato_id}")
async def get_ato(
    slug: str,
    ato_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tenant = await _get_tenant(slug, db)
    latest_subq = _latest_analise_subq(tenant.id)

    r = await db.execute(
        select(Ato, Analise)
        .outerjoin(latest_subq, Ato.id == latest_subq.c.ato_id)
        .outerjoin(
            Analise,
            and_(
                Analise.ato_id == Ato.id,
                Analise.criado_em == latest_subq.c.max_dt,
            ),
        )
        .where(Ato.tenant_id == tenant.id, Ato.id == ato_id)
    )
    row = r.first()
    if not row:
        raise HTTPException(status_code=404, detail="Ato não encontrado")

    ato, analise = row

    return {
        "id": str(ato.id),
        "numero": ato.numero,
        "tipo": ato.tipo,
        "titulo": ato.titulo,
        "ementa": ato.ementa,
        "data_publicacao": (
            ato.data_publicacao.isoformat() if ato.data_publicacao else None
        ),
        "url_pdf": ato.url_pdf,
        "url_original": ato.url_original,
        "nivel_alerta": analise.nivel_alerta if analise else None,
        "score_risco": analise.score_risco if analise else 0,
        "resumo_executivo": analise.resumo_executivo if analise else None,
        "resultado_haiku": analise.resultado_haiku if analise else None,
        "resultado_sonnet": analise.resultado_sonnet if analise else None,
        "recomendacao_campanha": analise.recomendacao_campanha if analise else None,
    }


@router.get("/orgaos/{slug}/stats")
async def get_stats(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from app.routers.public import get_stats as public_get_stats
    return await public_get_stats(slug=slug, db=db)


@router.get("/orgaos/{slug}/rodadas")
async def get_rodada_ativa(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tenant = await _get_tenant(slug, db)

    r = await db.execute(
        select(RodadaAnalise)
        .where(
            RodadaAnalise.tenant_id == tenant.id,
            RodadaAnalise.status.in_(["em_progresso", "pendente"]),
        )
        .order_by(RodadaAnalise.criado_em.desc())
        .limit(1)
    )
    rodada = r.scalar_one_or_none()

    if not rodada:
        return {"rodada_ativa": None}

    return {
        "rodada_ativa": {
            "id": str(rodada.id),
            "status": rodada.status,
            "total_atos": rodada.total_atos,
            "atos_analisados_haiku": rodada.atos_analisados_haiku,
            "atos_analisados_sonnet": rodada.atos_analisados_sonnet,
            "custo_total_usd": float(rodada.custo_total_usd),
            "iniciado_em": (
                rodada.iniciado_em.isoformat() if rodada.iniciado_em else None
            ),
        }
    }
