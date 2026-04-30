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
    tipo_atlas: str | None = Query(None),
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
    if tipo_atlas:
        q = q.where(Ato.tipo_atlas == tipo_atlas)
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
        # Auditoria — quem analisou, quando, custo, tokens
        "auditoria": {
            "criado_em": analise.criado_em.isoformat() if analise and analise.criado_em else None,
            "atualizado_em": analise.atualizado_em.isoformat() if analise and analise.atualizado_em else None,
            "status": analise.status if analise else None,
            "agentes": [
                a for a in [
                    "piper" if analise and (analise.tokens_piper or 0) > 0 else None,
                    "bud" if analise and (analise.tokens_bud or 0) > 0 else None,
                    "new" if analise and (analise.tokens_new or 0) > 0 else None,
                ] if a
            ],
            "tokens_piper": analise.tokens_piper if analise else 0,
            "tokens_bud": analise.tokens_bud if analise else 0,
            "tokens_new": analise.tokens_new if analise else 0,
            "custo_total_usd": float(analise.custo_usd) if analise and analise.custo_usd else 0.0,
        } if analise else None,
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

    # Em processamento agora (status = *_em_andamento)
    em_proc_base = (
        select(Ato.id, Ato.tipo, Ato.numero, Ato.data_publicacao, Analise.nivel_alerta, Analise.status)
        .join(Analise, Analise.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tid,
            Analise.status.in_(["bud_em_andamento", "new_em_andamento", "piper_em_andamento"]),
        )
        .order_by(Analise.atualizado_em.desc())
        .limit(10)
    )
    em_proc_rows = (await db.execute(em_proc_base)).all()

    def _serialize_em_proc(rows) -> list[dict]:
        out = []
        for row in rows:
            ato_id, tipo, numero, data, nivel, status = row
            agente = (
                "bud" if status == "bud_em_andamento"
                else "new" if status == "new_em_andamento"
                else "piper"
            )
            out.append({
                "ato_id": str(ato_id),
                "tipo": tipo,
                "numero": numero or "?",
                "data_publicacao": data.isoformat() if data else None,
                "nivel_alerta": nivel,
                "agente": agente,
            })
        return out

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
        "em_processamento": _serialize_em_proc(em_proc_rows),
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


# ─── Grafo de relações (estilo Arkham) ────────────────────────────────────────

def _icp_para_cor(icp, suspeito: bool) -> str:
    """Mapeia ICP individual para cor da paleta de alerta. icp pode ser float|None|Decimal."""
    if suspeito:
        return "vermelho"
    if icp is None:
        return "cinza"
    icp_f = float(icp)
    if icp_f >= 30:
        return "vermelho"
    if icp_f >= 15:
        return "laranja"
    if icp_f >= 5:
        return "amarelo"
    return "cinza"


def _gravidade_para_cor(g: str | None) -> str:
    if g == "critica":
        return "vermelho"
    if g == "alta":
        return "laranja"
    if g == "media":
        return "amarelo"
    return "cinza"


_GRAVIDADE_RANK = {"baixa": 1, "media": 2, "alta": 3, "critica": 4}


