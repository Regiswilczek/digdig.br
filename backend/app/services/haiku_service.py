import base64
import json
import logging
import re
import uuid
from decimal import Decimal

logger = logging.getLogger(__name__)
from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models.ato import Ato, ConteudoAto
from app.models.analise import Analise, Irregularidade
from app.models.tenant import Tenant, KnowledgeBase
from app.services.pessoas_service import salvar_pessoas

client = AsyncAnthropic()

NIVEIS_VALIDOS = {"verde", "amarelo", "laranja", "vermelho"}

PRECOS_HAIKU = {
    "input": 0.80 / 1_000_000,
    "output": 4.00 / 1_000_000,
    "cache_read": 0.08 / 1_000_000,
    "cache_write": 1.00 / 1_000_000,
}

SYSTEM_PROMPT_TEMPLATE = """Você é um Auditor Investigativo Sênior especializado em direito administrativo brasileiro, compliance e detecção de fraudes no setor público.

Sua missão é analisar atos administrativos do {nome_orgao} e identificar indícios de irregularidades LEGAIS, MORAIS e ÉTICAS — mesmo quando o ato aparenta conformidade formal.

LINGUAGEM OBRIGATÓRIA — PRINCÍPIO DE DIVULGAÇÃO, NÃO AFIRMAÇÃO:
Você NUNCA afirma que um crime foi cometido. Você apresenta indícios, padrões e evidências.
A conclusão jurídica pertence ao leitor, ao advogado, ao promotor.
- USE: "indício de", "padrão suspeito de", "possível violação de", "elemento compatível com"
- EVITE: "é corrupto", "cometeu crime", "é ilegal", "é nepotismo" (como afirmação definitiva)
- A força investigativa está em apresentar TODOS os indícios de forma tão clara e fundamentada que o leitor chegue à conclusão por si mesmo — não em rotular.

MINDSET DE AUDITORIA (COMO VOCÊ DEVE PENSAR):
1. Omissões são evidências: O que NÃO está escrito (falta de dotação orçamentária, falta de motivação clara, falta de prazo) é tão importante quanto o que está escrito.
2. Princípios Constitucionais (LIMPE): Avalie sempre Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência (Art. 37 da CF). Um ato pode ser formalmente legal e ainda violar esses princípios.
3. Linguagem de Camuflagem: Desconfie de expressões como "necessidade imperiosa", "reestruturação estratégica" ou "interesse público" usadas sem base técnica objetiva.
4. Ato legalmente correto pode ser moralmente errado: Verifique nepotismo, perseguição política e concentração de poder mesmo quando o ato cumpre os ritos formais.

═══════════════════════════════════════════════
BASE LEGAL E REGULATÓRIA — {nome_orgao}
{regimento}
═══════════════════════════════════════════════

LEIS E NORMAS APLICÁVEIS:
{regras_especificas}

NÍVEIS DE ALERTA (CALIBRAÇÃO RIGOROSA):
- VERDE (score 0–20): Ato puramente burocrático, rotineiro, motivação clara, base legal explícita. Nenhuma omissão relevante.
- AMARELO (score 21–50): Falhas formais, omissões de dados obrigatórios, linguagem vaga, suspeita moral leve sem evidência concreta.
- LARANJA (score 51–75): Indícios claros de favorecimento, gastos sem justificativa técnica, concentração de poder, padrão suspeito de nomeações ou violação ética demonstrável.
- VERMELHO (score 76–100): Violação legal direta, nepotismo explícito, fracionamento de despesa confirmado, sobrepreço evidente ou fraude materializada no texto.

CRITÉRIOS DE ANÁLISE OBRIGATÓRIOS:

1. LEGAL: Violações diretas ao Regimento Interno e à Lei 12.378/2010
   - Autoridade incompetente para o ato
   - Violação de quórum, prazos excedidos, composição irregular de comissão
   - Ausência de dotação orçamentária em atos que geram despesa
   - Ausência de motivação técnica em dispensas, nomeações e exonerações
   - Fracionamento de despesa para fugir de licitação obrigatória

2. MORAL/ÉTICO (mesmo que "formalmente legal"):
   - Nepotismo e nepotismo cruzado (nomeações de aliados ou troca de favores)
   - Concentração de poder via Ad Referendum excessivo ou acúmulo de cargos
   - Perseguição política via comissões processantes ou exonerações sem causa
   - Cabide de empregos (mesmas pessoas em múltiplas comissões remuneradas)
   - Gastos questionáveis, diárias excessivas, contratos sem justificativa técnica
   - Falta de transparência, opacidade deliberada, omissão de informações relevantes

3. EXTRAÇÃO ESTRUTURADA:
   - Nomes completos, cargos, valores monetários, referências a atos anteriores

REGRA ANTI-ALUCINAÇÃO: Toda conclusão deve ser ancorada no texto fornecido. Cite o trecho exato que suporta cada indício. Se a evidência é uma omissão, descreva explicitamente qual elemento obrigatório está ausente.

Responda SEMPRE em JSON válido com esta estrutura exata:
{{
  "nivel_alerta": "verde|amarelo|laranja|vermelho",
  "score_risco": <inteiro de 0 a 100 conforme calibração dos níveis acima>,
  "resumo": "2-3 frases",
  "indicios": [{{"categoria": "legal|moral|etica|processual", "tipo": "string", "descricao": "string", "artigo_violado": "string|null", "gravidade": "baixa|media|alta|critica"}}],
  "pessoas_extraidas": [{{"nome": "string", "cargo": "string", "tipo_aparicao": "nomeado|exonerado|assina|membro_comissao|processado|mencionado"}}],
  "valores_monetarios": [],
  "referencias_atos": [],
  "requer_aprofundamento": false,
  "motivo_aprofundamento": "string|null"
}}"""


