"""
tag_service.py — Taxonomia de irregularidades + persistência de tags

Taxonomia com 9 categorias e ~60 tipos de irregularidade.
Usada por Piper (triage), Bud (análise profunda) e New (padrões).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

# ---------------------------------------------------------------------------
# Taxonomia completa
# ---------------------------------------------------------------------------

TAXONOMIA: dict[str, dict] = {
    # ── Categoria 1: Fraudes em Dinheiro e Patrimônio ──────────────────────
    "enriquecimento_ilicito": {
        "nome": "Enriquecimento Ilícito",
        "categoria": "cat1_dinheiro",
        "categoria_nome": "Fraudes em Dinheiro e Patrimônio",
    },
    "peculato_apropriacao": {
        "nome": "Peculato-Apropriação",
        "categoria": "cat1_dinheiro",
        "categoria_nome": "Fraudes em Dinheiro e Patrimônio",
    },
    "peculato_desvio": {
        "nome": "Peculato-Desvio",
        "categoria": "cat1_dinheiro",
        "categoria_nome": "Fraudes em Dinheiro e Patrimônio",
    },
    "sobrepreco": {
        "nome": "Sobrepreço",
        "categoria": "cat1_dinheiro",
        "categoria_nome": "Fraudes em Dinheiro e Patrimônio",
    },
    "superfaturamento": {
        "nome": "Superfaturamento",
        "categoria": "cat1_dinheiro",
        "categoria_nome": "Fraudes em Dinheiro e Patrimônio",
    },
    "jogo_planilha": {
        "nome": "Jogo de Planilha",
        "categoria": "cat1_dinheiro",
        "categoria_nome": "Fraudes em Dinheiro e Patrimônio",
    },
    "laranja_interposto": {
        "nome": "Laranja (Interposto Nome)",
        "categoria": "cat1_dinheiro",
        "categoria_nome": "Fraudes em Dinheiro e Patrimônio",
    },
    "lavagem_dinheiro": {
        "nome": "Lavagem de Dinheiro",
        "categoria": "cat1_dinheiro",
        "categoria_nome": "Fraudes em Dinheiro e Patrimônio",
    },
    "dano_erario": {
        "nome": "Dano ao Erário",
        "categoria": "cat1_dinheiro",
        "categoria_nome": "Fraudes em Dinheiro e Patrimônio",
    },

    # ── Categoria 2: Fraudes em Licitações e Contratos ─────────────────────
    "direcionamento_edital": {
        "nome": "Direcionamento de Edital",
        "categoria": "cat2_licitacao",
        "categoria_nome": "Fraudes em Licitações e Contratos",
    },
    "fracionamento_despesa": {
        "nome": "Fracionamento de Despesa",
        "categoria": "cat2_licitacao",
        "categoria_nome": "Fraudes em Licitações e Contratos",
    },
    "dispensa_indevida": {
        "nome": "Dispensa Indevida de Licitação",
        "categoria": "cat2_licitacao",
        "categoria_nome": "Fraudes em Licitações e Contratos",
    },
    "inexigibilidade_fabricada": {
        "nome": "Inexigibilidade Fabricada",
        "categoria": "cat2_licitacao",
        "categoria_nome": "Fraudes em Licitações e Contratos",
    },
    "conluio_cartel": {
        "nome": "Conluio (Cartel)",
        "categoria": "cat2_licitacao",
        "categoria_nome": "Fraudes em Licitações e Contratos",
    },
    "empresa_fachada": {
        "nome": "Empresa de Fachada",
        "categoria": "cat2_licitacao",
        "categoria_nome": "Fraudes em Licitações e Contratos",
    },

    # ── Categoria 3: Abuso de Poder e Vícios de Processo ───────────────────
    "vicio_competencia": {
        "nome": "Vício de Competência",
        "categoria": "cat3_abuso_poder",
        "categoria_nome": "Abuso de Poder e Vícios de Processo",
    },
    "incompetencia_personae": {
        "nome": "Incompetência Ratione Personae",
        "categoria": "cat3_abuso_poder",
        "categoria_nome": "Abuso de Poder e Vícios de Processo",
    },
    "desvio_finalidade": {
        "nome": "Desvio de Finalidade",
        "categoria": "cat3_abuso_poder",
        "categoria_nome": "Abuso de Poder e Vícios de Processo",
    },
    "usurpacao_funcao": {
        "nome": "Usurpação de Função Pública",
        "categoria": "cat3_abuso_poder",
        "categoria_nome": "Abuso de Poder e Vícios de Processo",
    },
    "vicio_motivacao": {
        "nome": "Vício de Motivação",
        "categoria": "cat3_abuso_poder",
        "categoria_nome": "Abuso de Poder e Vícios de Processo",
    },
    "falsidade_ideologica": {
        "nome": "Falsidade Ideológica",
        "categoria": "cat3_abuso_poder",
        "categoria_nome": "Abuso de Poder e Vícios de Processo",
    },

    # ── Categoria 4: Crimes de Conduta e Ética ─────────────────────────────
    "concussao": {
        "nome": "Concussão",
        "categoria": "cat4_conduta",
        "categoria_nome": "Crimes de Conduta e Ética",
    },
    "corrupcao_passiva": {
        "nome": "Corrupção Passiva",
        "categoria": "cat4_conduta",
        "categoria_nome": "Crimes de Conduta e Ética",
    },
    "prevaricacao": {
        "nome": "Prevaricação",
        "categoria": "cat4_conduta",
        "categoria_nome": "Crimes de Conduta e Ética",
    },
    "advocacia_administrativa": {
        "nome": "Advocacia Administrativa",
        "categoria": "cat4_conduta",
        "categoria_nome": "Crimes de Conduta e Ética",
    },
    "condescendencia_criminosa": {
        "nome": "Condescendência Criminosa",
        "categoria": "cat4_conduta",
        "categoria_nome": "Crimes de Conduta e Ética",
    },
    "trafico_influencia": {
        "nome": "Tráfico de Influência",
        "categoria": "cat4_conduta",
        "categoria_nome": "Crimes de Conduta e Ética",
    },
    "nepotismo": {
        "nome": "Nepotismo",
        "categoria": "cat4_conduta",
        "categoria_nome": "Crimes de Conduta e Ética",
    },
    "nepotismo_cruzado": {
        "nome": "Nepotismo Cruzado",
        "categoria": "cat4_conduta",
        "categoria_nome": "Crimes de Conduta e Ética",
    },

    # ── Categoria 5: Violações aos Princípios da Administração ─────────────
    "violacao_impessoalidade": {
        "nome": "Violação da Impessoalidade",
        "categoria": "cat5_principios",
        "categoria_nome": "Violações aos Princípios da Administração",
    },
    "promocao_pessoal": {
        "nome": "Promoção Pessoal",
        "categoria": "cat5_principios",
        "categoria_nome": "Violações aos Princípios da Administração",
    },
    "clientelismo": {
        "nome": "Clientelismo",
        "categoria": "cat5_principios",
        "categoria_nome": "Violações aos Princípios da Administração",
    },
    "conflito_interesses": {
        "nome": "Conflito de Interesses",
        "categoria": "cat5_principios",
        "categoria_nome": "Violações aos Princípios da Administração",
    },
    "captura_regulatoria": {
        "nome": "Captura Regulatória",
        "categoria": "cat5_principios",
        "categoria_nome": "Violações aos Princípios da Administração",
    },
    "porta_giratoria": {
        "nome": "Porta Giratória",
        "categoria": "cat5_principios",
        "categoria_nome": "Violações aos Princípios da Administração",
    },

    # ── Categoria 6: Trato com Pessoas e Poder ─────────────────────────────
    "assedio_moral_org": {
        "nome": "Assédio Moral Organizacional",
        "categoria": "cat6_pessoas",
        "categoria_nome": "Trato com Pessoas e Poder",
    },
    "abuso_poder_simbolico": {
        "nome": "Abuso de Poder Simbólico",
        "categoria": "cat6_pessoas",
        "categoria_nome": "Trato com Pessoas e Poder",
    },
    "quebra_decoro": {
        "nome": "Quebra de Decoro",
        "categoria": "cat6_pessoas",
        "categoria_nome": "Trato com Pessoas e Poder",
    },
    "soberba_administrativa": {
        "nome": "Soberba Administrativa",
        "categoria": "cat6_pessoas",
        "categoria_nome": "Trato com Pessoas e Poder",
    },
    "personalismo": {
        "nome": "Personalismo",
        "categoria": "cat6_pessoas",
        "categoria_nome": "Trato com Pessoas e Poder",
    },

    # ── Categoria 7: Gestão da Verdade e Transparência ─────────────────────
    "incoerencia_etica": {
        "nome": "Incoerência Ética",
        "categoria": "cat7_transparencia",
        "categoria_nome": "Gestão da Verdade e Transparência",
    },
    "omissao_relevante": {
        "nome": "Omissão Relevante",
        "categoria": "cat7_transparencia",
        "categoria_nome": "Gestão da Verdade e Transparência",
    },
    "opacidade_deliberada": {
        "nome": "Opacidade Deliberada",
        "categoria": "cat7_transparencia",
        "categoria_nome": "Gestão da Verdade e Transparência",
    },
    "disfarce_legalidade": {
        "nome": "Disfarce de Legalidade",
        "categoria": "cat7_transparencia",
        "categoria_nome": "Gestão da Verdade e Transparência",
    },
    "cinismo_politico": {
        "nome": "Cinismo Político",
        "categoria": "cat7_transparencia",
        "categoria_nome": "Gestão da Verdade e Transparência",
    },

    # ── Categoria 8: Relacionamento com Interesses Privados ────────────────
    "amiguismo": {
        "nome": "Amiguismo (Cronyism)",
        "categoria": "cat8_privado",
        "categoria_nome": "Relacionamento com Interesses Privados",
    },
    "fisiologismo": {
        "nome": "Fisiologismo",
        "categoria": "cat8_privado",
        "categoria_nome": "Relacionamento com Interesses Privados",
    },
    "captura_carater": {
        "nome": "Captura de Caráter",
        "categoria": "cat8_privado",
        "categoria_nome": "Relacionamento com Interesses Privados",
    },
    "clientelismo_servicos": {
        "nome": "Clientelismo (Serviços)",
        "categoria": "cat8_privado",
        "categoria_nome": "Relacionamento com Interesses Privados",
    },

    # ── Categoria 9: Integridade Institucional ─────────────────────────────
    "deslealdade_institucional": {
        "nome": "Deslealdade Institucional",
        "categoria": "cat9_institucional",
        "categoria_nome": "Integridade Institucional",
    },
    "seletividade_administrativa": {
        "nome": "Seletividade Administrativa",
        "categoria": "cat9_institucional",
        "categoria_nome": "Integridade Institucional",
    },
    "falsa_urgencia": {
        "nome": "Falsa Urgência",
        "categoria": "cat9_institucional",
        "categoria_nome": "Integridade Institucional",
    },
    "apatia_burocratica": {
        "nome": "Apatia Burocrática",
        "categoria": "cat9_institucional",
        "categoria_nome": "Integridade Institucional",
    },
    "blindagem_pares": {
        "nome": "Blindagem de Pares",
        "categoria": "cat9_institucional",
        "categoria_nome": "Integridade Institucional",
    },
    "mercantilizacao_cargo": {
        "nome": "Mercantilização do Cargo",
        "categoria": "cat9_institucional",
        "categoria_nome": "Integridade Institucional",
    },
}

CODIGOS_VALIDOS = set(TAXONOMIA.keys())

# Texto compacto para incluir nos prompts dos modelos
LISTA_TAGS_PROMPT = "\n".join(
    f'  "{codigo}" — {info["nome"]} ({info["categoria_nome"]})'
    for codigo, info in TAXONOMIA.items()
)


def codigos_para_prompt(limit: int | None = None) -> str:
    items = list(TAXONOMIA.items())
    if limit:
        items = items[:limit]
    return "\n".join(f'  "{c}" — {i["nome"]}' for c, i in items)


# ---------------------------------------------------------------------------
# Persistência
# ---------------------------------------------------------------------------

async def salvar_tags_piper(
    db: AsyncSession,
    ato_id: uuid.UUID,
    analise_id: uuid.UUID,
    tenant_id: uuid.UUID,
    tags_raw: list[dict],
) -> None:
    """Salva tags identificadas pelo Piper. Substitui qualquer tag anterior do Piper."""
    from app.models.tag import AtoTag, TagHistorico

    # Remove tags anteriores deste ato atribuídas pelo piper
    await db.execute(
        delete(AtoTag).where(
            AtoTag.ato_id == ato_id,
            AtoTag.atribuido_por == "piper",
        )
    )

    agora = datetime.now(timezone.utc)
    for tag_item in tags_raw:
        codigo = tag_item.get("codigo", "")
        if codigo not in CODIGOS_VALIDOS:
            continue
        info = TAXONOMIA[codigo]
        gravidade = tag_item.get("gravidade", "media")
        justificativa = tag_item.get("justificativa", "")

        tag = AtoTag(
            id=uuid.uuid4(),
            ato_id=ato_id,
            analise_id=analise_id,
            tenant_id=tenant_id,
            codigo=codigo,
            nome=info["nome"],
            categoria=info["categoria"],
            categoria_nome=info["categoria_nome"],
            gravidade=gravidade,
            ativa=True,
            atribuido_por="piper",
            revisado_por=None,
            justificativa=justificativa,
            criado_em=agora,
            atualizado_em=agora,
        )
        db.add(tag)

        hist = TagHistorico(
            id=uuid.uuid4(),
            ato_id=ato_id,
            analise_id=analise_id,
            tag_codigo=codigo,
            acao="adicionada",
            modelo="piper",
            justificativa=justificativa,
            gravidade_anterior=None,
            gravidade_nova=gravidade,
            criado_em=agora,
        )
        db.add(hist)


async def revisar_tags_bud_new(
    db: AsyncSession,
    ato_id: uuid.UUID,
    analise_id: uuid.UUID,
    tenant_id: uuid.UUID,
    tags_revisadas: list[dict],
    modelo: str,  # "bud" ou "new"
) -> None:
    """Aplica revisão de tags por Bud ou New — pode confirmar, remover, adicionar, elevar, rebaixar."""
    from app.models.tag import AtoTag, TagHistorico

    agora = datetime.now(timezone.utc)

    # Carrega tags ativas atuais
    result = await db.execute(
        select(AtoTag).where(AtoTag.ato_id == ato_id, AtoTag.ativa == True)
    )
    tags_atuais: dict[str, AtoTag] = {t.codigo: t for t in result.scalars().all()}

    for rev in tags_revisadas:
        codigo = rev.get("codigo", "")
        if codigo not in CODIGOS_VALIDOS:
            continue
        acao = rev.get("acao", "confirmada")
        gravidade_nova = rev.get("gravidade", "media")
        justificativa = rev.get("justificativa", "")

        tag_existente = tags_atuais.get(codigo)

        if acao == "removida":
            if tag_existente:
                tag_existente.ativa = False
                tag_existente.revisado_por = modelo
                tag_existente.atualizado_em = agora
            hist = TagHistorico(
                id=uuid.uuid4(),
                ato_id=ato_id,
                analise_id=analise_id,
                tag_codigo=codigo,
                acao="removida",
                modelo=modelo,
                justificativa=justificativa,
                gravidade_anterior=tag_existente.gravidade if tag_existente else None,
                gravidade_nova=None,
                criado_em=agora,
            )
            db.add(hist)

        elif acao in ("confirmada", "adicionada", "elevada", "rebaixada"):
            info = TAXONOMIA[codigo]
            if tag_existente:
                gravidade_anterior = tag_existente.gravidade
                tag_existente.gravidade = gravidade_nova
                tag_existente.revisado_por = modelo
                tag_existente.atualizado_em = agora
                if acao == "confirmada" and gravidade_anterior == gravidade_nova:
                    acao_hist = "confirmada"
                elif gravidade_nova > gravidade_anterior:
                    acao_hist = "elevada"
                else:
                    acao_hist = acao
            else:
                # Tag nova identificada por Bud/New
                nova_tag = AtoTag(
                    id=uuid.uuid4(),
                    ato_id=ato_id,
                    analise_id=analise_id,
                    tenant_id=tenant_id,
                    codigo=codigo,
                    nome=info["nome"],
                    categoria=info["categoria"],
                    categoria_nome=info["categoria_nome"],
                    gravidade=gravidade_nova,
                    ativa=True,
                    atribuido_por=modelo,
                    revisado_por=None,
                    justificativa=justificativa,
                    criado_em=agora,
                    atualizado_em=agora,
                )
                db.add(nova_tag)
                acao_hist = "adicionada"
                gravidade_anterior = None

            hist = TagHistorico(
                id=uuid.uuid4(),
                ato_id=ato_id,
                analise_id=analise_id,
                tag_codigo=codigo,
                acao=acao_hist,
                modelo=modelo,
                justificativa=justificativa,
                gravidade_anterior=gravidade_anterior if tag_existente else None,
                gravidade_nova=gravidade_nova,
                criado_em=agora,
            )
            db.add(hist)


async def buscar_tags_ativas(db: AsyncSession, ato_id: uuid.UUID) -> list[dict]:
    """Retorna tags ativas de um ato como lista de dicts (para passar como contexto ao Bud/New)."""
    from app.models.tag import AtoTag
    result = await db.execute(
        select(AtoTag).where(AtoTag.ato_id == ato_id, AtoTag.ativa == True)
    )
    return [
        {
            "codigo": t.codigo,
            "nome": t.nome,
            "categoria_nome": t.categoria_nome,
            "gravidade": t.gravidade,
            "atribuido_por": t.atribuido_por,
        }
        for t in result.scalars().all()
    ]
