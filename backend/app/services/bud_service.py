"""
bud_service.py — Bud: análise profunda via Claude Sonnet

Substitui o sonnet_service como agente de análise profunda.
Recebe o contexto enriquecido (texto completo + análise do Piper + histórico de pessoas)
e produz uma ficha de denúncia com indicíos legais/morais detalhados.
Também executa revisão e refinamento das tags identificadas pelo Piper.
"""
from __future__ import annotations

import json
import re
import uuid
from collections import Counter
from decimal import Decimal

from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
import re as _re
from app.models.ato import Ato, ConteudoAto
from app.models.analise import Analise, Irregularidade
from app.models.pessoa import AparicaoPessoa, Pessoa
from app.services.piper_service import NIVEIS_VALIDOS
from app.services.tag_service import (
    LISTA_TAGS_PROMPT,
    buscar_tags_ativas,
    revisar_tags_bud_new,
)

client = AsyncAnthropic()

PRECOS_BUD = {
    "input": 3.00 / 1_000_000,
    "output": 15.00 / 1_000_000,
    "cache_read": 0.30 / 1_000_000,
    "cache_write": 3.75 / 1_000_000,
}

BUD_EXTRA = f"""

MODO: INVESTIGAÇÃO PROFUNDA E CRUZAMENTO DE DADOS (BUD)
Você é o investigador final. O Piper já pré-classificou este ato como suspeito.
Você tem acesso ao texto do ato, à análise do Piper, ao HISTÓRICO DE APARIÇÕES das pessoas e a atos relacionados do corpus.

INSTRUÇÕES DE CRUZAMENTO (CRÍTICO):
1. Analise o Histórico: Se uma pessoa nomeada já aparece em dezenas de comissões ou cargos de confiança no histórico, sinalize indício de "Concentração de Poder" ou "Clientelismo".
2. Conexões Ocultas: Busque relações entre as pessoas citadas e possíveis conflitos de interesse com base no histórico fornecido.
3. Materialidade: A Ficha de Denúncia deve ser irrefutável. Use citações diretas do texto como prova material.

INVESTIGAÇÃO EXPANDIDA (USE O CORPUS COMPLETO):
Além do texto do ato e da análise do Piper, você tem acesso ao histórico completo das pessoas no corpus inteiro do órgão.
Use esse histórico para traçar linhas investigativas:
- Se uma pessoa aparece sistematicamente em nomeações + exonerações, pode ser indício de clientelismo
- Se o mesmo grupo controla múltiplas comissões, pode ser indício de concentração de poder
- Cruze datas, cargos e tipos de aparição para identificar padrões que um ato isolado não revela
Documente essas conexões na "narrativa_completa" e inclua como evidências na ficha de denúncia.

USE O CONTEXTO FORNECIDO PARA:
1. Confirmar ou refutar a suspeita inicial do Piper
2. Identificar padrões que só aparecem com contexto histórico
3. Construir uma narrativa investigativa coerente
4. Gerar uma ficha de denúncia pronta para uso

REVISÃO DE TAGS DO PIPER:
O Piper identificou tags iniciais. Sua missão é auditar o trabalho dele:
- Confirme as tags que têm base real no texto ou no histórico
- Remova (ação "removida") tags que são falsos positivos sem evidência concreta
- Adicione novas tags que o Piper não viu, especialmente as baseadas no cruzamento histórico de pessoas

TAGS DISPONÍVEIS:
{LISTA_TAGS_PROMPT}

Responda em JSON com esta estrutura:
{{
  "nivel_alerta_confirmado": "verde|amarelo|laranja|vermelho",
  "score_risco_final": 0,
  "confirmacao_suspeita": true,
  "analise_aprofundada": {{
    "indicios_legais": [{{"tipo": "string", "descricao": "string", "artigo_violado": "string", "gravidade": "string"}}],
    "indicios_morais": [{{"tipo": "string", "descricao": "string", "impacto_politico": "string", "gravidade": "string"}}],
    "padrao_identificado": "Descreva o padrão anômalo encontrado ao cruzar o ato com o histórico de pessoas (ex: mesma pessoa em 12 comissões em 6 meses) — ou null se não houver padrão",
    "narrativa_completa": "Explicação detalhada conectando o ato atual com o histórico de pessoas e atos relacionados"
  }},
  "ficha_denuncia": {{
    "titulo": "Título jornalístico direto e objetivo",
    "fato": "O que aconteceu (com citação do trecho exato do documento que prova o fato)",
    "indicio_legal": "Qual lei ou regra apresenta indício de violação",
    "indicio_moral": "Qual princípio ético apresenta indício de violação",
    "evidencias": ["Evidência 1 (trecho do texto)", "Evidência 2 (do histórico de pessoas)"],
    "impacto": "Possível dano ao erário ou à instituição",
    "recomendacao_campanha": "Como usar isso em transparência pública, jornalismo ou processo"
  }},
  "tags_revisadas": [
    {{"codigo": "<codigo_exato>", "acao": "confirmada|adicionada|removida|elevada|rebaixada", "gravidade": "baixa|media|alta|critica", "justificativa": "Por que a tag foi alterada ou confirmada (citar evidência ou ausência de evidência)"}}
  ]
}}"""


