#!/usr/bin/env python3
"""
Analisa Atas Plenárias do CAU/PR com Bud (Claude Sonnet) — análise profunda.

Itera sobre atas com texto extraído (qualidade='boa') que ainda não foram
analisadas pelo Bud, mais recentes primeiro. Envia o texto completo ao
Sonnet e salva em `analises`.

O prompt e o schema JSON são específicos para ata plenária (quórum, pauta,
presentes/ausentes, deliberações). Para portarias/deliberações use o pipeline
padrão Piper→Bud via worker Celery.

Uso (cd backend/):
    python scripts/analisar_atos_bud_local.py --dry-run     # mostra quais seriam analisadas
    python scripts/analisar_atos_bud_local.py --limit 2     # analisa só 2 (teste)
    python scripts/analisar_atos_bud_local.py               # roda tudo
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

TENANT_ID   = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"
SONNET_MODEL = "claude-sonnet-4-6"
MAX_CHARS   = 150_000   # ~37k tokens — seguro para atas de até 150 páginas
RATE_LIMIT_SECONDS = 3.0

PRECOS = {
    "input":       3.00 / 1_000_000,
    "output":     15.00 / 1_000_000,
    "cache_read":  0.30 / 1_000_000,
    "cache_write": 3.75 / 1_000_000,
}

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado no backend/.env")
# Porta 6543 = transaction mode pooler (sem limite de sessões simultâneas)
ASYNCPG_URL = (
    DATABASE_URL
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace(":5432/", ":6543/")
)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_API_KEY:
    sys.exit("ERROR: ANTHROPIC_API_KEY não encontrado no backend/.env")

SYSTEM_PROMPT = """Você é um especialista em direito administrativo e transparência pública, com foco em fiscalização de conselhos profissionais federais brasileiros (Lei 12.378/2010 — CAU).

Analise a ata de reunião plenária fornecida e extraia um JSON estruturado completo.

FOCO DA ANÁLISE:
- Quórum: estava completo? Houve deliberação sem quórum legal?
- Votações: unanimidade suspeita, ausência de votos contrários em temas polêmicos
- Deliberações aprovadas: numere e descreva cada uma
- Pessoas nomeadas, contratadas ou beneficiadas por decisão plenária
- Irregularidades processuais: pauta com itens extra, aprovação de ata sem leitura, etc.
- Concentração de poder: mesmas pessoas em múltiplos papéis

Use linguagem de INDÍCIO, nunca de conclusão jurídica definitiva.

Responda APENAS com JSON válido, sem texto antes ou depois:

{
  "reuniao_numero": "string",
  "reuniao_data": "YYYY-MM-DD ou null",
  "tipo_reuniao": "ordinaria|extraordinaria",
  "quorum_total": 0,
  "quorum_legal_minimo": 0,
  "quorum_atingido": true,
  "presentes": ["Nome (Cargo)"],
  "ausentes": ["Nome (Cargo)"],
  "pauta": [
    {
      "item": 1,
      "titulo": "string",
      "resultado": "aprovado|rejeitado|retirado|adiado|informativo",
      "votos_favor": 0,
      "votos_contra": 0,
      "abstencoes": 0,
      "unanime": true,
      "pessoas_envolvidas": ["string"],
      "observacao": "string ou null"
    }
  ],
  "deliberacoes_aprovadas": ["ex: DPOPR 0094-01/2019"],
  "pessoas_extraidas": [
    {"nome": "string", "cargo": "string", "tipo_aparicao": "preside|vota|nomeado|contratado|citado"}
  ],
  "nivel_alerta": "verde|amarelo|laranja|vermelho",
  "score_risco": 0,
  "resumo_executivo": "2-3 frases sobre o que aconteceu nesta reunião e os principais pontos de atenção.",
  "irregularidades": [
    {
      "categoria": "processual|legal|moral",
      "tipo": "string",
      "descricao": "string",
      "artigo_violado": "string ou null",
      "gravidade": "baixa|media|alta|critica"
    }
  ],
  "recomendacao_campanha": "string ou null"
}

