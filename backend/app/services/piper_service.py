"""
piper_service.py — Piper: agente de triagem investigativa (Gemini 2.5 Pro)

Primeiro estágio do pipeline Piper → Bud → Zew.
Responsabilidades:
  - Montar o system prompt base (regimento + base legal da KB)
  - Analisar atos com texto extraído (PDF nativo)
  - Analisar atos digitalizados (PDF escaneado) via Gemini Vision
  - Identificar pessoas, valores, referências e tags de irregularidade

Exporta as constantes e utilitários compartilhados pelo Bud e pelo Zew:
  NIVEIS_VALIDOS, SYSTEM_PROMPT_TEMPLATE, montar_system_prompt, parse_piper_response
"""
from __future__ import annotations

import base64
import json
import logging
import re
import uuid
from decimal import Decimal

logger = logging.getLogger(__name__)

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.ato import Ato, ConteudoAto
from app.models.analise import Analise, Irregularidade
from app.models.tenant import Tenant, KnowledgeBase
from app.services.pessoas_service import salvar_pessoas
from app.services.tag_service import LISTA_TAGS_PROMPT, salvar_tags_piper

# ─── Constantes compartilhadas por todo o pipeline ───────────────────────────

NIVEIS_VALIDOS = {"verde", "amarelo", "laranja", "vermelho"}

PRECO_PIPER = {
    "input": 1.25 / 1_000_000,
    "output": 10.00 / 1_000_000,
}

MAX_PAGES_VISAO = 50

# ─── System prompt base (usado pelo Piper, Bud e Zew) ────────────────────────

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

PIPER_EXTRA = f"""

MODO: TRIAGEM INVESTIGATIVA (PIPER)
Você é a primeira linha de defesa. Leia o texto integral do ato e classifique o risco.

INSTRUÇÕES ESPECÍFICAS:
1. Aplique o Princípio da Prevenção: Na dúvida sobre omissão ou linguagem vaga, eleve para AMARELO ou LARANJA. Não presuma boa-fé em textos mal redigidos ou incompletos.
2. Extração Cirúrgica: Extraia todos os nomes, cargos e valores monetários com precisão absoluta.
3. Silêncio Suspeito: Se o ato gera despesa mas não cita dotação orçamentária, isso é LARANJA.

TAXONOMIA DE IRREGULARIDADES:
Identifique as irregularidades usando EXCLUSIVAMENTE os códigos abaixo.
{LISTA_TAGS_PROMPT}

Acrescente ao JSON de resposta o campo:
"tags_identificadas": [
  {{"codigo": "<código_exato>", "gravidade": "baixa|media|alta|critica", "justificativa": "Cite o trecho exato do texto que comprova a tag (ou a omissão que a evidencia)"}}
]

Use apenas códigos presentes na lista. Inclua somente tags com evidência real no texto.
"""


# ─── Utilitários compartilhados ───────────────────────────────────────────────

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


def parse_piper_response(raw_text: str) -> dict:
    """Parser robusto com 4 níveis de fallback para respostas truncadas ou malformadas."""
    # 1. Tenta o texto cru direto
    result = _try_parse_json(raw_text.strip())
    if result is not None:
        _garantir_campos_piper(result)
        return result

    # 2. Remove code fences e tenta de novo
    text = re.sub(r"^```(?:json)?\s*\n?", "", raw_text.strip(), flags=re.MULTILINE)
    text = re.sub(r"\n?```\s*$", "", text.strip(), flags=re.MULTILINE)
    result = _try_parse_json(text)
    if result is not None:
        _garantir_campos_piper(result)
        return result

    # 3. Extrai primeiro bloco {...} do texto
    json_match = re.search(r"\{.*\}", text, re.DOTALL)
    if json_match:
        result = _try_parse_json(json_match.group())
        if result is not None:
            _garantir_campos_piper(result)
            return result

    # 4. Extração parcial — salva o que foi escrito antes do truncamento
    logger.warning("piper_parse_error", extra={"raw_first_300": raw_text[:300]})

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
        "tags_identificadas": [],
        "parse_error": True,
        "tokens_truncado": True,
    }


