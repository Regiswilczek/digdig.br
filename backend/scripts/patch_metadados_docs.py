#!/usr/bin/env python3
"""
Corrige numero, data_publicacao e ementa dos atos com metadados ruins
(numero = nome de arquivo, data nula, ementa nula).

Extrai via regex do texto_completo — sem chamadas de API.

Uso (cd backend/):
    python scripts/patch_metadados_docs.py --dry-run   # mostra o que seria corrigido
    python scripts/patch_metadados_docs.py             # aplica
"""
import argparse
import asyncio
import os
import re
import sys
from datetime import date
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import asyncpg

TENANT_ID = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"
DATABASE_URL = os.environ.get("DATABASE_URL", "")
ASYNCPG_URL = (
    DATABASE_URL
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace(":5432/", ":6543/")
)

TIPOS_ALVO = [
    "dispensa_eletronica",
    "relatorio_parecer",
    "relatorio_tcu",
    "contratacao_direta",
    "auditoria_independente",
    "contrato",
    "convenio",
]

MESES = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8,
    "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
}


def _numero_parece_arquivo(numero: str | None) -> bool:
    """True se o número parece nome de arquivo (sem barra, muito longo, com hifens/underscores)."""
    if not numero:
        return True
    if "/" in numero and len(numero) < 20:
        return False  # formato normal: 001/2024
    return len(numero) > 20 or "-" in numero or "_" in numero


def _extrair_numero(texto: str, tipo: str) -> str | None:
    padroes = [
        # Processo administrativo
        r"[Pp]rocesso\s+[Nn][°º.]?\s*([\d]{4,}[\.\-/][\d\.\-/]+)",
        r"[Pp]rocesso\s+[Nn][°º.]?\s*([\w\d][\w\d\.\-/]{5,20})",
        # Dispensa eletrônica
        r"[Dd]ispensa\s+[Ee]letr[ôo]nica\s+[Nn][°º.]?\s*([\d]+[\w./\-]*)",
        r"[Dd]ispensa\s+[Nn][°º.]?\s*([\d]+[\w./\-]*)",
        r"\bDE[- ][Nn][°º.]?\s*([\d]+/\d{4})",
        # Contratação direta
        r"[Cc]ontrata[çc][ãa]o\s+[Dd]ireta\s+[Nn][°º.]?\s*([\d]+[\w./\-]*)",
        # Contrato
        r"[Cc]ontrato\s+[Nn][°º.]?\s*([\d]+[\w./\-]*)",
        # Convênio
        r"[Cc]onv[eê]nio\s+[Nn][°º.]?\s*([\d]+[\w./\-]*)",
        # Parecer / Relatório
        r"[Pp]arecer\s+[Nn][°º.]?\s*([\d]+[\w./\-]*)",
        r"[Rr]elat[oó]rio\s+[Nn][°º.]?\s*([\d]+[\w./\-]*)",
        # Número genérico no início do doc (ex: "Nº 042/2023")
        r"^[Nn][°º]\s*([\d]+[\w./\-]*)",
        r"[Nn][°º]\s*([\d]{2,}[./\-][\d]{4})",
    ]
    for p in padroes:
        m = re.search(p, texto[:3000], re.MULTILINE)
        if m:
            val = m.group(1).strip().rstrip(".")
            if len(val) >= 3:
                return val
    return None


