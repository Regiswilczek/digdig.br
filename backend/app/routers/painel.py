from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case, extract, exists, text
from app.database import get_db
from app.models.tenant import Tenant
from app.models.ato import Ato, ConteudoAto, RodadaAnalise
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
                "resultado_bud": None,
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

    # Tags ativas do ato
    tags_payload: list[dict] = []
    if analise:
        from app.models.tag import AtoTag
        tags_r = await db.execute(
            select(AtoTag)
            .where(AtoTag.ato_id == ato.id, AtoTag.ativa == True)  # noqa: E712
            .order_by(AtoTag.criado_em.asc())
        )
        for t in tags_r.scalars().all():
            tags_payload.append({
                "codigo": t.codigo,
                "nome": t.nome,
                "categoria": t.categoria,
                "categoria_nome": t.categoria_nome,
                "gravidade": t.gravidade,
                "atribuido_por": t.atribuido_por,
                "revisado_por": t.revisado_por,
                "justificativa": t.justificativa,
            })

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
        "resultado_piper": analise.resultado_piper if analise else None,
        "resultado_bud": analise.resultado_bud if analise else None,
        "recomendacao_campanha": analise.recomendacao_campanha if analise else None,
        # Métricas de auditoria (CVSS-A)
        "cvss_score": float(analise.cvss_score) if analise and analise.cvss_score else None,
        "cvss_vector": analise.cvss_vector if analise else None,
        "cvss_fi": analise.cvss_fi if analise else None,
        "cvss_li": analise.cvss_li if analise else None,
        "cvss_ri": analise.cvss_ri if analise else None,
        "cvss_av": analise.cvss_av if analise else None,
        "cvss_ac": analise.cvss_ac if analise else None,
        "cvss_pr": analise.cvss_pr if analise else None,
        # Tags
        "tags": tags_payload,
    }


