#!/usr/bin/env python3
"""
Extrai ementa e data_publicacao das deliberações que estão vazias,
lendo o texto_completo que já está no banco — sem nenhuma chamada de rede.

Uso:
    cd backend
    python scripts/patch_ementa_data_deliberacoes.py
    python scripts/patch_ementa_data_deliberacoes.py --dry-run   # só mostra, não salva
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
import ftfy

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL não encontrado no .env")
ASYNCPG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
TENANT_ID   = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"

MESES = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3,
    "abril": 4, "maio": 5, "junho": 6, "julho": 7,
    "agosto": 8, "setembro": 9, "outubro": 10,
    "novembro": 11, "dezembro": 12,
}


def fix(texto: str) -> str:
    """Corrige mojibake (UTF-8 bytes lidos como Latin-1) e normaliza espaços."""
    try:
        texto = texto.encode("latin-1").decode("utf-8", errors="replace")
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    return ftfy.fix_text(texto)


def extrair_ementa(texto: str) -> str | None:
    texto = fix(texto)
    lines = [l.strip() for l in texto.split("\n") if l.strip()]

    # Procura a linha do título da deliberação
    delib_idx = None
    for i, line in enumerate(lines):
        up = line.upper()
        if ("DELIBERA" in up and ("PLEN" in up or "DPOPR" in up or "AD REFERENDUM" in up)):
            delib_idx = i
            break

    if delib_idx is not None:
        # Coleta as linhas seguintes até o corpo ("O PLENÁRIO..." / "O CONSELHO...")
        ementa_parts = []
        for line in lines[delib_idx + 1:]:
            up = line.upper()
            if up.startswith("O PLEN") or up.startswith("O CONSELHO") or up.startswith("CONSIDERANDO"):
                break
            if len(ementa_parts) >= 6:
                break
            ementa_parts.append(line)
        ementa = " ".join(ementa_parts).strip()
        if len(ementa) > 10:
            return ementa[:500]

    # Fallback: campo ASSUNTO no cabeçalho
    for line in lines:
        if line.upper().startswith("ASSUNTO"):
            assunto = re.sub(r"^ASSUNTO\s*", "", line, flags=re.IGNORECASE).strip()
            if len(assunto) > 10:
                return assunto[:500]

    return None


def extrair_data(texto: str) -> date | None:
    texto = fix(texto)

    padroes = [
        # "no dia 29 de janeiro de 2021"
        r"(?:no\s+)?dia\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})",
        # "Curitiba, 29 de janeiro de 2021"
        r"Curitiba,?\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})",
        # "em 29 de janeiro de 2021"
        r"\bem\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})",
        # genérico "DD de MMMM de YYYY"
        r"\b(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})\b",
    ]

    for pat in padroes:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            dia, mes_str, ano = int(m.group(1)), m.group(2).lower(), int(m.group(3))
            mes = MESES.get(mes_str)
            if mes and 1 <= dia <= 31 and 2000 <= ano <= 2030:
                try:
                    return date(ano, mes, dia)
                except ValueError:
                    continue

    # Fallback: DD/MM/YYYY
    m = re.search(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b", texto)
    if m:
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            pass

    return None


async def main(dry_run: bool) -> None:
    conn = await asyncpg.connect(ASYNCPG_URL)
    try:
        rows = await conn.fetch(
            """
            SELECT a.id, a.numero, a.ementa, a.data_publicacao, c.texto_completo
            FROM atos a
            JOIN conteudo_ato c ON c.ato_id = a.id
            WHERE a.tenant_id = $1
              AND a.tipo = 'deliberacao'
              AND (a.ementa IS NULL OR a.ementa = '' OR a.data_publicacao IS NULL)
            ORDER BY a.numero
            """,
            TENANT_ID,
        )

        total = len(rows)
        print(f"\n{'='*60}")
        print(f"  PATCH EMENTA/DATA — {total} deliberações pendentes")
        print(f"  Modo: {'DRY-RUN (sem salvar)' if dry_run else 'REAL (salvando no banco)'}")
        print(f"{'='*60}\n")

        ok_ementa = ok_data = sem_ementa = sem_data = 0

        for row in rows:
            texto = row["texto_completo"] or ""
            novo_ementa = None
            nova_data   = None

            if not row["ementa"]:
                novo_ementa = extrair_ementa(texto)

            if not row["data_publicacao"]:
                nova_data = extrair_data(texto)

            if not novo_ementa and not nova_data:
                sem_ementa += (1 if not row["ementa"] else 0)
                sem_data   += (1 if not row["data_publicacao"] else 0)
                continue

            # Mostra resultado
            ementa_display = (novo_ementa or "")[:60] + "…" if novo_ementa and len(novo_ementa) > 60 else (novo_ementa or "—")
            print(f"  {row['numero']:22s}  ementa={ementa_display!r:65s}  data={nova_data}")

            if not dry_run:
                updates = {}
                if novo_ementa:
                    updates["ementa"] = novo_ementa
                    ok_ementa += 1
                if nova_data:
                    updates["data_publicacao"] = nova_data
                    ok_data += 1

                if updates:
                    set_clause = ", ".join(f"{k}=${i+2}" for i, k in enumerate(updates))
                    values = list(updates.values())
                    await conn.execute(
                        f"UPDATE atos SET {set_clause} WHERE id=$1",
                        row["id"], *values,
                    )
            else:
                ok_ementa += 1 if novo_ementa else 0
                ok_data   += 1 if nova_data else 0

        print(f"\n{'='*60}")
        print(f"  Ementas {'encontradas' if dry_run else 'salvas'}:  {ok_ementa}")
        print(f"  Datas   {'encontradas' if dry_run else 'salvas'}:  {ok_data}")
        print(f"  Sem ementa no texto:  {sem_ementa}")
        print(f"  Sem data no texto:    {sem_data}")
        print(f"{'='*60}\n")

    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Mostra sem salvar")
    args = parser.parse_args()
    asyncio.run(main(args.dry_run))
