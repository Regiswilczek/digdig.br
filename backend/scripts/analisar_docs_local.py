#!/usr/bin/env python3
"""
Analisa documentos administrativos do CAU/PR com Sonnet (análise direta, sem Haiku).

Tipos cobertos: dispensa_eletronica, relatorio_parecer, relatorio_tcu,
                contratacao_direta, auditoria_independente, contrato, convenio

Itera sobre documentos com texto extraído (qualidade='boa'), sem análise Sonnet,
mais recentes primeiro. Envia o texto completo ao Sonnet e salva em `analises`.

Uso (cd backend/):
    python scripts/analisar_docs_local.py --dry-run          # mostra o que seria analisado
    python scripts/analisar_docs_local.py --limit 3          # testa com 3 docs
    python scripts/analisar_docs_local.py --tipo dispensa_eletronica   # só um tipo
    python scripts/analisar_docs_local.py                    # roda tudo
"""
import argparse
import asyncio
import json
import os
import re
import sys
import uuid
from decimal import Decimal
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import asyncpg
from anthropic import AsyncAnthropic

TENANT_ID    = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"
SONNET_MODEL = "claude-sonnet-4-6"
MAX_CHARS    = 150_000
RATE_LIMIT_SECONDS = 3.0

TIPOS_ALVO = [
    "dispensa_eletronica",
    "relatorio_parecer",
    "relatorio_tcu",
    "contratacao_direta",
    "auditoria_independente",
    "contrato",
    "convenio",
]

TIPO_LABEL = {
    "dispensa_eletronica":  "Dispensa Eletrônica",
    "relatorio_parecer":    "Relatório/Parecer",
    "relatorio_tcu":        "Relatório TCU",
    "contratacao_direta":   "Contratação Direta",
    "auditoria_independente": "Auditoria Independente",
    "contrato":             "Contrato",
    "convenio":             "Convênio",
}

PRECOS = {
    "input":       3.00 / 1_000_000,
    "output":     15.00 / 1_000_000,
    "cache_read":  0.30 / 1_000_000,
    "cache_write": 3.75 / 1_000_000,
}

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado no backend/.env")
ASYNCPG_URL = (
    DATABASE_URL
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace(":5432/", ":6543/")
)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_API_KEY:
    sys.exit("ERROR: ANTHROPIC_API_KEY não encontrado no backend/.env")

SYSTEM_PROMPT = """Você é um especialista em direito administrativo e transparência pública, com foco em fiscalização de conselhos profissionais federais brasileiros (Lei 12.378/2010 — CAU).

Analise o documento administrativo fornecido e extraia um JSON estruturado completo.

FOCOS DE ANÁLISE POR TIPO:
- Dispensas eletrônicas / contratações diretas: justificativa legal (Art. 75 Lei 14.133/2021), pesquisa de preços, fornecedor único, valor dentro do limite, vedação de fracionamento
- Contratos / convênios: partes, objeto, valor, prazo, cláusulas abusivas, aditivos sem justificativa, garantias
- Relatórios e pareceres: conflito de interesse do parecerista, conclusão favorável sem fundamentação, omissão de irregularidades
- Auditorias independentes: ressalvas, recomendações ignoradas, escopo limitado artificialmente
- Qualquer tipo: pessoas beneficiadas, empresa vinculada a gestores, reincidência de fornecedor

Use linguagem de INDÍCIO, nunca de conclusão jurídica definitiva.

Responda APENAS com JSON válido, sem texto antes ou depois:

{
  "tipo_documento": "string",
  "numero": "string ou null",
  "data_documento": "YYYY-MM-DD ou null",
  "objeto": "descrição do objeto/assunto principal",
  "valor_total": "R$ X.XXX,XX ou null",
  "partes_envolvidas": [
    {"nome": "string", "papel": "contratante|contratado|parecerista|auditor|beneficiario|outro"}
  ],
  "pessoas_extraidas": [
    {"nome": "string", "cargo": "string", "tipo_aparicao": "assina|autoriza|beneficiado|citado"}
  ],
  "base_legal": ["string"],
  "irregularidades": [
    {
      "categoria": "processual|legal|moral|financeira",
      "tipo": "string",
      "descricao": "string",
      "artigo_violado": "string ou null",
      "gravidade": "baixa|media|alta|critica"
    }
  ],
  "nivel_alerta": "verde|amarelo|laranja|vermelho",
  "score_risco": 0,
  "resumo_executivo": "2-3 frases sobre o documento e os principais pontos de atenção.",
  "recomendacao_campanha": "string ou null"
}

CRITÉRIOS DE ALERTA:
- verde: documento regular, sem irregularidades relevantes
- amarelo: ponto de atenção que merece acompanhamento
- laranja: irregularidade clara que justifica aprofundamento ou questionamento formal
- vermelho: indício grave de ilegalidade, sobrepreço, favorecimento ou fraude
"""


