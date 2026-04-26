import json, re

with open(r'c:\Users\Regis\Desktop\CAU PR\backend\scripts\_pages.json', encoding='utf-8', errors='replace') as f:
    raw = f.read()

# strip ANSI codes (obscura --dump text may add them)
raw = re.sub(r'\x1b\[[0-9;]*m', '', raw)

try:
    pages = json.loads(raw)
except Exception as e:
    print("JSON parse error:", e)
    print(raw[:500])
    exit(1)

print(f"Total pages: {len(pages)}\n")
for p in sorted(pages, key=lambda x: x.get('slug', '')):
    title = p.get('title', {}).get('rendered', '') if isinstance(p.get('title'), dict) else p.get('title', '')
    print(f"  [{p['id']:6d}] parent={p.get('parent',0):6d}  {p['link']}")
    print(f"           {title}")
