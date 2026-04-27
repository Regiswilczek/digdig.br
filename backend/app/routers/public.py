from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case, cast, Date as SADate
from app.database import get_db
from app.models.tenant import Tenant
from app.models.ato import Ato
from app.models.analise import Analise
from app.models.dados_financeiros import Diaria

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

    # Atos com pelo menos uma análise, por tipo (source of truth para todos os tipos)
    analise_subq = (
        select(Ato.tipo, func.count(Analise.ato_id.distinct()).label("com_analise"))
        .join(Analise, Analise.ato_id == Ato.id)
        .where(Ato.tenant_id == tenant.id)
        .group_by(Ato.tipo)
        .subquery()
    )
    analise_count_r = await db.execute(select(analise_subq))
    por_tipo_analise = {r.tipo: r.com_analise for r in analise_count_r.all()}

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
    total_analisados = sum(por_tipo_analise.values())
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
            tipo: {
                "total": total,
                "analisados": por_tipo_analise.get(tipo, 0),
            }
            for tipo, total in sorted(por_tipo_total.items(), key=lambda x: -x[1])
        },
    }


@router.get("/orgaos/{slug}/analises-recentes")
async def analises_recentes(slug: str, db: AsyncSession = Depends(get_db)):
    tenant_r = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = tenant_r.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Órgão não encontrado")

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    rows_r = await db.execute(
        select(
            Analise.id,
            Analise.ato_id,
            Analise.nivel_alerta,
            Analise.score_risco,
            Analise.criado_em,
            Ato.numero,
            Ato.tipo,
        )
        .join(Ato, Analise.ato_id == Ato.id)
        .where(
            Analise.tenant_id == tenant.id,
            Analise.criado_em >= since,
        )
        .order_by(Analise.criado_em.desc())
        .limit(1000)
    )
    rows = rows_r.all()

    return {
        "analises": [
            {
                "id": str(r.id),
                "ato_id": str(r.ato_id),
                "nivel_alerta": r.nivel_alerta,
                "score_risco": r.score_risco,
                "criado_em": r.criado_em.isoformat() if r.criado_em else None,
                "numero": r.numero,
                "tipo": r.tipo,
            }
            for r in rows
        ],
    }


@router.get("/orgaos/{slug}/atividade")
async def atividade_recente(slug: str, db: AsyncSession = Depends(get_db)):
    """
    Feed unificado de atividade: documentos que entraram no sistema (scraper)
    e/ou foram analisados nas últimas 24h, em ordem cronológica decrescente.
    Status possíveis: 'entrando' (sem análise) | 'analisado'
    """
    tenant_r = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = tenant_r.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Órgão não encontrado")

    # Analisados: últimas 24h. Entrando (scraper): últimas 4h para evitar flood de lotes antigos.
    since_analisado = datetime.now(timezone.utc) - timedelta(hours=24)
    since_entrando = datetime.now(timezone.utc) - timedelta(hours=4)

    # Última análise por ato (subquery lateral)
    latest_analise = (
        select(
            Analise.ato_id,
            func.max(Analise.criado_em).label("analisado_em"),
        )
        .where(Analise.tenant_id == tenant.id)
        .group_by(Analise.ato_id)
        .subquery()
    )
    nivel_subq = (
        select(
            Analise.ato_id,
            Analise.nivel_alerta,
            Analise.criado_em.label("analisado_em"),
        )
        .join(latest_analise, and_(
            Analise.ato_id == latest_analise.c.ato_id,
            Analise.criado_em == latest_analise.c.analisado_em,
        ))
        .where(Analise.tenant_id == tenant.id)
        .subquery()
    )

    atos_r = await db.execute(
        select(
            Ato.id.label("item_id"),
            Ato.numero.label("numero"),
            Ato.tipo.label("tipo"),
            Ato.criado_em.label("criado_em"),
            nivel_subq.c.nivel_alerta,
            nivel_subq.c.analisado_em,
        )
        .outerjoin(nivel_subq, nivel_subq.c.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tenant.id,
            or_(
                and_(nivel_subq.c.analisado_em.isnot(None), nivel_subq.c.analisado_em >= since_analisado),
                and_(nivel_subq.c.analisado_em.is_(None), Ato.criado_em >= since_entrando),
            ),
        )
    )
    atos_rows = atos_r.all()

    # Diárias inseridas nas últimas 4h
    diarias_r = await db.execute(
        select(
            Diaria.id.label("item_id"),
            Diaria.codigo_processo.label("numero"),
            Diaria.nome_passageiro.label("tipo"),
            Diaria.criado_em.label("criado_em"),
        )
        .where(
            Diaria.tenant_id == tenant.id,
            Diaria.criado_em >= since_entrando,
        )
    )
    diarias_rows = diarias_r.all()

    atos_items = [
        {
            "ato_id":       str(r.item_id),
            "numero":       r.numero,
            "tipo":         r.tipo,
            "criado_em":    r.criado_em.isoformat() if r.criado_em else None,
            "analisado_em": r.analisado_em.isoformat() if r.analisado_em else None,
            "nivel_alerta": r.nivel_alerta,
            "status":       "analisado" if r.nivel_alerta else "entrando",
            "origem":       "ato",
        }
        for r in atos_rows
    ]

    diarias_items = [
        {
            "ato_id":       str(r.item_id),
            "numero":       r.numero,
            "tipo":         "diaria",
            "criado_em":    r.criado_em.isoformat() if r.criado_em else None,
            "analisado_em": None,
            "nivel_alerta": None,
            "status":       "entrando",
            "origem":       "financeiro",
            "descricao":    r.tipo,  # nome_passageiro
        }
        for r in diarias_rows
    ]

    todos = sorted(
        atos_items + diarias_items,
        key=lambda x: x["criado_em"] or "",
        reverse=True,
    )[:60]

    return {"atividade": todos}


