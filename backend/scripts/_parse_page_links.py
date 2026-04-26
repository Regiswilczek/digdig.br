import json, re, html as hlib, sys

page_ids = {
    19319: "Contratações Diretas",
    160:   "Relatórios ao TCU",
    17867: "Relação de Contratos",
    17421: "Quadro de Empregados",
    174:   "Diárias e Deslocamentos",
    17580: "Folhas de Pagamento",
    110:   "Resoluções",
    18664: "Pautas das Reuniões",
}

import subprocess, os

OBSCURA = r"c:\Users\Regis\Desktop\obscura-eval\obscura.exe"

for page_id, label in page_ids.items():
    url = f"https://transparencia.caupr.gov.br/wp-json/wp/v2/pages/{page_id}?_fields=content"
    r = subprocess.run(
        [OBSCURA, "fetch", url, "--dump=text", "--stealth", "--quiet"],
        capture_output=True, text=True, timeout=40, encoding="utf-8", errors="replace"
    )
    raw = re.sub(r'\x1b\[[0-9;]*m', '', r.stdout)
    try:
        d = json.loads(raw)
        rendered = d.get("content", {}).get("rendered", "")
        links = re.findall(r'href=\\"([^\\"]+)\\"', rendered)
        txt = hlib.unescape(re.sub(r'<[^>]+>', ' ', rendered))
        txt = re.sub(r'\s+', ' ', txt).strip()
        print(f"\n{'='*60}")
        print(f"  {label} (page {page_id})")
        print(f"{'='*60}")
        print(f"  Texto: {txt[:300]}")
        if links:
            print(f"  Links ({len(links)}):")
            for l in links[:10]:
                print(f"    {l}")
    except Exception as e:
        print(f"\n[{label}] ERRO: {e} | raw: {raw[:100]}")
