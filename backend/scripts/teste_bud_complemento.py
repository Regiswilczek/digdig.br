#!/usr/bin/env python3
"""
teste_bud_complemento.py — testa a nova lógica do Bud:
  • preenche cvss_* só onde Piper deixou NULL
  • adiciona tags só se o ato não tem nenhuma ativa

Roda em 3 atos sinalizados do CAU/PR e imprime antes/depois.
Usa sessão nova por ato pra isolar contexto async do SQLAlchemy.
"""
from __future__ import annotations

import asyncio
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, "/app")

from sqlalchemy import select, text, delete, update
from app.database import async_session_factory
from app.models.tenant import Tenant
from app.models.ato import Ato, RodadaAnalise
from app.models.analise import Analise, Irregularidade
from app.models.tag import AtoTag
from app.services.bud_service import analisar_ato_bud
from app.services.piper_service import montar_system_prompt


CAU_SLUG = "cau-pr"

ATOS_TESTE = [
    # (numero, tipo, reset_cvss, reset_tags, descricao_caso)
    ("2021.COM.11.0166-00", "dispensa_eletronica", True,  True,  "(A) cvss=NULL + sem tags"),
    ("21",                  "ata_plenaria",        False, False, "(B) ata vermelho — cvss já NULL"),
    ("11",                  "ata_plenaria",        False, False, "(C) ata vermelho COM 2 tags"),
]


def _snapshot_cvss(a):
    return {
        "fi": a.cvss_fi, "li": a.cvss_li, "ri": a.cvss_ri,
        "av": a.cvss_av, "ac": a.cvss_ac, "pr": a.cvss_pr,
        "score": float(a.cvss_score) if a.cvss_score is not None else None,
        "vector": a.cvss_vector,
    }


async def _snapshot_tags(db, ato_id):
    r = await db.execute(
        select(AtoTag).where(AtoTag.ato_id == ato_id, AtoTag.ativa == True)
    )
    return [
        {"codigo": t.codigo, "gravidade": t.gravidade, "por": t.atribuido_por}
        for t in r.scalars().all()
    ]


async def _snapshot_irreg(db, analise_id):
    r = await db.execute(
        select(Irregularidade).where(Irregularidade.analise_id == analise_id)
    )
    return [
        {"categoria": i.categoria, "tipo": i.tipo, "gravidade": i.gravidade}
        for i in r.scalars().all()
    ]


async def _setup() -> tuple[uuid.UUID, uuid.UUID, str]:
    """Cria rodada nova e retorna (rodada_id, tenant_id, system_prompt)."""
    async with async_session_factory() as db:
        tenant_r = await db.execute(select(Tenant).where(Tenant.slug == CAU_SLUG))
        tenant = tenant_r.scalar_one()
        tid = tenant.id

        await db.execute(text("""
            UPDATE rodadas_analise SET status='cancelado', concluido_em=NOW()
            WHERE tenant_id=:t AND status IN ('em_progresso','pendente')
        """), {"t": str(tid)})
        rodada = RodadaAnalise(
            id=uuid.uuid4(), tenant_id=tid, status="em_progresso",
            agente="bud", iniciado_em=datetime.now(timezone.utc),
        )
        db.add(rodada)
        await db.commit()

        sp = await montar_system_prompt(db, tid)
        return rodada.id, tid, sp


async def _reset_ato(numero: str, tipo: str, rodada_id: uuid.UUID, tid: uuid.UUID,
                    reset_cvss: bool, reset_tags: bool) -> tuple[uuid.UUID, uuid.UUID] | None:
    async with async_session_factory() as db:
        r = await db.execute(text("""
            SELECT a.id AS analise_id, a.ato_id
            FROM analises a JOIN atos x ON x.id=a.ato_id
            WHERE x.tenant_id=:t AND x.numero=:n AND x.tipo=:tp
            LIMIT 1
        """), {"t": str(tid), "n": numero, "tp": tipo})
        row = r.one_or_none()
        if not row:
            return None
        analise_id, ato_id = row.analise_id, row.ato_id

        # Apaga irregularidades do Bud anterior
        await db.execute(delete(Irregularidade).where(Irregularidade.analise_id == analise_id))

        # Reset Bud + aponta pra rodada nova
        values = dict(
            resultado_bud=None,
            analisado_por_bud=False,
            status="piper_completo",
            custo_bud_usd=0,
            rodada_id=rodada_id,
        )
        if reset_cvss:
            values.update(dict(
                cvss_fi=None, cvss_li=None, cvss_ri=None,
                cvss_av=None, cvss_ac=None, cvss_pr=None,
                cvss_score=None, cvss_vector=None,
            ))
        await db.execute(update(Analise).where(Analise.id == analise_id).values(**values))

        # Desativa AtoTag adicionadas por bud (mantém as do piper)
        if reset_tags:
            await db.execute(
                update(AtoTag)
                .where(AtoTag.ato_id == ato_id, AtoTag.atribuido_por == "bud", AtoTag.ativa == True)
                .values(ativa=False)
            )

        await db.commit()
        return analise_id, ato_id