@router.get("/orgaos/{slug}/crescimento")
async def get_crescimento(slug: str, db: AsyncSession = Depends(get_db)):
    """Série temporal cumulativa de documentos inseridos no banco por dia."""
    tenant_r = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = tenant_r.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Órgão não encontrado")

    rows_r = await db.execute(
        select(
            cast(Ato.criado_em, SADate).label("dia"),
            func.count().label("novos"),
        )
        .where(Ato.tenant_id == tenant.id, Ato.criado_em.isnot(None))
        .group_by(cast(Ato.criado_em, SADate))
        .order_by(cast(Ato.criado_em, SADate))
    )
    rows = rows_r.all()

    pontos = []
    acumulado = 0
    for r in rows:
        acumulado += r.novos
        pontos.append({"dia": r.dia.isoformat(), "total": acumulado})

    # Marcos: primeiro dia de inserção por tipo
    TIPO_LABELS = {
        "portaria": "Portarias",
        "deliberacao": "Deliberações",
        "ata_plenaria": "Atas Plenárias",
        "portaria_normativa": "Port. Normativas",
        "dispensa_eletronica": "Disp. Eletrônica",
        "contratacao_direta": "Cont. Diretas",
        "contrato": "Contratos",
        "convenio": "Convênios",
        "relatorio_tcu": "Rel. TCU",
        "relatorio_parecer": "Rel. e Pareceres",
        "auditoria_independente": "Auditorias",
        "licitacao": "Licitações",
        "ata_registro_preco": "Ata Reg. Preço",
    }
    tipos_r = await db.execute(
        select(
            Ato.tipo,
            func.min(Ato.criado_em).label("primeiro_dt"),
            func.count().label("total"),
        )
        .where(Ato.tenant_id == tenant.id, Ato.criado_em.isnot(None))
        .group_by(Ato.tipo)
        .order_by(func.min(Ato.criado_em))
    )
    tipos_rows = tipos_r.all()

    cum_by_date = {p["dia"]: p["total"] for p in pontos}
    all_dias = sorted(cum_by_date.keys())

    def cum_at_or_before_dia(dia_str: str) -> int:
        result = 0
        for d in all_dias:
            if d <= dia_str:
                result = cum_by_date[d]
            else:
                break
        return result

    def dt_to_str(dt) -> str:
        s = dt.isoformat()
        # strip timezone suffix for consistent JS parsing
        return s[:19] if len(s) > 19 else s

    marcos = [
        {
            "tipo": r.tipo,
            "label": TIPO_LABELS.get(r.tipo, r.tipo),
            "primeiro_dia": dt_to_str(r.primeiro_dt)[:10],
            "primeiro_dt": dt_to_str(r.primeiro_dt),
            "total_acumulado": cum_at_or_before_dia(dt_to_str(r.primeiro_dt)[:10]),
            "total_tipo": r.total,
        }
        for r in tipos_rows
        if r.primeiro_dt is not None
    ]

    return {
        "pontos": pontos,
        "inicio": pontos[0]["dia"] if pontos else None,
        "total_atual": acumulado,
        "marcos": marcos,
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

    # Base query: join atos com analises (inner join já filtra só os com análise)
    # Para atas plenárias, processado é gerenciado pelo Sonnet runner — não filtrar por processado
    filters = [Ato.tenant_id == tenant.id]
    if tipo == "ata_plenaria":
        filters.append(Ato.tipo == "ata_plenaria")
    else:
        filters.append(Ato.processado == True)
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
