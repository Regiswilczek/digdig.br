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
from app.models.pessoa import AparicaoPessoa, Pessoa
from app.services.haiku_service import NIVEIS_VALIDOS

client = AsyncAnthropic()

PRECOS_SONNET = {
    "input": 3.00 / 1_000_000,
    "output": 15.00 / 1_000_000,
    "cache_read": 0.30 / 1_000_000,
    "cache_write": 3.75 / 1_000_000,
}

SONNET_EXTRA = """

MODO: ANÁLISE PROFUNDA

Você está recebendo um ato que foi PRÉ-CLASSIFICADO como suspeito.
Use o histórico das pessoas envolvidas e os atos relacionados para:
1. Confirmar ou refutar a suspeita inicial do Haiku
2. Identificar padrões que só aparecem com contexto histórico
3. Construir uma narrativa política coerente
4. Gerar uma ficha de denúncia pronta para uso

Responda em JSON com esta estrutura:
{
  "nivel_alerta_confirmado": "verde|amarelo|laranja|vermelho",
  "score_risco_final": 0,
  "confirmacao_suspeita": true,
  "analise_aprofundada": {
    "indicios_legais": [{"tipo": "string", "descricao": "string", "artigo_violado": "string", "gravidade": "string"}],
    "indicios_morais": [{"tipo": "string", "descricao": "string", "impacto_politico": "string", "gravidade": "string"}],
    "padrao_identificado": "string|null",
    "narrativa_completa": "string"
  },
  "ficha_denuncia": {
    "titulo": "string",
    "fato": "string",
    "indicio_legal": "string",
    "indicio_moral": "string",
    "evidencias": ["string"],
    "impacto": "string",
    "recomendacao_campanha": "string"
  }
}"""


def parse_sonnet_response(raw_text: str) -> dict:
    # Strip markdown code fences before parsing
    text = re.sub(r"^```(?:json)?\s*\n?", "", raw_text.strip(), flags=re.MULTILINE)
    text = re.sub(r"\n?```\s*$", "", text.strip(), flags=re.MULTILINE)
    try:
        result = json.loads(text)
        if result.get("nivel_alerta_confirmado") not in NIVEIS_VALIDOS:
            result["nivel_alerta_confirmado"] = "laranja"
        return result
    except json.JSONDecodeError:
        json_match = re.search(r"\{.*\}", text, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group())
                if result.get("nivel_alerta_confirmado") not in NIVEIS_VALIDOS:
                    result["nivel_alerta_confirmado"] = "laranja"
                return result
            except json.JSONDecodeError:
                pass
        nivel_match = re.search(r'"nivel_alerta_confirmado"\s*:\s*"(\w+)"', raw_text)
        nivel = nivel_match.group(1) if nivel_match else "laranja"
        return {
            "nivel_alerta_confirmado": nivel if nivel in NIVEIS_VALIDOS else "laranja",
            "score_risco_final": 60,
            "confirmacao_suspeita": True,
            "analise_aprofundada": {
                "indicios_legais": [],
                "indicios_morais": [],
                "narrativa_completa": "Análise incompleta — resposta malformada.",
            },
            "ficha_denuncia": {
                "titulo": "Análise indisponível",
                "fato": "",
                "indicio_legal": "",
                "indicio_moral": "",
                "evidencias": [],
                "impacto": "",
                "recomendacao_campanha": "",
            },
            "parse_error": True,
        }


