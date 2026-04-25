from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from app.database import get_db
from app.models.tenant import Tenant
from app.models.ato import Ato
from app.models.analise import Analise

router = APIRouter(prefix="/public", tags=["public"])

NIVEIS_ORDEM = ["vermelho", "laranja", "amarelo", "verde"]


@router.get("/orgaos/{slug}/stats")
async def get_stats(slug: str, db: AsyncSession = Depends(get_db)):
    tenant_r = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = tenant_r.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Órgão não encontrado")

    # Totais por tipo
    tipos_r = await db.execute(
        select(Ato.tipo, func.count().label("total"))
        .where(Ato.tenant_id == tenant.id)
        .group_by(Ato.tipo)
    )
    por_tipo_total = {r.tipo: r.total for r in tipos_r}

    # Processados por tipo
    proc_r = await db.execute(
        select(Ato.tipo, func.count().label("total"))
        .where(Ato.tenant_id == tenant.id, Ato.processado == True)
        .group_by(Ato.tipo)
    )
    por_tipo_proc = {r.tipo: r.total for r in proc_r}

    # Distribuição por nível de alerta — apenas a analise mais recente por ato
    latest_subq = (
        select(Analise.ato_id, func.max(Analise.criado_em).label("max_dt"))
        .where(Analise.tenant_id == tenant.id)
        .group_by(Analise.ato_id)
        .subquery()
    )
    dist_r = await db.execute(
        select(Analise.nivel_alerta, func.count().label("total"))
        .join(latest_subq, and_(
            Analise.ato_id == latest_subq.c.ato_id,
            Analise.criado_em == latest_subq.c.max_dt,
        ))
        .where(Analise.tenant_id == tenant.id, Analise.nivel_alerta.isnot(None))
        .group_by(Analise.nivel_alerta)
    )
    distribuicao = {r.nivel_alerta: r.total for r in dist_r}

    total_atos = sum(por_tipo_total.values())
    total_analisados = sum(por_tipo_proc.values())
    total_criticos = distribuicao.get("vermelho", 0) + distribuicao.get("laranja", 0)

    return {
        "tenant": {"slug": tenant.slug, "nome": tenant.nome},
        "total_atos": total_atos,
        "total_analisados": total_analisados,
        "total_criticos": total_criticos,
        "distribuicao": {
            "verde": distribuicao.get("verde", 0),
            "amarelo": distribuicao.get("amarelo", 0),
            "laranja": distribuicao.get("laranja", 0),
            "vermelho": distribuicao.get("vermelho", 0),
        },
        "por_tipo": {
            "portaria": {
                "total": por_tipo_total.get("portaria", 0),
                "analisados": por_tipo_proc.get("portaria", 0),
            },
            "deliberacao": {
                "total": por_tipo_total.get("deliberacao", 0),
                "analisados": por_tipo_proc.get("deliberacao", 0),
            },
        },
    }


@router.get("/orgaos/{slug}/atos")
async def get_atos(
    slug: str,
    tipo: str | None = Query(default=None),
    nivel: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=100),
    db: AsyncSession = Depends(get_db),
):
    tenant_r = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = tenant_r.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Órgão não encontrado")

    # Base query: join atos com analises (só atos processados)
    filters = [
        Ato.tenant_id == tenant.id,
        Ato.processado == True,
    ]
    if tipo in ("portaria", "deliberacao"):
        filters.append(Ato.tipo == tipo)

    # Subquery para pegar a analise mais recente por ato
    subq = (
        select(
            Analise.ato_id,
            func.max(Analise.criado_em).label("max_dt"),
        )
        .where(Analise.tenant_id == tenant.id)
        .group_by(Analise.ato_id)
        .subquery()
    )

    q = (
        select(
            Ato.id,
            Ato.numero,
            Ato.tipo,
            Ato.titulo,
            Ato.ementa,
            Ato.data_publicacao,
            Analise.nivel_alerta,
            Analise.score_risco,
        )
        .join(subq, Ato.id == subq.c.ato_id)
        .join(
            Analise,
            and_(
                Analise.ato_id == Ato.id,
                Analise.criado_em == subq.c.max_dt,
            ),
        )
        .where(*filters)
    )

    if nivel in ("verde", "amarelo", "laranja", "vermelho"):
        q = q.where(Analise.nivel_alerta == nivel)

    # Ordenar: vermelhos primeiro, depois laranja, amarelo, verde; depois por data desc
    nivel_order = case(
        (Analise.nivel_alerta == "vermelho", 1),
        (Analise.nivel_alerta == "laranja", 2),
        (Analise.nivel_alerta == "amarelo", 3),
        (Analise.nivel_alerta == "verde", 4),
        else_=5,
    )
    q = q.order_by(nivel_order.asc(), Ato.data_publicacao.desc().nullslast())

    # Contagem total
    count_q = select(func.count()).select_from(q.subquery())
    total_r = await db.execute(count_q)
    total = total_r.scalar_one()

    # Paginar
    offset = (page - 1) * limit
    rows_r = await db.execute(q.offset(offset).limit(limit))
    rows = rows_r.all()

    return {
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "limit": limit,
        "atos": [
            {
                "id": str(r.id),
                "numero": r.numero,
                "tipo": r.tipo,
                "titulo": r.titulo,
                "ementa": r.ementa,
                "data_publicacao": r.data_publicacao.isoformat() if r.data_publicacao else None,
                "nivel_alerta": r.nivel_alerta,
                "score_risco": r.score_risco,
            }
            for r in rows
        ],
    }