@router.get("/orgaos/{slug}/stats")
async def get_stats(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from app.routers.public import get_stats as public_get_stats
    return await public_get_stats(slug=slug, db=db)


@router.get("/orgaos/{slug}/pendentes")
async def get_pendentes_extracao(
    slug: str,
    tipo: str | None = Query(None),
    motivo: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Documentos pendentes: sem texto extraído OU com texto mas sem análise de IA."""
    tenant = await _get_tenant(slug, db)

    # Subqueries de existência
    _tem_texto = exists(
        select(ConteudoAto.ato_id).where(
            ConteudoAto.ato_id == Ato.id,
            ConteudoAto.qualidade == "boa",
        )
    )
    _tem_analise = exists(
        select(Analise.ato_id).where(Analise.ato_id == Ato.id)
    )

    cond_sem_texto  = ~_tem_texto
    cond_sem_analise = and_(_tem_texto, ~_tem_analise)
    cond_pendente   = or_(cond_sem_texto, cond_sem_analise)

    # KPIs globais
    r_sem_texto = await db.execute(
        select(func.count()).where(Ato.tenant_id == tenant.id, cond_sem_texto)
    )
    r_sem_analise = await db.execute(
        select(func.count()).where(Ato.tenant_id == tenant.id, cond_sem_analise)
    )
    # Backward-compat: totais das categorias originais
    r_port = await db.execute(
        select(func.count()).where(
            Ato.tenant_id == tenant.id,
            Ato.tipo == "portaria",
            cond_sem_texto,
        )
    )
    r_delib = await db.execute(
        select(func.count()).where(
            Ato.tenant_id == tenant.id,
            Ato.tipo == "deliberacao",
            cond_sem_texto,
        )
    )

    total_sem_texto      = r_sem_texto.scalar_one()
    total_sem_analise    = r_sem_analise.scalar_one()
    total_portaria_escaneada = r_port.scalar_one()
    total_deliberacao_html   = r_delib.scalar_one()

    # Lista paginada
    base_q = (
        select(Ato)
        .where(Ato.tenant_id == tenant.id, cond_pendente)
        .order_by(Ato.data_publicacao.asc().nulls_last())
    )
    if tipo:
        base_q = base_q.where(Ato.tipo == tipo)
    if motivo == "sem_texto":
        base_q = base_q.where(cond_sem_texto)
    elif motivo == "sem_analise":
        base_q = base_q.where(cond_sem_analise)

    total_r = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total = total_r.scalar_one()

    rows = await db.execute(base_q.offset((page - 1) * limit).limit(limit))
    atos = rows.scalars().all()

    def _motivo(ato: Ato) -> str:
        # Resolve no Python após fetch — evita join extra
        return "sem_texto" if ato.pdf_baixado is False or ato.tipo == "deliberacao" else "sem_analise"

    return {
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "total_sem_texto": total_sem_texto,
        "total_sem_analise": total_sem_analise,
        # backward-compat
        "total_portaria_escaneada": total_portaria_escaneada,
        "total_deliberacao_html": total_deliberacao_html,
        "atos": [
            {
                "id": str(ato.id),
                "numero": ato.numero,
                "tipo": ato.tipo,
                "data_publicacao": (
                    ato.data_publicacao.isoformat() if ato.data_publicacao else None
                ),
                "url_pdf": ato.url_pdf,
                "url_original": ato.url_original,
                "motivo": _motivo(ato),
            }
            for ato in atos
        ],
    }


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
            "atos_analisados_piper": rodada.atos_analisados_piper,
            "atos_analisados_bud": rodada.atos_analisados_bud,
            "custo_total_usd": float(rodada.custo_total_usd),
            "iniciado_em": (
                rodada.iniciado_em.isoformat() if rodada.iniciado_em else None
            ),
        }
    }


@router.get("/orgaos/{slug}/pipeline-status")
async def get_pipeline_status(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Status agregado das filas de análise para o painel público.

    Retorna 3 filas (uma por agente) com total e amostra de 10 documentos:
    - aguarda_piper: ato com texto/PDF, sem resultado_piper
    - aguarda_bud: Piper marcou vermelho/laranja, sem resultado_bud
    - aguarda_new: Bud confirmou vermelho, sem resultado_new
    """
    tenant = await _get_tenant(slug, db)
    tid = tenant.id

    def _serialize(rows) -> list[dict]:
        out = []
        for row in rows:
            ato_id, tipo, numero, data = row[0], row[1], row[2], row[3]
            nivel = row[4] if len(row) > 4 else None
            out.append({
                "ato_id": str(ato_id),
                "tipo": tipo,
                "numero": numero or "?",
                "data_publicacao": data.isoformat() if data else None,
                "nivel_alerta": nivel,
                "motivo": None,
            })
        return out

    def _serialize_sem_texto(rows) -> list[dict]:
        out = []
        for row in rows:
            ato_id, tipo, numero, data, url_pdf, erro = row
            if erro:
                motivo = "erro_download"
            elif not url_pdf:
                motivo = "sem_url"
            else:
                motivo = "pendente"
            out.append({
                "ato_id": str(ato_id),
                "tipo": tipo,
                "numero": numero or "?",
                "data_publicacao": data.isoformat() if data else None,
                "nivel_alerta": None,
                "motivo": motivo,
            })
        return out

    # Aguarda Piper = sem QUALQUER análise (não foi triado, nem foi para o
    # Bud por rota direta — caso das atas plenárias com qualidade='boa').
    aguarda_piper_base = (
        select(Ato.id, Ato.tipo, Ato.numero, Ato.data_publicacao)
        .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tid,
            ConteudoAto.qualidade.in_(["boa", "parcial", "ruim"]),
            ~select(Analise.id).where(
                Analise.ato_id == Ato.id,
                or_(
                    Analise.resultado_piper.isnot(None),
                    Analise.resultado_bud.isnot(None),
                ),
            ).exists(),
        )
    )
    piper_total = (await db.execute(select(func.count()).select_from(aguarda_piper_base.subquery()))).scalar_one()
    piper_amostra = (
        await db.execute(aguarda_piper_base.order_by(Ato.data_publicacao.desc().nullslast()).limit(10))
    ).all()

    aguarda_bud_base = (
        select(Ato.id, Ato.tipo, Ato.numero, Ato.data_publicacao, Analise.nivel_alerta)
        .join(Analise, Analise.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tid,
            Analise.resultado_piper.isnot(None),
            Analise.nivel_alerta.in_(["vermelho", "laranja"]),
            Analise.resultado_bud.is_(None),
        )
    )
    bud_total = (await db.execute(select(func.count()).select_from(aguarda_bud_base.subquery()))).scalar_one()
    bud_amostra = (
        await db.execute(aguarda_bud_base.order_by(Analise.criado_em.desc()).limit(10))
    ).all()

    aguarda_new_base = (
        select(Ato.id, Ato.tipo, Ato.numero, Ato.data_publicacao, Analise.nivel_alerta)
        .join(Analise, Analise.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tid,
            Analise.resultado_bud.isnot(None),
            Analise.nivel_alerta == "vermelho",
            Analise.resultado_new.is_(None),
        )
    )
    new_total = (await db.execute(select(func.count()).select_from(aguarda_new_base.subquery()))).scalar_one()
    new_amostra = (
        await db.execute(aguarda_new_base.order_by(Analise.criado_em.desc()).limit(10))
    ).all()

    # Fila 4: Sem texto extraído (bloqueados antes do Piper)
    sem_texto_base = (
        select(Ato.id, Ato.tipo, Ato.numero, Ato.data_publicacao, Ato.url_pdf, Ato.erro_download)
        .where(
            Ato.tenant_id == tid,
            ~select(ConteudoAto.ato_id).where(ConteudoAto.ato_id == Ato.id).exists(),
        )
    )
    sem_texto_total = (await db.execute(select(func.count()).select_from(sem_texto_base.subquery()))).scalar_one()
    sem_texto_amostra = (
        await db.execute(sem_texto_base.order_by(Ato.data_publicacao.desc().nullslast()).limit(10))
    ).all()

    return {
        "tenant": {"id": str(tid), "slug": slug, "nome": tenant.nome_completo},
        "filas": {
            "aguarda_piper": {
                "total": piper_total,
                "amostra": _serialize(piper_amostra),
                "agente": "Piper",
                "descricao": "Triagem inicial — todo ato com texto entra aqui",
            },
            "aguarda_bud": {
                "total": bud_total,
                "amostra": _serialize(bud_amostra),
                "agente": "Bud",
                "descricao": "Aprofundamento de críticos (vermelho ou laranja)",
            },
            "aguarda_new": {
                "total": new_total,
                "amostra": _serialize(new_amostra),
                "agente": "New",
                "descricao": "Revisão sistêmica de vermelhos confirmados pelo Bud",
            },
            "sem_texto": {
                "total": sem_texto_total,
                "amostra": _serialize_sem_texto(sem_texto_amostra),
                "agente": "Sem texto",
                "descricao": "Atos sem texto extraído — bloqueados antes do pipeline",
            },
        },
    }


@router.get("/orgaos/{slug}/metricas/icp")
async def get_metricas_icp(
    slug: str,
    recalcular: bool = Query(False, description="Força recálculo mesmo que exista snapshot recente"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retorna o ICP (Índice de Concentração de Poder) do órgão.
    Usa snapshot em cache (icp_orgao) se existir e recalcular=False.
    """
    from app.services.icp_service import calcular_icp_orgao, _interpretar_sistemico
    from app.models.pessoa import IcpOrgao

    tenant = await _get_tenant(slug, db)

    if not recalcular:
        snap_r = await db.execute(
            select(IcpOrgao)
            .where(IcpOrgao.tenant_id == tenant.id)
            .order_by(IcpOrgao.calculado_em.desc())
            .limit(1)
        )
        snap = snap_r.scalar_one_or_none()
        if snap:
            return {
                "icp_sistemico": float(snap.icp_sistemico) if snap.icp_sistemico else None,
                "classificacao": _interpretar_sistemico(float(snap.icp_sistemico)) if snap.icp_sistemico else "",
                "total_atos_base": snap.total_atos,
                "total_pessoas": snap.total_pessoas,
                "top_concentradores": snap.top_concentradores or [],
                "calculado_em": snap.calculado_em.isoformat(),
                "cache": True,
            }

    resultado = await calcular_icp_orgao(db, tenant.id)

    if "erro" in resultado:
        raise HTTPException(status_code=422, detail=resultado["erro"])

    resultado["cache"] = False
    return resultado
