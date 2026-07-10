import json, sys

d = json.load(sys.stdin)
paths = d.get('paths', {})

# Find ALL paths under /admin/users
for p, methods in sorted(paths.items()):
    if p.startswith('/admin/users'):
        print(f'=== {p} ===')
        for m, info in methods.items():
            print(f'  {m.upper()}: {info.get("summary", "")}')
        print()