def _garantir_campos_piper(result: dict) -> None:
    result.setdefault("score_risco", 0)
    result.setdefault("resumo", "")
    result.setdefault("indicios", [])
    result.setdefault("pessoas_extraidas", [])
    result.setdefault("valores_monetarios", [])
    result.setdefault("referencias_atos", [])
    result.setdefault("requer_aprofundamento", False)
    result.setdefault("motivo_aprofundamento", None)
    result.setdefault("tags_identificadas", [])


# ─── System prompt builder ────────────────────────────────────────────────────

async def montar_system_prompt(db: AsyncSession, tenant_id: uuid.UUID) -> str:
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one()

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
            docs_extras.append(f"─── {doc.titulo} ({doc.tipo}) ───\n{doc.conteudo}")

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


# ─── Cliente Gemini ───────────────────────────────────────────────────────────

def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=settings.gemini_api_key,
    )


# ─── Análise de texto (PDF nativo) ───────────────────────────────────────────

async def analisar_ato_piper(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID,
    system_prompt: str,
) -> Analise:
    """
    Triagem com Piper (Gemini Pro) para atos com texto extraído.
    Idempotente: pula se ato.processado já está True.
    Raises openai.RateLimitError / APIError no chamador para retry.
    """
    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    if ato.processado:
        existing = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
        analise = existing.scalar_one_or_none()
        if analise:
            return analise

    conteudo_result = await db.execute(
        select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
    )
    conteudo = conteudo_result.scalar_one_or_none()
    texto = conteudo.texto_completo if conteudo else "(texto não disponível)"

    user_prompt = (
        f"Analise o seguinte ato administrativo:\n\n"
        f"TIPO: {ato.tipo}\n"
        f"NÚMERO: {ato.numero}\n"
        f"DATA: {ato.data_publicacao or 'não informada'}\n"
        f"EMENTA: {ato.ementa or 'não informada'}\n\n"
        f"TEXTO COMPLETO:\n{texto}"
    )

    full_system = system_prompt + PIPER_EXTRA
    client = _get_client()

    response = await client.chat.completions.create(
        model=settings.gemini_pro_model,
        max_tokens=16000,
        messages=[
            {"role": "system", "content": full_system},
            {"role": "user", "content": user_prompt},
        ],
    )

    raw_text = response.choices[0].message.content or ""
    resultado = parse_piper_response(raw_text)

    input_tokens = response.usage.prompt_tokens if response.usage else 0
    output_tokens = response.usage.completion_tokens if response.usage else 0
    custo = input_tokens * PRECO_PIPER["input"] + output_tokens * PRECO_PIPER["output"]

    analise = await _salvar_resultado_piper(
        db, ato, ato_id, rodada_id, resultado, input_tokens, output_tokens, custo
    )

    await salvar_tags_piper(
        db, ato_id, analise.id, ato.tenant_id,
        resultado.get("tags_identificadas", []),
    )

    await salvar_pessoas(
        db, ato_id, ato.tenant_id,
        resultado.get("pessoas_extraidas", []),
        data_ato=ato.data_publicacao,
    )

    await db.commit()
    return analise


# ─── Análise de visão (PDF escaneado) ────────────────────────────────────────

