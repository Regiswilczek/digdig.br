#!/usr/bin/env python3
"""
Extrai texto de documentos pendentes em duas fases:

  Fase 1 — pdfplumber nos PDFs com url_pdf mas sem conteudo_ato (28 docs)
            convenio (22), dispensa_eletronica (5), relatorio_tcu (1)

  Fase 2 — OCR Tesseract nos PDFs digitalizados/escaneados (~213 docs)
            portaria (151), ata_plenaria (62), convenio (2), etc.

REQUISITOS PARA FASE 2:
    pip install pytesseract pdf2image
    Instalar Tesseract com língua portuguesa:
        https://github.com/UB-Mannheim/tesseract/wiki
        Durante instalação: marcar "Additional language data" → Portuguese (por)

Uso (cd backend/):
    python scripts/extrair_faltantes.py --dry-run
    python scripts/extrair_faltantes.py --fase 1
    python scripts/extrair_faltantes.py --fase 2 --limit 10
    python scripts/extrair_faltantes.py --fase 2 --tipo portaria
    python scripts/extrair_faltantes.py          # ambas as fases
"""
import argparse
import asyncio
import io
import os
import sys
import time
from collections import Counter
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import asyncpg
import httpx
import pdfplumber

TENANT_ID = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
ASYNCPG_URL = (
    DATABASE_URL
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace(":5432/", ":6543/")
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/pdf,*/*",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Referer": "https://www.caupr.gov.br/",
}

TIPOS_OCR = [
    "portaria",
    "ata_plenaria",
    "convenio",
    "deliberacao",
    "dispensa_eletronica",
    "relatorio_parecer",
    "relatorio_tcu",
    "contratacao_direta",
    "auditoria_independente",
    "contrato",
]

# Caminhos padrão do Tesseract no Windows
TESSERACT_PATHS_WIN = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Users\Regis\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
]


# ── Extração ────────────────────────────────────────────────────────────────

def _extrair_pdfplumber(pdf_bytes: bytes) -> tuple[str, int]:
    texto_paginas = []
    num_pags = 0
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        num_pags = len(pdf.pages)
        for page in pdf.pages:
            t = page.extract_text() or ""
            texto_paginas.append(t)
    return "\n\n".join(texto_paginas).strip(), num_pags


def _ocr_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    try:
        import pytesseract
        from pdf2image import convert_from_bytes
    except ImportError:
        raise RuntimeError(
            "\nFalta instalar dependências:\n"
            "    pip install pytesseract pdf2image\n"
            "E o Tesseract:\n"
            "    https://github.com/UB-Mannheim/tesseract/wiki\n"
            "    (marcar Portuguese durante instalação)"
        )

    if sys.platform == "win32":
        for p in TESSERACT_PATHS_WIN:
            if Path(p).exists():
                pytesseract.pytesseract.tesseract_cmd = p
                break

    images = convert_from_bytes(pdf_bytes, dpi=300, fmt="jpeg")
    paginas = []
    for img in images:
        texto = pytesseract.image_to_string(img, lang="por")
        paginas.append(texto)

    return "\n\n".join(paginas).strip(), len(images)


async def _baixar_pdf(url: str) -> bytes | None:
    for tentativa in range(3):
        try:
            async with httpx.AsyncClient(
                timeout=90, follow_redirects=True, verify=False
            ) as client:
                r = await client.get(url, headers=HEADERS)
                if r.status_code == 200 and len(r.content) > 500:
                    return r.content
                print(f"    HTTP {r.status_code}")
                return None
        except Exception as e:
            if tentativa < 2:
                await asyncio.sleep(3)
            else:
                print(f"    Erro download: {e}")
    return None


# ── Fase 1: pdfplumber nos sem conteudo_ato ──────────────────────────────────

async def fase1(conn, dry_run: bool, limit: int | None) -> None:
    print(f"\n{'='*60}")
    print("FASE 1 — pdfplumber (sem conteudo_ato, com url_pdf)")
    print(f"{'='*60}")

    rows = await conn.fetch(
        """
        SELECT a.id, a.tipo, a.numero, a.url_pdf
        FROM atos a
        WHERE a.tenant_id = $1
          AND a.url_pdf IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM conteudo_ato c WHERE c.ato_id = a.id)
        ORDER BY a.tipo, a.numero
        """,
        TENANT_ID,
    )

    if limit:
        rows = rows[:limit]

    total = len(rows)
    print(f"Documentos encontrados: {total}")

    if dry_run:
        ct = Counter(r["tipo"] for r in rows)
        for tipo, n in sorted(ct.items(), key=lambda x: -x[1]):
            print(f"  {tipo:<32} {n:>4}")
        return

    ok = erro = 0
    for i, r in enumerate(rows, 1):
        label = (
            f"[{i:3d}/{total}] {r['tipo']:<28} "
            f"Nº {str(r['numero'] or '?'):>10}"
        )

        pdf_bytes = await _baixar_pdf(r["url_pdf"])
        if not pdf_bytes:
            print(f"  ✗  {label}  — sem PDF")
            erro += 1
            await asyncio.sleep(1.5)
            continue

        try:
            texto, npags = _extrair_pdfplumber(pdf_bytes)
            qualidade = "boa" if len(texto) > 200 else "ruim"
            tokens = len(texto) // 4

            await conn.execute(
                """
                INSERT INTO conteudo_ato
                    (ato_id, texto_completo, metodo_extracao, qualidade, tokens_estimados)
                VALUES ($1, $2, 'pdfplumber', $3, $4)
                ON CONFLICT (ato_id) DO UPDATE
                   SET texto_completo   = EXCLUDED.texto_completo,
                       metodo_extracao  = EXCLUDED.metodo_extracao,
                       qualidade        = EXCLUDED.qualidade,
                       tokens_estimados = EXCLUDED.tokens_estimados
                """,
                r["id"], texto, qualidade, tokens,
            )

            print(
                f"  {'✓' if qualidade == 'boa' else '~'}  {label}  "
                f"{npags}pág  {len(texto):,}chars  [{qualidade}]"
            )
            ok += 1
        except Exception as e:
            print(f"  ✗  {label}  {e}")
            erro += 1

        await asyncio.sleep(1.5)

    print(f"\n  Fase 1: {ok} OK | {erro} erros")


# ── Fase 2: OCR nos escaneados ───────────────────────────────────────────────

async def fase2(conn, dry_run: bool, limit: int | None, tipos: list[str]) -> None:
    print(f"\n{'='*60}")
    print("FASE 2 — OCR Tesseract (ruim / digitalizado)")
    print(f"Tipos: {', '.join(tipos)}")
    print(f"{'='*60}")

    rows = await conn.fetch(
        """
        SELECT a.id, a.tipo, a.numero, a.url_pdf, c.qualidade
        FROM atos a
        JOIN conteudo_ato c ON c.ato_id = a.id
        WHERE a.tenant_id = $1
          AND a.url_pdf IS NOT NULL
          AND a.tipo = ANY($2::text[])
          AND c.qualidade IN ('ruim', 'digitalizado')
        ORDER BY a.tipo, a.numero
        """,
        TENANT_ID, tipos,
    )

    if limit:
        rows = rows[:limit]

    total = len(rows)
    print(f"Documentos para OCR: {total}")

    if dry_run:
        ct = Counter(r["tipo"] for r in rows)
        for tipo, n in sorted(ct.items(), key=lambda x: -x[1]):
            print(f"  {tipo:<32} {n:>4}")
        print("\n(DRY RUN — nada executado)")
        return

    if total == 0:
        print("Nada a fazer.")
        return

    est_min = total * 1.5  # ~1.5 min por doc de 10 páginas
    print(f"Tempo estimado: ~{est_min:.0f} min ({total} docs × ~1.5 min/doc)")
    try:
        input("\nPressione ENTER para iniciar ou Ctrl+C para cancelar... ")
    except EOFError:
        pass

    ok = erro = 0
    inicio = time.time()

    for i, r in enumerate(rows, 1):
        label = (
            f"[{i:3d}/{total}] {r['tipo']:<28} "
            f"Nº {str(r['numero'] or '?'):>10}"
        )

        pdf_bytes = await _baixar_pdf(r["url_pdf"])
        if not pdf_bytes:
            print(f"  ✗  {label}  — sem PDF")
            erro += 1
            await asyncio.sleep(1)
            continue

        try:
            t0 = time.time()
            texto, npags = _ocr_pdf(pdf_bytes)
            elapsed = time.time() - t0
            qualidade = "boa" if len(texto) > 200 else "ruim"
            tokens = len(texto) // 4

            await conn.execute(
                """
                UPDATE conteudo_ato
                   SET texto_completo   = $1,
                       metodo_extracao  = 'tesseract',
                       qualidade        = $2,
                       tokens_estimados = $3
                 WHERE ato_id = $4
                """,
                texto, qualidade, tokens, r["id"],
            )

            print(
                f"  {'✓' if qualidade == 'boa' else '~'}  {label}  "
                f"{npags}pág  {len(texto):,}chars  [{qualidade}]  {elapsed:.0f}s"
            )
            ok += 1
        except Exception as e:
            print(f"  ✗  {label}  {e}")
            erro += 1

        await asyncio.sleep(0.5)

    total_min = (time.time() - inicio) / 60
    print(f"\n{'='*60}")
    print(f"  Fase 2: {ok} OK | {erro} erros | {total_min:.1f} min total")
    print(f"{'='*60}")


# ── Main ─────────────────────────────────────────────────────────────────────

async def main(dry_run: bool, fase: int | None, limit: int | None, tipos: list[str]) -> None:
    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    try:
        if fase is None or fase == 1:
            await fase1(conn, dry_run, limit)
        if fase is None or fase == 2:
            await fase2(conn, dry_run, limit, tipos)
    finally:
        await conn.close()

    print("\nConcluído.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Extrai texto de documentos pendentes CAU/PR"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Mostra o que seria processado sem alterar o banco"
    )
    parser.add_argument(
        "--fase", type=int, choices=[1, 2], default=None,
        help="1=pdfplumber (28 faltantes)  2=OCR (escaneados)  padrão=ambas"
    )
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument(
        "--tipo", type=str, default=None,
        help="Filtrar um tipo específico para fase 2 (ex: portaria)"
    )
    args = parser.parse_args()

    tipos = [args.tipo] if args.tipo else TIPOS_OCR
    asyncio.run(main(
        dry_run=args.dry_run,
        fase=args.fase,
        limit=args.limit,
        tipos=tipos,
    ))
