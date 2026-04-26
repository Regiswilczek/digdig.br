#!/usr/bin/env python3
"""
Executa análise Haiku nos tipos ainda não analisados do CAU/PR.

Tipos cobertos: dispensa_eletronica, relatorio_parecer, relatorio_tcu,
                contratacao_direta, auditoria_independente, contrato, convenio

Cria uma rodada nova automaticamente (ou reutiliza a última em_progresso).
Roda direto contra o Supabase — sem Celery, sem Railway.

Uso (cd backend/):
    python scripts/analise_outros_haiku_local.py --dry-run
    python scripts/analise_outros_haiku_local.py --tipo dispensa_eletronica
    python scripts/analise_outros_haiku_local.py --workers 5
    python scripts/analise_outros_haiku_local.py           # tudo, 10 workers
"""
import asyncio
import sys
import argparse
import uuid
from pathlib import Path
from decimal import Decimal
from datetime import datetime, timezone

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Cria engine próprio com porta 6543 (transaction mode pooler) ANTES de importar app.database,
# depois injeta no módulo para que haiku_service use a conexão correta.
_raw_url = os.environ.get("DATABASE_URL", "")
_url_6543 = _raw_url.replace(":5432/", ":6543/")
_engine_local = create_async_engine(
    _url_6543,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=False,
    connect_args={"statement_cache_size": 0},
)
_factory_local = async_sessionmaker(_engine_local, class_=AsyncSession, expire_on_commit=False)

import app.database as _db_module
_db_module.engine = _engine_local
_db_module.async_session_factory = _factory_local

from sqlalchemy import select, update, func
from app.database import async_session_factory
from app.models.ato import Ato, RodadaAnalise, ConteudoAto
from app.models.analise import Analise
from app.services.haiku_service import analisar_ato_haiku, montar_system_prompt

TENANT_ID    = uuid.UUID("f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4")
CUSTO_LIMITE = Decimal("15.00")
EMOJIS       = {"verde": "🟢", "amarelo": "🟡", "laranja": "🟠", "vermelho": "🔴"}

TIPOS_ALVO = [
    "portaria",
    "dispensa_eletronica",
    "relatorio_parecer",
    "relatorio_tcu",
    "contratacao_direta",
    "auditoria_independente",
    "contrato",
    "convenio",
]

TIPO_LABEL = {
    "portaria":               "Portaria",
    "dispensa_eletronica":    "Dispensa Eletr.",
    "relatorio_parecer":      "Rel./Parecer",
    "relatorio_tcu":          "Rel. TCU",
    "contratacao_direta":     "Cont. Direta",
    "auditoria_independente": "Auditoria",
    "contrato":               "Contrato",
    "convenio":               "Convênio",
}


async def _obter_ou_criar_rodada(db, tipos: list[str]) -> RodadaAnalise:
    """Reutiliza rodada em_progresso/pendente para esses tipos, ou cria uma nova."""
    r = await db.execute(
        select(RodadaAnalise)
        .where(
            RodadaAnalise.tenant_id == TENANT_ID,
            RodadaAnalise.status.in_(["em_progresso", "pendente"]),
        )
        .order_by(RodadaAnalise.criado_em.desc())
        .limit(1)
    )
    rodada = r.scalar_one_or_none()

    if rodada:
        print(f"  Rodada existente: {str(rodada.id)[:8]}...  status={rodada.status}")
        return rodada

    # Conta atos pendentes para total_atos
    total_r = await db.execute(
        select(func.count())
        .select_from(Ato)
        .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
        .where(
            Ato.tenant_id == TENANT_ID,
            Ato.tipo.in_(tipos),
            Ato.processado == False,
        )
    )
    total = total_r.scalar()

    rodada = RodadaAnalise(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        status="em_progresso",
        total_atos=total,
        iniciado_em=datetime.now(timezone.utc),
    )
    db.add(rodada)
    await db.commit()
    await db.refresh(rodada)
    print(f"  Rodada criada: {str(rodada.id)[:8]}...  total_atos={total}")
    return rodada


async def _processar_ato(
    ato_id: uuid.UUID,
    label: str,
    rodada_id: uuid.UUID,
    system_prompt,
    print_lock: asyncio.Lock,
) -> dict:
    try:
        async with async_session_factory() as db:
            check = await db.execute(select(Ato.processado).where(Ato.id == ato_id))
            if check.scalar():
                async with print_lock:
                    print(f"  {label}  (já processado, pulando)")
                return {"ok": False, "custo": Decimal("0"), "nivel": None, "skipped": True}

            analise = await analisar_ato_haiku(db, ato_id, rodada_id, system_prompt)
            custo = analise.custo_usd or Decimal("0")

            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == rodada_id)
                .values(
                    atos_analisados_haiku=RodadaAnalise.atos_analisados_haiku + 1,
                    custo_total_usd=func.coalesce(RodadaAnalise.custo_total_usd, 0) + custo,
                )
            )
            await db.commit()

            emoji = EMOJIS.get(analise.nivel_alerta, "⚪")
            async with print_lock:
                print(f"  {label}  {emoji} {analise.nivel_alerta or '?':8s}  ${float(custo):.4f}")

            return {"ok": True, "custo": custo, "nivel": analise.nivel_alerta}

    except Exception as e:
        async with print_lock:
            print(f"  {label}  ✗ {e}")
        return {"ok": False, "custo": Decimal("0"), "nivel": None}