def _try_parse_json(text: str) -> dict | None:
    try:
        result = json.loads(text)
        if result.get("nivel_alerta") not in NIVEIS_VALIDOS:
            result["nivel_alerta"] = "amarelo"
        return result
    except (json.JSONDecodeError, AttributeError):
        return None


def _extrair_objetos_de_array(texto: str, campo: str) -> list:
    """Extrai objetos JSON completos de um array que pode estar truncado."""
    match = re.search(rf'"{campo}"\s*:\s*\[', texto)
    if not match:
        return []
    pos = match.end()
    objetos, prof, inicio = [], 0, None
    for i, c in enumerate(texto[pos:], pos):
        if c == '{':
            if prof == 0:
                inicio = i
            prof += 1
        elif c == '}':
            prof -= 1
            if prof == 0 and inicio is not None:
                try:
                    objetos.append(json.loads(texto[inicio:i + 1]))
                except json.JSONDecodeError:
                    pass
                inicio = None
        elif c == ']' and prof == 0:
            break
    return objetos


def parse_haiku_response(raw_text: str) -> dict:
    # 1. Try raw text first
    result = _try_parse_json(raw_text.strip())
    if result is not None:
        return result

    # 2. Strip markdown code fences and try again
    text = re.sub(r"^```(?:json)?\s*\n?", "", raw_text.strip(), flags=re.MULTILINE)
    text = re.sub(r"\n?```\s*$", "", text.strip(), flags=re.MULTILINE)
    result = _try_parse_json(text)
    if result is not None:
        return result

    # 3. Extract first {...} block from the text (handles prose before/after JSON)
    json_match = re.search(r"\{.*\}", text, re.DOTALL)
    if json_match:
        result = _try_parse_json(json_match.group())
        if result is not None:
            return result

    # 4. Partial extraction — salvage what was written before truncation
    logger.warning("haiku_parse_error", extra={"raw_first_300": raw_text[:300]})

    nivel_match = re.search(r'"nivel_alerta"\s*:\s*"(\w+)"', raw_text)
    nivel = nivel_match.group(1) if nivel_match else "amarelo"
    if nivel not in NIVEIS_VALIDOS:
        nivel = "amarelo"

    score_match = re.search(r'"score_risco"\s*:\s*(\d+)', raw_text)
    score = int(score_match.group(1)) if score_match else 50

    resumo_match = re.search(r'"resumo"\s*:\s*"((?:[^"\\]|\\.)*)"', raw_text)
    resumo = (
        resumo_match.group(1)
        if resumo_match
        else "Análise parcial — resposta truncada por limite de tokens."
    )

    return {
        "nivel_alerta": nivel,
        "score_risco": score,
        "resumo": resumo,
        "indicios": _extrair_objetos_de_array(raw_text, "indicios"),
        "pessoas_extraidas": _extrair_objetos_de_array(raw_text, "pessoas_extraidas"),
        "valores_monetarios": _extrair_objetos_de_array(raw_text, "valores_monetarios"),
        "referencias_atos": _extrair_objetos_de_array(raw_text, "referencias_atos"),
        "requer_aprofundamento": False,
        "motivo_aprofundamento": None,
        "parse_error": True,
        "tokens_truncado": True,
    }