def _parse_json(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except json.JSONDecodeError:
                pass
    return {"parse_error": True, "raw": raw[:500]}


async def main(dry_run: bool, limit: int | None, tipo_filtro: str | None) -> None:
    tipos = [tipo_filtro] if tipo_filtro else TIPOS_ALVO

    print(f"\n{'='*60}")
    print("Analisador Sonnet — Documentos Administrativos CAU/PR")
    print(f"Tipos: {', '.join(tipos)}")
    print(f"{'='*60}\n")

    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    try:
        rows = await conn.fetch(
            """
            SELECT a.id, a.numero, a.tipo, a.data_publicacao,
                   c.texto_completo, c.tokens_estimados
            FROM atos a
            JOIN conteudo_ato c ON c.ato_id = a.id
            WHERE a.tenant_id = $1
              AND a.tipo = ANY($2::text[])
              AND c.qualidade = 'boa'
              AND NOT EXISTS (
                  SELECT 1 FROM analises
                  WHERE ato_id = a.id
                    AND analisado_por_sonnet = true
              )
            ORDER BY a.data_publicacao DESC NULLS LAST, a.numero DESC
            """,
            TENANT_ID,
            tipos,
        )

        print(f"Documentos com texto sem análise Sonnet: {len(rows)}")

        # Resumo por tipo
        contagem: dict[str, int] = {}
        for r in rows:
            contagem[r["tipo"]] = contagem.get(r["tipo"], 0) + 1
        for t, n in sorted(contagem.items(), key=lambda x: -x[1]):
            print(f"  {TIPO_LABEL.get(t, t):<30} {n:>4}")

        if not rows:
            print("Nada a analisar.")
            return

        if limit:
            rows = rows[:limit]
            print(f"\n(limitado a {limit})\n")

        if dry_run:
            print("\n─── DRY RUN ───\n")
            custo_est = 0.0
            for r in rows:
                tokens = r["tokens_estimados"] or 0
                custo = tokens * PRECOS["input"] + 2000 * PRECOS["output"]
                custo_est += custo
                label = TIPO_LABEL.get(r["tipo"], r["tipo"])
                print(f"  {label:<28} Nº {str(r['numero'] or '?'):>6}  "
                      f"{tokens:,} tokens  ~${custo:.4f}")
            print(f"\nCusto estimado total: ~${custo_est:.2f}")
            return

        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        ok = erro = 0
        custo_total = 0.0
        total = len(rows)

        for idx, row in enumerate(rows, 1):
            numero   = str(row["numero"] or "?")
            tipo     = row["tipo"]
            label    = TIPO_LABEL.get(tipo, tipo)
            data_str = str(row["data_publicacao"]) if row["data_publicacao"] else "?"
            prefix   = f"[{idx:3d}/{total}] {label} Nº {numero} [{data_str}]"
            ato_id   = row["id"]

            texto = row["texto_completo"]
            if len(texto) > MAX_CHARS:
                texto = texto[:MAX_CHARS]
                print(f"  ⚠  {prefix}: texto truncado em {MAX_CHARS:,} chars")

            try:
                response = await client.messages.create(
                    model=SONNET_MODEL,
                    max_tokens=8000,
                    system=SYSTEM_PROMPT,
                    messages=[{
                        "role": "user",
                        "content": (
                            f"Analise o seguinte documento do CAU/PR "
                            f"({label}, Nº {numero}, data {data_str}):\n\n{texto}"
                        ),
                    }],
                )

                resultado = _parse_json(response.content[0].text)

                custo = (
                    response.usage.input_tokens * PRECOS["input"]
                    + response.usage.output_tokens * PRECOS["output"]
                    + getattr(response.usage, "cache_read_input_tokens", 0) * PRECOS["cache_read"]
                    + getattr(response.usage, "cache_creation_input_tokens", 0) * PRECOS["cache_write"]
                )
                custo_total += custo

                nivel = resultado.get("nivel_alerta", "amarelo")
                score = resultado.get("score_risco", 50)
                resumo = resultado.get("resumo_executivo", "")
                rec = resultado.get("recomendacao_campanha")

                if nivel not in {"verde", "amarelo", "laranja", "vermelho"}:
                    nivel = "amarelo"

                analise_id = uuid.uuid4()
                await conn.execute(
                    """
                    INSERT INTO analises
                        (id, ato_id, tenant_id, rodada_id, status,
                         nivel_alerta, score_risco,
                         analisado_por_haiku, analisado_por_sonnet,
                         resultado_haiku, resultado_sonnet,
                         resumo_executivo, recomendacao_campanha,
                         tokens_haiku, tokens_sonnet, custo_usd,
                         criado_em, atualizado_em)
                    VALUES ($1,$2,$3,NULL,'sonnet_completo',
                            $4,$5,
                            false,true,
                            NULL,$6,
                            $7,$8,
                            0,$9,$10,
                            NOW(),NOW())
                    ON CONFLICT DO NOTHING
                    """,
                    analise_id, ato_id, TENANT_ID,
                    nivel, score,
                    json.dumps(resultado, ensure_ascii=False),
                    resumo, rec,
                    response.usage.input_tokens + response.usage.output_tokens,
                    Decimal(str(round(custo, 8))),
                )
                await conn.execute(
                    "UPDATE atos SET processado = true WHERE id = $1",
                    ato_id,
                )

                icone = {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}.get(nivel, "?")
                print(f"  {icone}  {prefix}  score={score}  ${custo:.4f}"
                      f"  in={response.usage.input_tokens:,} out={response.usage.output_tokens:,}")
                ok += 1

            except Exception as exc:
                print(f"  ✗  {prefix}: {exc}")
                erro += 1

            if idx < total:
                await asyncio.sleep(RATE_LIMIT_SECONDS)

    finally:
        await conn.close()

    print(f"\n{'='*60}")
    print(f"Concluído: {ok} analisados | {erro} erros | custo total: ${custo_total:.4f}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analisa documentos administrativos CAU/PR com Sonnet")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--tipo", type=str, default=None, choices=TIPOS_ALVO,
                        help="Analisar só um tipo específico")
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run, limit=args.limit, tipo_filtro=args.tipo))