async def _rodar_um(analise_id: uuid.UUID, ato_id: uuid.UUID, rodada_id: uuid.UUID, sp: str) -> dict:
    async with async_session_factory() as db:
        ar = await db.execute(select(Analise).where(Analise.id == analise_id))
        analise = ar.scalar_one()
        antes = {
            "cvss": _snapshot_cvss(analise),
            "tags": await _snapshot_tags(db, ato_id),
            "irreg": await _snapshot_irreg(db, analise_id),
        }

        try:
            await analisar_ato_bud(db, ato_id, rodada_id, sp)
            erro = None
        except Exception as exc:
            erro = repr(exc)[:300]

    async with async_session_factory() as db:
        ar = await db.execute(select(Analise).where(Analise.id == analise_id))
        analise = ar.scalar_one()
        depois = {
            "cvss": _snapshot_cvss(analise),
            "tags": await _snapshot_tags(db, ato_id),
            "irreg": await _snapshot_irreg(db, analise_id),
            "nivel": analise.nivel_alerta,
            "score_risco": analise.score_risco,
            "custo_bud": float(analise.custo_bud_usd or 0),
            "cvss_revisado_bud": (analise.resultado_bud or {}).get("cvss_revisado"),
            "tags_revisadas_bud": (analise.resultado_bud or {}).get("tags_revisadas"),
        }
    return {"antes": antes, "depois": depois, "erro": erro}


async def main() -> None:
    rodada_id, tid, sp = await _setup()
    print(f"Rodada de teste: {rodada_id}\n")

    for numero, tipo, reset_cvss, reset_tags, desc in ATOS_TESTE:
        print("="*72)
        print(f"ATO: {tipo} {numero} — {desc}")
        print(f"     reset_cvss={reset_cvss}  reset_tags={reset_tags}")
        print("-"*72)

        ids = await _reset_ato(numero, tipo, rodada_id, tid, reset_cvss, reset_tags)
        if not ids:
            print("  !! Ato não encontrado")
            continue
        analise_id, ato_id = ids

        out = await _rodar_um(analise_id, ato_id, rodada_id, sp)
        antes = out["antes"]; depois = out["depois"]
        print(f"  ANTES  cvss : {antes['cvss']}")
        print(f"  ANTES  tags : {antes['tags']}")
        print(f"  ANTES  irreg: n={len(antes['irreg'])}")
        if out["erro"]:
            print(f"  !! ERRO no Bud: {out['erro']}")
            continue
        print(f"  DEPOIS cvss : {depois['cvss']}")
        print(f"  DEPOIS tags : {depois['tags']}")
        print(f"  DEPOIS irreg: n={len(depois['irreg'])} → {[(i['categoria'], i['tipo'][:30], i['gravidade']) for i in depois['irreg'][:8]]}")
        print(f"  nivel={depois['nivel']} score={depois['score_risco']} custo=${depois['custo_bud']:.4f}")
        print(f"  Bud cvss_revisado: {depois['cvss_revisado_bud']}")
        tr = depois["tags_revisadas_bud"] or []
        print(f"  Bud tags_revisadas (n={len(tr)}): {[(t.get('codigo'), t.get('acao')) for t in tr[:5]]}")

    async with async_session_factory() as db:
        await db.execute(
            update(RodadaAnalise).where(RodadaAnalise.id == rodada_id)
            .values(status="concluido", concluido_em=datetime.now(timezone.utc))
        )
        await db.commit()
    print("\n=== Concluído ===")


if __name__ == "__main__":
    asyncio.run(main())