async def montar_system_prompt(db: AsyncSession, tenant_id: uuid.UUID) -> str:
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one()

    # Busca todos os documentos da KB — regimento, lei, resolucao, etc.
    kb_result = await db.execute(
        select(KnowledgeBase)
        .where(KnowledgeBase.tenant_id == tenant_id)
        .order_by(KnowledgeBase.tipo.asc(), KnowledgeBase.criado_em.desc())
    )
    kb_docs = kb_result.scalars().all()

    regimento = "Regimento não cadastrado — analise com base na Lei 12.378/2010."
    docs_extras: list[str] = []

    for doc in kb_docs:
        if doc.tipo == "regimento":
            regimento = doc.conteudo
        else:
            docs_extras.append(
                f"─── {doc.titulo} ({doc.tipo}) ───\n{doc.conteudo}"
            )

    regras_especificas = (
        "\n\n".join(docs_extras)
        if docs_extras
        else "Sem documentos adicionais cadastrados (lei federal, resoluções CAU/BR)."
    )

    return SYSTEM_PROMPT_TEMPLATE.format(
        nome_orgao=tenant.nome_completo,
        regimento=regimento,
        regras_especificas=regras_especificas,
    )


async def analisar_ato_haiku(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID | None,
    system_prompt: str,
) -> Analise:
    """
    Raises anthropic.RateLimitError and anthropic.APIError on API failure.
    Callers (Celery tasks) are responsible for retry with exponential backoff.
    """
    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    # Idempotency guard: skip API call if ato was already successfully analyzed
    if ato.processado:
        existing = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
        analise = existing.scalar_one_or_none()
        if analise:
            return analise

    conteudo_result = await db.execute(
        select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
    )
    conteudo = conteudo_result.scalar_one_or_none()
    texto = conteudo.texto_completo[:32_000] if conteudo else "(texto não disponível)"

    user_prompt = f"""Analise o seguinte ato administrativo:

TIPO: {ato.tipo}
NÚMERO: {ato.numero}
DATA: {ato.data_publicacao or 'não informada'}
EMENTA: {ato.ementa or 'não informada'}

TEXTO COMPLETO:
{texto}"""

    response = await client.messages.create(
        model=settings.claude_haiku_model,
        max_tokens=16000,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_prompt}],
    )

    resultado = parse_haiku_response(response.content[0].text)

    if response.stop_reason == "max_tokens":
        resultado["tokens_truncado"] = True
        logger.warning(
            "haiku_tokens_truncado",
            extra={"ato_id": str(ato_id), "output_tokens": response.usage.output_tokens},
        )

    custo = (
        response.usage.input_tokens * PRECOS_HAIKU["input"]
        + response.usage.output_tokens * PRECOS_HAIKU["output"]
        + getattr(response.usage, "cache_read_input_tokens", 0) * PRECOS_HAIKU["cache_read"]
        + getattr(response.usage, "cache_creation_input_tokens", 0) * PRECOS_HAIKU["cache_write"]
    )

    # Upsert Analise
    analise_result = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
    analise = analise_result.scalar_one_or_none()

    if not analise:
        analise = Analise(
            id=uuid.uuid4(),
            ato_id=ato_id,
            tenant_id=ato.tenant_id,
            rodada_id=rodada_id,
        )
        db.add(analise)

    analise.status = "haiku_completo"
    analise.nivel_alerta = resultado["nivel_alerta"]
    analise.score_risco = resultado.get("score_risco", 0)
    analise.analisado_por_haiku = True
    analise.resultado_haiku = resultado
    analise.resumo_executivo = resultado.get("resumo")
    analise.tokens_haiku = response.usage.input_tokens + response.usage.output_tokens
    analise.custo_usd = Decimal(str(custo))

    # Save Irregularidades
    for indicio in resultado.get("indicios", []):
        irr = Irregularidade(
            id=uuid.uuid4(),
            analise_id=analise.id,
            ato_id=ato_id,
            tenant_id=ato.tenant_id,
            categoria=indicio.get("categoria", "moral"),
            tipo=indicio.get("tipo", "desconhecido"),
            descricao=indicio.get("descricao", ""),
            artigo_violado=indicio.get("artigo_violado"),
            gravidade=indicio.get("gravidade", "media"),
        )
        db.add(irr)

    ato.processado = True
    await db.flush()

    await salvar_pessoas(
        db, ato_id, ato.tenant_id,
        resultado.get("pessoas_extraidas", []),
        data_ato=ato.data_publicacao,
    )

    await db.commit()
    return analise


MAX_PAGES_VISAO = 50


