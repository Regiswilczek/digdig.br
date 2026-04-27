#!/usr/bin/env python3
"""
Popula atos.ementa com o texto extraído da página HTML das Deliberações Plenárias.

Uso:
    cd backend
    python scripts/importar_ementas_deliberacoes.py            # executa
    python scripts/importar_ementas_deliberacoes.py --dry-run  # só mostra stats

Não altera schema, não chama IA.
"""
import asyncio
import re
import sys
import argparse
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import asyncpg
import os
from bs4 import BeautifulSoup

TENANT_ID = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"
HTML_PATH = ROOT.parent / "DOCUMENTOS QUE CONSEGUI NA MAO" / "Deliberações Plenárias.html"

# Remove o boilerplate de links no final da ementa
_ARQUIVO_RE = re.compile(
    r"[:\s]*arquivo (no formato|nos formatos)[^.]*\.?\s*$",
    re.IGNORECASE,
)

# Remove o "Carta de Apoio Institucional em arquivo no formato PDF." que aparece em alguns
_CARTA_RE = re.compile(r"\s*Carta de Apoio Institucional.*$", re.IGNORECASE)


def _limpar_ementa(texto: str) -> str:
    texto = _ARQUIVO_RE.sub("", texto).strip()
    texto = _CARTA_RE.sub("", texto).strip()
    texto = texto.rstrip(".:,; ")
    return texto


def _normalizar_numero(numero: str) -> str:
    """Remove asterisco, espaços extras e normaliza para comparação."""
    n = numero.strip().rstrip("*").strip()
    # Converte ponto como separador para barra: "02.2024" → "02/2024", "16.23" → "16/2023"
    # Só aplica quando o padrão é NNN.AAAA ou NNN.AA
    n = re.sub(r"^(\d+)\.(\d{4})$", r"\1/\2", n)
    n = re.sub(r"^(\d+)\.(\d{2})$", lambda m: f"{m.group(1)}/20{m.group(2)}", n)
    return n


def _variantes(numero: str) -> list[str]:
    """
    Gera variantes do número para tentar matches flexíveis.
    Ex: "0138-01/2021" → ["0138-01/2021", "138-01/2021", "01/2021"]
    """
    n = _normalizar_numero(numero)
    variantes = [n]

    # Remove zeros à esquerda do segmento antes do primeiro hífen
    if "-" in n:
        partes = n.split("-", 1)
        sem_zero = partes[0].lstrip("0") or "0"
        variantes.append(f"{sem_zero}-{partes[1]}")
        # Só a parte após o hífen (ex: "01/2021")
        variantes.append(partes[1])
    elif "/" in n:
        # Remove zeros à esquerda antes da barra
        partes = n.split("/", 1)
        sem_zero = partes[0].lstrip("0") or "0"
        variantes.append(f"{sem_zero}/{partes[1]}")

    return list(dict.fromkeys(variantes))  # deduplica mantendo ordem


def parsear_html(caminho: Path) -> dict[str, dict]:
    """
    Retorna dict: {numero_normalizado: {"ementa": str, "tipo": str, "titulo_completo": str}}
    """
    with open(caminho, encoding="utf-8", errors="replace") as f:
        html = f.read()

    soup = BeautifulSoup(html, "html.parser")

    entradas: dict[str, dict] = {}
    strongs = [s for s in soup.find_all("strong") if "DELIBERA" in s.get_text().upper()]

    for strong in strongs:
        titulo = strong.get_text(" ", strip=True)

        # Extrai número: texto após "Nº " (ou "N°" / "No ")
        m = re.search(r"N[ºo°]\s*(.+)$", titulo, re.IGNORECASE)
        if not m:
            continue
        numero_raw = m.group(1).strip().rstrip("*").strip()

        tipo = "ad_referendum" if "AD REFERENDUM" in titulo.upper() else "plenaria"

        # Percorre parágrafos seguintes até encontrar parágrafo vazio (separador)
        p_titulo = strong.find_parent("p")
        if p_titulo is None:
            continue

        ementa_parts = []
        notas = []
        current = p_titulo.find_next_sibling()

        while current:
            tag_text = current.get_text(" ", strip=True)

            # Parágrafo vazio = separador entre entradas
            if not tag_text or tag_text in ("\xa0", "&nbsp;"):
                break

            # Verifica se é próxima entrada (começa com DELIBERA em negrito)
            if current.find("strong") and "DELIBERA" in current.get_text().upper():
                break

            # Linha de data: "de DD/MM/AAAA" — pula
            if re.match(r"^de\s+\d{1,2}/\d{1,2}/\d{4}$", tag_text):
                current = current.find_next_sibling()
                continue

            # Nota de substituição / referenda (começa com * ou contém "substituída")
            if tag_text.startswith("*") or "substituí" in tag_text.lower() or "substituí" in tag_text.lower():
                notas.append(_limpar_ementa(tag_text))
                current = current.find_next_sibling()
                continue

            # Texto de ementa principal
            ementa_parts.append(_limpar_ementa(tag_text))
            current = current.find_next_sibling()

        if not ementa_parts:
            current = p_titulo.find_next_sibling()

        ementa_texto = " ".join(filter(None, ementa_parts)).strip()
        ementa_final = ementa_texto
        if notas:
            ementa_final += "\n\n" + "\n".join(notas)

        if ementa_final:
            numero_norm = _normalizar_numero(numero_raw)
            entradas[numero_norm] = {
                "ementa": ementa_final,
                "tipo": tipo,
                "titulo_completo": titulo,
            }

    return entradas