def _parse_bud_response(raw_text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*\n?", "", raw_text.strip(), flags=re.MULTILINE)
    text = re.sub(r"\n?```\s*$", "", text.strip(), flags=re.MULTILINE)
    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                result = json.loads(m.group())
            except json.JSONDecodeError:
                result = {}
        else:
            result = {}

    if result.get("nivel_alerta_confirmado") not in NIVEIS_VALIDOS:
        nivel_match = re.search(r'"nivel_alerta_confirmado"\s*:\s*"(\w+)"', raw_text)
        nivel = nivel_match.group(1) if nivel_match else "laranja"
        result["nivel_alerta_confirmado"] = nivel if nivel in NIVEIS_VALIDOS else "laranja"

    result.setdefault("score_risco_final", 60)
    result.setdefault("confirmacao_suspeita", True)
    result.setdefault("analise_aprofundada", {
        "indicios_legais": [],
        "indicios_morais": [],
        "padrao_identificado": None,
        "narrativa_completa": "",
    })
    result.setdefault("ficha_denuncia", {
        "titulo": "",
        "fato": "",
        "indicio_legal": "",
        "indicio_moral": "",
        "evidencias": [],
        "impacto": "",
        "recomendacao_campanha": "",
    })
    result.setdefault("tags_revisadas", [])
    return result


async def _montar_contexto_bud(
    db: AsyncSession,
    ato_id: uuid.UUID,
    analise: Analise,
) -> str:
    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    conteudo_result = await db.execute(
        select(ConteudoAto).where(ConteudoAto.ato_id == ato_id)
    )
    conteudo = conteudo_result.scalar_one_or_none()
    texto = conteudo.texto_completo if conteudo else ""

    aparicoes_result = await db.execute(
        select(AparicaoPessoa).where(AparicaoPessoa.ato_id == ato_id)
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

    historico_pessoas = [
        {
            "nome": pessoas_by_id[ap.pessoa_id].nome_normalizado,
            "cargo": ap.cargo,
            "total_aparicoes": pessoas_by_id[ap.pessoa_id].total_aparicoes,
        }
        for ap in aparicoes
        if ap.pessoa_id in pessoas_by_id
    ]

    # Histórico expandido por pessoa — padrões no corpus completo do órgão
    historico_expandido = []
    for pessoa_id, pessoa in pessoas_by_id.items():
        if pessoa.total_aparicoes > 1:
            ap_hist_result = await db.execute(
                select(AparicaoPessoa)
                .where(AparicaoPessoa.pessoa_id == pessoa_id)
                .order_by(AparicaoPessoa.data_ato.desc())
                .limit(30)
            )
            ap_hist = ap_hist_result.scalars().all()
            tipos = dict(Counter(ap.tipo_aparicao for ap in ap_hist if ap.tipo_aparicao))
            cargos = list({ap.cargo for ap in ap_hist if ap.cargo})[:5]
            datas = [str(ap.data_ato) for ap in ap_hist if ap.data_ato]
            historico_expandido.append({
                "nome": pessoa.nome_normalizado,
                "total_aparicoes_corpus": pessoa.total_aparicoes,
                "distribuicao_por_tipo": tipos,
                "cargos_exercidos": cargos,
                "periodo": f"{datas[-1]} a {datas[0]}" if len(datas) >= 2 else (datas[0] if datas else "N/A"),
            })

    # Fonte de análise prévia: prefere resultado_piper, fallback resultado_haiku
    analise_previa = analise.resultado_piper or analise.resultado_haiku or {}
    tags_atuais = await buscar_tags_ativas(db, ato_id)

    # Atos relacionados: busca textos de atos referenciados no documento
    referencias_raw = analise_previa.get("referencias_atos", [])
    atos_relacionados_ctx = ""
    if referencias_raw:
        # Extrai números de strings como "Portaria 123/2023" ou "123/2023"
        numeros = []
        for ref in referencias_raw[:10]:  # no máximo 10 referências
            ref_str = str(ref)
            m = _re.search(r"(\d{1,5}/\d{4}|\d{3,5})", ref_str)
            if m:
                numeros.append(m.group(1))

        if numeros:
            atos_ref_result = await db.execute(
                select(Ato, ConteudoAto)
                .join(ConteudoAto, ConteudoAto.ato_id == Ato.id, isouter=True)
                .where(
                    Ato.tenant_id == ato.tenant_id,
                    Ato.numero.in_(numeros),
                )
                .limit(5)
            )
            blocos = []
            for ato_ref, conteudo_ref in atos_ref_result.all():
                if conteudo_ref and conteudo_ref.texto_completo:
                    trecho = conteudo_ref.texto_completo[:8_000]
                    blocos.append(
                        f"[{ato_ref.tipo.upper()} Nº {ato_ref.numero} — {ato_ref.data_publicacao}]\n{trecho}"
                    )
            if blocos:
                atos_relacionados_ctx = "\n\n---\n\n".join(blocos)

    ctx = (
        f"TEXTO DO ATO:\n{texto}\n\n"
        f"ANÁLISE PRÉVIA DO PIPER:\n{json.dumps(analise_previa, ensure_ascii=False, indent=2)}\n\n"
        f"TAGS IDENTIFICADAS PELO PIPER:\n{json.dumps(tags_atuais, ensure_ascii=False, indent=2)}\n\n"
        f"PESSOAS NESTE ATO:\n{json.dumps(historico_pessoas, ensure_ascii=False, indent=2)}"
    )
    if historico_expandido:
        ctx += f"\n\nHISTÓRICO EXPANDIDO DAS PESSOAS NO CORPUS (padrões para cruzamento investigativo):\n{json.dumps(historico_expandido, ensure_ascii=False, indent=2)}"
    if atos_relacionados_ctx:
        ctx += f"\n\nATOS RELACIONADOS (referenciados no documento):\n{atos_relacionados_ctx}"
    return ctx


async def analisar_ato_bud(
    db: AsyncSession,
    ato_id: uuid.UUID,
    rodada_id: uuid.UUID,
    system_prompt_base: str,
) -> Analise:
    """
    Executa análise profunda com Bud (Sonnet).
    Requer que o Piper (ou Haiku legado) já tenha rodado.
    Raises anthropic.RateLimitError / APIError no chamador para retry.
    """
    analise_result = await db.execute(
        select(Analise).where(Analise.ato_id == ato_id, Analise.rodada_id == rodada_id)
    )
    analise = analise_result.scalar_one_or_none()
    if analise is None:
        raise ValueError(f"Analise não encontrada para ato_id={ato_id} — Piper deve rodar primeiro")

    ato_result = await db.execute(select(Ato).where(Ato.id == ato_id))
    ato = ato_result.scalar_one()

    contexto = await _montar_contexto_bud(db, ato_id, analise)
    system_prompt = system_prompt_base + BUD_EXTRA

    response = await client.messages.create(
        model=settings.claude_sonnet_model,
        max_tokens=16000,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": contexto}],
    )

    resultado = _parse_bud_response(response.content[0].text)

    custo = (
        response.usage.input_tokens * PRECOS_BUD["input"]
        + response.usage.output_tokens * PRECOS_BUD["output"]
        + getattr(response.usage, "cache_read_input_tokens", 0) * PRECOS_BUD["cache_read"]
        + getattr(response.usage, "cache_creation_input_tokens", 0) * PRECOS_BUD["cache_write"]
    )

    analise.status = "bud_completo"
    analise.nivel_alerta = resultado["nivel_alerta_confirmado"]
    analise.score_risco = resultado.get("score_risco_final", analise.score_risco)
    analise.analisado_por_bud = True
    analise.resultado_bud = resultado
    analise.recomendacao_campanha = resultado.get("ficha_denuncia", {}).get("recomendacao_campanha")
    analise.tokens_bud = response.usage.input_tokens + response.usage.output_tokens
    analise.custo_usd = analise.custo_usd + Decimal(str(custo))

    # Irregularidades — só insere se ainda não foi feito (guard de retry)
    if not analise.analisado_por_sonnet and not analise.analisado_por_bud:
        for indicio in resultado.get("analise_aprofundada", {}).get("indicios_legais", []):
            db.add(Irregularidade(
                id=uuid.uuid4(),
                analise_id=analise.id,
                ato_id=ato_id,
                tenant_id=ato.tenant_id,
                categoria="legal",
                tipo=indicio.get("tipo", "desconhecido"),
                descricao=indicio.get("descricao", ""),
                artigo_violado=indicio.get("artigo_violado"),
                gravidade=indicio.get("gravidade", "alta"),
            ))
        for indicio in resultado.get("analise_aprofundada", {}).get("indicios_morais", []):
            db.add(Irregularidade(
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
            ))

    # Revisão de tags pelo Bud
    await revisar_tags_bud_new(
        db, ato_id, analise.id, ato.tenant_id,
        resultado.get("tags_revisadas", []),
        modelo="bud",
    )

    analise.analisado_por_sonnet = True  # mantém compat com campo legado

    await db.commit()
    return analise