async def analisar_ato_haiku_visao(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID | None,
    system_prompt: str,
    pdf_bytes: bytes,
) -> Analise:
    """
    Analisa portarias digitalizadas (sem camada de texto) enviando as páginas como
    imagens ao Claude Haiku Vision. Usa a mesma estrutura de resultado que
    analisar_ato_haiku — as tarefas Celery e scripts locais podem tratar os dois
    modos de forma uniforme.

    Raises anthropic.RateLimitError / APIError para retry no chamador.
    """
    import fitz  # PyMuPDF — importação local para não quebrar ambientes sem o pacote

    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    # Idempotência: pula se já foi analisado
    if ato.processado:
        existing = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
        analise = existing.scalar_one_or_none()
        if analise:
            return analise

    # Converte páginas do PDF em imagens PNG (2× zoom para legibilidade)
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    paginas = list(doc)[:MAX_PAGES_VISAO]
    if not paginas:
        raise ValueError(f"PDF sem páginas renderizáveis: ato {ato_id}")

    image_blocks = []
    for page in paginas:
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_b64 = base64.b64encode(pix.tobytes("png")).decode()
        image_blocks.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png", "data": img_b64},
        })

    aviso_paginas = (
        f" (exibindo {MAX_PAGES_VISAO} de {len(doc)} páginas)"
        if len(doc) > MAX_PAGES_VISAO
        else ""
    )
    user_prompt_text = (
        f"Analise o seguinte ato administrativo digitalizado"
        f"{aviso_paginas}. "
        f"O texto completo está nas imagens abaixo — leia-as e execute a análise.\n\n"
        f"TIPO: {ato.tipo}\n"
        f"NÚMERO: {ato.numero}\n"
        f"DATA: {ato.data_publicacao or 'não informada'}\n"
        f"EMENTA: {ato.ementa or 'não informada'}"
    )

    content: list = image_blocks + [{"type": "text", "text": user_prompt_text}]

    response = await client.messages.create(
        model=settings.claude_haiku_model,
        max_tokens=16000,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": content}],
    )

    resultado = parse_haiku_response(response.content[0].text)

    if response.stop_reason == "max_tokens":
        resultado["tokens_truncado"] = True
        logger.warning(
            "haiku_visao_tokens_truncado",
            extra={"ato_id": str(ato_id), "output_tokens": response.usage.output_tokens},
        )

    custo = (
        response.usage.input_tokens * PRECOS_HAIKU["input"]
        + response.usage.output_tokens * PRECOS_HAIKU["output"]
        + getattr(response.usage, "cache_read_input_tokens", 0) * PRECOS_HAIKU["cache_read"]
        + getattr(response.usage, "cache_creation_input_tokens", 0) * PRECOS_HAIKU["cache_write"]
    )

    # Upsert Analise
    analise_result = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
    analise = analise_result.scalar_one_or_none()

    if not analise:
        analise = Analise(
            id=uuid.uuid4(),
            ato_id=ato_id,
            tenant_id=ato.tenant_id,
            rodada_id=rodada_id,
        )
        db.add(analise)

    analise.status = "haiku_completo"
    analise.nivel_alerta = resultado["nivel_alerta"]
    analise.score_risco = resultado.get("score_risco", 0)
    analise.analisado_por_haiku = True
    analise.resultado_haiku = resultado
    analise.resumo_executivo = resultado.get("resumo")
    analise.tokens_haiku = response.usage.input_tokens + response.usage.output_tokens
    analise.custo_usd = Decimal(str(custo))

    # Irregularidades
    for indicio in resultado.get("indicios", []):
        irr = Irregularidade(
            id=uuid.uuid4(),
            analise_id=analise.id,
            ato_id=ato_id,
            tenant_id=ato.tenant_id,
            categoria=indicio.get("categoria", "moral"),
            tipo=indicio.get("tipo", "desconhecido"),
            descricao=indicio.get("descricao", ""),
            artigo_violado=indicio.get("artigo_violado"),
            gravidade=indicio.get("gravidade", "media"),
        )
        db.add(irr)

    # Registra conteudo_ato como digitalizado para rastreabilidade
    conteudo_existente = await db.execute(
        select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
    )
    if not conteudo_existente.scalar_one_or_none():
        db.add(ConteudoAto(
            ato_id=ato_id,
            texto_completo=f"[Documento digitalizado — {len(paginas)} página(s) analisadas via Haiku Vision]",
            metodo_extracao="haiku_visao",
            qualidade="digitalizado",
            tokens_estimados=response.usage.input_tokens,
        ))

    ato.pdf_baixado = True
    ato.processado = True
    await db.flush()

    await salvar_pessoas(
        db, ato_id, ato.tenant_id,
        resultado.get("pessoas_extraidas", []),
        data_ato=ato.data_publicacao,
    )

    await db.commit()
    return analise
