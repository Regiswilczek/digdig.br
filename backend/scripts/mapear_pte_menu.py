#!/usr/bin/env python3
"""
mapear_pte_menu.py — captura os 10 menus do PTE com seus sub-itens reais
e cruza com discovery_pw pra dar status de coleta de cada sub-item.

Saída: docs/pte-mapa-completo.md
"""
from __future__ import annotations

import asyncio
import json
import re
from collections import defaultdict
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).parent.parent.parent
DISCOVERY_JSON = ROOT / "docs" / "pte-discovery-playwright.json"
OUT_MD = ROOT / "docs" / "pte-mapa-completo.md"


# ── Status de captura por path (atualizado conforme avanço) ─────────────────

# Caminhos onde o scraper FUNCIONA (paginate metadata via httpx)
COLETADOS_PAGINATE = {
    "4/127": ("Convênios", "convenio_estadual", "38.915 metadata"),
    "5/114": ("Contratos", "contrato_publico", "9.364 metadata"),
    "5/115": ("Licitações", "licitacao", "~50-80k metadata (2007-2026)"),
    "5/116": ("Situação Fornecedores", "fornecedor_estado", "59.863 metadata"),
    "5/117": ("Preços Registrados", "preco_registrado", "51.413 metadata"),
    "5/204": ("Dispensas/Inexigibilidade", "dispensa_inexigibilidade", "92.216 (paginate trava em 110)"),
    "5/210": ("Licitações (duplicado)", "licitacao", "= 5/115"),
    "5/226": ("Aquisições COVID-19 / Dispensas", "dispensa_inexigibilidade", "= 5/204"),
    "5/297": ("Catálogo de Itens", "catalogo_item", "61.491 metadata"),
}

# Caminhos onde o scraper BD funciona (dump ZIP via dialog AJAX)
COLETADOS_BD = {
    "6/1": ("Remuneração", "dump_remuneracao_mensal", "168 ZIPs / 1.1GB / 30M linhas"),
}

# Caminhos com Download do BD detectado mas que ainda não conseguimos baixar
PENDENTES_DOWNLOAD = {
    "3/3":  ("Consulta Detalhada da Receita", "formPesquisaReceita"),
    "3/57": ("Outras Consultas da Receita", "formPesquisaReceitaOrcamentaria"),
    "4/22": ("Consulta Detalhada da Despesa", "formPesquisaDespesa"),
    "4/28": ("Consulta por Credor", "formPesquisa"),
    "4/77": ("Outras Consultas da Despesa", "formPesquisaPreFormatada"),
    "4/126": ("Total Desembolsado", "formPesquisaTotalDesembolsado"),
    "5/213": ("Estoque de Suprimentos", "parent_form"),
    "6/2":  ("Viagens (Diárias e Passagens)", "formViagens — dropdown ano vazio"),
    "6/131": ("Relação de Servidores", "formRelacaoServidores"),
    "8/177": ("Bens Móveis", "parent_form"),
}

# Caminhos com iframe externo (sistemas paralelos com dados próprios)
SISTEMAS_EXTERNOS = {
    "3/27":  "Recolhimento Diário (recdiario.fazenda.pr.gov.br)",
    "3/285": "FlexPortal Receitas (Adobe Flex)",
    "3/304": "PowerBI Emendas Parlamentares PIX",
    "3/309": "SERPRO Transferências (federal × estadual)",
    "4/50":  "Portal v4 Adiantamentos (HTML estático)",
    "4/100": "Portal v4 Repasses Municípios (HTML estático)",
    "4/191": "RPV — Requisições de Pequeno Valor",
    "4/287": "FlexPortal Despesas",
    "4/288": "FlexPortal Fornecedores",
    "4/324": "PowerBI SEFA",
    "4/325": "SIAFIC Dispêndios Extraorçamentários",
    "6/271": "Qlik Sense Terceirizados",
    "7/54":  "SIAFIC ISSPAGOS",
    "8/17":  "GCAU Casa Civil",
    "8/20":  "Legislação Estadual (legislacao.pr.gov.br)",
    "8/113": "Qlik PTE (bi.pr.gov.br)",
    "8/293": "Programa Estadual de Desburocratização (legislação)",
    "8/294": "Regulamento da Prestação Digital de Serviços",
    "8/295": "Qlik CGEOUV+",
    "10/140": "Sistag Social — Repasses",
    "10/319": "SEED Convênios (Educação)",
    "11/61": "Qlik Realizações de Governo",
}


