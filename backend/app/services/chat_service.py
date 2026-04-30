import json
import re
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text as sql_text

from app.config import settings
from app.database import async_session_factory
from app.models.ato import Ato, ConteudoAto
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

COMO CITAR (OBRIGATÓRIO):
Sempre que mencionar um ato, formate a citação como link markdown:
  [TIPO Nº (dd/mm/aaaa)](/painel/{slug}/ato/<id>)
O <id> está no campo "id:" de cada bloco do contexto. Exemplo correto:
  [PORTARIA 384 (10/10/2022)](/painel/cau-pr/ato/6391ed49-d420-405b-8287-6bb039cbb871)
Nunca cite um ato sem o link. Nunca invente IDs — só use os IDs presentes no contexto.

LINGUAGEM:
- Formal mas acessível, sem jargão jurídico desnecessário
- Use "suspeita", "indício", "padrão irregular" — nunca "crime confirmado"
- Seja direto e útil: aponte a irregularidade específica e sugira o que fazer com ela

QUANDO O CONTEXTO TROUXER "PESSOAS ENCONTRADAS" OU "TRECHOS DE TEXTO":
- Eles vêm da própria base auditada — confie neles e cite os atos referenciados
- Se houver aparições de uma pessoa, liste TODAS (não diga que ela não aparece)
- Se houver trechos com a expressão buscada, mencione o ato e cite o trecho

