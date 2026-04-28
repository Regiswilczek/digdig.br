#!/usr/bin/env python3
"""
Executa a análise Haiku localmente para as deliberações pendentes.
Roda direto contra o Supabase — sem Celery, sem Railway.

Uso:
    cd backend
    python scripts/analise_deliberacoes_local.py              # 10 workers (padrão)
    python scripts/analise_deliberacoes_local.py --workers 5  # N workers
    python scripts/analise_deliberacoes_local.py --workers 1  # sequencial

Segurança:
    - Só processa atos com processado=False (idempotente)
    - Para automaticamente se custo acumulado > $5
    - Usa a rodada de deliberações criada em 2026-04-24
"""
import asyncio
import sys
import argparse
from pathlib import Path
from decimal import Decimal
from datetime import datetime

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import uuid
from sqlalchemy import select, update, func
from app.database import async_session_factory
from app.models.ato import Ato, RodadaAnalise, ConteudoAto
from app.models.analise import Analise
from app.services.haiku_service import analisar_ato_haiku, montar_system_prompt

RODADA_ID    = uuid.UUID("5b365c0d-43be-4a7e-a22d-159f50fbe3c2")
TENANT_ID    = uuid.UUID("f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4")
CUSTO_LIMITE = Decimal("5.00")
EMOJIS       = {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}


async def _processar_ato(ato_id: uuid.UUID, label: str, system_prompt, print_lock: asyncio.Lock) -> dict:
    """Analisa um ato em sessão própria. Retorna dict com resultado."""
    try:
        async with async_session_factory() as db:
            # Re-verifica antes de chamar a API — protege contra duas instâncias simultâneas
            # que lerem a mesma lista de pendentes antes de qualquer uma marcar processado=True.
            check = await db.execute(select(Ato.processado).where(Ato.id == ato_id))
            if check.scalar():
                async with print_lock:
                    print(f"  {label}  (ja processado, pulando)")
                return {"ok": False, "custo": Decimal("0"), "nivel": None, "skipped": True}

            analise = await analisar_ato_haiku(db, ato_id, RODADA_ID, system_prompt)
            custo = analise.custo_usd or Decimal("0")

            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == RODADA_ID)
                .values(
                    atos_analisados_haiku=RodadaAnalise.atos_analisados_haiku + 1,
                    custo_total_usd=func.coalesce(RodadaAnalise.custo_total_usd, 0) + custo,
                )
            )
            await db.commit()

            emoji = EMOJIS.get(analise.nivel_alerta, "⚪")
            async with print_lock:
                print(f"  {label:22s} {emoji} {analise.nivel_alerta:8s}  ${float(custo):.4f}")

            return {"ok": True, "custo": custo, "nivel": analise.nivel_alerta}

    except Exception as e:
        async with print_lock:
            print(f"  {label:22s} X {e}")
        return {"ok": False, "custo": Decimal("0"), "nivel": None}


