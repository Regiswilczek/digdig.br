#!/usr/bin/env python3
"""
Atualiza os planos no banco de dados para o novo modelo de negócio do Dig Dig.

Uso:
    cd backend
    python scripts/seed_planos.py
    python scripts/seed_planos.py --dry-run   # só mostra, não salva
"""
import argparse
import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import asyncpg

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado no .env")
ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

UPDATES = [
    # (nome, preco_mensal, limite_chat_mensal, limite_exportacoes_mensal, teto_tokens_brl, tem_exportacao, tem_api)
    ("cidadao",      0.00,   None, None,  None,  False, False),
    ("investigador", 179.00, None, 5,     30.00, True,  False),
    ("profissional", 679.00, None, 15,    114.00,True,  False),
    ("api & dados",  1998.00,None, None,  None,  True,  True),
]

INSERTS = [
    {
        "nome": "patrocinador",
        "preco_mensal": 82.50,
        "preco_anual": 990.00,
        "e_anual": True,
        "limite_chat_mensal": None,
        "limite_exportacoes_mensal": 5,
        "teto_tokens_brl": 30.00,
        "tem_exportacao": True,
        "tem_api": False,
        "max_assentos": 1,
        "ativo": True,
        "descricao": "Plano anual de patrocinador. Acesso ao chat com IA e geração de documentos. Nome listado como apoiador.",
    },
    {
        "nome": "tecnico",
        "preco_mensal": None,
        "preco_anual": None,
        "e_anual": False,
        "limite_chat_mensal": None,
        "limite_exportacoes_mensal": None,
        "teto_tokens_brl": None,
        "tem_exportacao": True,
        "tem_api": True,
        "max_assentos": 10,
        "ativo": True,
        "descricao": "Plano técnico sob consulta para órgãos, empresas e mandatos. Monitoramento contínuo personalizado.",
    },
]


async def main(dry_run: bool) -> None:
    conn = await asyncpg.connect(ASYNCPG_URL)
    try:
        print(f"\n{'='*60}")
        print(f"  SEED PLANOS — {'DRY-RUN' if dry_run else 'REAL'}")
        print(f"{'='*60}\n")

        # Adicionar colunas novas se não existirem
        migrations = [
            "ALTER TABLE planos ADD COLUMN IF NOT EXISTS limite_exportacoes_mensal INTEGER",
            "ALTER TABLE planos ADD COLUMN IF NOT EXISTS teto_tokens_brl NUMERIC(10,2)",
            "ALTER TABLE planos ADD COLUMN IF NOT EXISTS e_anual BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE planos ADD COLUMN IF NOT EXISTS preco_anual NUMERIC(10,2)",
            "ALTER TABLE planos ALTER COLUMN preco_mensal DROP NOT NULL",
        ]
        for sql in migrations:
            print(f"  Migration: {sql[:60]}...")
            if not dry_run:
                await conn.execute(sql)

        print()

        # Atualizar planos existentes
        for nome, preco_mensal, limite_chat, limite_export, teto_tokens, tem_export, tem_api in UPDATES:
            print(f"  UPDATE {nome!r:20s} preco={preco_mensal}  exportacoes={limite_export}  teto_tokens={teto_tokens}")
            if not dry_run:
                await conn.execute(
                    """
                    UPDATE planos SET
                        preco_mensal = $2,
                        limite_chat_mensal = $3,
                        limite_exportacoes_mensal = $4,
                        teto_tokens_brl = $5,
                        tem_exportacao = $6,
                        tem_api = $7
                    WHERE nome = $1
                    """,
                    nome, preco_mensal, limite_chat, limite_export, teto_tokens, tem_export, tem_api,
                )

        print()

        # Inserir novos planos
        for p in INSERTS:
            exists = await conn.fetchval("SELECT COUNT(*) FROM planos WHERE nome = $1", p["nome"])
            if exists:
                print(f"  SKIP INSERT {p['nome']!r:20s} (já existe)")
                continue

            print(f"  INSERT {p['nome']!r:20s} preco={p['preco_mensal']}  anual={p['preco_anual']}")
            if not dry_run:
                await conn.execute(
                    """
                    INSERT INTO planos (
                        id, nome, preco_mensal, preco_anual, e_anual,
                        limite_chat_mensal, limite_exportacoes_mensal, teto_tokens_brl,
                        tem_exportacao, tem_api, max_assentos, ativo, descricao
                    ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    """,
                    p["nome"], p["preco_mensal"], p["preco_anual"], p["e_anual"],
                    p["limite_chat_mensal"], p["limite_exportacoes_mensal"], p["teto_tokens_brl"],
                    p["tem_exportacao"], p["tem_api"], p["max_assentos"], p["ativo"], p["descricao"],
                )

        print(f"\n{'='*60}")
        print(f"  {'Concluído (dry-run)' if dry_run else 'Concluído — banco atualizado'}")
        print(f"{'='*60}\n")

    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Mostra sem salvar")
    args = parser.parse_args()
    asyncio.run(main(args.dry_run))
