import json
import re
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from app.config import settings
from app.database import async_session_factory
from app.models.ato import Ato
from app.models.analise import Analise
from app.models.chat import ChatSessao, ChatMensagem
from app.models.tenant import Tenant


_SYSTEM_PROMPT = """\
Você é um analista especializado em transparência pública e controle social, \
trabalhando com dados auditados do {nome_orgao}.

Você tem acesso aos resultados de uma auditoria de {total_atos} atos administrativos \
do {nome_orgao}, analisados por IA com base no Regimento Interno vigente.

VOCÊ PODE:
- Explicar indícios e suspeitas identificados em atos específicos
- Identificar padrões entre múltiplos atos
- Produzir resumos, fichas de denúncia e textos para uso político ou jornalístico
- Responder sobre pessoas, cargos e relacionamentos detectados nos atos
- Calcular estatísticas e comparações dos dados

VOCÊ NÃO PODE:
- Afirmar que houve crime (isso é competência judicial)
- Inventar dados que não estão na base auditada
- Opinar sobre política partidária ou recomendar candidatos
- Revelar dados pessoais de usuários da plataforma

COMO CITAR:
Sempre que mencionar um ato, cite: Tipo + Número + Data
Exemplo: "conforme Portaria 678 de 02/04/2026"

LINGUAGEM:
- Formal mas acessível, sem jargão jurídico desnecessário
- Use "suspeita", "indício", "padrão irregular" — nunca "crime confirmado"
- Seja direto e útil: aponte a irregularidade específica e sugira o que fazer com ela

DISTRIBUIÇÃO ATUAL DA AUDITORIA:
🔴 Vermelho (crítico): {vermelho} atos
🟠 Laranja (grave): {laranja} atos
🟡 Amarelo (suspeito): {amarelo} atos
🟢 Verde (conforme): {verde} atos
"""


def _extrair_palavras_chave(pergunta: str) -> list[str]:
    nums = re.findall(r"\b\d{3,4}\b", pergunta)
    nomes = re.findall(r"\b[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙ][a-záéíóúãõâêîôûàèìòù]{3,}\b", pergunta)
    stop = {
        "para", "como", "qual", "quais", "sobre", "entre", "esse", "essa",
        "isso", "atos", "anos", "pela", "pelo", "seus", "suas", "mais", "menos",
        "quando", "onde", "porque", "quem", "foram", "houve", "existe", "foram",
    }
    termos = [w for w in pergunta.lower().split() if len(w) > 4 and w not in stop]
    return (nums + nomes + termos)[:8]


async def _buscar_contexto(
    pergunta: str, tenant_id: uuid.UUID, db: AsyncSession
) -> tuple[str, dict]:
    palavras = _extrair_palavras_chave(pergunta)

    latest_subq = (
        select(Analise.ato_id, func.max(Analise.criado_em).label("max_dt"))
        .where(Analise.tenant_id == tenant_id)
        .group_by(Analise.ato_id)
        .subquery()
    )

    def _join_analise(q):
        return q.outerjoin(
            latest_subq, Ato.id == latest_subq.c.ato_id
        ).outerjoin(
            Analise,
            and_(
                Analise.ato_id == Ato.id,
                Analise.criado_em == latest_subq.c.max_dt,
            ),
        )

    rows = []

    if palavras:
        conds = []
        for p in palavras:
            conds.append(Ato.ementa.ilike(f"%{p}%"))
            conds.append(Ato.titulo.ilike(f"%{p}%"))
            conds.append(Ato.numero.ilike(f"%{p}%"))
        q = (
            _join_analise(select(Ato, Analise))
            .where(Ato.tenant_id == tenant_id)
            .where(or_(*conds))
            .order_by(Analise.score_risco.desc().nullslast(), Ato.data_publicacao.desc().nullslast())
            .limit(15)
        )
        result = await db.execute(q)
        rows = result.all()

    if not rows:
        q = (
            _join_analise(select(Ato, Analise))
            .where(Ato.tenant_id == tenant_id)
            .where(Analise.nivel_alerta.in_(["vermelho", "laranja"]))
            .order_by(Analise.score_risco.desc().nullslast())
            .limit(10)
        )
        result = await db.execute(q)
        rows = result.all()

    stats = {"atos_consultados": len(rows)}
    if not rows:
        return "Nenhum dado relevante encontrado para esta pergunta.", stats

    partes = ["DADOS RELEVANTES DO BANCO DE AUDITORIA:\n"]
    for ato, analise in rows:
        nivel = analise.nivel_alerta.upper() if analise and analise.nivel_alerta else "NÃO ANALISADO"
        score = analise.score_risco if analise else 0
        data_str = ato.data_publicacao.strftime("%d/%m/%Y") if ato.data_publicacao else "s/d"
        ementa = (ato.ementa or "")[:280]
        parte = f"\n{ato.tipo.upper()} Nº {ato.numero} — {data_str}\nEmenta: {ementa}\nNível: {nivel} (score {score})"
        if analise and analise.resumo_executivo:
            parte += f"\nAnálise: {analise.resumo_executivo[:400]}"
        if analise and analise.resultado_piper:
            indicios = (analise.resultado_piper or {}).get("indicios", [])[:3]
            if indicios:
                parte += "\nIndícios:"
                for ind in indicios:
                    grav = ind.get("gravidade", "?").upper()
                    tipo = ind.get("tipo", "")
                    desc = ind.get("descricao", "")[:120]
                    parte += f"\n  [{grav}] {tipo}: {desc}"
        partes.append(parte)

    context = "\n---".join(partes)
    if len(context) > 28_000:
        context = context[:28_000] + "\n[contexto truncado por limite de tokens]"
    return context, stats


