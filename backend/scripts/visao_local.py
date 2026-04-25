#!/usr/bin/env python3
"""
Analisa portarias digitalizadas (sem camada de texto) enviando as páginas como
imagens ao Claude Haiku Vision.

Essas portarias têm erro_download='texto_vazio' porque o pdfplumber não consegue
extrair texto de PDFs escaneados (imagens sem OCR). São principalmente portarias
de 2018–2021.

Uso:
    cd backend
    python scripts/visao_local.py

Segurança:
    - Só processa atos com processado=False e erro_download='texto_vazio'
    - Para automaticamente se custo acumulado > $8
    - Usa a rodada em_progresso existente (mesma do analise_local.py)
"""
import asyncio
import sys
import os
from pathlib import Path
from decimal import Decimal
from datetime import datetime

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import uuid
import httpx
from sqlalchemy import select, update, func
from app.database import async_session_factory
from app.models.ato import Ato, RodadaAnalise
from app.models.analise import Analise
from app.services.haiku_service import analisar_ato_haiku_visao, montar_system_prompt

RODADA_ID = uuid.UUID("9063d83c-f510-40b4-93c3-b7469e665aae")
TENANT_ID = uuid.UUID("f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4")
CUSTO_LIMITE = Decimal("8.00")

RATE_LIMIT_SECONDS = 2.0  # mais conservador por causa do download + API
MAX_PDF_BYTES = 50 * 1024 * 1024

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.caupr.gov.br/",
    "Accept": "application/pdf,*/*",
}


async def main():
    async with async_session_factory() as db:

        # 1. Verificar rodada
        rodada_r = await db.execute(
            select(RodadaAnalise).where(RodadaAnalise.id == RODADA_ID)
        )
        rodada = rodada_r.scalar_one()
        print(f"\n{'='*60}")
        print(f"  RODADA  {str(RODADA_ID)[:8]}...")
        print(f"  status  {rodada.status}")
        print(f"  haiku   {rodada.atos_analisados_haiku}/{rodada.total_atos}")
        print(f"{'='*60}\n")

        if rodada.status not in ("em_progresso", "pendente", "haiku_completo"):
            print(f"AVISO: rodada está '{rodada.status}' — não é possível continuar.")
            return

        # 2. Buscar portarias que falharam com 403 no Railway (IP americano bloqueado).
        #    Localmente, o IP brasileiro consegue baixar. São principalmente PDFs
        #    escaneados de 2018-2021 sem camada de texto.
        atos_r = await db.execute(
            select(Ato)
            .where(
                Ato.tenant_id == TENANT_ID,
                Ato.url_pdf.isnot(None),
                Ato.processado == False,
                Ato.erro_download.contains("403"),
            )
            .order_by(Ato.data_publicacao.asc())
        )
        atos = atos_r.scalars().all()
        total = len(atos)

        custo_est = float(Decimal(str(total)) * Decimal("0.060"))
        print(f"Portarias com 403 pendentes: {total}")
        print(f"Custo estimado: ${custo_est:.2f} (base $0.060/ato)\n")

        if total == 0:
            print("Nenhuma portaria digitalizada pendente.")
            return

        input("Pressione ENTER para iniciar ou Ctrl+C para cancelar... ")

        # 3. Montar system prompt (regimento vai para cache)
        print("\nCarregando regimento interno...")
        system_prompt = await montar_system_prompt(db, TENANT_ID)
        print("Regimento carregado.\n")

        # 4. Processar
        custo_sessao = Decimal("0")
        ok = erro = pulados = 0
        inicio = datetime.now()

        async with httpx.AsyncClient(
            headers=HEADERS, follow_redirects=True, timeout=45
        ) as http:
            for i, ato in enumerate(atos, 1):
                elapsed = (datetime.now() - inicio).seconds
                print(
                    f"[{i:3d}/{total}] {ato.tipo} {ato.numero or '?':10s} "
                    f"{str(ato.data_publicacao or '')[:10]}",
                    end="  ",
                )

                try:
                    # Baixa PDF
                    resp = await http.get(ato.url_pdf)
                    if resp.status_code == 403:
                        print(f"⛔ 403 Forbidden")
                        pulados += 1
                        continue

                    resp.raise_for_status()
                    pdf_bytes = resp.content

                    if len(pdf_bytes) > MAX_PDF_BYTES:
                        print(f"⛔ PDF muito grande ({len(pdf_bytes)//1024}KB)")
                        pulados += 1
                        continue

                    # Analisa com Haiku Vision
                    analise = await analisar_ato_haiku_visao(
                        db, ato.id, RODADA_ID, system_prompt, pdf_bytes
                    )
                    custo_ato = analise.custo_usd or Decimal("0")
                    custo_sessao += custo_ato

                    # Atualiza rodada
                    await db.execute(
                        update(RodadaAnalise)
                        .where(RodadaAnalise.id == RODADA_ID)
                        .values(
                            atos_analisados_haiku=RodadaAnalise.atos_analisados_haiku + 1,
                            custo_total_usd=func.coalesce(RodadaAnalise.custo_total_usd, 0) + custo_ato,
                        )
                    )
                    await db.commit()

                    nivel_emoji = {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}.get(
                        analise.nivel_alerta, "⚪"
                    )
                    print(
                        f"{nivel_emoji} {analise.nivel_alerta:8s}  "
                        f"${float(custo_ato):.4f}  acum=${float(custo_sessao):.3f}"
                    )
                    ok += 1

                    if custo_sessao > CUSTO_LIMITE:
                        print(f"\n⛔ Limite de ${CUSTO_LIMITE} atingido. Pausando.")
                        break

                except KeyboardInterrupt:
                    print("\n\nInterrompido pelo usuário.")
                    break
                except Exception as e:
                    print(f"✗ erro: {e}")
                    erro += 1
                    continue

                if i < total:
                    await asyncio.sleep(RATE_LIMIT_SECONDS)

        # 5. Resumo
        duracao = (datetime.now() - inicio).seconds
        print(f"\n{'='*60}")
        print(f"  OK:      {ok}")
        print(f"  Erro:    {erro}")
        print(f"  Pulados: {pulados}")
        print(f"  Custo da sessão: ${float(custo_sessao):.4f}")
        print(f"  Duração: {duracao//60}m {duracao%60}s")
        print(f"{'='*60}\n")

        # 6. Verificar se todas as digitalizadas foram processadas
        pendentes_r = await db.execute(
            select(func.count()).where(
                Ato.tenant_id == TENANT_ID,
                Ato.processado == False,
                Ato.erro_download.contains("403"),
            )
        )
        restantes = pendentes_r.scalar()

        if restantes == 0:
            print("✅ Todas as portarias com 403 foram analisadas.")
        else:
            print(f"⏸  Restam {restantes} portarias com 403. Rode novamente para continuar.")


if __name__ == "__main__":
    asyncio.run(main())