@router.get("/orgaos/{slug}/grafo/raiz")
async def grafo_raiz(
    slug: str,
    limit: int = Query(15, ge=1, le=50),
    icp_min: float = Query(0, ge=0, le=100),
    incluir_tags_top: int = Query(10, ge=0, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Entry-point do grafo. Retorna top N pessoas por ICP e top M tags
    mais atribuídas. Sem edges — UI usa para popular o canvas inicial.
    """
    tenant = await _get_tenant(slug, db)

    pessoas_r = await db.execute(text("""
        SELECT id, nome_normalizado, cargo_mais_recente, icp_individual,
               total_aparicoes, eh_suspeito, primeiro_ato_data, ultimo_ato_data
        FROM pessoas
        WHERE tenant_id = :tid AND COALESCE(icp_individual, 0) >= :icp_min
        ORDER BY icp_individual DESC NULLS LAST, total_aparicoes DESC
        LIMIT :lim
    """), {"tid": str(tenant.id), "icp_min": icp_min, "lim": limit})
    pessoas_rows = pessoas_r.fetchall()

    nodes_pessoas = [
        {
            "id": str(r.id),
            "tipo": "pessoa",
            "nome": r.nome_normalizado,
            "cargo": r.cargo_mais_recente,
            "icp": float(r.icp_individual) if r.icp_individual is not None else None,
            "total_aparicoes": r.total_aparicoes or 0,
            "suspeito": bool(r.eh_suspeito),
            "primeiro_ato": r.primeiro_ato_data.isoformat() if r.primeiro_ato_data else None,
            "ultimo_ato": r.ultimo_ato_data.isoformat() if r.ultimo_ato_data else None,
            "cor_categoria": _icp_para_cor(r.icp_individual, bool(r.eh_suspeito)),
        }
        for r in pessoas_rows
    ]

    nodes_tags = []
    if incluir_tags_top > 0:
        tags_r = await db.execute(text("""
            SELECT codigo,
                   MIN(nome) AS nome,
                   MIN(categoria) AS categoria,
                   MIN(categoria_nome) AS categoria_nome,
                   COUNT(DISTINCT ato_id) AS atos_count,
                   MODE() WITHIN GROUP (ORDER BY gravidade) AS gravidade_predominante
            FROM ato_tags
            WHERE tenant_id = :tid AND ativa = TRUE
            GROUP BY codigo
            ORDER BY atos_count DESC
            LIMIT :lim
        """), {"tid": str(tenant.id), "lim": incluir_tags_top})
        nodes_tags = [
            {
                "codigo": r.codigo,
                "tipo": "tag",
                "nome": r.nome,
                "categoria": r.categoria,
                "categoria_nome": r.categoria_nome,
                "gravidade_predominante": r.gravidade_predominante or "baixa",
                "atos_count": int(r.atos_count or 0),
                "cor_categoria": _gravidade_para_cor(r.gravidade_predominante),
            }
            for r in tags_r.fetchall()
        ]

    return {
        "nodes_pessoas": nodes_pessoas,
        "nodes_atos": [],
        "nodes_tags": nodes_tags,
        "edges_pessoa_pessoa": [],
        "edges_pessoa_ato": [],
        "edges_ato_tag": [],
        "root_id": None,
    }


@router.get("/orgaos/{slug}/grafo/pessoa/{pessoa_id}")
async def grafo_expandir_pessoa(
    slug: str,
    pessoa_id: str,
    limit_vizinhos: int = Query(12, ge=1, le=50),
    peso_min: float = Query(2, ge=1, le=50),
    incluir_atos: bool = Query(True),
    incluir_tags: bool = Query(True),
    limit_atos: int = Query(5, ge=1, le=15),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Expande uma pessoa: retorna a pessoa + vizinhos diretos via relacoes_pessoas.
    - edges_pessoa_pessoa: com tags_compartilhadas e gravidade_max calculadas.
    - se incluir_atos: top N atos da pessoa central + edges pessoa↔ato.
    - se incluir_tags: tags ativas dos atos retornados + edges_ato_tag.
    """
    tenant = await _get_tenant(slug, db)

    # 1. Pessoa central + vizinhos via relacoes_pessoas
    pessoas_r = await db.execute(text("""
        WITH base AS (
            SELECT id FROM pessoas
            WHERE id = :pid AND tenant_id = :tid
        ),
        vizinhos AS (
            SELECT
                CASE
                    WHEN rp.pessoa_a_id = :pid THEN rp.pessoa_b_id
                    ELSE rp.pessoa_a_id
                END AS pessoa_id,
                rp.peso, rp.atos_em_comum
            FROM relacoes_pessoas rp
            WHERE rp.tenant_id = :tid
              AND (rp.pessoa_a_id = :pid OR rp.pessoa_b_id = :pid)
              AND rp.atos_em_comum >= :peso_min
            ORDER BY rp.peso DESC
            LIMIT :lim_v
        )
        SELECT p.id, p.nome_normalizado, p.cargo_mais_recente, p.icp_individual,
               p.total_aparicoes, p.eh_suspeito, p.primeiro_ato_data, p.ultimo_ato_data,
               CASE WHEN p.id = :pid THEN TRUE ELSE FALSE END AS is_root
        FROM pessoas p
        WHERE p.tenant_id = :tid AND (
            p.id = :pid OR p.id IN (SELECT pessoa_id FROM vizinhos)
        )
    """), {"pid": pessoa_id, "tid": str(tenant.id), "peso_min": peso_min, "lim_v": limit_vizinhos})
    pessoas_rows = pessoas_r.fetchall()

    if not any(r.is_root for r in pessoas_rows):
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")

    nodes_pessoas = [
        {
            "id": str(r.id),
            "tipo": "pessoa",
            "nome": r.nome_normalizado,
            "cargo": r.cargo_mais_recente,
            "icp": float(r.icp_individual) if r.icp_individual is not None else None,
            "total_aparicoes": r.total_aparicoes or 0,
            "suspeito": bool(r.eh_suspeito),
            "primeiro_ato": r.primeiro_ato_data.isoformat() if r.primeiro_ato_data else None,
            "ultimo_ato": r.ultimo_ato_data.isoformat() if r.ultimo_ato_data else None,
            "cor_categoria": _icp_para_cor(r.icp_individual, bool(r.eh_suspeito)),
        }
        for r in pessoas_rows
    ]

    # 2. Edges pessoa↔pessoa: para cada par no conjunto, calcula peso + tags compartilhadas.
    # Inclui só arestas onde a pessoa central é uma das pontas (o canvas tem ela como hub).
    pessoa_ids = [str(r.id) for r in pessoas_rows]
    edges_pp = []
    if len(pessoa_ids) > 1:
        pares_r = await db.execute(text("""
            WITH ids AS (SELECT UNNEST(CAST(:ids AS uuid[])) AS pid),
            relacoes_central AS (
                SELECT
                    LEAST(rp.pessoa_a_id, rp.pessoa_b_id) AS a,
                    GREATEST(rp.pessoa_a_id, rp.pessoa_b_id) AS b,
                    rp.peso, rp.atos_em_comum
                FROM relacoes_pessoas rp
                WHERE rp.tenant_id = :tid
                  AND (rp.pessoa_a_id = :pid OR rp.pessoa_b_id = :pid)
                  AND rp.pessoa_a_id IN (SELECT pid FROM ids)
                  AND rp.pessoa_b_id IN (SELECT pid FROM ids)
            ),
            tags_por_par AS (
                SELECT rc.a, rc.b,
                       array_agg(DISTINCT t.codigo) FILTER (WHERE t.codigo IS NOT NULL) AS tags,
                       MAX(CASE t.gravidade
                            WHEN 'critica' THEN 4
                            WHEN 'alta' THEN 3
                            WHEN 'media' THEN 2
                            WHEN 'baixa' THEN 1
                            ELSE 0
                       END) AS grav_rank
                FROM relacoes_central rc
                JOIN aparicoes_pessoa ap_a ON ap_a.pessoa_id = rc.a AND ap_a.tenant_id = :tid
                JOIN aparicoes_pessoa ap_b ON ap_b.pessoa_id = rc.b
                                           AND ap_b.ato_id = ap_a.ato_id
                                           AND ap_b.tenant_id = :tid
                LEFT JOIN ato_tags t ON t.ato_id = ap_a.ato_id AND t.ativa = TRUE
                GROUP BY rc.a, rc.b
            )
            SELECT rc.a, rc.b, rc.peso, rc.atos_em_comum,
                   COALESCE(tp.tags, ARRAY[]::text[]) AS tags,
                   tp.grav_rank
            FROM relacoes_central rc
            LEFT JOIN tags_por_par tp ON tp.a = rc.a AND tp.b = rc.b
        """), {"tid": str(tenant.id), "pid": pessoa_id, "ids": pessoa_ids})
        rank_para_grav = {4: "critica", 3: "alta", 2: "media", 1: "baixa"}
        for r in pares_r.fetchall():
            edges_pp.append({
                "source": str(r.a),
                "target": str(r.b),
                "kind": "co_aparicao",
                "peso": float(r.peso),
                "atos_em_comum": int(r.atos_em_comum),
                "tags_compartilhadas": list(r.tags or []),
                "gravidade_max": rank_para_grav.get(r.grav_rank),
            })

    # 3. Atos da pessoa central (opcional)
    nodes_atos = []
    edges_pa = []
    nodes_tags = []
    edges_at = []
    ato_ids: list[str] = []

    if incluir_atos:
        atos_r = await db.execute(text("""
            SELECT a.id, a.tipo, a.numero, a.data_publicacao,
                   an.nivel_alerta,
                   ap.tipo_aparicao, ap.cargo,
                   (SELECT COUNT(*) FROM aparicoes_pessoa ap2 WHERE ap2.ato_id = a.id) AS pessoas_count,
                   (SELECT COUNT(*) FROM ato_tags t WHERE t.ato_id = a.id AND t.ativa = TRUE) AS tags_count
            FROM aparicoes_pessoa ap
            JOIN atos a ON a.id = ap.ato_id
            LEFT JOIN LATERAL (
                SELECT nivel_alerta FROM analises an2
                WHERE an2.ato_id = a.id
                ORDER BY an2.criado_em DESC LIMIT 1
            ) an ON TRUE
            WHERE ap.pessoa_id = :pid AND ap.tenant_id = :tid
            ORDER BY
                CASE an.nivel_alerta
                    WHEN 'vermelho' THEN 0
                    WHEN 'laranja' THEN 1
                    WHEN 'amarelo' THEN 2
                    WHEN 'verde' THEN 3
                    ELSE 4
                END,
                a.data_publicacao DESC NULLS LAST
            LIMIT :lim
        """), {"pid": pessoa_id, "tid": str(tenant.id), "lim": limit_atos})
        for r in atos_r.fetchall():
            ato_ids.append(str(r.id))
            nodes_atos.append({
                "id": str(r.id),
                "tipo": "ato",
                "numero": r.numero,
                "ato_tipo": r.tipo,
                "data_publicacao": r.data_publicacao.isoformat() if r.data_publicacao else None,
                "nivel_alerta": r.nivel_alerta,
                "pessoas_count": int(r.pessoas_count or 0),
                "tags_count": int(r.tags_count or 0),
            })
            edges_pa.append({
                "source": pessoa_id,
                "target": str(r.id),
                "kind": "aparicao",
                "tipo_aparicao": r.tipo_aparicao,
                "cargo": r.cargo,
            })

    # 4. Tags ativas dos atos retornados (opcional)
    if incluir_tags and ato_ids:
        tags_r = await db.execute(text("""
            WITH atos_ids AS (SELECT UNNEST(CAST(:ato_ids AS uuid[])) AS ato_id),
            tags_dos_atos AS (
                SELECT t.codigo, t.nome, t.categoria, t.categoria_nome, t.gravidade,
                       t.atribuido_por, t.ato_id
                FROM ato_tags t
                WHERE t.ativa = TRUE
                  AND t.ato_id IN (SELECT ato_id FROM atos_ids)
                  AND t.tenant_id = :tid
            )
            SELECT codigo, nome, categoria, categoria_nome, ato_id, gravidade, atribuido_por
            FROM tags_dos_atos
        """), {"ato_ids": ato_ids, "tid": str(tenant.id)})
        # Agrega tags únicas + edges ato↔tag
        tags_dict: dict[str, dict] = {}
        for r in tags_r.fetchall():
            if r.codigo not in tags_dict:
                tags_dict[r.codigo] = {
                    "codigo": r.codigo,
                    "tipo": "tag",
                    "nome": r.nome,
                    "categoria": r.categoria,
                    "categoria_nome": r.categoria_nome,
                    "gravidade_predominante": r.gravidade,
                    "atos_count": 0,
                    "cor_categoria": _gravidade_para_cor(r.gravidade),
                    "_grav_max_rank": _GRAVIDADE_RANK.get(r.gravidade, 0),
                }
            else:
                # mantém a maior gravidade vista
                if _GRAVIDADE_RANK.get(r.gravidade, 0) > tags_dict[r.codigo]["_grav_max_rank"]:
                    tags_dict[r.codigo]["gravidade_predominante"] = r.gravidade
                    tags_dict[r.codigo]["cor_categoria"] = _gravidade_para_cor(r.gravidade)
                    tags_dict[r.codigo]["_grav_max_rank"] = _GRAVIDADE_RANK.get(r.gravidade, 0)
            tags_dict[r.codigo]["atos_count"] += 1
            edges_at.append({
                "source": str(r.ato_id),
                "target": r.codigo,
                "kind": "atribuicao_tag",
                "gravidade": r.gravidade,
                "atribuido_por": r.atribuido_por,
            })
        for v in tags_dict.values():
            v.pop("_grav_max_rank", None)
        nodes_tags = list(tags_dict.values())

    return {
        "nodes_pessoas": nodes_pessoas,
        "nodes_atos": nodes_atos,
        "nodes_tags": nodes_tags,
        "edges_pessoa_pessoa": edges_pp,
        "edges_pessoa_ato": edges_pa,
        "edges_ato_tag": edges_at,
        "root_id": pessoa_id,
    }


@router.get("/orgaos/{slug}/grafo/atos-comuns/{pessoa_a_id}/{pessoa_b_id}")
async def grafo_atos_comuns(
    slug: str,
    pessoa_a_id: str,
    pessoa_b_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lista atos onde duas pessoas aparecem juntas, com tags ativas e
    tipo_aparicao/cargo de cada uma. Usado quando o usuário clica numa
    aresta pessoa↔pessoa no grafo.
    """
    tenant = await _get_tenant(slug, db)

    atos_r = await db.execute(text("""
        SELECT a.id, a.tipo, a.numero, a.data_publicacao, a.ementa,
               an.nivel_alerta,
               ap_a.tipo_aparicao AS tipo_a, ap_a.cargo AS cargo_a,
               ap_b.tipo_aparicao AS tipo_b, ap_b.cargo AS cargo_b
        FROM aparicoes_pessoa ap_a
        JOIN aparicoes_pessoa ap_b ON ap_b.ato_id = ap_a.ato_id
                                   AND ap_b.pessoa_id = :pb
                                   AND ap_b.tenant_id = :tid
        JOIN atos a ON a.id = ap_a.ato_id
        LEFT JOIN LATERAL (
            SELECT nivel_alerta FROM analises an2
            WHERE an2.ato_id = a.id
            ORDER BY an2.criado_em DESC LIMIT 1
        ) an ON TRUE
        WHERE ap_a.pessoa_id = :pa AND ap_a.tenant_id = :tid
        ORDER BY a.data_publicacao DESC NULLS LAST
        LIMIT 50
    """), {"pa": pessoa_a_id, "pb": pessoa_b_id, "tid": str(tenant.id)})
    rows = atos_r.fetchall()
    if not rows:
        return {
            "pessoa_a_id": pessoa_a_id,
            "pessoa_b_id": pessoa_b_id,
            "atos": [],
        }

    ato_ids = [str(r.id) for r in rows]
    tags_r = await db.execute(text("""
        SELECT ato_id, codigo, nome, gravidade
        FROM ato_tags
        WHERE ativa = TRUE
          AND tenant_id = :tid
          AND ato_id IN (SELECT UNNEST(CAST(:ato_ids AS uuid[])))
    """), {"tid": str(tenant.id), "ato_ids": ato_ids})
    tags_por_ato: dict[str, list] = {}
    for t in tags_r.fetchall():
        tags_por_ato.setdefault(str(t.ato_id), []).append({
            "codigo": t.codigo,
            "nome": t.nome,
            "gravidade": t.gravidade,
        })

    return {
        "pessoa_a_id": pessoa_a_id,
        "pessoa_b_id": pessoa_b_id,
        "atos": [
            {
                "ato_id": str(r.id),
                "tipo": r.tipo,
                "numero": r.numero,
                "data_publicacao": r.data_publicacao.isoformat() if r.data_publicacao else None,
                "ementa": (r.ementa or "")[:300] if r.ementa else None,
                "nivel_alerta": r.nivel_alerta,
                "tipo_aparicao_a": r.tipo_a,
                "cargo_a": r.cargo_a,
                "tipo_aparicao_b": r.tipo_b,
                "cargo_b": r.cargo_b,
                "tags": tags_por_ato.get(str(r.id), []),
            }
            for r in rows
        ],
    }


@router.get("/orgaos/{slug}/grafo/tag/{codigo}")
async def grafo_expandir_tag(
    slug: str,
    codigo: str,
    limit_atos: int = Query(20, ge=1, le=50),
    incluir_pessoas: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Drill-down por tag de irregularidade. Retorna o nó-tag, top N atos
    com a tag ativa, e (opcional) pessoas envolvidas nesses atos.
    Útil para "navegar pelo padrão" — ex: nepotismo, falsa_urgencia.
    """
    tenant = await _get_tenant(slug, db)

    tag_r = await db.execute(text("""
        SELECT codigo,
               MIN(nome) AS nome,
               MIN(categoria) AS categoria,
               MIN(categoria_nome) AS categoria_nome,
               COUNT(DISTINCT ato_id) AS atos_count,
               MODE() WITHIN GROUP (ORDER BY gravidade) AS gravidade_predominante
        FROM ato_tags
        WHERE tenant_id = :tid AND ativa = TRUE AND codigo = :codigo
        GROUP BY codigo
    """), {"tid": str(tenant.id), "codigo": codigo})
    tag_row = tag_r.first()
    if not tag_row:
        raise HTTPException(status_code=404, detail=f"Tag '{codigo}' sem atribuições ativas neste órgão")

    node_tag = {
        "codigo": tag_row.codigo,
        "tipo": "tag",
        "nome": tag_row.nome,
        "categoria": tag_row.categoria,
        "categoria_nome": tag_row.categoria_nome,
        "gravidade_predominante": tag_row.gravidade_predominante or "baixa",
        "atos_count": int(tag_row.atos_count),
        "cor_categoria": _gravidade_para_cor(tag_row.gravidade_predominante),
    }

    atos_r = await db.execute(text("""
        SELECT a.id, a.tipo, a.numero, a.data_publicacao,
               an.nivel_alerta,
               t.gravidade, t.atribuido_por,
               (SELECT COUNT(*) FROM aparicoes_pessoa ap2 WHERE ap2.ato_id = a.id) AS pessoas_count,
               (SELECT COUNT(*) FROM ato_tags t2 WHERE t2.ato_id = a.id AND t2.ativa = TRUE) AS tags_count
        FROM ato_tags t
        JOIN atos a ON a.id = t.ato_id
        LEFT JOIN LATERAL (
            SELECT nivel_alerta FROM analises an2
            WHERE an2.ato_id = a.id
            ORDER BY an2.criado_em DESC LIMIT 1
        ) an ON TRUE
        WHERE t.tenant_id = :tid AND t.ativa = TRUE AND t.codigo = :codigo
        ORDER BY
            CASE t.gravidade
                WHEN 'critica' THEN 0
                WHEN 'alta' THEN 1
                WHEN 'media' THEN 2
                WHEN 'baixa' THEN 3
                ELSE 4
            END,
            a.data_publicacao DESC NULLS LAST
        LIMIT :lim
    """), {"tid": str(tenant.id), "codigo": codigo, "lim": limit_atos})
    atos_rows = atos_r.fetchall()

    nodes_atos = []
    edges_at = []
    ato_ids: list[str] = []
    for r in atos_rows:
        ato_ids.append(str(r.id))
        nodes_atos.append({
            "id": str(r.id),
            "tipo": "ato",
            "numero": r.numero,
            "ato_tipo": r.tipo,
            "data_publicacao": r.data_publicacao.isoformat() if r.data_publicacao else None,
            "nivel_alerta": r.nivel_alerta,
            "pessoas_count": int(r.pessoas_count or 0),
            "tags_count": int(r.tags_count or 0),
        })
        edges_at.append({
            "source": str(r.id),
            "target": codigo,
            "kind": "atribuicao_tag",
            "gravidade": r.gravidade,
            "atribuido_por": r.atribuido_por,
        })

    nodes_pessoas = []
    edges_pa = []
    if incluir_pessoas and ato_ids:
        pessoas_r = await db.execute(text("""
            SELECT DISTINCT ON (p.id)
                   p.id, p.nome_normalizado, p.cargo_mais_recente, p.icp_individual,
                   p.total_aparicoes, p.eh_suspeito,
                   p.primeiro_ato_data, p.ultimo_ato_data
            FROM pessoas p
            JOIN aparicoes_pessoa ap ON ap.pessoa_id = p.id
            WHERE p.tenant_id = :tid
              AND ap.ato_id IN (SELECT UNNEST(CAST(:ato_ids AS uuid[])))
            ORDER BY p.id
        """), {"tid": str(tenant.id), "ato_ids": ato_ids})
        for r in pessoas_r.fetchall():
            nodes_pessoas.append({
                "id": str(r.id),
                "tipo": "pessoa",
                "nome": r.nome_normalizado,
                "cargo": r.cargo_mais_recente,
                "icp": float(r.icp_individual) if r.icp_individual is not None else None,
                "total_aparicoes": r.total_aparicoes or 0,
                "suspeito": bool(r.eh_suspeito),
                "primeiro_ato": r.primeiro_ato_data.isoformat() if r.primeiro_ato_data else None,
                "ultimo_ato": r.ultimo_ato_data.isoformat() if r.ultimo_ato_data else None,
                "cor_categoria": _icp_para_cor(r.icp_individual, bool(r.eh_suspeito)),
            })

        # Edges pessoa↔ato
        ap_r = await db.execute(text("""
            SELECT ap.pessoa_id, ap.ato_id, ap.tipo_aparicao, ap.cargo
            FROM aparicoes_pessoa ap
            WHERE ap.tenant_id = :tid
              AND ap.ato_id IN (SELECT UNNEST(CAST(:ato_ids AS uuid[])))
        """), {"tid": str(tenant.id), "ato_ids": ato_ids})
        for r in ap_r.fetchall():
            edges_pa.append({
                "source": str(r.pessoa_id),
                "target": str(r.ato_id),
                "kind": "aparicao",
                "tipo_aparicao": r.tipo_aparicao,
                "cargo": r.cargo,
            })

    return {
        "nodes_pessoas": nodes_pessoas,
        "nodes_atos": nodes_atos,
        "nodes_tags": [node_tag],
        "edges_pessoa_pessoa": [],
        "edges_pessoa_ato": edges_pa,
        "edges_ato_tag": edges_at,
        "root_id": codigo,
    }