async def _build_system_prompt(tenant_id: uuid.UUID, db: AsyncSession) -> str:
    tenant_r = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_r.scalar_one_or_none()
    nome = tenant.nome if tenant else "CAU/PR"

    total_r = await db.execute(
        select(func.count()).select_from(Ato).where(Ato.tenant_id == tenant_id)
    )
    total = total_r.scalar() or 0

    dist_r = await db.execute(
        select(Analise.nivel_alerta, func.count().label("n"))
        .where(Analise.tenant_id == tenant_id)
        .group_by(Analise.nivel_alerta)
    )
    dist = {r.nivel_alerta: r.n for r in dist_r}

    return _SYSTEM_PROMPT.format(
        nome_orgao=nome,
        total_atos=total,
        vermelho=dist.get("vermelho", 0),
        laranja=dist.get("laranja", 0),
        amarelo=dist.get("amarelo", 0),
        verde=dist.get("verde", 0),
    )


async def criar_sessao(user_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> ChatSessao:
    sessao = ChatSessao(
        user_id=user_id,
        tenant_id=tenant_id,
        ativa=True,
        total_mensagens=0,
        custo_total_usd=Decimal("0"),
    )
    db.add(sessao)
    await db.commit()
    await db.refresh(sessao)
    return sessao


async def listar_sessoes(
    user_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> list[ChatSessao]:
    result = await db.execute(
        select(ChatSessao)
        .where(
            ChatSessao.user_id == user_id,
            ChatSessao.tenant_id == tenant_id,
            ChatSessao.ativa == True,  # noqa: E712
        )
        .order_by(ChatSessao.ultima_msg_em.desc().nullslast())
        .limit(20)
    )
    return list(result.scalars().all())


async def get_sessao(sessao_id: str, user_id: str, db: AsyncSession) -> ChatSessao | None:
    result = await db.execute(
        select(ChatSessao).where(
            ChatSessao.id == uuid.UUID(sessao_id),
            ChatSessao.user_id == uuid.UUID(user_id),
        )
    )
    return result.scalar_one_or_none()


async def get_mensagens(sessao_id: str, db: AsyncSession, limit: int = 60) -> list[ChatMensagem]:
    result = await db.execute(
        select(ChatMensagem)
        .where(ChatMensagem.sessao_id == uuid.UUID(sessao_id))
        .order_by(ChatMensagem.criado_em.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def _get_historico_llm(sessao_id: str, db: AsyncSession, limit: int = 8) -> list[dict]:
    msgs = await get_mensagens(sessao_id, db, limit=limit * 2)
    return [{"role": m.role, "content": m.conteudo} for m in msgs[-(limit * 2):]]


async def stream_resposta(
    sessao_id: str,
    pergunta: str,
    user_id: str,
    tenant_id: uuid.UUID,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    """Yield SSE chunks, save exchange to DB after completion."""
    inicio = time.monotonic()

    # Cap de custo da sessão (auditoria A-9). Bloqueia ANTES de chamar a LLM.
    cap_usd = Decimal(str(settings.chat_session_cost_limit_usd))
    sessao_cost_r = await db.execute(
        select(ChatSessao.custo_total_usd).where(ChatSessao.id == uuid.UUID(sessao_id))
    )
    custo_acumulado = sessao_cost_r.scalar_one_or_none() or Decimal("0")
    if custo_acumulado >= cap_usd:
        yield (
            "data: "
            + json.dumps(
                {
                    "erro": (
                        f"Limite de custo da sessão atingido (USD {float(custo_acumulado):.4f} "
                        f"de USD {float(cap_usd):.2f}). Inicie uma nova sessão para continuar."
                    )
                },
                ensure_ascii=False,
            )
            + "\n\n"
        )
        yield f"data: {json.dumps({'fim': True})}\n\n"
        return

    historico = await _get_historico_llm(sessao_id, db)
    contexto, ctx_stats = await _buscar_contexto(pergunta, tenant_id, db)
    system_prompt = await _build_system_prompt(tenant_id, db)

    user_content = f"{contexto}\n\n---\nPERGUNTA: {pergunta}"
    messages = historico + [{"role": "user", "content": user_content}]

    import openai  # lazy import — only needed at runtime

    client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

    full_response = ""
    tokens_in = 0
    tokens_out = 0

    try:
        stream = await client.chat.completions.create(
            model=settings.openai_chat_model,
            messages=[{"role": "system", "content": system_prompt}] + messages,
            max_tokens=1500,
            temperature=0.3,
            stream=True,
            stream_options={"include_usage": True},
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                delta = chunk.choices[0].delta.content
                full_response += delta
                yield f"data: {json.dumps({'texto': delta}, ensure_ascii=False)}\n\n"
            if hasattr(chunk, "usage") and chunk.usage:
                tokens_in = chunk.usage.prompt_tokens or 0
                tokens_out = chunk.usage.completion_tokens or 0

    except Exception as exc:
        yield f"data: {json.dumps({'erro': str(exc)}, ensure_ascii=False)}\n\n"
    finally:
        yield f"data: {json.dumps({'fim': True})}\n\n"

    if not full_response:
        return

    tempo_ms = int((time.monotonic() - inicio) * 1000)
    # gpt-4o-mini: $0.150/1M input, $0.600/1M output
    custo = Decimal(str(round(tokens_in * 1.5e-7 + tokens_out * 6e-7, 8)))

    async with async_session_factory() as session:
        try:
            session.add(
                ChatMensagem(
                    sessao_id=uuid.UUID(sessao_id),
                    role="user",
                    conteudo=pergunta,
                    tipo_pergunta="chat",
                    custo_usd=Decimal("0"),
                )
            )
            session.add(
                ChatMensagem(
                    sessao_id=uuid.UUID(sessao_id),
                    role="assistant",
                    conteudo=full_response,
                    tipo_pergunta="chat",
                    contexto_usado=ctx_stats,
                    tokens_input=tokens_in,
                    tokens_output=tokens_out,
                    custo_usd=custo,
                    tempo_resposta_ms=tempo_ms,
                )
            )

            sessao_r = await session.execute(
                select(ChatSessao).where(ChatSessao.id == uuid.UUID(sessao_id))
            )
            sessao = sessao_r.scalar_one_or_none()
            if sessao:
                sessao.total_mensagens = (sessao.total_mensagens or 0) + 2
                sessao.custo_total_usd = (sessao.custo_total_usd or Decimal("0")) + custo
                sessao.ultima_msg_em = datetime.now(timezone.utc)
                if not sessao.titulo:
                    sessao.titulo = pergunta[:120]

            await session.commit()
        except Exception:
            await session.rollback()
