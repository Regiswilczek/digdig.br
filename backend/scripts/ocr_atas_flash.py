#!/usr/bin/env python3
"""
ocr_atas_flash.py — OCR puro via Gemini Flash Lite (~10x mais barato que Pro).

Faz APENAS transcrição literal das imagens do PDF, sem análise. Atualiza
conteudo_ato.texto_completo + qualidade='digitalizado_ocr'. Não toca em
analises (Piper texto/Bud rodam depois pelo pipeline normal).

Uso (dentro do container api):
    python /app/scripts/ocr_atas_flash.py --tenant cau-pr --dry-run
    python /app/scripts/ocr_atas_flash.py --tenant cau-pr --limit 1
    python /app/scripts/ocr_atas_flash.py --tenant cau-pr
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import sys
import time
import uuid

sys.path.insert(0, "/app")

from sqlalchemy import select, text
from app.database import async_session_factory
from app.models.tenant import Tenant
from app.models.ato import Ato, ConteudoAto
from app.config import settings
from app.workers.analise_tasks import _baixar_pdf
from openai import AsyncOpenAI


CAU_SLUG_DEFAULT = "cau-pr"
MAX_PAGES = 50
ZOOM = 1.5  # menor que Piper Vision (2.0) — Flash Lite tolera; cada PNG mais leve

PRECO_FLASH_LITE = {
    # Gemini 2.5 Flash Lite (preview): $0.10/M input, $0.40/M output
    "input": 0.10 / 1_000_000,
    "output": 0.40 / 1_000_000,
}


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=settings.gemini_api_key,
    )


SYSTEM_PROMPT = (
    "Você é um OCR. Sua única tarefa é transcrever LITERALMENTE o texto das "
    "imagens fornecidas, na ordem em que aparecem. Não comente, não resuma, "
    "não interprete. Reproduza pontuação, números, nomes e quebras de linha "
    "fielmente. Se uma palavra estiver ilegível, escreva [ilegível]."
)


async def _ocr_uma_ata(client, pdf_bytes: bytes) -> tuple[str, int, int, float]:
    """Roda OCR num PDF. Retorna (texto, tokens_in, tokens_out, custo)."""
    import fitz

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    paginas = list(doc)[:MAX_PAGES]
    if not paginas:
        raise ValueError("PDF sem páginas renderizáveis")

    image_blocks = []
    for page in paginas:
        pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM))
        img_b64 = base64.b64encode(pix.tobytes("png")).decode()
        image_blocks.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{img_b64}"},
        })

    aviso = f" (exibindo {MAX_PAGES} de {len(doc)} páginas)" if len(doc) > MAX_PAGES else ""
    user_prompt = [
        {"type": "text", "text": f"Transcreva literalmente o conteúdo das imagens a seguir{aviso}."},
    ] + image_blocks

    response = await client.chat.completions.create(
        model=settings.gemini_flash_lite_model,
        max_tokens=32000,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )

    texto = (response.choices[0].message.content or "").strip()
    tin = response.usage.prompt_tokens if response.usage else 0
    tout = response.usage.completion_tokens if response.usage else 0
    custo = tin * PRECO_FLASH_LITE["input"] + tout * PRECO_FLASH_LITE["output"]
    return texto, tin, tout, custo


async def _coletar(tenant_id: uuid.UUID, limit: int | None) -> list[dict]:
    async with async_session_factory() as db:
        sql = """
            SELECT a.id, a.numero, a.data_publicacao, a.url_pdf
            FROM atos a
            JOIN conteudo_ato c ON c.ato_id = a.id
            WHERE a.tenant_id = :tid
              AND a.tipo = 'ata_plenaria'
              AND c.qualidade = 'ruim'
              AND a.url_pdf IS NOT NULL
            ORDER BY a.data_publicacao NULLS LAST
        """
        if limit:
            sql += f" LIMIT {int(limit)}"
        rows = await db.execute(text(sql), {"tid": str(tenant_id)})
        return [dict(r._mapping) for r in rows]


async def _salvar_texto(ato_id: uuid.UUID, texto: str) -> None:
    async with async_session_factory() as db:
        cr = await db.execute(select(ConteudoAto).where(ConteudoAto.ato_id == ato_id))
        conteudo = cr.scalar_one_or_none()
        if conteudo:
            conteudo.texto_completo = texto
            conteudo.qualidade = "digitalizado_ocr"
            conteudo.metodo_extracao = "gemini_flash_ocr"
            conteudo.tokens_estimados = max(conteudo.tokens_estimados or 0, len(texto) // 4)
        else:
            db.add(ConteudoAto(
                ato_id=ato_id,
                texto_completo=texto,
                qualidade="digitalizado_ocr",
                metodo_extracao="gemini_flash_ocr",
                tokens_estimados=len(texto) // 4,
            ))
        await db.commit()


async def main(tenant_slug: str, limit: int | None, dry_run: bool) -> None:
    async with async_session_factory() as db:
        tenant = (await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))).scalar_one()
    rows = await _coletar(tenant.id, limit)

    print(f"\n=== OCR via Gemini Flash Lite — {tenant_slug} qualidade=ruim ===")
    print(f"Modelo: {settings.gemini_flash_lite_model}  zoom={ZOOM}  max_pages={MAX_PAGES}")
    print(f"Atas a processar: {len(rows)}")
    if not rows:
        return
    if dry_run:
        for r in rows:
            print(f"  num={r['numero']!r:6} dt={r['data_publicacao']}")
        return

    client = _get_client()
    sucesso = falha = 0
    custo_total = 0.0
    inicio = time.monotonic()
    print(f"\n{'#':>3}  {'NUM':>6}  {'DATA':10}  {'PDF':>6}  {'TXT_LEN':>8}  {'TOK_IN':>8}  {'TOK_OUT':>7}  {'CUSTO':>9}")
    print("-" * 80)
    for i, r in enumerate(rows, 1):
        num = r["numero"]
        dt = str(r["data_publicacao"])[:10] if r["data_publicacao"] else "?"
        try:
            pdf_bytes = await _baixar_pdf(r["url_pdf"], timeout=120)
            pdf_mb = len(pdf_bytes) / 1_000_000
            texto, tin, tout, custo = await _ocr_uma_ata(client, pdf_bytes)
            await _salvar_texto(r["id"], texto)
            custo_total += custo
            print(f"{i:>3}  {num!r:>6}  {dt:10}  {pdf_mb:>5.1f}M  {len(texto):>8}  {tin:>8}  {tout:>7}  ${custo:.4f}")
            sucesso += 1
        except Exception as exc:
            print(f"{i:>3}  {num!r:>6}  {dt:10}  ERRO: {type(exc).__name__}: {str(exc)[:100]}")
            falha += 1

    elapsed = time.monotonic() - inicio
    print()
    print(f"═══ TOTAL ═══")
    print(f"  Sucesso: {sucesso}/{len(rows)}")
    print(f"  Falha:   {falha}")
    print(f"  Custo:   US$ {custo_total:.4f}")
    print(f"  Tempo:   {elapsed:.0f}s ({elapsed/60:.1f}min)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant", default=CAU_SLUG_DEFAULT)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.tenant, args.limit, args.dry_run))
