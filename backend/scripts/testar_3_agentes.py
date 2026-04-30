#!/usr/bin/env python3
"""
Bench Piper + Bud em amostra de 5 atos cada — para mapear custo + qualidade.

- Piper: cria rodada nova, roda em 5 atos da fila aguarda_piper
- Bud:   usa a rodada EXISTENTE da analise Piper de 5 atos da fila aguarda_bud

Salva log JSON em /tmp/teste_3_agentes_<timestamp>.json com tokens, cache hits,
custo por chamada e total por agente.

Uso:
    cd backend
    python scripts/testar_3_agentes.py --dry-run
    python scripts/testar_3_agentes.py
"""
import argparse
import asyncio
import json
import sys
import time
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from sqlalchemy import select, or_
from app.database import async_session_factory
from app.models.ato import Ato, ConteudoAto, RodadaAnalise
from app.models.analise import Analise
from app.models.tenant import Tenant
from app.services.piper_service import analisar_ato_piper, montar_system_prompt
from app.services.bud_service import analisar_ato_bud

TENANT_SLUG = "cau-pr"
AMOSTRA = 5
PAUSA_ENTRE = 2.5  # segundos entre calls (rate limit)


async def coletar_amostra(db) -> dict:
    tenant = (await db.execute(select(Tenant).where(Tenant.slug == TENANT_SLUG))).scalar_one()

    # Aguarda Piper: ato com texto/PDF e SEM nenhuma análise
    piper_atos = (await db.execute(
        select(Ato.id, Ato.tipo, Ato.numero, Ato.data_publicacao, ConteudoAto.qualidade)
        .join(ConteudoAto, ConteudoAto.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tenant.id,
            ConteudoAto.qualidade.in_(["boa", "parcial", "ruim"]),
            ~select(Analise.id).where(
                Analise.ato_id == Ato.id,
                or_(Analise.resultado_piper.isnot(None), Analise.resultado_bud.isnot(None)),
            ).exists(),
        )
        .order_by(Ato.data_publicacao.desc().nullslast())
        .limit(AMOSTRA)
    )).all()

    # Aguarda Bud: tem resultado_piper, vermelho/laranja, sem resultado_bud
    bud_rows = (await db.execute(
        select(
            Ato.id, Ato.tipo, Ato.numero, Ato.data_publicacao,
            Analise.nivel_alerta, Analise.rodada_id, Analise.cvss_score,
        )
        .join(Analise, Analise.ato_id == Ato.id)
        .where(
            Ato.tenant_id == tenant.id,
            Analise.resultado_piper.isnot(None),
            Analise.nivel_alerta.in_(["vermelho", "laranja"]),
            Analise.resultado_bud.is_(None),
        )
        .order_by(Analise.criado_em.desc())
        .limit(AMOSTRA)
    )).all()

    return {
        "tenant_id": tenant.id,
        "piper": piper_atos,
        "bud": bud_rows,
    }


def fmt_ato(ato_id, tipo, numero, data, *_extras) -> str:
    data_str = str(data or "")[:10]
    return f"  {str(ato_id)[:8]}  {tipo[:14]:14s}  {(numero or '?'):>10s}  {data_str}"


