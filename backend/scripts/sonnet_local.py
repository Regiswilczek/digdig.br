#!/usr/bin/env python3
"""
Fase Sonnet: aprofunda a análise dos atos classificados como vermelho pelo Haiku.
Gera análise detalhada, narrativa política e ficha de denúncia completa.

Uso:
    cd backend
    python scripts/sonnet_local.py

Segurança:
    - Só processa analises com nivel_alerta='vermelho' e analisado_por_sonnet=False
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

RODADA_ID = uuid.UUID("9063d83c-f510-40b4-93c3-b7469e665aae")
TENANT_ID = uuid.UUID("f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4")
CUSTO_LIMITE = Decimal("10.00")


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
        print(f"  sonnet  {rodada.atos_analisados_sonnet} analisados até agora")
        print(f"{'='*60}\n")

        # 2. Buscar vermelho + laranja ainda não processados pelo Sonnet.
        #    Ordem: vermelho primeiro (mais críticos), depois laranja.
        #    A 1ª chamada paga o cache write do regimento ($0.255);
        #    todas as seguintes pagam só cache read ($0.020) — vale a pena incluir laranjas.
        criticos_r = await db.execute(
            select(Analise).where(
                Analise.tenant_id == TENANT_ID,
                Analise.nivel_alerta.in_(["vermelho", "laranja"]),
                Analise.analisado_por_sonnet == False,
            ).order_by(
                Analise.nivel_alerta.asc(),   # vermelho < laranja alfabeticamente — usar score
                Analise.score_risco.desc(),
            )
        )
        criticos = criticos_r.scalars().all()
        # Garante vermelhos antes dos laranjas
        criticos = sorted(criticos, key=lambda a: (0 if a.nivel_alerta == "vermelho" else 1, -a.score_risco))
        total = len(criticos)

        n_vermelho = sum(1 for a in criticos if a.nivel_alerta == "vermelho")
        n_laranja = sum(1 for a in criticos if a.nivel_alerta == "laranja")
        print(f"Casos pendentes: {n_vermelho} vermelhos + {n_laranja} laranjas = {total} total")
        custo_est = 0.30 + (total - 1) * 0.06 if total > 0 else 0
        print(f"Custo estimado: ~${custo_est:.2f} (cache write 1ª chamada + cache read nas demais)\n")

        if total == 0:
            print("Nenhum caso vermelho pendente para análise Sonnet.")
            return

        # Mostra resumo dos casos antes de pedir confirmação
        for analise in criticos:
            ato_r = await db.execute(select(Ato).where(Ato.id == analise.ato_id))
            ato = ato_r.scalar_one()
            print(f"  🔴 {ato.tipo} {ato.numero} — score {analise.score_risco}")
            print(f"     {ato.ementa or '(sem ementa)'}")
            print(f"     {analise.resumo_executivo or '(sem resumo)'[:120]}\n")

        input("Pressione ENTER para iniciar o Sonnet ou Ctrl+C para cancelar... ")

        # 3. Montar system prompt
        print("\nCarregando regimento interno...")
        system_prompt = await montar_system_prompt(db, TENANT_ID)
        print("Regimento carregado.\n")

        # 4. Processar
        custo_sessao = Decimal("0")
        ok = erro = 0
        inicio = datetime.now()

        for i, analise in enumerate(criticos, 1):
            ato_r = await db.execute(select(Ato).where(Ato.id == analise.ato_id))
            ato = ato_r.scalar_one()

            print(f"[{i}/{total}] {ato.tipo} {ato.numero} — score {analise.score_risco}", end="  ")

            try:
                # Captura custo anterior ANTES da chamada — mesmo objeto SQLAlchemy
                custo_antes = analise.custo_usd or Decimal("0")

                analise_atualizada = await analisar_ato_sonnet(
                    db, ato.id, RODADA_ID, system_prompt
                )

                custo_ato = (analise_atualizada.custo_usd or Decimal("0")) - custo_antes
                custo_sessao += custo_ato

                await db.execute(
                    update(RodadaAnalise)
                    .where(RodadaAnalise.id == RODADA_ID)
                    .values(
                        atos_analisados_sonnet=RodadaAnalise.atos_analisados_sonnet + 1,
                        custo_total_usd=func.coalesce(RodadaAnalise.custo_total_usd, 0) + custo_ato,
                    )
                )
                await db.commit()

                nivel = analise_atualizada.nivel_alerta
                nivel_emoji = {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}.get(nivel, "⚪")
                print(f"{nivel_emoji} confirmado={nivel}  score={analise_atualizada.score_risco}  ${float(custo_ato):.4f}  acum=${float(custo_sessao):.3f}")
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

        # 5. Resumo
        duracao = (datetime.now() - inicio).seconds
        print(f"\n{'='*60}")
        print(f"  OK:    {ok}")
        print(f"  Erro:  {erro}")
        print(f"  Custo da sessão: ${float(custo_sessao):.4f}")
        print(f"  Duração: {duracao//60}m {duracao%60}s")
        print(f"{'='*60}\n")

        if ok == total:
            print("✅ Fase Sonnet completa! Fichas de denúncia geradas para todos os casos vermelhos.")
            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == RODADA_ID)
                .values(status="concluida")
            )
            await db.commit()
            print("   Rodada marcada como 'concluida'.")


if __name__ == "__main__":
    asyncio.run(main())