DISTRIBUIÇÃO ATUAL DA AUDITORIA:
🔴 Vermelho (crítico): {vermelho} atos
🟠 Laranja (grave): {laranja} atos
🟡 Amarelo (suspeito): {amarelo} atos
🟢 Verde (conforme): {verde} atos
"""


_STOPWORDS = {
    "para", "como", "qual", "quais", "sobre", "entre", "esse", "essa",
    "isso", "atos", "anos", "pela", "pelo", "seus", "suas", "mais", "menos",
    "quando", "onde", "porque", "quem", "foram", "houve", "existe", "tenho",
    "tinha", "esta", "está", "estão", "estive", "esteve", "tive", "teve",
    "tem", "tens", "muito", "pouco", "pode", "podem", "deve", "devem",
    "alguma", "algum", "algumas", "alguns", "nenhuma", "nenhum",
    "porventura", "tambem", "também", "todos", "todas", "outro", "outra",
    "outros", "outras", "ainda", "depois", "antes", "agora", "voce", "você",
    "voces", "vocês", "minha", "meu", "minhas", "meus", "nosso", "nossa",
    "nossos", "nossas", "deles", "delas", "eles", "elas", "fazer", "feito",
}


_NOME_PROPRIO_RE = re.compile(
    r"\b[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÇ][a-záéíóúãõâêîôûàèìòùç]{2,}"
    r"(?:\s+(?:d[ao]s?|del|de|von|van)\s+|\s+)"
    r"[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÇ][a-záéíóúãõâêîôûàèìòùç]{2,}"
    r"(?:\s+[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÇ][a-záéíóúãõâêîôûàèìòùç]{2,})*\b"
)


def _extrair_palavras_chave(pergunta: str) -> list[str]:
    nums = re.findall(r"\b\d{3,4}\b", pergunta)
    nomes = re.findall(r"\b[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙ][a-záéíóúãõâêîôûàèìòù]{3,}\b", pergunta)
    termos = [
        w for w in pergunta.lower().split()
        if len(w) > 4 and w not in _STOPWORDS and not w.isdigit()
    ]
    return (nums + nomes + termos)[:8]


_INICIAIS_FRASE = {
    "Eu", "Você", "Voce", "Vocês", "Voces", "Quem", "Quando", "Onde",
    "Como", "Qual", "Quais", "Por", "O", "A", "Os", "As", "Um", "Uma",
    "Tem", "Há", "Existe", "Existem", "Pode", "Posso", "Mostre", "Liste",
    "Procure", "Procura", "Busque", "Busca", "Cite", "Diga", "Fale",
    "Encontre", "Verifique", "Veja", "Hoje", "Ontem",
}


def _extrair_nomes_proprios(pergunta: str) -> list[str]:
    """Extrai nomes próprios (preferindo 2+ palavras; aceita 1 palavra incomum)."""
    matches = _NOME_PROPRIO_RE.findall(pergunta)
    cleaned: list[str] = []
    for m in matches:
        m = m.strip()
        if 5 < len(m) < 100 and m.lower() not in _STOPWORDS:
            cleaned.append(m)

    # Palavras isoladas começando com maiúscula (sobrenome solto na pergunta).
    # Filtra início de frase comum e palavras já capturadas pelas matches multiword.
    extras = re.findall(r"\b[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÇ][a-záéíóúãõâêîôûàèìòùç]{3,}\b", pergunta)
    for e in extras:
        if e in _INICIAIS_FRASE:
            continue
        if e.lower() in _STOPWORDS:
            continue
        if any(e in c for c in cleaned):
            continue
        cleaned.append(e)

    # Remove duplicatas preservando ordem
    seen: set[str] = set()
    out: list[str] = []
    for c in cleaned:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out[:5]


async def _buscar_pessoas(
    nomes: list[str], tenant_id: uuid.UUID, db: AsyncSession
) -> str:
    """Para cada nome, busca em pessoas + aparicoes_pessoa e retorna bloco formatado.
    Estratégia: AND de tokens — ex: 'Regis Wilczek' exige nome conter 'regis' E 'wilczek',
    o que casa 'REGIS ALESSANDER WILCZEK' (com nome do meio entre eles).
    """
    if not nomes:
        return ""

    pessoas_vistas: set[str] = set()
    blocos: list[str] = []

    for nome in nomes:
        # tokens do nome buscado (≥3 chars cada)
        tokens = [t.lower() for t in re.split(r"\s+", nome) if len(t) >= 3]
        if not tokens:
            continue

        # Monta cláusula: cada token precisa estar em nome_normalizado OU em alguma variante
        conds_sql_parts = []
        params: dict = {"tid": str(tenant_id)}
        for i, tok in enumerate(tokens):
            params[f"t{i}"] = f"%{tok}%"
            conds_sql_parts.append(
                f"(LOWER(p.nome_normalizado) LIKE :t{i} "
                f"OR EXISTS (SELECT 1 FROM unnest(COALESCE(p.variantes_nome, ARRAY[]::text[])) v "
                f"WHERE LOWER(v) LIKE :t{i}))"
            )
        cond_sql = " AND ".join(conds_sql_parts)

        q = sql_text(f"""
            SELECT p.id, p.nome_normalizado, p.cargo_mais_recente, p.total_aparicoes,
                   p.primeiro_ato_data, p.ultimo_ato_data
            FROM pessoas p
            WHERE p.tenant_id = :tid AND ({cond_sql})
            ORDER BY p.total_aparicoes DESC
            LIMIT 5
        """)
        result = await db.execute(q, params)
        pessoas = list(result)
        if not pessoas:
            continue

        for p in pessoas:
            pessoa_id, nome_n, cargo, total, prim, ult = p
            if str(pessoa_id) in pessoas_vistas:
                continue
            pessoas_vistas.add(str(pessoa_id))
            primeira = prim.strftime("%d/%m/%Y") if prim else "?"
            ultima = ult.strftime("%d/%m/%Y") if ult else "?"
            bloco = (
                f"\nPESSOA: {nome_n}\n"
                f"  Cargo mais recente: {cargo or 'não informado'}\n"
                f"  Total de aparições: {total}  ({primeira} → {ultima})"
            )

            # aparições detalhadas
            q2 = sql_text("""
                SELECT a.id, a.tipo, a.numero, a.data_publicacao, ap.tipo_aparicao, ap.cargo
                FROM aparicoes_pessoa ap
                JOIN atos a ON a.id = ap.ato_id
                WHERE ap.pessoa_id = :pid
                ORDER BY a.data_publicacao DESC NULLS LAST
                LIMIT 20
            """)
            r2 = await db.execute(q2, {"pid": str(pessoa_id)})
            aps = list(r2)
            if aps:
                bloco += "\n  Aparições:"
                for ap in aps:
                    ato_id, tipo, num, dt, tipo_ap, cargo_ap = ap
                    dt_s = dt.strftime("%d/%m/%Y") if dt else "s/d"
                    bloco += (
                        f"\n   - id:{ato_id} | {tipo.upper()} {num} ({dt_s}) — "
                        f"{tipo_ap}: {cargo_ap or '-'}"
                    )
            blocos.append(bloco)

    if not blocos:
        return ""
    return "PESSOAS ENCONTRADAS NA BASE AUDITADA:\n" + "\n---".join(blocos)


def _extrair_snippet(texto: str, termo: str, janela: int = 220) -> str:
    """Acha primeira ocorrência (case-insensitive) e retorna ±janela ao redor."""
    if not texto or not termo:
        return ""
    idx = texto.lower().find(termo.lower())
    if idx < 0:
        return ""
    inicio = max(0, idx - janela)
    fim = min(len(texto), idx + len(termo) + janela)
    snippet = texto[inicio:fim].replace("\n", " ").strip()
    prefixo = "…" if inicio > 0 else ""
    sufixo = "…" if fim < len(texto) else ""
    return f"{prefixo}{snippet}{sufixo}"


def _snippet_word_boundary(texto: str, termo: str, janela: int = 220) -> str:
    """Acha primeira ocorrência com word boundary (não casa 'Regis' dentro de 'Registro')."""
    if not texto or not termo:
        return ""
    pat = re.compile(r"\b" + re.escape(termo) + r"\b", re.IGNORECASE)
    m = pat.search(texto)
    if not m:
        return ""
    inicio = max(0, m.start() - janela)
    fim = min(len(texto), m.end() + janela)
    snippet = texto[inicio:fim].replace("\n", " ").strip()
    prefixo = "…" if inicio > 0 else ""
    sufixo = "…" if fim < len(texto) else ""
    return f"{prefixo}{snippet}{sufixo}"


async def _buscar_em_textos_completos(
    termos: list[str], tenant_id: uuid.UUID, db: AsyncSession, max_atos: int = 8
) -> str:
    """Busca termos em conteudo_ato.texto_completo com word-boundary e retorna trechos.
    Usa regex POSIX `~*` com `\\y...\\y` (PostgreSQL word boundary) — evita falsos
    positivos como 'Regis' dentro de 'REGISTRO'.
    """
    if not termos:
        return ""

    bons = [t for t in termos if len(t) >= 4][:5]
    if not bons:
        return ""

    conds_sql = " OR ".join([f"c.texto_completo ~* :t{i}" for i in range(len(bons))])
    params: dict = {"tid": str(tenant_id), "lim": max_atos}
    for i, t in enumerate(bons):
        # \y = word boundary (PostgreSQL); escapa o termo para neutralizar metacaracteres
        params[f"t{i}"] = r"\y" + re.escape(t) + r"\y"

    q = sql_text(f"""
        SELECT a.id, a.tipo, a.numero, a.data_publicacao, c.texto_completo
        FROM atos a
        JOIN conteudo_ato c ON c.ato_id = a.id
        WHERE a.tenant_id = :tid
          AND ({conds_sql})
        ORDER BY a.data_publicacao DESC NULLS LAST
        LIMIT :lim
    """)
    result = await db.execute(q, params)
    rows = list(result)
    if not rows:
        return ""

    blocos: list[str] = []
    for row in rows:
        ato_id, tipo, num, dt, texto = row
        dt_s = dt.strftime("%d/%m/%Y") if dt else "s/d"
        snippet = ""
        for t in bons:
            snippet = _snippet_word_boundary(texto, t)
            if snippet:
                break
        if not snippet:
            continue
        blocos.append(
            f"id:{ato_id} | {tipo.upper()} {num} ({dt_s}):\n  {snippet}"
        )

    if not blocos:
        return ""
    return "TRECHOS DE TEXTO ONDE A EXPRESSÃO APARECE:\n\n" + "\n\n".join(blocos)


async def _buscar_contexto(
    pergunta: str, tenant_id: uuid.UUID, db: AsyncSession
) -> tuple[str, dict]:
    palavras = _extrair_palavras_chave(pergunta)
    nomes_proprios = _extrair_nomes_proprios(pergunta)

    stats = {
        "atos_consultados": 0,
        "pessoas_encontradas": 0,
        "trechos_encontrados": 0,
    }

    partes: list[str] = []

    # 1) Pessoas — quando há nome próprio na pergunta, busca SEMPRE primeiro
    if nomes_proprios:
        bloco_pessoas = await _buscar_pessoas(nomes_proprios, tenant_id, db)
        if bloco_pessoas:
            partes.append(bloco_pessoas)
            stats["pessoas_encontradas"] = bloco_pessoas.count("PESSOA:")

    # 2) Trechos de texto completo — quando há nome próprio ou termos específicos
    termos_fulltext = nomes_proprios + [p for p in palavras if len(p) >= 5][:3]
    if termos_fulltext:
        bloco_trechos = await _buscar_em_textos_completos(
            termos_fulltext, tenant_id, db, max_atos=6
        )
        if bloco_trechos:
            partes.append(bloco_trechos)
            stats["trechos_encontrados"] = bloco_trechos.count("\n\n") - 1

    # 3) Atos via ementa/titulo/numero — abordagem original
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
            .limit(10)
        )
        result = await db.execute(q)
        rows = result.all()

    # Fallback: se nada veio em nenhuma das 3 buscas, retorna críticos
    if not rows and not partes:
        q = (
            _join_analise(select(Ato, Analise))
            .where(Ato.tenant_id == tenant_id)
            .where(Analise.nivel_alerta.in_(["vermelho", "laranja"]))
            .order_by(Analise.score_risco.desc().nullslast())
            .limit(8)
        )
        result = await db.execute(q)
        rows = result.all()

    stats["atos_consultados"] = len(rows)

    if rows:
        bloco = ["DADOS RELEVANTES DO BANCO DE AUDITORIA:\n"]
        for ato, analise in rows:
            nivel = analise.nivel_alerta.upper() if analise and analise.nivel_alerta else "NÃO ANALISADO"
            score = analise.score_risco if analise else 0
            data_str = ato.data_publicacao.strftime("%d/%m/%Y") if ato.data_publicacao else "s/d"
            ementa = (ato.ementa or "")[:280]
            parte = (
                f"\nid:{ato.id} | {ato.tipo.upper()} Nº {ato.numero} — {data_str}"
                f"\nEmenta: {ementa}\nNível: {nivel} (score {score})"
            )
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
            bloco.append(parte)
        partes.append("\n---".join(bloco))

    if not partes:
        return "Nenhum dado relevante encontrado para esta pergunta.", stats

    context = "\n\n========\n\n".join(partes)
    if len(context) > 32_000:
        context = context[:32_000] + "\n[contexto truncado por limite de tokens]"
    return context, stats


async def _build_system_prompt(tenant_id: uuid.UUID, db: AsyncSession) -> str:
    tenant_r = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_r.scalar_one_or_none()
    nome = tenant.nome if tenant else "CAU/PR"
    slug = tenant.slug if tenant else "cau-pr"

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
        slug=slug,
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


def _get_chat_client():
    """
    Cliente Gemini via OpenAI-compat (mesmo backend usado pelo Piper).
    """
    import openai
    return openai.AsyncOpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=settings.gemini_api_key,
    )


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

    client = _get_chat_client()
    modelo = settings.gemini_flash_lite_model

    full_response = ""
    tokens_in = 0
    tokens_out = 0

    try:
        stream = await client.chat.completions.create(
            model=modelo,
            messages=[{"role": "system", "content": system_prompt}] + messages,
            max_tokens=2000,
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
    # Gemini 2.5 Flash Lite: $0.10/1M input, $0.40/1M output
    custo = Decimal(str(round(tokens_in * 1e-7 + tokens_out * 4e-7, 8)))

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