CRITÉRIOS DE ALERTA:
- verde: reunião normal, sem irregularidades relevantes
- amarelo: algum ponto de atenção processual ou votação suspeita
- laranja: irregularidade clara que merece aprofundamento
- vermelho: indício grave de ilegalidade ou favorecimento
"""


def _parse_json(raw: str) -> dict:
    text = raw.strip()
    # Strip markdown code fences (```json ... ```)
    if text.startswith("```"):
        lines = text.splitlines()
        lines = lines[1:]  # drop first line (```json or ```)
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


async def main(dry_run: bool, limit: int | None) -> None:
    print(f"\n{'='*60}")
    print("Analisador Bud (Claude Sonnet) — Atas Plenárias CAU/PR")
    print(f"{'='*60}\n")

    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    try:
        # Atas com texto extraído, sem análise Bud, mais recentes primeiro
        rows = await conn.fetch(
            """
            SELECT a.id, a.numero, a.data_publicacao, a.subtipo,
                   c.texto_completo, c.qualidade, c.tokens_estimados
            FROM atos a
            JOIN conteudo_ato c ON c.ato_id = a.id
            WHERE a.tenant_id = $1
              AND a.tipo = 'ata_plenaria'
              AND c.qualidade = 'boa'
              AND NOT EXISTS (
                  SELECT 1 FROM analises
                  WHERE ato_id = a.id
                    AND analisado_por_bud = true
              )
            ORDER BY CAST(a.numero AS INTEGER) DESC
            """,
            TENANT_ID,
        )

        print(f"Atas com texto sem análise Bud: {len(rows)}")

        if not rows:
            print("Nada a analisar.")
            return

        if limit:
            rows = rows[:limit]
            print(f"(limitado a {limit})\n")

        if dry_run:
            print("\n─── DRY RUN ───\n")
            custo_est = 0.0
            for r in rows:
                tokens = r["tokens_estimados"] or 0
                custo = tokens * PRECOS["input"] + 3000 * PRECOS["output"]
                custo_est += custo
                print(f"  Reunião {r['numero']:>4s}  [{r['data_publicacao']}]"
                      f"  {tokens:,} tokens  ~${custo:.4f}")
            print(f"\nCusto estimado total: ~${custo_est:.2f}")
            return

        # Análise real
        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        ok = erro = 0
        custo_total = 0.0
        total = len(rows)

        for idx, row in enumerate(rows, 1):
            numero   = row["numero"]
            data_str = str(row["data_publicacao"]) if row["data_publicacao"] else "?"
            prefix   = f"[{idx:3d}/{total}] Reunião {numero:>4s} [{data_str}]"
            ato_id   = row["id"]

            texto = row["texto_completo"]
            if len(texto) > MAX_CHARS:
                texto = texto[:MAX_CHARS]
                print(f"  ⚠  {prefix}: texto truncado em {MAX_CHARS:,} chars")

            try:
                response = await client.messages.create(
                    model=SONNET_MODEL,
                    max_tokens=6000,
                    system=SYSTEM_PROMPT,
                    messages=[{
                        "role": "user",
                        "content": f"Analise a seguinte ata da {numero}ª Reunião Plenária do CAU/PR:\n\n{texto}",
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

                nivel   = resultado.get("nivel_alerta", "amarelo")
                score   = resultado.get("score_risco", 50)
                resumo  = resultado.get("resumo_executivo", "")
                rec     = resultado.get("recomendacao_campanha")

                niveis_validos = {"verde", "amarelo", "laranja", "vermelho"}
                if nivel not in niveis_validos:
                    nivel = "amarelo"

                # Insere em analises
                analise_id = uuid.uuid4()
                await conn.execute(
                    """
                    INSERT INTO analises
                        (id, ato_id, tenant_id, rodada_id, status,
                         nivel_alerta, score_risco,
                         analisado_por_bud,
                         resultado_bud,
                         resumo_executivo, recomendacao_campanha,
                         tokens_bud, custo_usd,
                         criado_em, atualizado_em)
                    VALUES ($1,$2,$3,NULL,'bud_completo',
                            $4,$5,
                            true,
                            $6,
                            $7,$8,
                            $9,$10,
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
                # Marca o ato como processado para aparecer no dashboard
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
    print(f"Concluído: {ok} analisadas | {erro} erros | custo total: ${custo_total:.4f}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analisa atas plenárias CAU/PR com Bud (Claude Sonnet)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run, limit=args.limit))