async def main(workers: int) -> None:
    async with async_session_factory() as db:

        # 1. Verificar rodada
        rodada_r = await db.execute(select(RodadaAnalise).where(RodadaAnalise.id == RODADA_ID))
        rodada = rodada_r.scalar_one()

        print(f"\n{'='*60}")
        print(f"  RODADA DELIBERAÇÕES  {str(RODADA_ID)[:8]}...")
        print(f"  status  {rodada.status}")
        print(f"  haiku   {rodada.atos_analisados_haiku}/{rodada.total_atos}")
        print(f"  custo   ${rodada.custo_total_usd or 0:.4f}")
        print(f"{'='*60}\n")

        if rodada.status not in ("em_progresso", "pendente"):
            print(f"AVISO: rodada está '{rodada.status}' — não é possível continuar.")
            return

        # 2. Buscar deliberações pendentes
        atos_r = await db.execute(
            select(Ato)
            .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
            .where(
                Ato.tenant_id == TENANT_ID,
                Ato.tipo == "deliberacao",
                Ato.processado == False,
            )
            .order_by(Ato.data_publicacao.asc().nulls_last())
        )
        atos = atos_r.scalars().all()
        total = len(atos)
        print(f"Deliberações pendentes: {total}")
        custo_est = float(Decimal(str(total)) * Decimal("0.0120"))
        print(f"Custo estimado: ${custo_est:.2f}  (base $0.012/ato)")
        print(f"Custo limite sessão: ${CUSTO_LIMITE}")
        print(f"Workers: {workers}  (batches de {workers})\n")

        if total == 0:
            print("Nenhuma deliberação pendente. Pipeline completo.")
            return

        try:
            input("Pressione ENTER para iniciar ou Ctrl+C para cancelar... ")
        except EOFError:
            pass

        # 3. Montar system prompt (uma vez — fica em cache Anthropic)
        print("\nCarregando regimento interno...")
        system_prompt = await montar_system_prompt(db, TENANT_ID)
        print("Regimento carregado.\n")

        # 4. Captura IDs e números antes de fechar a sessão principal
        items = [(a.id, a.numero or "?") for a in atos]

    # Sessão principal fechada — workers usam sessões próprias a partir daqui

    print_lock   = asyncio.Lock()
    custo_sessao = Decimal("0")
    ok = erro    = 0
    inicio       = datetime.now()
    parar        = False

    for batch_start in range(0, total, workers):
        if parar:
            break

        batch = items[batch_start : batch_start + workers]
        batch_num = batch_start // workers + 1
        total_batches = (total + workers - 1) // workers

        print(f"--- Batch {batch_num}/{total_batches}  "
              f"[{batch_start+1}-{batch_start+len(batch)}/{total}] ---")

        tasks = [
            _processar_ato(
                ato_id,
                f"[{batch_start+j+1:3d}/{total}] {numero:14s}",
                system_prompt,
                print_lock,
            )
            for j, (ato_id, numero) in enumerate(batch)
        ]

        resultados = await asyncio.gather(*tasks)

        batch_custo = Decimal("0")
        for r in resultados:
            if r["ok"]:
                ok += 1
                batch_custo += r["custo"]
                custo_sessao += r["custo"]
            elif not r.get("skipped"):
                erro += 1

        print(f"    Batch {batch_num} concluido — custo batch: ${float(batch_custo):.4f}  "
              f"acumulado: ${float(custo_sessao):.3f}\n")

        if custo_sessao > CUSTO_LIMITE:
            print(f"⛔ Limite de ${CUSTO_LIMITE} atingido. Pausando.")
            parar = True

    # 5. Resumo
    duracao = (datetime.now() - inicio).seconds
    print(f"{'='*60}")
    print(f"  OK:    {ok}")
    print(f"  Erro:  {erro}")
    print(f"  Custo da sessão: ${float(custo_sessao):.4f}")
    print(f"  Duração: {duracao//60}m {duracao%60}s")
    print(f"{'='*60}\n")

    # 6. Verificar conclusão
    async with async_session_factory() as db:
        pendentes_r = await db.execute(
            select(func.count())
            .select_from(Ato)
            .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
            .where(
                Ato.tenant_id == TENANT_ID,
                Ato.tipo == "deliberacao",
                Ato.processado == False,
            )
        )
        restantes = pendentes_r.scalar()

        if restantes == 0:
            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == RODADA_ID)
                .values(status="haiku_completo")
            )
            await db.commit()
            print("Haiku completo para todas as deliberações!")
            print("   Próximo passo: rodar sonnet_deliberacoes_local.py nos vermelhos + laranjas.")
        else:
            print(f"Restam {restantes} deliberações. Rode novamente para continuar.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=10,
                        help="Número de análises em paralelo por batch (padrão: 10)")
    args = parser.parse_args()
    asyncio.run(main(args.workers))
