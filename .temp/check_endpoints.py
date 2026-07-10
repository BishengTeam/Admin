import json, sys

d = json.load(sys.stdin)
paths = d.get('paths', {})

for p, methods in sorted(paths.items()):
    if '/admin/users/' in p:
        for m, info in methods.items():
            print(f'{m.upper():7s} {p}  — {info.get("summary", "")}')
