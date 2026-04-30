"""
relacoes_service.py — Geração de pares Pessoa↔Pessoa a partir de co-aparições em atos.

Para cada par de pessoas que aparece em pelo menos um ato em comum, insere
(ou atualiza) uma linha em `relacoes_pessoas` com:
  - atos_em_comum: quantos atos distintos compartilham
  - peso: mesma métrica clamped em 99.99 (NUMERIC(5,2) no banco)

Idempotente via ON CONFLICT (tenant_id, pessoa_a_id, pessoa_b_id) DO UPDATE.
A constraint UniqueConstraint("tenant_id", "pessoa_a_id", "pessoa_b_id") já
existe no modelo RelacaoPessoa.

Convenção: pessoa_a_id < pessoa_b_id sempre — evita pares duplicados (A,B) e (B,A).
"""
from __future__ import annotations

import time
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


_INSERT_PARES_SQL = text("""
    INSERT INTO relacoes_pessoas (
        id, tenant_id, pessoa_a_id, pessoa_b_id,
        tipo_relacao, atos_em_comum, peso, criado_em
    )
    SELECT
        gen_random_uuid(), :tid, a, b,
        'co_aparicao', c,
        LEAST(c::numeric, 99.99),
        NOW()
    FROM (
        SELECT
            LEAST(ap1.pessoa_id, ap2.pessoa_id) AS a,
            GREATEST(ap1.pessoa_id, ap2.pessoa_id) AS b,
            COUNT(DISTINCT ap1.ato_id) AS c
        FROM aparicoes_pessoa ap1
        JOIN aparicoes_pessoa ap2
            ON ap1.ato_id = ap2.ato_id
           AND ap1.pessoa_id < ap2.pessoa_id
        WHERE ap1.tenant_id = :tid AND ap2.tenant_id = :tid
        GROUP BY 1, 2
    ) pares
    ON CONFLICT (tenant_id, pessoa_a_id, pessoa_b_id)
    DO UPDATE SET
        atos_em_comum = EXCLUDED.atos_em_comum,
        peso = EXCLUDED.peso
""")


async def recalcular_relacoes(db: AsyncSession, tenant_id: uuid.UUID) -> dict:
    """
    Recalcula relacoes_pessoas para o tenant a partir de aparicoes_pessoa.

    Retorna dict com `pares_total` (linhas existentes após o run) e `duracao_ms`.
    Também faz commit — pode ser chamado dentro ou fora de outra transação;
    caller que estiver em transação maior deve usar nested begin().
    """
    inicio = time.monotonic()

    await db.execute(_INSERT_PARES_SQL, {"tid": str(tenant_id)})
    await db.commit()

    total_r = await db.execute(
        text("SELECT COUNT(*) FROM relacoes_pessoas WHERE tenant_id = :tid"),
        {"tid": str(tenant_id)},
    )
    total = total_r.scalar_one() or 0

    return {
        "pares_total": int(total),
        "duracao_ms": int((time.monotonic() - inicio) * 1000),
    }