def _extrair_data(texto: str) -> date | None:
    # DD/MM/YYYY
    m = re.search(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b", texto[:3000])
    if m:
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            pass

    # DD de mês de YYYY
    m = re.search(
        r"\b(\d{1,2})\s+de\s+([a-záàãâéêíóôõúü]+)\s+de\s+(\d{4})\b",
        texto[:3000], re.IGNORECASE
    )
    if m:
        mes = MESES.get(m.group(2).lower())
        if mes:
            try:
                return date(int(m.group(3)), mes, int(m.group(1)))
            except ValueError:
                pass

    # Ano isolado no nome (fallback: pega o primeiro ano razoável)
    m = re.search(r"\b(20[12]\d)\b", texto[:500])
    if m:
        try:
            return date(int(m.group(1)), 1, 1)
        except ValueError:
            pass

    return None


def _extrair_ementa(texto: str) -> str | None:
    padroes = [
        r"[Oo]bjeto[:\s]+(.{20,300}?)(?:\n|$)",
        r"[Ee]menta[:\s]+(.{20,300}?)(?:\n|$)",
        r"[Dd]escri[çc][ãa]o[:\s]+(.{20,300}?)(?:\n|$)",
        r"[Ss]umário[:\s]+(.{20,300}?)(?:\n|$)",
        r"[Aa]ssunto[:\s]+(.{20,300}?)(?:\n|$)",
        r"[Tt]rata[- ]se\s+de\s+(.{20,300}?)(?:\n|\.)",
    ]
    for p in padroes:
        m = re.search(p, texto[:5000], re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            val = re.sub(r"\s+", " ", val)
            if len(val) >= 20:
                return val[:400]
    return None


async def main(dry_run: bool) -> None:
    print(f"\n{'='*60}")
    print("Patch Metadados — Documentos Administrativos CAU/PR")
    print(f"{'='*60}\n")

    conn = await asyncpg.connect(ASYNCPG_URL, statement_cache_size=0)
    try:
        rows = await conn.fetch(
            """
            SELECT a.id, a.tipo, a.numero, a.data_publicacao, a.ementa,
                   c.texto_completo
            FROM atos a
            JOIN conteudo_ato c ON c.ato_id = a.id
            WHERE a.tenant_id = $1
              AND a.tipo = ANY($2::text[])
              AND c.qualidade = 'boa'
            ORDER BY a.tipo, a.numero
            """,
            TENANT_ID, TIPOS_ALVO
        )

        total = len(rows)
        corrigidos = sem_melhora = 0

        for r in rows:
            ato_id   = r["id"]
            tipo     = r["tipo"]
            numero   = r["numero"]
            data_pub = r["data_publicacao"]
            ementa   = r["ementa"]
            texto    = r["texto_completo"] or ""

            numero_ruim = _numero_parece_arquivo(numero)
            data_nula   = data_pub is None
            ementa_nula = not ementa

            # Só processa se tiver algo para melhorar
            if not (numero_ruim or data_nula or ementa_nula):
                continue

            novo_numero = _extrair_numero(texto, tipo) if numero_ruim else None
            nova_data   = _extrair_data(texto) if data_nula else None
            nova_ementa = _extrair_ementa(texto) if ementa_nula else None

            tem_melhora = novo_numero or nova_data or nova_ementa
            if not tem_melhora:
                sem_melhora += 1
                continue

            corrigidos += 1
            print(f"  [{tipo}]")
            if numero_ruim:
                print(f"    numero:  {str(numero or '?')[:40]:40s} → {str(novo_numero or '(não encontrado)')[:30]}")
            if data_nula and nova_data:
                print(f"    data:    None → {nova_data}")
            if ementa_nula and nova_ementa:
                print(f"    ementa:  {nova_ementa[:80]}...")

            if not dry_run:
                # Verifica conflito de numero antes de tentar atualizar
                if novo_numero:
                    conflito = await conn.fetchval(
                        "SELECT 1 FROM atos WHERE tenant_id=$1 AND numero=$2 AND tipo=$3 AND id!=$4",
                        TENANT_ID, novo_numero, tipo, ato_id
                    )
                    if conflito:
                        print(f"    ⚠ numero '{novo_numero}' já existe em outro ato — pulando numero")
                        novo_numero = None

                updates = []
                params  = []
                idx = 1

                if novo_numero:
                    updates.append(f"numero = ${idx}")
                    params.append(novo_numero)
                    idx += 1
                if nova_data:
                    updates.append(f"data_publicacao = ${idx}")
                    params.append(nova_data)
                    idx += 1
                if nova_ementa:
                    updates.append(f"ementa = ${idx}")
                    params.append(nova_ementa)
                    idx += 1

                if updates:
                    params.append(ato_id)
                    await conn.execute(
                        f"UPDATE atos SET {', '.join(updates)} WHERE id = ${idx}",
                        *params
                    )

    finally:
        await conn.close()

    print(f"\n{'='*60}")
    print(f"Total analisados : {total}")
    print(f"Com melhorias    : {corrigidos}")
    print(f"Sem dados no PDF : {sem_melhora}")
    if dry_run:
        print("(DRY RUN — nenhuma alteração aplicada)")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run))