async def capture_menu_structure() -> dict[str, dict[str, str]]:
    """Abre /pte/home, hoverea cada um dos 10 menus do topo, captura
    os labels dos sub-itens com seus paths.
    """
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1920, "height": 1080})
        page = await ctx.new_page()
        await page.goto("https://www.transparencia.pr.gov.br/pte/home",
                        wait_until="networkidle", timeout=60000)
        await asyncio.sleep(3)

        # estrutura: { "PESSOAL": { "6/1": "Remuneração", ... } }
        # captura todos os links pra /pte/assunto/X/Y, junto com o texto e o
        # menu-pai mais próximo (categoria do topo).
        result = await page.evaluate("""() => {
            const out = {};
            // os 10 menus do topo: têm class ou aria que os identifica
            // procurar h2/h3/links visíveis
            const links = Array.from(document.querySelectorAll('a[href*="/pte/assunto/"]'));
            const data = links.map(a => {
                const m = a.href.match(/\\/pte\\/assunto\\/(\\d+)\\/(\\d+)/);
                if (!m) return null;
                const path = `${m[1]}/${m[2]}`;
                const label = a.innerText.trim() || a.title || '';
                // tenta encontrar o menu-pai (heurística: pular pra cima até achar div com menu)
                let parent = a;
                let menuPai = null;
                while (parent && parent !== document.body) {
                    if (parent.classList && (
                        parent.classList.contains('menu') ||
                        parent.classList.contains('item-menu') ||
                        parent.classList.contains('submenu')
                    )) {
                        // sobe mais um nível pra achar o título
                        let p2 = parent.parentElement;
                        while (p2 && p2 !== document.body) {
                            const hdr = p2.querySelector('a.menu-titulo, .menu-titulo, .titulo-menu, h2, h3');
                            if (hdr && hdr.innerText) { menuPai = hdr.innerText.trim(); break; }
                            p2 = p2.parentElement;
                        }
                        break;
                    }
                    parent = parent.parentElement;
                }
                return { path, label, menuPai };
            }).filter(Boolean);
            return data;
        }""")
        await b.close()
        return result


def categorize_by_top_menu(items_with_labels: list[dict]) -> dict[int, dict]:
    """Agrupa por categoria (primeiro número do path) e mantém label + path.

    Como o menu-pai não foi capturado de forma confiável, usamos as categorias
    canônicas do PTE conforme os 10 ícones do topo.
    """
    # mapping fixo categoria → label do menu (canônico)
    CAT_NAMES = {
        2: "PLANEJAMENTO E ORÇAMENTO",
        3: "RECEITAS",
        4: "DESPESAS",
        5: "COMPRAS",
        6: "PESSOAL",
        7: "RESPONSABILIDADE FISCAL",
        8: "INFORMAÇÕES GERAIS / LEGISLAÇÃO",
        10: "TRANSPARÊNCIA TEMÁTICA",
        11: "OBRAS E AÇÕES",
        12: "JUSTIÇA FISCAL",
    }
    by_cat: dict[int, list[dict]] = defaultdict(list)
    for item in items_with_labels:
        path = item["path"]
        cat = int(path.split("/")[0])
        by_cat[cat].append(item)
    # dedup por path mantendo melhor label
    deduped: dict[int, dict] = {}
    for cat in sorted(by_cat.keys()):
        seen: dict[str, str] = {}
        for item in by_cat[cat]:
            label = item["label"]
            path = item["path"]
            # mantém o label mais informativo
            existing = seen.get(path, "")
            if not existing or (label and len(label) > len(existing)):
                seen[path] = label
        deduped[cat] = {
            "name": CAT_NAMES.get(cat, f"CATEGORIA {cat}"),
            "items": [{"path": p, "label": l or "(sem label)"} for p, l in sorted(seen.items(), key=lambda x: int(x[0].split("/")[1]))],
        }
    return deduped


def status_of(path: str) -> tuple[str, str]:
    """Retorna (emoji_status, descrição)."""
    if path in COLETADOS_PAGINATE:
        _, _, vol = COLETADOS_PAGINATE[path]
        return ("✅", f"COLETADO — {vol}")
    if path in COLETADOS_BD:
        _, _, vol = COLETADOS_BD[path]
        return ("✅", f"COLETADO BD — {vol}")
    if path in PENDENTES_DOWNLOAD:
        _, form = PENDENTES_DOWNLOAD[path]
        return ("🟡", f"PENDENTE — botão Download detectado ({form})")
    if path in SISTEMAS_EXTERNOS:
        return ("🔵", f"SISTEMA EXTERNO — {SISTEMAS_EXTERNOS[path]}")
    return ("🔴", "NÃO MAPEADO")