def _match(numero_db: str, indice: dict[str, dict]) -> dict | None:
    """Tenta casar numero_db com alguma entrada do índice HTML."""
    n = _normalizar_numero(numero_db)

    # 1. Exact match
    if n in indice:
        return indice[n]

    # 2. Variantes do número do DB
    for v in _variantes(n):
        if v in indice:
            return indice[v]

    # 3. DB tem número incompleto (ex: "0094-") → prefixo
    if n.endswith("-"):
        prefixo = n.rstrip("-")
        for chave in indice:
            if chave.startswith(prefixo + "-"):
                return indice[chave]

    # 4. O HTML pode ter número sem zeros (ex: "94-12/2019") → DB tem "0094-12/2019"
    for chave in indice:
        for v_html in _variantes(chave):
            if v_html == n:
                return indice[chave]

    return None


async def main(dry_run: bool):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print(f"\nParsing HTML: {HTML_PATH}")
    indice = parsear_html(HTML_PATH)
    print(f"  Entradas encontradas no HTML: {len(indice)}")

    dsn = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn, statement_cache_size=0)

    # Busca todos os atos tipo deliberacao
    atos = await conn.fetch("""
        SELECT id::text, numero, ementa
        FROM atos
        WHERE tenant_id = $1 AND tipo = 'deliberacao'
        ORDER BY data_publicacao DESC NULLS LAST
    """, TENANT_ID)

    total = len(atos)
    sem_ementa = [a for a in atos if not a["ementa"]]
    print(f"  Deliberações no banco: {total}")
    print(f"  Sem ementa: {len(sem_ementa)}\n")

    matched = []
    nao_matched = []

    for ato in sem_ementa:
        entrada = _match(ato["numero"] or "", indice)
        if entrada:
            matched.append((ato["id"], ato["numero"], entrada["ementa"]))
        else:
            nao_matched.append(ato["numero"])

    print(f"Matching:")
    print(f"  Casados:    {len(matched)}")
    print(f"  Sem match:  {len(nao_matched)}\n")

    if dry_run:
        print("-- DRY RUN: nenhuma escrita no banco --")
        print("\nAmostra dos casados:")
        for ato_id, numero, ementa in matched[:5]:
            print(f"  {numero}: {ementa[:80]}...")
        if nao_matched:
            print(f"\nAmostra sem match:")
            for n in nao_matched[:10]:
                print(f"  {n}")
    else:
        print("Atualizando banco...")
        ok = 0
        for i, (ato_id, numero, ementa) in enumerate(matched, 1):
            await conn.execute(
                "UPDATE atos SET ementa = $1 WHERE id = $2::uuid",
                ementa, ato_id,
            )
            ok += 1
            if i % 50 == 0 or i == len(matched):
                print(f"  [{i:4d}/{len(matched)}] ...", end="\r")

        print(f"\n  Atualizados: {ok}")

        # Exporta sem match para revisão
        sem_match_path = ROOT / "scripts" / "ementa_sem_match.txt"
        sem_match_path.write_text("\n".join(nao_matched), encoding="utf-8")
        print(f"  Sem match exportado: {sem_match_path}")

    await conn.close()
    print("\nConcluído.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.dry_run))