async def rodar_agente(
    nome: str,
    func_chamar,
    db,
    rodada_id: uuid.UUID,
    system_prompt: str,
    atos: list,
    log: list,
):
    print(f"\n── {nome.upper()} ── ({len(atos)} atos)")
    for i, item in enumerate(atos, 1):
        ato_id = item[0]
        numero = item[2]
        tipo = item[1]
        prefix = f"[{i}/{len(atos)}] {tipo[:14]:14s} {(numero or '?'):>10s}"
        print(prefix, end="  ", flush=True)
        t0 = time.monotonic()
        try:
            analise = await func_chamar(db, ato_id, rodada_id, system_prompt)
            await db.commit()
            tempo_ms = int((time.monotonic() - t0) * 1000)
            # Lê tokens da análise atualizada
            await db.refresh(analise)
            entry = {
                "agente": nome,
                "ato_id": str(ato_id),
                "tipo": tipo,
                "numero": str(numero or ""),
                "tempo_ms": tempo_ms,
                "tokens_piper": analise.tokens_piper,
                "tokens_piper_cached": analise.tokens_piper_cached,
                "tokens_bud": analise.tokens_bud,
                "tokens_new": analise.tokens_new,
                "custo_acumulado_usd": float(analise.custo_usd or 0),
                "nivel_alerta": analise.nivel_alerta,
                "cvss_score": float(analise.cvss_score) if analise.cvss_score else None,
                "status": "ok",
            }
            log.append(entry)
            cvss = f"CVSS={analise.cvss_score}" if analise.cvss_score else ""
            print(f"{analise.nivel_alerta or '—':10s} {cvss:>10s} {tempo_ms/1000:>5.1f}s  ${float(analise.custo_usd or 0):.4f}")
        except Exception as exc:
            tempo_ms = int((time.monotonic() - t0) * 1000)
            log.append({
                "agente": nome,
                "ato_id": str(ato_id),
                "tipo": tipo,
                "numero": str(numero or ""),
                "tempo_ms": tempo_ms,
                "status": "erro",
                "erro": str(exc)[:300],
            })
            await db.rollback()
            print(f"✗ {type(exc).__name__}: {str(exc)[:60]}")
        if i < len(atos):
            await asyncio.sleep(PAUSA_ENTRE)


