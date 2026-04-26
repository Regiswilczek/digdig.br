#!/usr/bin/env python3
"""
Garimpo do Portal da Transparência do CAU/PR.
Usa Obscura para renderizar cada seção e extrai links de documentos (PDF, XLS, DOCX).
"""
import subprocess, re, html as hlib, sys

OBSCURA = r"c:\Users\Regis\Desktop\obscura-eval\obscura.exe"

SECOES = [
    ("Atas de Reuniões de Comissões",          "https://transparencia.caupr.gov.br/atas-de-reunioes-de-comissoes/"),
    ("Atas Plenárias Extraordinárias",          "https://transparencia.caupr.gov.br/atas-de-reunioes-plenarias-extraordinarias/"),
    ("Pautas das Reuniões Plenárias",           "https://transparencia.caupr.gov.br/pautas-das-reunioes-plenarias/"),
    ("Súmulas Conselho Diretor",                "https://transparencia.caupr.gov.br/sumulas-e-deliberacoes-das-reunioes-do-conselho-diretor/"),
    ("Súmulas Comissões Temporárias",           "https://transparencia.caupr.gov.br/sumulas-das-reunioes-de-comissoes-temporarias/"),
    ("Resoluções",                              "https://transparencia.caupr.gov.br/resolucoes/"),
    ("Atos Declaratórios",                      "https://transparencia.caupr.gov.br/atos-declaratorios/"),
    ("Contratações Diretas / Inexigibilidades", "https://transparencia.caupr.gov.br/contratacoes-diretas/"),
    ("Relação de Contratos",                    "https://transparencia.caupr.gov.br/relacao-de-contratos-do-cau-pr/"),
    ("Relação de Convênios",                    "https://transparencia.caupr.gov.br/relacao-de-convenios-do-cau-pr/"),
    ("Folhas de Pagamento",                     "https://transparencia.caupr.gov.br/folhas-de-pagamentos/"),
    ("Diárias e Deslocamentos",                 "https://transparencia.caupr.gov.br/diarias-e-deslocamentos-2/"),
    ("Quadro de Empregados",                    "https://transparencia.caupr.gov.br/quadro-de-empregados-publicos-3/"),
    ("Tabelas de Remuneração",                  "https://transparencia.caupr.gov.br/tabelas-de-remuneracao/"),
    ("Relatórios ao TCU",                       "https://transparencia.caupr.gov.br/relatorios-de-gestao/"),
    ("Relatórios e Pareceres",                  "https://transparencia.caupr.gov.br/relatorios-e-pareceres/"),
    ("Auditoria Independente",                  "https://transparencia.caupr.gov.br/auditoria-independente/"),
    ("Licitações / Editais",                    "https://transparencia.caupr.gov.br/licitacoes-2/"),
    ("Dispensa Eletrônica",                     "https://transparencia.caupr.gov.br/dispensa-eletronica/"),
    ("Atas de Registro de Preço",               "https://transparencia.caupr.gov.br/atas-de-registro-de-preco/"),
    ("Orientações Jurídicas",                   "https://transparencia.caupr.gov.br/orientacoes-juridicas/"),
    ("Eleições do CAU",                         "https://transparencia.caupr.gov.br/eleicoes-dos-cau/"),
]

DOC_EXTS = re.compile(r'\.(pdf|xls|xlsx|doc|docx|csv|zip)(\?[^"]*)?$', re.IGNORECASE)

def fetch_html(url: str) -> str:
    r = subprocess.run(
        [OBSCURA, "fetch", url, "--dump=html", "--stealth", "--quiet"],
        capture_output=True, text=True, timeout=45, encoding="utf-8", errors="replace"
    )
    return r.stdout

def extract_doc_links(html: str) -> list[tuple[str, str]]:
    """Returns list of (anchor_text, href) for document links."""
    results = []
    for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>([^<]*)</a>', html, re.IGNORECASE):
        href, text = m.group(1), hlib.unescape(m.group(2)).strip()
        if DOC_EXTS.search(href) or any(x in href.lower() for x in ['upload', 'wp-content']):
            if href.startswith('http'):
                results.append((text or href.split('/')[-1], href))
    return results

def extract_text_preview(html: str, chars: int = 400) -> str:
    txt = re.sub(r'<[^>]+>', ' ', html)
    txt = hlib.unescape(txt)
    txt = re.sub(r'\s+', ' ', txt).strip()
    return txt[:chars]

print(f"\n{'='*70}")
print("GARIMPO — Portal da Transparência do CAU/PR")
print(f"{'='*70}")
print(f"Seções a verificar: {len(SECOES)}\n")

summary = []

for label, url in SECOES:
    print(f"  → {label}...", end=" ", flush=True)
    try:
        html = fetch_html(url)
        doc_links = extract_doc_links(html)
        preview = extract_text_preview(html)

        # Count potential items (headings, list items)
        items = len(re.findall(r'<(h[2-4]|li|p)\b', html))

        print(f"✓  ({len(doc_links)} docs, ~{items} itens)")
        summary.append((label, url, doc_links, preview, items))
    except Exception as e:
        print(f"✗  {e}")
        summary.append((label, url, [], str(e), 0))

print(f"\n\n{'='*70}")
print("RESULTADO COMPLETO")
print(f"{'='*70}\n")

for label, url, docs, preview, items in summary:
    print(f"\n── {label}")
    print(f"   URL: {url}")
    print(f"   Itens estimados: {items}  |  Docs encontrados: {len(docs)}")
    if preview:
        print(f"   Preview: {preview[:200]}")
    if docs:
        print(f"   Documentos ({len(docs)}):")
        for text, href in docs[:8]:
            ext = href.rsplit('.', 1)[-1].split('?')[0].upper()[:4] if '.' in href else '?'
            print(f"     [{ext}] {text[:60]}  →  {href[:80]}")
        if len(docs) > 8:
            print(f"     ... e mais {len(docs)-8}")
