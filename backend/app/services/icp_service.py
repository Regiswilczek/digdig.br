"""
icp_service.py — ICP (Índice de Concentração de Poder)

Mede a concentração de poder decisório em um órgão público.
Baseado na Centralidade de Grau Ponderada (teoria dos grafos) e no
Índice de Herfindahl-Hirschman (HHI) para concentração sistêmica.

ICP Individual:  aparicoes(p) / total_atos_orgao × 100
ICP Sistêmico:   Σ(ICP²  top 10%) / Σ(ICP² todos)  →  0.0 a 1.0
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func, update

from app.models.pessoa import Pessoa, IcpOrgao


_INTERPRETACOES_INDIVIDUAL = [
    (30.0, "Concentração Crítica"),
    (15.0, "Concentração Significativa"),
    (5.0,  "Atenção"),
    (0.0,  "Normal"),
]

_INTERPRETACOES_SISTEMICO = [
    (0.75, "Captura institucional provável"),
    (0.50, "Alta concentração"),
    (0.25, "Concentração moderada"),
    (0.0,  "Poder distribuído (saudável)"),
]


def _interpretar_individual(icp: float) -> str:
    for limiar, label in _INTERPRETACOES_INDIVIDUAL:
        if icp >= limiar:
            return label
    return "Normal"


def _interpretar_sistemico(icp: float) -> str:
    for limiar, label in _INTERPRETACOES_SISTEMICO:
        if icp >= limiar:
            return label
    return "Poder distribuído (saudável)"


async def calcular_icp_orgao(db: AsyncSession, tenant_id: uuid.UUID) -> dict:
    """
    Calcula e persiste o ICP para todas as pessoas do tenant.
    Retorna o resultado completo (top concentradores + ICP sistêmico).
    """
    # 1. Total de atos distintos do órgão
    total_r = await db.execute(
        text("SELECT COUNT(DISTINCT id) FROM atos WHERE tenant_id = :tid"),
        {"tid": tenant_id},
    )
    total_atos = total_r.scalar_one() or 0

    if total_atos == 0:
        return {"erro": "Sem atos processados para este órgão"}

    # 2. Aparições por pessoa (com força de rede somada via subquery para evitar duplicação)
    query = text("""
        WITH peso_por_pessoa AS (
            SELECT pessoa_id, SUM(peso) AS forca_rede
            FROM (
                SELECT pessoa_a_id AS pessoa_id, peso FROM relacoes_pessoas WHERE tenant_id = :tid
                UNION ALL
                SELECT pessoa_b_id AS pessoa_id, peso FROM relacoes_pessoas WHERE tenant_id = :tid
            ) sub
            GROUP BY pessoa_id
        ),
        aparicoes_por_pessoa AS (
            SELECT
                p.id,
                p.nome_normalizado,
                p.cargo_mais_recente,
                COUNT(DISTINCT ap.ato_id) AS atos_distintos,
                COALESCE(pp.forca_rede, 0) AS forca_rede
            FROM pessoas p
            JOIN aparicoes_pessoa ap ON p.id = ap.pessoa_id
            LEFT JOIN peso_por_pessoa pp ON p.id = pp.pessoa_id
            WHERE p.tenant_id = :tid
            GROUP BY p.id, p.nome_normalizado, p.cargo_mais_recente, pp.forca_rede
        )
        SELECT
            id,
            nome_normalizado,
            cargo_mais_recente,
            atos_distintos,
            forca_rede,
            ROUND((atos_distintos::numeric / :total_atos) * 100, 2) AS icp_individual
        FROM aparicoes_por_pessoa
        ORDER BY icp_individual DESC
    """)

    rows_r = await db.execute(query, {"tid": tenant_id, "total_atos": total_atos})
    rows = rows_r.fetchall()

    if not rows:
        return {"erro": "Sem pessoas registradas para este órgão"}

    total_pessoas = len(rows)

    # 3. Persiste icp_individual em cada pessoa
    now = datetime.now(timezone.utc)
    for row in rows:
        await db.execute(
            text("""
                UPDATE pessoas
                SET icp_individual = :icp, icp_atualizado_em = :now
                WHERE id = :pid
            """),
            {"icp": float(row.icp_individual), "now": now, "pid": row.id},
        )

    # 4. Calcula ICP sistêmico (HHI): Σ(icp² top 10%) / Σ(icp² todos)
    icps = [float(r.icp_individual) for r in rows]
    top_n = max(1, len(icps) // 10)
    top_icps = icps[:top_n]

    soma_todos = sum(v ** 2 for v in icps)
    soma_top = sum(v ** 2 for v in top_icps)
    icp_sistemico = round(soma_top / soma_todos, 4) if soma_todos > 0 else 0.0

    # 5. Top concentradores (primeiros 10)
    top_concentradores = [
        {
            "nome": r.nome_normalizado,
            "cargo_atual": r.cargo_mais_recente,
            "atos_distintos": r.atos_distintos,
            "icp_individual": float(r.icp_individual),
            "interpretacao": _interpretar_individual(float(r.icp_individual)),
            "forca_rede": float(r.forca_rede),
        }
        for r in rows[:10]
    ]

    # 6. Persiste snapshot em icp_orgao
    snapshot = IcpOrgao(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        icp_sistemico=Decimal(str(icp_sistemico)),
        total_atos=total_atos,
        total_pessoas=total_pessoas,
        top_concentradores=top_concentradores,
    )
    db.add(snapshot)
    await db.commit()

    return {
        "icp_sistemico": icp_sistemico,
        "classificacao": _interpretar_sistemico(icp_sistemico),
        "total_atos_base": total_atos,
        "total_pessoas": total_pessoas,
        "top_concentradores": top_concentradores,
    }
