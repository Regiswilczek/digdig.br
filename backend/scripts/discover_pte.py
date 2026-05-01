#!/usr/bin/env python3
"""
discover_pte.py — varredura dos 128 sub-itens do PTE pra mapear estrutura.

Pra cada `/pte/assunto/X/Y`:
  - Faz GET, extrai título da página
  - Detecta se tem `<form id="formPesquisa">` (PrimeFaces)
  - Detecta widget DataTable (id e nome)
  - Detecta filtro de ano (input)
  - Lista colunas (TH headers)
  - Lista anos disponíveis no dropdown (se houver)

Saída: docs/pte-discovery.json + docs/pte-discovery.md (tabelão).

Esse mapa vira a referência pra adicionar entries em PTE_ENDPOINTS
de scrape_pte.py de forma sistemática.

Uso:
    python scripts/discover_pte.py
"""
from __future__ import annotations

import asyncio
import json
import re
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).parent.parent.parent
OUT_JSON = ROOT / "docs" / "pte-discovery.json"
OUT_MD = ROOT / "docs" / "pte-discovery.md"

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0"
PTE_BASE = "https://www.transparencia.pr.gov.br/pte/assunto"
HOME = "https://www.transparencia.pr.gov.br/pte/home"

CONCURRENCY = 4


def _strip(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&nbsp;", " ", s)
    s = re.sub(r"&[a-z]+;", "", s)
    return re.sub(r"\s+", " ", s).strip()


def parse_page(path: str, body: str) -> dict:
    out = {
        "path": path,
        "url": f"{PTE_BASE}/{path}",
        "len": len(body),
    }
    title = re.search(r"<title>([^<]+)", body)
    if title:
        out["title"] = _strip(title.group(1))[:120]
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', body, re.DOTALL)
    if h1:
        out["h1"] = _strip(h1.group(1))[:200]
    h2 = re.search(r'<h2[^>]*>(.*?)</h2>', body, re.DOTALL)
    if h2:
        out["h2"] = _strip(h2.group(1))[:200]

    has_form = "formPesquisa" in body
    out["has_form"] = has_form
    if not has_form:
        return out

    # action
    m = re.search(r'<form[^>]+id="formPesquisa"[^>]+action="([^"]+)"', body)
    if m:
        out["action"] = m.group(1)
    # widgets — formato: <div id="formPesquisa:NAME" class="ui-datatable...">
    dt = re.findall(r'<div[^>]+id="formPesquisa:([a-zA-Z][a-zA-Z0-9_]+)"[^>]+class="[^"]*ui-datatable', body)
    if not dt:
        dt = re.findall(r'PrimeFaces\.cw\("DataTable","formPesquisa:([^"]+)"', body)
    out["widgets_datatable"] = sorted(set(dt))
    # filtro de ano
    fano = re.findall(r'name="(formPesquisa:[a-zA-Z_-]*ano[a-zA-Z_-]*_input)"', body, re.I)
    out["filtro_ano"] = sorted(set(fano))[:1]
    # anos no dropdown
    anos = sorted(set(re.findall(r'data-label="(\d{4})"', body)))
    out["anos_dropdown"] = anos
    # colunas (TH role=columnheader)
    ths = re.findall(r'<th[^>]+role="columnheader"[^>]*>(.*?)</th>', body, re.DOTALL)
    out["columns"] = [_strip(t)[:50] for t in ths if t.strip()]
    # rows per page (rows="10|20|30")
    rpp = re.search(r'rows="(\d+)"', body)
    if rpp:
        out["rows_per_page"] = int(rpp.group(1))
    return out


async def discover_one(http: httpx.AsyncClient, path: str, sem: asyncio.Semaphore) -> dict:
    async with sem:
        try:
            r = await http.get(f"{PTE_BASE}/{path}", timeout=30, follow_redirects=True)
        except Exception as exc:
            return {"path": path, "error": f"GET {exc!s:.80}"}
        if r.status_code != 200:
            return {"path": path, "http_status": r.status_code}
        try:
            return parse_page(path, r.text)
        except Exception as exc:
            return {"path": path, "error": f"PARSE {exc!s:.80}"}


async def list_all_subitens(http: httpx.AsyncClient) -> list[str]:
    r = await http.get(HOME, timeout=30, follow_redirects=True)
    links = sorted(set(re.findall(r'/pte/assunto/(\d+)/(\d+)', r.text)))
    return [f"{cat}/{sub}" for cat, sub in links]


async def main() -> None:
    sem = asyncio.Semaphore(CONCURRENCY)
    async with httpx.AsyncClient(
        headers={"User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9"},
        follow_redirects=True,
        timeout=60,
    ) as http:
        print("Listando sub-itens em /pte/home ...")
        paths = await list_all_subitens(http)
        print(f"Encontrados {len(paths)} sub-itens. Iniciando descoberta (concurrency={CONCURRENCY})...\n")
        results = await asyncio.gather(*[discover_one(http, p, sem) for p in paths])

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"\n→ {OUT_JSON}\n")

    # Markdown
    com_form = [r for r in results if r.get("has_form")]
    sem_form = [r for r in results if not r.get("has_form") and "error" not in r]
    erros = [r for r in results if "error" in r]
    com_dt = [r for r in com_form if r.get("widgets_datatable")]

    lines = ["# PTE Discovery — varredura dos sub-itens disponíveis", ""]
    lines.append(f"Total: **{len(results)}** sub-itens detectados em `/pte/home`.")
    lines.append("")
    lines.append(f"- Com `formPesquisa`: **{len(com_form)}**")
    lines.append(f"  - Com DataTable widget: **{len(com_dt)}**")
    lines.append(f"  - Com filtro de ano: **{sum(1 for r in com_form if r.get('filtro_ano'))}**")
    lines.append(f"- Sem form (página índice / redirect): **{len(sem_form)}**")
    lines.append(f"- Erros HTTP/parse: **{len(erros)}**")
    lines.append("")

    lines.append("## Sub-itens com DataTable (alvos prioritários do scraper)")
    lines.append("")
    lines.append("| path | título | widget | filtro ano | colunas | anos |")
    lines.append("|---|---|---|---|---|---|")
    for r in sorted(com_dt, key=lambda x: tuple(map(int, x['path'].split('/')))):
        title = (r.get("h2") or r.get("h1") or r.get("title") or "?")[:60]
        widget = ",".join(r.get("widgets_datatable") or []) or "—"
        fano = ",".join(r.get("filtro_ano") or []).replace("formPesquisa:", "") or "—"
        cols = " · ".join((r.get("columns") or [])[:5])
        anos = r.get("anos_dropdown") or []
        anos_s = f"{anos[0]}..{anos[-1]} ({len(anos)})" if anos else "—"
        lines.append(f"| `{r['path']}` | {title} | `{widget}` | `{fano}` | {cols} | {anos_s} |")
    lines.append("")

    lines.append("## Sub-itens com form mas SEM DataTable (precisam abordagem diferente)")
    lines.append("")
    lines.append("| path | título | obs |")
    lines.append("|---|---|---|")
    sem_dt = [r for r in com_form if not r.get("widgets_datatable")]
    for r in sorted(sem_dt, key=lambda x: tuple(map(int, x['path'].split('/')))):
        title = (r.get("h2") or r.get("h1") or r.get("title") or "?")[:60]
        cols = " · ".join((r.get("columns") or [])[:3]) or "(sem TH)"
        lines.append(f"| `{r['path']}` | {title} | {cols} |")
    lines.append("")

    lines.append("## Sub-itens sem form (provavelmente índice/landing — tem links pra outras páginas)")
    lines.append("")
    lines.append("| path | título |")
    lines.append("|---|---|")
    for r in sorted(sem_form, key=lambda x: tuple(map(int, x['path'].split('/')))):
        title = (r.get("h2") or r.get("h1") or r.get("title") or "?")[:60]
        lines.append(f"| `{r['path']}` | {title} |")
    lines.append("")

    if erros:
        lines.append("## Erros")
        lines.append("")
        for r in erros:
            lines.append(f"- `{r['path']}`: {r.get('error') or r.get('http_status')}")
        lines.append("")

    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text("\n".join(lines))
    print(f"→ {OUT_MD}")
    print(f"\nResumo: {len(com_dt)} com DataTable, {len(sem_dt)} com form-sem-DT, {len(sem_form)} índice, {len(erros)} erros.")


if __name__ == "__main__":
    asyncio.run(main())
