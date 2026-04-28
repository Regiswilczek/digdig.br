#!/usr/bin/env python3
"""
Analisa atas plenárias pendentes com Piper (Gemini Pro).

- qualidade='parcial' (12 atas, têm texto): análise de texto via analisar_ato_piper
- qualidade='ruim'    (50 atas, sem texto): baixa PDF + visão via analisar_ato_piper_visao

Uso:
    cd backend
    python scripts/analisar_atas_piper_local.py --dry-run
    python scripts/analisar_atas_piper_local.py --limit 5
    python scripts/analisar_atas_piper_local.py
"""
import argparse
import asyncio
import sys
import os
from decimal import Decimal
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import uuid
import httpx
from sqlalchemy import select, update, func
from app.database import async_session_factory
from app.models.ato import Ato, ConteudoAto, RodadaAnalise
from app.models.analise import Analise
from app.services.piper_service import analisar_ato_piper, analisar_ato_piper_visao, montar_system_prompt

TENANT_ID = uuid.UUID("f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4")
CUSTO_LIMITE = Decimal("5.00")
RATE_LIMIT_SEGUNDOS = 3.0

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.caupr.gov.br/",
    "Accept": "application/pdf,*/*",
}

NIVEL_EMOJI = {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}


async def main(dry_run: bool, limit: int | None) -> None:
    async with async_session_factory() as db:

        # Atas com qualidade != 'boa' e sem Piper
        atos_r = await db.execute(
            select(Ato, ConteudoAto)
            .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
            .outerjoin(Analise, Analise.ato_id == Ato.id)
            .where(
                Ato.tenant_id == TENANT_ID,
                Ato.tipo == "ata_plenaria",
                Ato.processado == False,
                ConteudoAto.qualidade.in_(["parcial", "ruim"]),
                Analise.resultado_piper == None,
            )
            .order_by(ConteudoAto.qualidade, Ato.data_publicacao.asc().nullslast())
        )
        pares = atos_r.all()

        # Separa por tipo de processamento
        parciais = [(a, c) for a, c in pares if c.qualidade == "parcial"]
        ruins    = [(a, c) for a, c in pares if c.qualidade == "ruim" and a.url_pdf]
        sem_url  = [(a, c) for a, c in pares if c.qualidade == "ruim" and not a.url_pdf]

        total_processavel = len(parciais) + len(ruins)
        if limit:
            todos = parciais[:limit] + ruins[:max(0, limit - len(parciais))]
            parciais = [(a, c) for a, c in todos if c.qualidade == "parcial"]
            ruins    = [(a, c) for a, c in todos if c.qualidade == "ruim"]

        print(f"\n{'='*65}")
        print(f"  ANÁLISE PIPER — ATAS PLENÁRIAS CAU/PR")
        print(f"{'='*65}")
        print(f"  Parcial (texto disponível): {len(parciais):3d} atas  → texto direto")
        print(f"  Ruim   (PDF sem texto):     {len(ruins):3d} atas  → visão Gemini Pro")
        if sem_url:
            print(f"  Sem URL PDF:               {len(sem_url):3d} atas  → puladas")
        custo_est = len(parciais) * 0.015 + len(ruins) * 0.06
        print(f"  Custo estimado total:       ~${custo_est:.2f}")
        print(f"{'='*65}\n")

        if not parciais and not ruins:
            print("Nenhuma ata pendente. Tudo certo.")
            return

        if dry_run:
            print("── DRY RUN ──")
            print("\nParcial (texto):")
            for ato, ca in parciais:
                chars = len(ca.texto_completo or "")
                print(f"  Ata {str(ato.numero or '?'):>4s}  {str(ato.data_publicacao or '')[:10]}  {chars:,} chars")
            print("\nRuim (visão):")
            for ato, ca in ruins:
                print(f"  Ata {str(ato.numero or '?'):>4s}  {str(ato.data_publicacao or '')[:10]}  {ato.url_pdf or 'sem URL'}")
            return

        try:
            input("Pressione ENTER para iniciar ou Ctrl+C para cancelar... ")
        except EOFError:
            pass

        # Cria rodada específica para atas
        rodada = RodadaAnalise(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            status="em_progresso",
            total_atos=len(parciais) + len(ruins),
        )
        db.add(rodada)
        await db.commit()
        await db.refresh(rodada)
        rodada_id = rodada.id
        print(f"\nRodada criada: {rodada_id}\n")

        print("Carregando system prompt (regimento + KB)...")
        system_prompt = await montar_system_prompt(db, TENANT_ID)
        print(f"System prompt: ~{len(system_prompt)//4:,} tokens\n")

        custo_sessao = Decimal("0")
        ok = erro = 0
        parou_por_limite = False
        inicio = datetime.now()
        total = len(parciais) + len(ruins)
        idx = 0

        # Extrai valores primitivos agora para não depender de lazy-load após rollback
        parciais_dados = [
            (a.id, str(a.numero or "?"), str(a.data_publicacao or "")[:10])
            for a, _ in parciais
        ]
        ruins_dados = [
            (a.id, str(a.numero or "?"), str(a.data_publicacao or "")[:10], a.url_pdf)
            for a, _ in ruins
        ]

        # ── Parciais (texto disponível) ────────────────────────────────────────
        for ato_id, numero, data_str in parciais_dados:
            idx += 1
            prefix = f"[{idx:3d}/{total}] Ata {numero:>4s} {data_str} [TEXTO]"
            print(prefix, end="  ", flush=True)
            try:
                analise = await analisar_ato_piper(db, ato_id, rodada_id, system_prompt)
                custo_ato = analise.custo_usd or Decimal("0")
                custo_sessao += custo_ato

                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == rodada_id)
                    .values(
                        atos_analisados_haiku=RodadaAnalise.atos_analisados_haiku + 1,
                        custo_total_usd=func.coalesce(RodadaAnalise.custo_total_usd, 0) + custo_ato,
                    )
                )
                await db.commit()

                emoji = NIVEL_EMOJI.get(analise.nivel_alerta, "⚪")
                cvss = f"CVSS={analise.cvss_score}" if analise.cvss_score else ""
                print(f"{emoji} {analise.nivel_alerta:8s}  {cvss}  ${float(custo_ato):.4f}  acum=${float(custo_sessao):.3f}")
                ok += 1
            except Exception as exc:
                print(f"✗  {exc}")
                await db.rollback()
                erro += 1

            if custo_sessao >= CUSTO_LIMITE:
                print(f"\n⚠  Limite de ${CUSTO_LIMITE} atingido. Parando.")
                parou_por_limite = True
                break

            if idx < total:
                await asyncio.sleep(RATE_LIMIT_SEGUNDOS)

        # ── Ruim (visão via PDF) ───────────────────────────────────────────────
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=90) as http:
            for ato_id, numero, data_str, url_pdf in ruins_dados:
                if custo_sessao >= CUSTO_LIMITE:
                    print(f"\n⚠  Limite de ${CUSTO_LIMITE} atingido. Parando.")
                    parou_por_limite = True
                    break

                idx += 1
                prefix = f"[{idx:3d}/{total}] Ata {numero:>4s} {data_str} [VISÃO]"
                print(prefix, end="  ", flush=True)

                try:
                    resp = await http.get(url_pdf)
                    resp.raise_for_status()
                    pdf_bytes = resp.content

                    if len(pdf_bytes) < 500:
                        raise ValueError(f"PDF muito pequeno ({len(pdf_bytes)} bytes)")

                    analise = await analisar_ato_piper_visao(
                        db, ato_id, rodada_id, system_prompt, pdf_bytes
                    )

                    # Atualiza qualidade do conteudo_ato para refletir que foi processado
                    await db.execute(
                        update(ConteudoAto)
                        .where(ConteudoAto.ato_id == ato_id)
                        .values(qualidade="digitalizado")
                    )
                    await db.commit()

                    custo_ato = analise.custo_usd or Decimal("0")
                    custo_sessao += custo_ato

                    await db.execute(
                        update(RodadaAnalise)
                        .where(RodadaAnalise.id == rodada_id)
                        .values(
                            atos_analisados_haiku=RodadaAnalise.atos_analisados_haiku + 1,
                            custo_total_usd=func.coalesce(RodadaAnalise.custo_total_usd, 0) + custo_ato,
                        )
                    )
                    await db.commit()

                    emoji = NIVEL_EMOJI.get(analise.nivel_alerta, "⚪")
                    cvss = f"CVSS={analise.cvss_score}" if analise.cvss_score else ""
                    print(f"{emoji} {analise.nivel_alerta:8s}  {cvss}  ${float(custo_ato):.4f}  acum=${float(custo_sessao):.3f}")
                    ok += 1

                except Exception as exc:
                    print(f"✗  {exc}")
                    await db.rollback()
                    erro += 1

                if idx < total:
                    await asyncio.sleep(RATE_LIMIT_SEGUNDOS)

        # Fecha rodada
        if parou_por_limite or erro > 0:
            status_final = "parcial"
        else:
            status_final = "concluido"
        await db.execute(
            update(RodadaAnalise)
            .where(RodadaAnalise.id == rodada_id)
            .values(status=status_final)
        )
        await db.commit()

        dur = (datetime.now() - inicio).seconds
        print(f"\n{'='*65}")
        print(f"  OK:     {ok}  |  Erros: {erro}")
        print(f"  Custo:  ${float(custo_sessao):.4f}")
        print(f"  Tempo:  {dur//60}m {dur%60}s")
        print(f"  Rodada: {rodada_id}")
        print(f"{'='*65}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Lista sem processar")
    parser.add_argument("--limit", type=int, default=None, help="Máximo de atas a processar")
    args = parser.parse_args()
    asyncio.run(main(args.dry_run, args.limit))