def render_md(by_cat: dict[int, dict]) -> str:
    lines = [
        "# PTE Mapa Completo — sub-item por sub-item",
        "",
        "Status de captura para cada um dos sub-itens dos 10 menus do",
        "Portal da Transparência do Estado do Paraná (PTE).",
        "",
        "**Legenda:**",
        "- ✅ COLETADO — dados já no banco/disco",
        "- 🟡 PENDENTE — Download do BD existe, automação parcial (precisa Playwright)",
        "- 🔵 SISTEMA EXTERNO — iframe pra outro portal (Qlik, PowerBI, FlexPortal, SIAFIC, etc.)",
        "- 🔴 NÃO MAPEADO — provavelmente página de índice ou conteúdo lazy-loaded sem datatable",
        "",
        "---",
        "",
    ]
    total = sum(len(c["items"]) for c in by_cat.values())
    contagem = {"✅": 0, "🟡": 0, "🔵": 0, "🔴": 0}

    for cat, info in by_cat.items():
        lines.append(f"## {cat}. {info['name']}")
        lines.append("")
        lines.append(f"**{len(info['items'])} sub-itens** mapeados.")
        lines.append("")
        lines.append("| # | Sub-item | Status | Detalhe |")
        lines.append("|---|----------|--------|---------|")
        for i, item in enumerate(info["items"], 1):
            emoji, desc = status_of(item["path"])
            contagem[emoji] += 1
            label = item["label"] or "(sem label)"
            label_clean = re.sub(r"\s+", " ", label)[:80]
            lines.append(f"| {i} | `{item['path']}` — **{label_clean}** | {emoji} | {desc} |")
        lines.append("")

    # Sumário no topo
    summary = [
        "## Resumo geral",
        "",
        f"| Status | Quantidade | % |",
        "|--------|-----------|---|",
    ]
    for k, v in contagem.items():
        pct = v / total * 100 if total else 0
        summary.append(f"| {k} | {v} | {pct:.1f}% |")
    summary.append(f"| **Total** | **{total}** | 100% |")
    summary.append("")
    summary.append("---")
    summary.append("")

    return "\n".join(lines[:8] + summary + lines[8:])


async def main() -> None:
    # carregar dados do discovery_pw já existente
    if not DISCOVERY_JSON.exists():
        print(f"⚠ {DISCOVERY_JSON} não existe — rode discover_pte_playwright.py antes.")
        return

    discovery = json.load(open(DISCOVERY_JSON))
    # fonte primária de paths/labels: discovery (h1/h2)
    items_with_labels = []
    for r in discovery:
        if "path" not in r:
            continue
        h1 = (r.get("h1") or "").split("\n")[0].strip()
        h2 = (r.get("h2") or "").split("\n")[0].strip()
        title = (r.get("title") or "").split("|")[0].strip()
        # priorizar h1 sobre title sobre h2
        label = h1 or title or h2 or ""
        items_with_labels.append({"path": r["path"], "label": label})

    print("Tentando capturar menu real do home (Playwright)...")
    try:
        menu_items = await capture_menu_structure()
        # merge: se o menu home tem label melhor pra um path, usa ele
        labels_from_menu = {x["path"]: x["label"] for x in menu_items if x["label"]}
        for item in items_with_labels:
            if item["path"] in labels_from_menu:
                menu_label = labels_from_menu[item["path"]]
                if menu_label and (not item["label"] or len(menu_label) > 5):
                    item["label"] = menu_label
        print(f"  → {len(labels_from_menu)} labels capturados do menu home")
    except Exception as exc:
        print(f"  → Playwright falhou: {exc!s:.100}")

    by_cat = categorize_by_top_menu(items_with_labels)
    md = render_md(by_cat)
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text(md)
    print(f"\n→ {OUT_MD}")
    print(f"  Categorias: {len(by_cat)}")
    for cat, info in by_cat.items():
        coletados = sum(1 for it in info["items"] if it["path"] in COLETADOS_PAGINATE or it["path"] in COLETADOS_BD)
        print(f"  Cat {cat:2d} {info['name'][:35]:35} — {len(info['items']):3d} sub-itens ({coletados} coletados)")


if __name__ == "__main__":
    asyncio.run(main())
