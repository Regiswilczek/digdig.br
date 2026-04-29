#!/usr/bin/env python3
"""
Diagnóstico completo dos documentos não analisados.
Mostra quais faltaram e por quê — portarias + deliberações.

Uso:
    cd backend
    python scripts/diagnostico_faltantes.py
"""
import asyncio
import os
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_env = Path(__file__).parent.parent / ".env"
if _env.exists():
    with open(_env) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado em backend/.env")

import asyncpg

ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")


async def main() -> None:
    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    try:
        # ── Totais gerais ──────────────────────────────────────────────────────
        totais = await conn.fetchrow("""
            SELECT
                COUNT(*)                                         AS total,
                COUNT(*) FILTER (WHERE processado = true)       AS analisados,
                COUNT(*) FILTER (WHERE processado = false)      AS nao_analisados
            FROM atos
        """)

        print(f"\n{'='*65}")
        print(f"  DIAGNÓSTICO DE COBERTURA — DIG DIG / CAU PR")
        print(f"{'='*65}")
        print(f"  Total de documentos no banco : {totais['total']}")
        print(f"  Analisados por IA            : {totais['analisados']}")
        print(f"  NÃO analisados               : {totais['nao_analisados']}")

        # ── Por tipo ──────────────────────────────────────────────────────────
        por_tipo = await conn.fetch("""
            SELECT
                tipo,
                COUNT(*)                                              AS total,
                COUNT(*) FILTER (WHERE processado = true)             AS analisados,
                COUNT(*) FILTER (WHERE processado = false)            AS pendentes,
                COUNT(*) FILTER (WHERE erro_download = 'texto_vazio') AS escaneados,
                COUNT(*) FILTER (WHERE url_pdf IS NULL
                                   AND processado = false)            AS sem_pdf,
                COUNT(*) FILTER (WHERE pdf_baixado = false
                                   AND erro_download IS NOT NULL
                                   AND erro_download != 'texto_vazio'
                                   AND processado = false)            AS outros_erros
            FROM atos
            GROUP BY tipo
            ORDER BY tipo
        """)

        print(f"\n{'─'*65}")
        print(f"  {'TIPO':<20} {'TOTAL':>6} {'ANALID':>7} {'PEND':>6} {'SCAN':>6} {'S/PDF':>6} {'ERRO':>6}")
        print(f"{'─'*65}")
        for r in por_tipo:
            print(
                f"  {r['tipo']:<20} {r['total']:>6} {r['analisados']:>7} "
                f"{r['pendentes']:>6} {r['escaneados']:>6} {r['sem_pdf']:>6} {r['outros_erros']:>6}"
            )

        # ── Detalhe: portarias escaneadas ─────────────────────────────────────
        escaneadas = await conn.fetch("""
            SELECT numero, data_publicacao, ementa, url_pdf
            FROM atos
            WHERE erro_download = 'texto_vazio'
            ORDER BY data_publicacao DESC NULLS LAST
        """)

        if escaneadas:
            print(f"\n{'─'*65}")
            print(f"  PDFs ESCANEADOS (sem camada de texto) — {len(escaneadas)} docs")
            print(f"  → Solução: rodar ocr_escaneadas_local.py")
            print(f"{'─'*65}")
            for r in escaneadas[:20]:
                num = r['numero'] or '?'
                data = str(r['data_publicacao'] or '')[:10]
                ementa = (r['ementa'] or '')[:60]
                print(f"  {data}  #{num:8s}  {ementa}")
            if len(escaneadas) > 20:
                print(f"  ... e mais {len(escaneadas) - 20} portarias escaneadas")

        # ── Detalhe: sem PDF ──────────────────────────────────────────────────
        sem_pdf = await conn.fetch("""
            SELECT tipo, numero, data_publicacao, ementa
            FROM atos
            WHERE url_pdf IS NULL AND processado = false
            ORDER BY tipo, data_publicacao DESC NULLS LAST
        """)

        if sem_pdf:
            print(f"\n{'─'*65}")
            print(f"  SEM URL DE PDF — {len(sem_pdf)} docs")
            print(f"  → Deliberações HTML-only: rodar scrape_deliberacoes_local.py --fase 2,3")
            print(f"{'─'*65}")
            for r in sem_pdf[:10]:
                num = r['numero'] or '?'
                data = str(r['data_publicacao'] or '')[:10]
                ementa = (r['ementa'] or '')[:55]
                print(f"  {r['tipo']:<12} {data}  #{num:8s}  {ementa}")
            if len(sem_pdf) > 10:
                print(f"  ... e mais {len(sem_pdf) - 10}")

        # ── Detalhe: outros erros de download ─────────────────────────────────
        outros = await conn.fetch("""
            SELECT tipo, numero, data_publicacao, erro_download, url_pdf
            FROM atos
            WHERE pdf_baixado = false
              AND processado = false
              AND erro_download IS NOT NULL
              AND erro_download != 'texto_vazio'
            ORDER BY tipo, data_publicacao DESC NULLS LAST
        """)

        if outros:
            print(f"\n{'─'*65}")
            print(f"  OUTROS ERROS DE DOWNLOAD — {len(outros)} docs")
            print(f"  → Rodar scrape_local.py (tentará novamente)")
            print(f"{'─'*65}")
            for r in outros[:10]:
                num = r['numero'] or '?'
                data = str(r['data_publicacao'] or '')[:10]
                print(f"  {r['tipo']:<12} {data}  #{num:8s}  erro={r['erro_download']}")
            if len(outros) > 10:
                print(f"  ... e mais {len(outros) - 10}")

        # ── Deliberações sem conteúdo extraído (pdf_baixado=false, sem erro) ──
        delib_sem_texto = await conn.fetch("""
            SELECT a.numero, a.data_publicacao, a.ementa, a.url_pdf
            FROM atos a
            LEFT JOIN conteudo_ato c ON c.ato_id = a.id
            WHERE a.tipo = 'deliberacao'
              AND a.processado = false
              AND c.ato_id IS NULL
              AND a.erro_download IS NULL
            ORDER BY a.data_publicacao DESC NULLS LAST
        """)

        if delib_sem_texto:
            print(f"\n{'─'*65}")
            print(f"  DELIBERAÇÕES SEM TEXTO EXTRAÍDO (sem erro, sem conteúdo) — {len(delib_sem_texto)} docs")
            print(f"  → Rodar scrape_deliberacoes_local.py")
            print(f"{'─'*65}")
            for r in delib_sem_texto[:10]:
                num = r['numero'] or '?'
                data = str(r['data_publicacao'] or '')[:10]
                ementa = (r['ementa'] or '')[:55]
                print(f"  {data}  #{num:8s}  {ementa}")
            if len(delib_sem_texto) > 10:
                print(f"  ... e mais {len(delib_sem_texto) - 10}")

        # ── Resumo e plano de ação ─────────────────────────────────────────────
        print(f"\n{'='*65}")
        print(f"  PLANO DE AÇÃO")
        print(f"{'='*65}")
        passo = 1
        if escaneadas:
            print(f"  {passo}. OCR dos {len(escaneadas)} PDFs escaneados:")
            print(f"     python scripts/ocr_escaneadas_local.py")
            passo += 1
        # sem_pdf e delib_sem_texto são os mesmos docs (sem url_pdf → sem conteudo_ato)
        delib_html_only = {r['numero'] for r in sem_pdf if r['tipo'] == 'deliberacao'}
        if delib_html_only:
            print(f"  {passo}. Scrape das {len(delib_html_only)} deliberações HTML-only:")
            print(f"     python scripts/scrape_deliberacoes_local.py --fase 2,3")
            passo += 1
        if outros:
            print(f"  {passo}. Re-tentar {len(outros)} downloads com erro:")
            print(f"     python scripts/scrape_local.py")
            passo += 1
        print(f"  4. Após extrair texto, rodar análise:")
        print(f"     python scripts/analisar_atos_piper_local.py --tipo portaria")
        print(f"     python scripts/analisar_atos_piper_local.py --tipo deliberacao")
        print(f"{'='*65}\n")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
