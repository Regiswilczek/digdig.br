#!/usr/bin/env python3
"""
Gera relatório de cobertura da análise: quais portarias foram processadas,
quais são escaneadas (sem texto), e quais não têm PDF.

Saída: cobertura_analise.json no diretório raiz do projeto.

Usage (from backend/ directory):
    python scripts/relatorio_cobertura.py
    python scripts/relatorio_cobertura.py --output /caminho/saida.json
"""
import asyncio
import json
import os
import sys
import argparse
from datetime import datetime, timezone
from pathlib import Path

# ── Load .env ──────────────────────────────────────────────────────────────────
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    with open(_env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL not set in backend/.env")

import asyncpg

ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")


async def main(output_path: Path) -> None:
    conn = await asyncpg.connect(ASYNCPG_URL)

    try:
        # ── Por ano ────────────────────────────────────────────────────────────
        por_ano = await conn.fetch("""
            SELECT
                EXTRACT(YEAR FROM data_publicacao)::int AS ano,
                COUNT(*) FILTER (WHERE pdf_baixado = true)          AS com_texto,
                COUNT(*) FILTER (WHERE erro_download = 'texto_vazio') AS escaneadas,
                COUNT(*) FILTER (WHERE url_pdf IS NULL)              AS sem_pdf,
                COUNT(*)                                              AS total
            FROM atos
            WHERE tipo = 'portaria'
            GROUP BY ano
            ORDER BY ano DESC NULLS LAST
        """)

        # ── Lista de escaneadas ────────────────────────────────────────────────
        escaneadas = await conn.fetch("""
            SELECT numero, data_publicacao, ementa, url_pdf
            FROM atos
            WHERE tipo = 'portaria' AND erro_download = 'texto_vazio'
            ORDER BY data_publicacao DESC NULLS LAST
        """)

        # ── Lista de processadas (com texto e analisadas por haiku) ───────────
        analisadas = await conn.fetch("""
            SELECT a.numero, a.data_publicacao, a.ementa,
                   an.nivel_alerta, an.score_risco
            FROM atos a
            JOIN analises an ON an.ato_id = a.id
            WHERE a.tipo = 'portaria' AND a.pdf_baixado = true AND a.processado = true
            ORDER BY a.data_publicacao DESC NULLS LAST
        """)

        # ── Com texto mas ainda não analisadas ────────────────────────────────
        nao_analisadas = await conn.fetch("""
            SELECT numero, data_publicacao, ementa
            FROM atos
            WHERE tipo = 'portaria'
              AND pdf_baixado = true
              AND processado = false
            ORDER BY data_publicacao DESC NULLS LAST
        """)

        # ── Totais gerais ──────────────────────────────────────────────────────
        totais = await conn.fetchrow("""
            SELECT
                COUNT(*)                                               AS total,
                COUNT(*) FILTER (WHERE pdf_baixado = true)             AS com_texto,
                COUNT(*) FILTER (WHERE erro_download = 'texto_vazio')  AS escaneadas,
                COUNT(*) FILTER (WHERE processado = true)              AS analisadas,
                COUNT(*) FILTER (WHERE pdf_baixado = true
                                   AND processado = false)             AS pendentes_analise
            FROM atos
            WHERE tipo = 'portaria'
        """)

    finally:
        await conn.close()

    # ── Monta o relatório ──────────────────────────────────────────────────────
    relatorio = {
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "orgao": "CAU/PR — Conselho de Arquitetura e Urbanismo do Paraná",
        "tipo_ato": "portaria",
        "resumo": {
            "total_portarias": totais["total"],
            "com_texto_extraivel": totais["com_texto"],
            "escaneadas_sem_texto": totais["escaneadas"],
            "analisadas_por_ia": totais["analisadas"],
            "pendentes_analise_ia": totais["pendentes_analise"],
            "cobertura_percentual": round(
                (totais["analisadas"] / totais["total"] * 100) if totais["total"] else 0, 1
            ),
            "cobertura_sobre_disponiveis": round(
                (totais["analisadas"] / totais["com_texto"] * 100)
                if totais["com_texto"] else 0, 1
            ),
        },
        "nota_metodologica": (
            "As portarias marcadas como 'escaneadas' foram baixadas com sucesso do site "
            "oficial do CAU/PR mas não possuem camada de texto extraível — são imagens "
            "digitalizadas sem OCR aplicado. Estas portarias NÃO foram incluídas na análise "
            "por inteligência artificial. Para análise futura destes documentos, seria "
            "necessária a aplicação de OCR (Reconhecimento Óptico de Caracteres)."
        ),
        "por_ano": [
            {
                "ano": r["ano"],
                "total": r["total"],
                "com_texto": r["com_texto"],
                "escaneadas": r["escaneadas"],
                "sem_pdf": r["sem_pdf"],
                "cobertura_pct": round(
                    r["com_texto"] / r["total"] * 100 if r["total"] else 0, 1
                ),
            }
            for r in por_ano
        ],
        "portarias_escaneadas": [
            {
                "numero": r["numero"],
                "data": str(r["data_publicacao"]) if r["data_publicacao"] else None,
                "ementa": r["ementa"],
                "url_pdf": r["url_pdf"],
                "motivo_exclusao": "PDF escaneado — sem camada de texto",
            }
            for r in escaneadas
        ],
        "portarias_analisadas": [
            {
                "numero": r["numero"],
                "data": str(r["data_publicacao"]) if r["data_publicacao"] else None,
                "ementa": r["ementa"],
                "nivel_alerta": r["nivel_alerta"],
                "score_risco": r["score_risco"],
            }
            for r in analisadas
        ],
        "portarias_pendentes_analise": [
            {
                "numero": r["numero"],
                "data": str(r["data_publicacao"]) if r["data_publicacao"] else None,
                "ementa": r["ementa"],
            }
            for r in nao_analisadas
        ],
    }

    # ── Salva JSON ─────────────────────────────────────────────────────────────
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=2)

    # ── Imprime resumo ─────────────────────────────────────────────────────────
    r = relatorio["resumo"]
    out = sys.stdout.buffer

    def w(line: str) -> None:
        out.write((line + "\n").encode("utf-8", errors="replace"))

    w(f"\n=== Cobertura da Analise - {relatorio['orgao']} ===\n")
    w(f"  Total portarias no banco  : {r['total_portarias']}")
    w(f"  Com texto extraivel       : {r['com_texto_extraivel']}")
    w(f"  Escaneadas (sem texto)    : {r['escaneadas_sem_texto']}")
    w(f"  Analisadas por IA         : {r['analisadas_por_ia']}")
    w(f"  Pendentes analise IA      : {r['pendentes_analise_ia']}")
    w(f"  Cobertura total           : {r['cobertura_percentual']}%")
    w(f"  Cobertura (disponiveis)   : {r['cobertura_sobre_disponiveis']}%")
    w(f"\n  Por ano:")
    for ano_row in relatorio["por_ano"]:
        bar = "#" * int(ano_row["cobertura_pct"] / 10)
        w(f"    {str(ano_row['ano'] or 'S/D'):4s}: {ano_row['com_texto']:3d}/{ano_row['total']:3d} "
          f"({ano_row['cobertura_pct']:5.1f}%) {bar}")

    w(f"\n  Relatorio salvo em: {output_path}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).parent.parent.parent / "cobertura_analise.json",
    )
    args = parser.parse_args()
    asyncio.run(main(args.output))
