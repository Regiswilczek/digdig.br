import json
import re
import uuid
from decimal import Decimal
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

SYSTEM_PROMPT_TEMPLATE = """Você é um auditor especializado em direito administrativo brasileiro e ética pública.

Sua missão é analisar atos administrativos do {nome_orgao} e identificar indícios de irregularidades legais, morais e éticas com base no Regimento Interno vigente.

═══════════════════════════════════════════════
REGIMENTO INTERNO — {nome_orgao}
{regimento}
═══════════════════════════════════════════════

REGRAS ESPECÍFICAS DESTE ÓRGÃO:
{regras_especificas}

NÍVEIS DE ALERTA:
- VERDE: ato conforme, sem irregularidades detectadas
- AMARELO: suspeito, requer atenção — possível irregularidade moral ou procedimental
- LARANJA: indício moderado-grave — possível irregularidade moral, ética ou legal
- VERMELHO: indício crítico — padrão altamente suspeito ou aparente violação legal direta

CRITÉRIOS DE ANÁLISE OBRIGATÓRIOS:

1. LEGAL: Violações diretas ao Regimento Interno e à Lei 12.378/2010
   - Autoridade incompetente para o ato
   - Violação de quórum, prazos excedidos, composição irregular de comissão

2. MORAL/ÉTICO (mesmo que "legal"):
   - Nepotismo, concentração de poder (Ad Referendum excessivo)
   - Perseguição política via comissões processantes
   - Cabide de empregos, gastos questionáveis, falta de transparência

3. EXTRAÇÃO ESTRUTURADA:
   - Nomes completos, cargos, valores monetários, referências a atos anteriores

Responda SEMPRE em JSON válido com esta estrutura exata:
{{
  "nivel_alerta": "verde|amarelo|laranja|vermelho",
  "score_risco": 0,
  "resumo": "2-3 frases",
  "indicios": [{{"categoria": "legal|moral|etica|processual", "tipo": "string", "descricao": "string", "artigo_violado": "string|null", "gravidade": "baixa|media|alta|critica"}}],
  "pessoas_extraidas": [{{"nome": "string", "cargo": "string", "tipo_aparicao": "nomeado|exonerado|assina|membro_comissao|processado|mencionado"}}],
  "valores_monetarios": [],
  "referencias_atos": [],
  "requer_aprofundamento": false,
  "motivo_aprofundamento": "string|null"
}}"""


def parse_haiku_response(raw_text: str) -> dict:
    try:
        result = json.loads(raw_text)
        if result.get("nivel_alerta") not in NIVEIS_VALIDOS:
            result["nivel_alerta"] = "amarelo"
        return result
    except json.JSONDecodeError:
        nivel_match = re.search(r'"nivel_alerta"\s*:\s*"(\w+)"', raw_text)
        nivel = nivel_match.group(1) if nivel_match else "amarelo"
        if nivel not in NIVEIS_VALIDOS:
            nivel = "amarelo"
        return {
            "nivel_alerta": nivel,
            "score_risco": 50,
            "resumo": "Análise incompleta — resposta malformada. Reprocessar manualmente.",
            "indicios": [],
            "pessoas_extraidas": [],
            "valores_monetarios": [],
            "referencias_atos": [],
            "requer_aprofundamento": False,
            "motivo_aprofundamento": None,
            "parse_error": True,
        }


async def montar_system_prompt(db: AsyncSession, tenant_id: uuid.UUID) -> str:
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one()

    # KnowledgeBase has no `ativo` field — fetch the most recent regimento entry.
    kb_result = await db.execute(
        select(KnowledgeBase)
        .where(
            KnowledgeBase.tenant_id == tenant_id,
            KnowledgeBase.tipo == "regimento",
        )
        .order_by(KnowledgeBase.criado_em.desc())
        .limit(1)
    )
    kb = kb_result.scalar_one_or_none()
    regimento = kb.conteudo if kb else "Regimento não cadastrado — analise com base na Lei 12.378/2010."

    return SYSTEM_PROMPT_TEMPLATE.format(
        nome_orgao=tenant.nome_completo,
        regimento=regimento,
        regras_especificas="Sem regras específicas cadastradas.",
    )


async def analisar_ato_haiku(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID,
    system_prompt: str,
) -> Analise:
    """
    Raises anthropic.RateLimitError and anthropic.APIError on API failure.
    Callers (Celery tasks) are responsible for retry with exponential backoff.
    """
    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    conteudo_result = await db.execute(
        select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
    )
    conteudo = conteudo_result.scalar_one_or_none()
    texto = conteudo.texto_completo[:8000] if conteudo else "(texto não disponível)"

    user_prompt = f"""Analise o seguinte ato administrativo:

TIPO: {ato.tipo}
NÚMERO: {ato.numero}
DATA: {ato.data_publicacao or 'não informada'}
EMENTA: {ato.ementa or 'não informada'}

TEXTO COMPLETO:
{texto}"""

    response = await client.messages.create(
        model=settings.claude_haiku_model,
        max_tokens=1500,
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
        await db.flush()

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
