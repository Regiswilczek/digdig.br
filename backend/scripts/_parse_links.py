import re

with open(r'c:\Users\Regis\Desktop\CAU PR\backend\scripts\_transparencia_html.tmp', encoding='utf-8', errors='replace') as f:
    html = f.read()

# Extract hrefs
pattern = re.compile(r'href="([^"]+)"')
links = pattern.findall(html)

seen = set()
for l in links:
    if l in seen:
        continue
    seen.add(l)
    if 'transparencia.caupr.gov.br' in l or (l.startswith('/') and not l.startswith('//')):
        print(l)
