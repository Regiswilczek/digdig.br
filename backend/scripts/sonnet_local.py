#!/usr/bin/env python3
"""
Fase Sonnet: aprofunda a análise dos atos classificados como laranja/vermelho.
Roda com até WORKERS chamadas simultâneas para terminar em < 5 minutos.

Uso:
    cd backend
    python scripts/sonnet_local.py

Segurança:
    - Só processa analises com nivel_alerta in ('vermelho','laranja') e analisado_por_sonnet=False
    - Para automaticamente se custo acumulado > $10
    - Usa a mesma rodada do pipeline Haiku
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
from sqlalchemy import select, update, func
from app.database import async_session_factory
from app.models.ato import Ato, RodadaAnalise
from app.models.analise import Analise
from app.services.haiku_service import montar_system_prompt
from app.services.sonnet_service import analisar_ato_sonnet

RODADA_ID   = uuid.UUID("5b365c0d-43be-4a7e-a22d-159f50fbe3c2")
TENANT_ID   = uuid.UUID("f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4")
CUSTO_LIMITE = Decimal("10.00")
WORKERS      = 2   # chamadas simultâneas à API (limitado pelo pool Supabase Session Mode)


async def processar_caso(
    idx: int,
    total: int,
    ato_id: uuid.UUID,
    analise_id: uuid.UUID,
    numero: str,
    tipo: str,
    score: int,
    nivel: str,
    system_prompt: str,
    sem: asyncio.Semaphore,
    lock: asyncio.Lock,
    custo_sessao: list,   # [Decimal] — mutável via lista para acesso compartilhado
    parar: asyncio.Event,
) -> tuple[bool, Decimal]:
    """Processa um caso em paralelo. Retorna (sucesso, custo_incremental)."""
    if parar.is_set():
        return False, Decimal("0")

    async with sem:
        if parar.is_set():
            return False, Decimal("0")

        try:
            async with async_session_factory() as db:
                # Busca custo atual antes da chamada (por analise_id para evitar duplicatas)
                analise_r = await db.execute(
                    select(Analise).where(Analise.id == analise_id)
                )
                analise = analise_r.scalar_one()
                custo_antes = analise.custo_usd or Decimal("0")

                analise_atualizada = await analisar_ato_sonnet(
                    db, ato_id, RODADA_ID, system_prompt
                )

                custo_ato = (analise_atualizada.custo_usd or Decimal("0")) - custo_antes

                # Atualiza rodada (com lock para evitar race condition)
                async with lock:
                    await db.execute(
                        update(RodadaAnalise)
                        .where(RodadaAnalise.id == RODADA_ID)
                        .values(
                            atos_analisados_sonnet=RodadaAnalise.atos_analisados_sonnet + 1,
                            custo_total_usd=func.coalesce(RodadaAnalise.custo_total_usd, 0) + custo_ato,
                        )
                    )
                    await db.commit()
                    custo_sessao[0] += custo_ato

                nivel_novo = analise_atualizada.nivel_alerta
                emoji = {"verde": "V", "amarelo": "A", "laranja": "L", "vermelho": "R"}.get(nivel_novo, "?")
                print(
                    f"  [{idx:2d}/{total}] {tipo} {numero:18s} "
                    f"score={analise_atualizada.score_risco:3d}  "
                    f"[{emoji}]  ${float(custo_ato):.4f}  acum=${float(custo_sessao[0]):.3f}"
                )

                if custo_sessao[0] > CUSTO_LIMITE:
                    print(f"\n  LIMITE DE ${CUSTO_LIMITE} ATINGIDO — parando.")
                    parar.set()

                return True, custo_ato

        except Exception as e:
            print(f"  [{idx:2d}/{total}] {tipo} {numero} ERRO: {e}")
            return False, Decimal("0")


async def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    async with async_session_factory() as db:

        # 1. Verificar rodada
        rodada_r = await db.execute(
            select(RodadaAnalise).where(RodadaAnalise.id == RODADA_ID)
        )
        rodada = rodada_r.scalar_one()
        print(f"\n{'='*60}")
        print(f"  RODADA  {str(RODADA_ID)[:8]}...")
        print(f"  status  {rodada.status}")
        print(f"  sonnet  {rodada.atos_analisados_sonnet} analisados ate agora")
        print(f"{'='*60}\n")

        # 2. Buscar pendentes
        criticos_r = await db.execute(
            select(Analise).where(
                Analise.tenant_id == TENANT_ID,
                Analise.nivel_alerta.in_(["vermelho", "laranja"]),
                Analise.analisado_por_sonnet == False,
            )
        )
        criticos = criticos_r.scalars().all()
        criticos = sorted(criticos, key=lambda a: (0 if a.nivel_alerta == "vermelho" else 1, -a.score_risco))
        total = len(criticos)

        n_v = sum(1 for a in criticos if a.nivel_alerta == "vermelho")
        n_l = sum(1 for a in criticos if a.nivel_alerta == "laranja")
        print(f"Pendentes: {n_v} vermelhos + {n_l} laranjas = {total} total")

        custo_est = 0.30 + max(0, total - 1) * 0.06
        tempo_est = max(1, (total + WORKERS - 1) // WORKERS) * 35
        print(f"Custo estimado: ~${custo_est:.2f}")
        print(f"Tempo estimado: ~{tempo_est//60}m{tempo_est%60:02d}s com {WORKERS} workers\n")

        if total == 0:
            print("Nenhum caso pendente para analise Sonnet.")
            return

        # 3. Listar casos
        casos = []
        for analise in criticos:
            ato_r = await db.execute(select(Ato).where(Ato.id == analise.ato_id))
            ato = ato_r.scalar_one()
            nivel_char = {"vermelho": "R", "laranja": "L"}.get(analise.nivel_alerta, "?")
            print(f"  [{nivel_char}] {ato.tipo} {ato.numero} score={analise.score_risco}")
            casos.append((ato.id, analise.id, ato.numero, ato.tipo, analise.score_risco, analise.nivel_alerta))

        print()
        try:
            input("Pressione ENTER para iniciar ou Ctrl+C para cancelar... ")
        except EOFError:
            pass  # modo nao-interativo: continua automaticamente

        # 4. Carregar system prompt
        print("\nCarregando regimento interno...")
        system_prompt = await montar_system_prompt(db, TENANT_ID)
        print("Regimento carregado.\n")

    # 5. Processar em paralelo (fora da session principal)
    sem   = asyncio.Semaphore(WORKERS)
    lock  = asyncio.Lock()
    parar = asyncio.Event()
    custo_sessao = [Decimal("0")]   # lista para mutabilidade em closures
    inicio = datetime.now()

    tasks = [
        processar_caso(
            idx=i + 1,
            total=total,
            ato_id=ato_id,
            analise_id=analise_id,
            numero=numero,
            tipo=tipo,
            score=score,
            nivel=nivel,
            system_prompt=system_prompt,
            sem=sem,
            lock=lock,
            custo_sessao=custo_sessao,
            parar=parar,
        )
        for i, (ato_id, analise_id, numero, tipo, score, nivel) in enumerate(casos)
    ]

    resultados = await asyncio.gather(*tasks)

    ok   = sum(1 for ok, _ in resultados if ok)
    erro = sum(1 for ok, _ in resultados if not ok)
    duracao = (datetime.now() - inicio).seconds

    print(f"\n{'='*60}")
    print(f"  OK:    {ok}/{total}")
    print(f"  Erros: {erro}")
    print(f"  Custo: ${float(custo_sessao[0]):.4f}")
    print(f"  Tempo: {duracao//60}m {duracao%60:02d}s")
    print(f"{'='*60}\n")

    if ok == total:
        print("Fase Sonnet completa!")
        async with async_session_factory() as db:
            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == RODADA_ID)
                .values(status="concluida")
            )
            await db.commit()
        print("  Rodada marcada como concluida.")


if __name__ == "__main__":
    asyncio.run(main())