async def main(dry_run: bool, workers: int, tipo_filtro: str | None) -> None:
    tipos = [tipo_filtro] if tipo_filtro else TIPOS_ALVO

    print(f"\n{'='*60}")
    print("Análise Haiku — Documentos Administrativos CAU/PR")
    print(f"Tipos: {', '.join(tipos)}")
    print(f"{'='*60}\n")

    async with async_session_factory() as db:

        # Buscar pendentes
        atos_r = await db.execute(
            select(Ato.id, Ato.numero, Ato.tipo)
            .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
            .where(
                Ato.tenant_id == TENANT_ID,
                Ato.tipo.in_(tipos),
                Ato.processado == False,
                ConteudoAto.qualidade.in_(["boa", "parcial"]),
            )
            .order_by(Ato.data_publicacao.asc().nulls_last())
        )
        atos = atos_r.all()
        total = len(atos)

        # Resumo por tipo
        contagem: dict[str, int] = {}
        for a in atos:
            contagem[a.tipo] = contagem.get(a.tipo, 0) + 1

        print(f"Documentos pendentes: {total}")
        for t, n in sorted(contagem.items(), key=lambda x: -x[1]):
            print(f"  {TIPO_LABEL.get(t, t):<22} {n:>4}")

        if total == 0:
            print("\nNenhum documento pendente.")
            return

        custo_est = total * 0.005
        print(f"\nCusto estimado: ~${custo_est:.2f}  (base $0.005/doc Haiku)")
        print(f"Limite de custo: ${CUSTO_LIMITE}")
        print(f"Workers: {workers}\n")

        if dry_run:
            print("─── DRY RUN — nenhuma análise executada ───")
            return

        try:
            input("Pressione ENTER para iniciar ou Ctrl+C para cancelar... ")
        except EOFError:
            pass

        # Obter/criar rodada
        rodada = await _obter_ou_criar_rodada(db, tipos)
        rodada_id = rodada.id

        # Carregar system prompt (regimento interno em cache)
        print("\nCarregando regimento interno...")
        system_prompt = await montar_system_prompt(db, TENANT_ID)
        print("Regimento carregado.\n")

        items = [(a.id, a.numero or "?", a.tipo) for a in atos]

    # Sessão principal fechada — workers usam sessões próprias
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

        print(f"--- Batch {batch_num}/{total_batches} "
              f"[{batch_start+1}-{batch_start+len(batch)}/{total}] ---")

        tasks = [
            _processar_ato(
                ato_id,
                f"[{batch_start+j+1:3d}/{total}] {TIPO_LABEL.get(tipo,''):16s} {numero:20s}",
                rodada_id,
                system_prompt,
                print_lock,
            )
            for j, (ato_id, numero, tipo) in enumerate(batch)
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

        print(f"    Batch {batch_num} concluído — custo: ${float(batch_custo):.4f}  "
              f"acumulado: ${float(custo_sessao):.3f}\n")

        if custo_sessao > CUSTO_LIMITE:
            print(f"⛔ Limite de ${CUSTO_LIMITE} atingido. Pausando.")
            parar = True

    duracao = (datetime.now() - inicio).seconds
    print(f"{'='*60}")
    print(f"  OK:    {ok}  |  Erro: {erro}")
    print(f"  Custo: ${float(custo_sessao):.4f}  |  Duração: {duracao//60}m {duracao%60}s")
    print(f"{'='*60}\n")

    # Marcar rodada concluída se tudo processado
    async with async_session_factory() as db:
        restantes_r = await db.execute(
            select(func.count())
            .select_from(Ato)
            .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
            .where(
                Ato.tenant_id == TENANT_ID,
                Ato.tipo.in_(tipos),
                Ato.processado == False,
                ConteudoAto.qualidade.in_(["boa", "parcial"]),
            )
        )
        restantes = restantes_r.scalar()
        if restantes == 0 and not parar:
            await db.execute(
                update(RodadaAnalise)
                .where(RodadaAnalise.id == rodada_id)
                .values(status="haiku_completo", concluido_em=datetime.now(timezone.utc))
            )
            await db.commit()
            print(f"✓ Haiku completo para {', '.join(tipos)}!")
            print("  Próximo: rodar analisar_docs_local.py nos vermelho/laranja.")
        elif restantes > 0:
            print(f"Restam {restantes} documentos. Rode novamente para continuar.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Análise Haiku — documentos administrativos CAU/PR")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--tipo", type=str, default=None, choices=TIPOS_ALVO)
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run, workers=args.workers, tipo_filtro=args.tipo))
