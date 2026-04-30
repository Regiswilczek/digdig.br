import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case, cast, Date as SADate, text
from app.database import get_db
from app.models.tenant import Tenant
from app.models.ato import Ato, ConteudoAto
from app.models.analise import Analise
from app.models.dados_financeiros import Diaria
from app.models.tag import AtoTag
import resend

# SQL fragment: identifica passagens aéreas pelo nome da cia
_PASSAGEM_COND = (
    Diaria.nome_despesa_padrao.ilike("%Linhas Aéreas%") |
    Diaria.nome_despesa_padrao.ilike("%Linhas Aereas%") |
    Diaria.nome_despesa_padrao.ilike("%AIRLINES%") |
    Diaria.nome_despesa_padrao.ilike("%AZUL%") |
    Diaria.nome_despesa_padrao.ilike("%GOL%") |
    Diaria.nome_despesa_padrao.ilike("%LATAM%") |
    Diaria.nome_despesa_padrao.ilike("%passagem%")
)

router = APIRouter(prefix="/public", tags=["public"])

NIVEIS_ORDEM = ["vermelho", "laranja", "amarelo", "verde"]


@router.get("/tenants")
async def listar_tenants(db: AsyncSession = Depends(get_db)):
    """
    Lista órgãos cadastrados — usado pela sidebar do painel pra renderizar
    dinamicamente os tenants (em vez do array hardcoded em painel.tsx).

    Ordem: status `active` primeiro, depois `coming_soon`/etc, alfabético dentro.
    """
    rows = (await db.execute(
        select(
            Tenant.slug, Tenant.nome, Tenant.nome_completo, Tenant.descricao_curta,
            Tenant.tipo_orgao, Tenant.estado, Tenant.status, Tenant.cor_tema,
            Tenant.logo_url, Tenant.total_atos,
        ).order_by(
            # active primeiro (boolean order: TRUE = 1, então DESC)
            (Tenant.status == "active").desc(),
            Tenant.nome.asc(),
        )
    )).all()
    return [
        {
            "slug": r.slug,
            "nome": r.nome,
            "nome_completo": r.nome_completo,
            "descricao_curta": r.descricao_curta,
            "tipo_orgao": r.tipo_orgao,
            "estado": r.estado,
            "status": r.status,
            "cor_tema": r.cor_tema,
            "logo_url": r.logo_url,
            "total_atos": r.total_atos or 0,
            "ativo": r.status == "active",
        }
        for r in rows
    ]


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

    # Atos sem texto extraído — não podem entrar no pipeline IA, descontam da meta.
    sem_texto_r = await db.execute(
        select(func.count())
        .select_from(Ato)
        .where(
            Ato.tenant_id == tenant.id,
            ~select(ConteudoAto.ato_id).where(ConteudoAto.ato_id == Ato.id).exists(),
        )
    )
    total_sem_texto = sem_texto_r.scalar_one()

    # Distribuição pela categoria do ATLAS (mais granular que `tipo` — quebra
    # `media_library` em licitação, contrato, financeiro_balanco etc).
    # Só conta atos que ATLAS já classificou; os outros vão pra "nao_classificado".
    atlas_total_r = await db.execute(
        select(Ato.tipo_atlas, func.count().label("total"))
        .where(Ato.tenant_id == tenant.id, Ato.tipo_atlas.isnot(None))
        .group_by(Ato.tipo_atlas)
    )
    por_categoria_atlas_total = {r.tipo_atlas: r.total for r in atlas_total_r}

    atlas_analise_r = await db.execute(
        select(Ato.tipo_atlas, func.count(Analise.ato_id.distinct()).label("com_analise"))
        .join(Analise, Analise.ato_id == Ato.id)
        .where(Ato.tenant_id == tenant.id, Ato.tipo_atlas.isnot(None))
        .group_by(Ato.tipo_atlas)
    )
    por_categoria_atlas_analise = {r.tipo_atlas: r.com_analise for r in atlas_analise_r.all()}

    return {
        "tenant": {"slug": tenant.slug, "nome": tenant.nome},
        "total_atos": total_atos,
        "total_analisados": total_analisados,
        "total_criticos": total_criticos,
        "total_sem_texto": total_sem_texto,
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
        "por_categoria_atlas": {
            cat: {
                "total": total,
                "analisados": por_categoria_atlas_analise.get(cat, 0),
            }
            for cat, total in sorted(por_categoria_atlas_total.items(), key=lambda x: -x[1])
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

    # Última atualização (criado OU atualizado pelo Bud/New) por ato.
    # Usar atualizado_em garante que aprofundamentos via UPDATE também
    # apareçam no topo do feed quando o Bud termina.
    latest_analise = (
        select(
            Analise.ato_id,
            func.max(Analise.atualizado_em).label("analisado_em"),
        )
        .where(Analise.tenant_id == tenant.id)
        .group_by(Analise.ato_id)
        .subquery()
    )
    # CASE para identificar o último modelo a tocar a análise.
    # Prioridade: status_em_andamento > resultado_new > resultado_bud > resultado_piper.
    modelo_case = case(
        (Analise.status == "new_em_andamento", "new"),
        (Analise.status == "bud_em_andamento", "bud"),
        (Analise.status == "piper_em_andamento", "piper"),
        (Analise.resultado_new.isnot(None), "new"),
        (Analise.resultado_bud.isnot(None), "bud"),
        (Analise.resultado_piper.isnot(None), "piper"),
        else_=None,
    )
    nivel_subq = (
        select(
            Analise.ato_id,
            Analise.nivel_alerta,
            Analise.atualizado_em.label("analisado_em"),
            modelo_case.label("modelo"),
            Analise.status.label("status_analise"),
        )
        .join(latest_analise, and_(
            Analise.ato_id == latest_analise.c.ato_id,
            Analise.atualizado_em == latest_analise.c.analisado_em,
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
            nivel_subq.c.modelo,
            nivel_subq.c.status_analise,
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
            # event_time = momento mais recente do ciclo (análise se houver, senão entrada)
            "event_time":   (r.analisado_em or r.criado_em).isoformat() if (r.analisado_em or r.criado_em) else None,
            "criado_em":    r.criado_em.isoformat() if r.criado_em else None,
            "analisado_em": r.analisado_em.isoformat() if r.analisado_em else None,
            "nivel_alerta": r.nivel_alerta,
            "status":       "analisado" if r.nivel_alerta else "entrando",
            "origem":       "ato",
            "modelo":       r.modelo,
            "em_andamento": (r.status_analise or "").endswith("_em_andamento"),
        }
        for r in atos_rows
    ]

    diarias_items = [
        {
            "ato_id":       str(r.item_id),
            "numero":       r.numero,
            "tipo":         "diaria",
            "event_time":   r.criado_em.isoformat() if r.criado_em else None,
            "criado_em":    r.criado_em.isoformat() if r.criado_em else None,
            "analisado_em": None,
            "nivel_alerta": None,
            "status":       "entrando",
            "origem":       "financeiro",
            "descricao":    r.tipo,  # nome_passageiro
            "modelo":       None,
            "em_andamento": False,
        }
        for r in diarias_rows
    ]

    todos = sorted(
        atos_items + diarias_items,
        key=lambda x: x["event_time"] or "",
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

    # Busca tags ativas para os atos retornados
    ato_ids_page = [r.id for r in rows]
    tags_map: dict[str, list[dict]] = {}
    if ato_ids_page:
        tags_r = await db.execute(
            select(AtoTag)
            .where(AtoTag.ato_id.in_(ato_ids_page), AtoTag.ativa == True)
            .order_by(AtoTag.ato_id, AtoTag.gravidade.desc())
        )
        for tag in tags_r.scalars().all():
            key = str(tag.ato_id)
            tags_map.setdefault(key, []).append({
                "codigo": tag.codigo,
                "nome": tag.nome,
                "categoria": tag.categoria,
                "categoria_nome": tag.categoria_nome,
                "gravidade": tag.gravidade,
                "atribuido_por": tag.atribuido_por,
                "revisado_por": tag.revisado_por,
            })

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
                "tags": tags_map.get(str(r.id), []),
            }
            for r in rows
        ],
    }


# ── Financeiro ──────────────────────────────────────────────────────────────

async def _resolve_tenant(slug: str, db: AsyncSession):
    r = await db.execute(select(Tenant).where(Tenant.slug == slug))
    t = r.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Órgão não encontrado")
    return t


@router.get("/orgaos/{slug}/financeiro/stats")
async def get_financeiro_stats(slug: str, db: AsyncSession = Depends(get_db)):
    tenant = await _resolve_tenant(slug, db)

    total_r = await db.execute(
        select(func.count()).where(Diaria.tenant_id == tenant.id)
    )
    total = total_r.scalar_one()

    passagens_r = await db.execute(
        select(func.count()).where(Diaria.tenant_id == tenant.id, _PASSAGEM_COND)
    )
    total_passagens = passagens_r.scalar_one()

    valor_passagens_r = await db.execute(
        select(func.coalesce(func.sum(Diaria.valor_total), 0)).where(
            Diaria.tenant_id == tenant.id, _PASSAGEM_COND
        )
    )
    valor_passagens = float(valor_passagens_r.scalar_one() or 0)

    valor_diarias_r = await db.execute(
        select(func.coalesce(func.sum(Diaria.valor_total), 0)).where(
            Diaria.tenant_id == tenant.id, ~_PASSAGEM_COND
        )
    )
    valor_diarias = float(valor_diarias_r.scalar_one() or 0)

    return {
        "diarias": {
            "total": total - total_passagens,
            "valor_total": valor_diarias,
            "analisados": 0,
        },
        "passagens": {
            "total": total_passagens,
            "valor_total": valor_passagens,
            "analisados": 0,
        },
    }


@router.get("/orgaos/{slug}/financeiro/diarias")
async def get_financeiro_diarias(
    slug: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _resolve_tenant(slug, db)
    base = and_(Diaria.tenant_id == tenant.id, ~_PASSAGEM_COND)

    total_r = await db.execute(select(func.count()).where(base))
    total = total_r.scalar_one()

    rows_r = await db.execute(
        select(
            Diaria.id,
            Diaria.codigo_processo,
            Diaria.nome_despesa_padrao,
            Diaria.nome_passageiro,
            Diaria.valor_total,
            Diaria.data_pagamento,
            Diaria.periodo_deslocamento,
            Diaria.cidade,
            Diaria.periodo_ref,
        )
        .where(base)
        .order_by(Diaria.data_pagamento.desc().nullslast(), Diaria.criado_em.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    rows = rows_r.all()

    return {
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "limit": limit,
        "registros": [
            {
                "id": str(r.id),
                "codigo_processo": r.codigo_processo,
                "tipo": r.nome_despesa_padrao,
                "beneficiario": r.nome_passageiro,
                "valor": float(r.valor_total) if r.valor_total else None,
                "data": r.data_pagamento.isoformat() if r.data_pagamento else None,
                "periodo": r.periodo_deslocamento,
                "cidade": r.cidade,
                "periodo_ref": r.periodo_ref,
            }
            for r in rows
        ],
    }


@router.get("/orgaos/{slug}/financeiro/passagens")
async def get_financeiro_passagens(
    slug: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _resolve_tenant(slug, db)
    base = and_(Diaria.tenant_id == tenant.id, _PASSAGEM_COND)

    total_r = await db.execute(select(func.count()).where(base))
    total = total_r.scalar_one()

    rows_r = await db.execute(
        select(
            Diaria.id,
            Diaria.codigo_processo,
            Diaria.nome_despesa_padrao,
            Diaria.nome_passageiro,
            Diaria.valor_total,
            Diaria.data_pagamento,
            Diaria.periodo_deslocamento,
            Diaria.nome_evento,
            Diaria.periodo_ref,
        )
        .where(base)
        .order_by(Diaria.data_pagamento.desc().nullslast(), Diaria.criado_em.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    rows = rows_r.all()

    return {
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "limit": limit,
        "registros": [
            {
                "id": str(r.id),
                "codigo_processo": r.codigo_processo,
                "cia": r.nome_despesa_padrao,
                "passageiro": r.nome_passageiro,
                "valor": float(r.valor_total) if r.valor_total else None,
                "data": r.data_pagamento.isoformat() if r.data_pagamento else None,
                "trecho": r.periodo_deslocamento,
                "evento": r.nome_evento,
                "periodo_ref": r.periodo_ref,
            }
            for r in rows
        ],
    }


# ── Lista de espera / acesso beta ─────────────────────────────────────────────

class AccessRequestBody(BaseModel):
    nome: str
    email: str
    profissao: str | None = None
    motivacao: str | None = None


@router.post("/access-requests", status_code=201)
async def create_access_request(body: AccessRequestBody, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    nome = body.nome.strip()

    await db.execute(
        text("""
            INSERT INTO access_requests (nome, email, profissao, motivacao)
            VALUES (:nome, :email, :profissao, :motivacao)
            ON CONFLICT DO NOTHING
        """),
        {"nome": nome, "email": email,
         "profissao": body.profissao or None, "motivacao": body.motivacao or None},
    )
    await db.commit()

    primeiro_nome = nome.split()[0] if nome else "Olá"

    resend.api_key = os.environ["RESEND_API_KEY"]
    resend.Emails.send({
        "from": os.environ.get("RESEND_FROM", "noreply@digdig.com.br"),
        "to": email,
        "subject": "Pedido registrado — Dig Dig",
        "html": f"""
<div style="font-family:monospace;background:#07080f;color:#fff;padding:40px 32px;max-width:480px;margin:0 auto">
  <p style="font-size:11px;letter-spacing:0.18em;color:#ffffff60;text-transform:uppercase;margin:0 0 28px">Dig Dig &middot; Pedido Recebido</p>
  <h1 style="font-size:26px;margin:0 0 16px;font-weight:800">{primeiro_nome}, seu pedido foi registrado.</h1>
  <p style="color:#ffffffb3;line-height:1.7;margin:0 0 20px;font-size:13px">
    O Dig Dig usa inteligência artificial para analisar automaticamente atos administrativos de órgãos públicos brasileiros &mdash; portarias, deliberações e processos &mdash; e identificar padrões de irregularidade com base nos próprios documentos oficiais.
  </p>
  <p style="color:#ffffff70;line-height:1.7;margin:0 0 20px;font-size:12px">
    O acesso é fechado porque os dados têm peso real: indícios de irregularidades em processos disciplinares sigilosos, concentração de poder em gestões eleitas, atos emitidos sem amparo em deliberação plenária. Antes de abrir para qualquer pessoa, queremos garantir que cada usuário entenda o que está lendo e use as informações com responsabilidade.
  </p>
  <p style="color:#ffffff70;line-height:1.7;margin:0 0 28px;font-size:12px">
    Analisaremos seu perfil em breve. Quando seu acesso for liberado, você receberá um email com o link para criar sua senha.
  </p>
  <hr style="border:none;border-top:1px solid #ffffff15;margin:0 0 28px">
  <p style="color:#ffffff40;font-size:11px;line-height:1.6;margin:0">
    Dig Dig &mdash; Transparência com dentes<br>
    <a href="https://digdig.com.br" style="color:#ffffff40">digdig.com.br</a>
  </p>
</div>
        """,
    })

    return {"ok": True}
