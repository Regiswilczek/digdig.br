#!/usr/bin/env python3
"""
Garimpo do Portal da Transparência do CAU/PR via WP REST API (httpx direto).
"""
import httpx, re, html as hlib, sys, json

BASE = "https://transparencia.caupr.gov.br"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
    "Accept": "application/json",
}

# (label, page_id) — IDs descobertos via WP API earlier
SECOES = [
    ("Atas de Reuniões de Comissões",          17409),
    ("Atas Plenárias Extraordinárias",          17576),
    ("Pautas das Reuniões Plenárias",           18664),
    ("Súmulas Conselho Diretor",                18692),
    ("Súmulas Comissões Temporárias",           18695),
    ("Resoluções",                              110),
    ("Atos Declaratórios",                      118),
    ("Atos Declaratórios (2)",                  17932),
    ("Contratações Diretas / Inexigibilidades", 19319),
    ("Relação de Contratos",                    17867),
    ("Relação de Convênios",                    17872),
    ("Folhas de Pagamento",                     17580),
    ("Diárias e Deslocamentos",                 174),
    ("Quadro de Empregados",                    17421),
    ("Quadro de Estagiários",                   17424),
    ("Tabelas de Remuneração",                  17225),
    ("Relatórios ao TCU",                       160),
    ("Relatórios e Pareceres",                  17203),
    ("Auditoria Independente",                  18731),
    ("Licitações / Editais",                    341),
    ("Dispensa Eletrônica",                     19317),
    ("Atas de Registro de Preço",               19321),
    ("Orientações Jurídicas",                   120),
    ("Eleições do CAU",                         597),
    ("Contratos e Convênios (diárias antiga)",  166),
    ("Acordos Nacionais",                       122),
    ("Acordos Internacionais",                  124),
    ("Portarias Presidenciais",                 116),
]

DOC_RE = re.compile(r'\.(pdf|xls|xlsx|doc|docx|csv|zip)(\?[^"\']*)?$', re.IGNORECASE)

def strip_html(h: str) -> str:
    return re.sub(r'\s+', ' ', hlib.unescape(re.sub(r'<[^>]+>', ' ', h))).strip()

def get_links(rendered: str):
    out = []
    for m in re.finditer(r'href=\\"([^\\"]+)\\"', rendered):
        href = m.group(1).replace('\\/', '/')
        if DOC_RE.search(href):
            out.append(href)
    # also try unescaped
    for m in re.finditer(r'href="([^"]+)"', rendered):
        href = m.group(1)
        if DOC_RE.search(href) and href not in out:
            out.append(href)
    return out

results = []

with httpx.Client(headers=HEADERS, timeout=30, follow_redirects=True) as client:
    for label, page_id in SECOES:
        url = f"{BASE}/wp-json/wp/v2/pages/{page_id}?_fields=id,slug,title,content,link"
        try:
            r = client.get(url)
            r.raise_for_status()
            data = r.json()
            rendered = data.get("content", {}).get("rendered", "")
            text = strip_html(rendered)
            links = get_links(rendered)
            # estimate items by counting paragraph/list markers in raw
            items = rendered.count('<p') + rendered.count('<li')
            results.append((label, page_id, data.get("link",""), links, text, items))
            status = f"✓  ({items} parágrafos, {len(links)} docs)"
        except Exception as e:
            results.append((label, page_id, "", [], str(e), 0))
            status = f"✗  {e}"
        print(f"  {label[:45]:45s} {status}")

print(f"\n\n{'='*70}")
print("MAPA DE DOCUMENTOS — Portal da Transparência CAU/PR")
print(f"{'='*70}\n")

for label, page_id, link, docs, text, items in results:
    has_content = bool(text and len(text) > 40 and 'wp-smiley' not in text)
    flag = "★" if (docs or items > 3) else ("·" if has_content else "∅")
    print(f"\n{flag} {label}  [id={page_id}]")
    if link:
        print(f"  {link}")
    if has_content:
        print(f"  Preview: {text[:250]}")
    if docs:
        print(f"  Docs PDF/XLS ({len(docs)}):")
        for d in docs[:6]:
            print(f"    {d[:100]}")
        if len(docs) > 6:
            print(f"    ... e mais {len(docs)-6}")
    elif not has_content:
        print(f"  (sem conteúdo visível via API — pode ser JS-only)")