async def _montar_contexto_enriquecido(
    db: AsyncSession, ato_id: uuid.UUID, analise_haiku: Analise
) -> str:
    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    conteudo_result = await db.execute(
        select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
    )
    conteudo = conteudo_result.scalar_one_or_none()
    texto = conteudo.texto_completo[:6000] if conteudo else ""

    # Get involved persons with history
    aparicoes_result = await db.execute(
        select(AparicaoPessoa).where(AparicaoPessoa.ato_id == ato_id).limit(10)
    )
    aparicoes = aparicoes_result.scalars().all()

    pessoa_ids = [ap.pessoa_id for ap in aparicoes]
    if pessoa_ids:
        pessoas_result = await db.execute(
            select(Pessoa).where(Pessoa.id.in_(pessoa_ids))
        )
        pessoas_by_id = {p.id: p for p in pessoas_result.scalars().all()}
    else:
        pessoas_by_id = {}

    historico_pessoas = []
    for ap in aparicoes:
        pessoa = pessoas_by_id.get(ap.pessoa_id)
        if pessoa:
            historico_pessoas.append({
                "nome": pessoa.nome_normalizado,
                "cargo": ap.cargo,
                "total_aparicoes": pessoa.total_aparicoes,
            })

    return f"""TEXTO DO ATO:
{texto}

ANÁLISE PRÉVIA DO HAIKU:
{json.dumps(analise_haiku.resultado_haiku, ensure_ascii=False, indent=2)}

HISTÓRICO DAS PESSOAS ENVOLVIDAS:
{json.dumps(historico_pessoas, ensure_ascii=False, indent=2)}"""


async def analisar_ato_sonnet(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID,
    system_prompt_base: str,
) -> Analise:
    """
    Raises anthropic.RateLimitError and anthropic.APIError on API failure.
    Callers (Celery tasks) are responsible for retry with exponential backoff.
    """
    analise_result = await db.execute(
        select(Analise).where(Analise.ato_id == ato_id, Analise.rodada_id == rodada_id)
    )
    analise = analise_result.scalar_one_or_none()
    if analise is None:
        raise ValueError(f"Analise not found for ato_id={ato_id} rodada={rodada_id} — Haiku must run first")

    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    contexto = await _montar_contexto_enriquecido(db, ato_id, analise)
    system_prompt = system_prompt_base + SONNET_EXTRA

    response = await client.messages.create(
        model=settings.claude_sonnet_model,
        max_tokens=8000,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": contexto}],
    )

    resultado = parse_sonnet_response(response.content[0].text)

    custo = (
        response.usage.input_tokens * PRECOS_SONNET["input"]
        + response.usage.output_tokens * PRECOS_SONNET["output"]
        + getattr(response.usage, "cache_read_input_tokens", 0) * PRECOS_SONNET["cache_read"]
        + getattr(response.usage, "cache_creation_input_tokens", 0) * PRECOS_SONNET["cache_write"]
    )

    analise.status = "sonnet_completo"
    analise.nivel_alerta = resultado["nivel_alerta_confirmado"]
    analise.score_risco = resultado.get("score_risco_final", analise.score_risco)
    analise.resultado_sonnet = resultado
    analise.recomendacao_campanha = (
        resultado.get("ficha_denuncia", {}).get("recomendacao_campanha")
    )
    analise.tokens_sonnet = response.usage.input_tokens + response.usage.output_tokens
    analise.custo_usd = analise.custo_usd + Decimal(str(custo))

    # Only save irregularidades once — guard against retry double-insertion
    if not analise.analisado_por_sonnet:
        for indicio in resultado.get("analise_aprofundada", {}).get("indicios_legais", []):
            irr = Irregularidade(
                id=uuid.uuid4(),
                analise_id=analise.id,
                ato_id=ato_id,
                tenant_id=ato.tenant_id,
                categoria="legal",
                tipo=indicio.get("tipo", "desconhecido"),
                descricao=indicio.get("descricao", ""),
                artigo_violado=indicio.get("artigo_violado"),
                gravidade=indicio.get("gravidade", "alta"),
            )
            db.add(irr)

        for indicio in resultado.get("analise_aprofundada", {}).get("indicios_morais", []):
            irr = Irregularidade(
                id=uuid.uuid4(),
                analise_id=analise.id,
                ato_id=ato_id,
                tenant_id=ato.tenant_id,
                categoria="moral",
                tipo=indicio.get("tipo", "desconhecido"),
                descricao=indicio.get("descricao", ""),
                artigo_violado=None,
                gravidade=indicio.get("gravidade", "alta"),
                impacto_politico=indicio.get("impacto_politico"),
            )
            db.add(irr)

    analise.analisado_por_sonnet = True

    await db.commit()
    return analise