async def analisar_ato_piper_visao(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID,
    system_prompt: str,
    pdf_bytes: bytes,
) -> Analise:
    """
    Triagem com Piper (Gemini Pro Vision) para atos digitalizados sem camada de texto.
    Converte as páginas do PDF em imagens PNG e envia ao Gemini via OpenAI-compatible API.
    Raises openai.RateLimitError / APIError no chamador para retry.
    """
    import fitz  # PyMuPDF — importação local para não quebrar ambientes sem o pacote

    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    if ato.processado:
        existing = await db.execute(select(Analise).where(Analise.ato_id == ato_id))
        analise = existing.scalar_one_or_none()
        if analise:
            return analise

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    paginas = list(doc)[:MAX_PAGES_VISAO]
    if not paginas:
        raise ValueError(f"PDF sem páginas renderizáveis: ato {ato_id}")

    # Gemini OpenAI-compat usa image_url com data URI
    image_blocks = []
    for page in paginas:
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_b64 = base64.b64encode(pix.tobytes("png")).decode()
        image_blocks.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{img_b64}"},
        })

    aviso_paginas = (
        f" (exibindo {MAX_PAGES_VISAO} de {len(doc)} páginas)"
        if len(doc) > MAX_PAGES_VISAO
        else ""
    )
    user_prompt_text = (
        f"Analise o seguinte ato administrativo digitalizado{aviso_paginas}. "
        f"O texto completo está nas imagens abaixo — leia-as e execute a análise.\n\n"
        f"TIPO: {ato.tipo}\n"
        f"NÚMERO: {ato.numero}\n"
        f"DATA: {ato.data_publicacao or 'não informada'}\n"
        f"EMENTA: {ato.ementa or 'não informada'}"
    )

    content: list = image_blocks + [{"type": "text", "text": user_prompt_text}]
    full_system = system_prompt + PIPER_EXTRA
    client = _get_client()

    response = await client.chat.completions.create(
        model=settings.gemini_pro_model,
        max_tokens=16000,
        messages=[
            {"role": "system", "content": full_system},
            {"role": "user", "content": content},
        ],
    )

    raw_text = response.choices[0].message.content or ""
    resultado = parse_piper_response(raw_text)

    input_tokens = response.usage.prompt_tokens if response.usage else 0
    output_tokens = response.usage.completion_tokens if response.usage else 0
    custo = input_tokens * PRECO_PIPER["input"] + output_tokens * PRECO_PIPER["output"]

    analise = await _salvar_resultado_piper(
        db, ato, ato_id, rodada_id, resultado, input_tokens, output_tokens, custo
    )

    # Registra metadado de que o ato foi processado via visão
    conteudo_existente = await db.execute(
        select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
    )
    if not conteudo_existente.scalar_one_or_none():
        db.add(ConteudoAto(
            ato_id=ato_id,
            texto_completo=f"[Documento digitalizado — {len(paginas)} página(s) analisadas via Piper Vision]",
            metodo_extracao="piper_visao",
            qualidade="digitalizado",
            tokens_estimados=input_tokens,
        ))

    ato.pdf_baixado = True

    await salvar_tags_piper(
        db, ato_id, analise.id, ato.tenant_id,
        resultado.get("tags_identificadas", []),
    )

    await salvar_pessoas(
        db, ato_id, ato.tenant_id,
        resultado.get("pessoas_extraidas", []),
        data_ato=ato.data_publicacao,
    )

    await db.commit()
    return analise


# ─── Helper interno ───────────────────────────────────────────────────────────

async def _salvar_resultado_piper(
    db: AsyncSession,
    ato: Ato,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID,
    resultado: dict,
    input_tokens: int,
    output_tokens: int,
    custo: float,
) -> Analise:
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

    analise.status = "piper_completo"
    analise.nivel_alerta = resultado["nivel_alerta"]
    analise.score_risco = resultado.get("score_risco", 0)
    analise.analisado_por_piper = True
    analise.resultado_piper = resultado
    analise.resumo_executivo = resultado.get("resumo")
    analise.tokens_piper = input_tokens + output_tokens
    analise.custo_usd = Decimal(str(custo))

    for indicio in resultado.get("indicios", []):
        db.add(Irregularidade(
            id=uuid.uuid4(),
            analise_id=analise.id,
            ato_id=ato_id,
            tenant_id=ato.tenant_id,
            categoria=indicio.get("categoria", "moral"),
            tipo=indicio.get("tipo", "desconhecido"),
            descricao=indicio.get("descricao", ""),
            artigo_violado=indicio.get("artigo_violado"),
            gravidade=indicio.get("gravidade", "media"),
        ))

    ato.processado = True
    await db.flush()
    return analise