async def main(dry_run: bool):
    print(f"\n{'='*70}")
    print("  BENCH DOS 3 AGENTES — 5 ATOS CADA")
    print(f"{'='*70}\n")

    async with async_session_factory() as db:
        amostra = await coletar_amostra(db)

        print(f"Tenant: {TENANT_SLUG}\n")
        print(f"Aguarda Piper: {len(amostra['piper'])}/{AMOSTRA}")
        for row in amostra["piper"]:
            print(fmt_ato(*row))
        print(f"\nAguarda Bud: {len(amostra['bud'])}/{AMOSTRA}")
        for row in amostra["bud"]:
            print(fmt_ato(*row[:4]) + f"  nivel={row[4]}")

        # Estimativa
        est_piper = len(amostra["piper"]) * 0.10
        est_bud = 0.30 + max(0, len(amostra["bud"]) - 1) * 0.06  # cache write 1ª vez
        total_est = est_piper + est_bud
        print(f"\nCusto estimado total: ~${total_est:.2f}")
        print(f"  Piper: ~${est_piper:.2f}  |  Bud: ~${est_bud:.2f}")

        if dry_run:
            print("\n── DRY RUN ── nada foi executado.")
            return

        try:
            input("\nPressione ENTER para iniciar ou Ctrl+C para cancelar... ")
        except EOFError:
            pass

        log: list = []
        inicio = datetime.now(timezone.utc)

        # Carrega system prompt UMA vez (compartilhado entre os 3 agentes)
        print("\nCarregando system prompt (regimento + KB)...")
        system_prompt = await montar_system_prompt(db, amostra["tenant_id"])
        print(f"System prompt: ~{len(system_prompt)//4:,} tokens\n")

        # ── Piper: cria rodada nova ───────────────────────────────────────
        rodada_piper = RodadaAnalise(
            id=uuid.uuid4(),
            tenant_id=amostra["tenant_id"],
            status="em_progresso",
            total_atos=len(amostra["piper"]),
        )
        db.add(rodada_piper)
        await db.commit()
        print(f"Rodada Piper criada: {rodada_piper.id}")

        await rodar_agente(
            "piper", analisar_ato_piper, db, rodada_piper.id, system_prompt, amostra["piper"], log,
        )

        # ── Bud: usa rodada existente de cada analise ─────────────────────
        print(f"\n{'─'*70}")
        for row in amostra["bud"]:
            ato_id, tipo, numero = row[0], row[1], row[2]
            rodada_id_existente = row[5]
            prefix = f"BUD {tipo[:14]:14s} {(numero or '?'):>10s}"
            print(prefix, end="  ", flush=True)
            t0 = time.monotonic()
            try:
                analise = await analisar_ato_bud(db, ato_id, rodada_id_existente, system_prompt)
                await db.commit()
                tempo_ms = int((time.monotonic() - t0) * 1000)
                await db.refresh(analise)
                log.append({
                    "agente": "bud",
                    "ato_id": str(ato_id),
                    "tipo": tipo,
                    "numero": str(numero or ""),
                    "rodada_id": str(rodada_id_existente),
                    "tempo_ms": tempo_ms,
                    "tokens_bud": analise.tokens_bud,
                    "tokens_piper": analise.tokens_piper,
                    "custo_acumulado_usd": float(analise.custo_usd or 0),
                    "nivel_alerta": analise.nivel_alerta,
                    "cvss_score": float(analise.cvss_score) if analise.cvss_score else None,
                    "status": "ok",
                })
                print(f"{analise.nivel_alerta or '—':10s} {tempo_ms/1000:>5.1f}s  ${float(analise.custo_usd or 0):.4f}")
            except Exception as exc:
                tempo_ms = int((time.monotonic() - t0) * 1000)
                log.append({
                    "agente": "bud",
                    "ato_id": str(ato_id),
                    "tipo": tipo,
                    "numero": str(numero or ""),
                    "tempo_ms": tempo_ms,
                    "status": "erro",
                    "erro": str(exc)[:300],
                })
                await db.rollback()
                print(f"✗ {type(exc).__name__}: {str(exc)[:60]}")
            await asyncio.sleep(PAUSA_ENTRE)

        # Fecha rodada Piper
        rodada_piper.status = "concluido"
        rodada_piper.concluido_em = datetime.now(timezone.utc)
        await db.commit()

        # Resumo
        fim = datetime.now(timezone.utc)
        relatorio = {
            "inicio": inicio.isoformat(),
            "fim": fim.isoformat(),
            "duracao_segundos": int((fim - inicio).total_seconds()),
            "rodada_piper_id": str(rodada_piper.id),
            "calls": log,
        }
        ts = inicio.strftime("%Y%m%d_%H%M%S")
        out_path = Path(f"/tmp/teste_3_agentes_{ts}.json")
        out_path.write_text(json.dumps(relatorio, indent=2, ensure_ascii=False))

        print(f"\n{'='*70}")
        print("  RESUMO")
        print(f"{'='*70}")
        for agente in ("piper", "bud"):
            oks = [c for c in log if c["agente"] == agente and c["status"] == "ok"]
            erros = [c for c in log if c["agente"] == agente and c["status"] == "erro"]
            tempo_total = sum(c["tempo_ms"] for c in oks) / 1000
            tempo_medio = tempo_total / len(oks) if oks else 0
            print(f"\n  {agente.upper()}:")
            print(f"    OK: {len(oks)}  Erros: {len(erros)}")
            if oks:
                print(f"    Tempo: total {tempo_total:.1f}s | médio {tempo_medio:.1f}s/ato")
                niveis = {}
                for c in oks:
                    niveis[c.get("nivel_alerta") or "—"] = niveis.get(c.get("nivel_alerta") or "—", 0) + 1
                niveis_str = "  ".join(f"{k}:{v}" for k, v in niveis.items())
                print(f"    Níveis: {niveis_str}")
            if erros:
                for e in erros:
                    print(f"    ✗ {e['ato_id'][:8]}  {e.get('erro','')[:80]}")

        print(f"\nLog detalhado: {out_path}")
        print(f"Duração total: {relatorio['duracao_segundos']}s")
        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Apenas mostra os atos selecionados")
    args = parser.parse_args()
    asyncio.run(main(args.dry_run))
