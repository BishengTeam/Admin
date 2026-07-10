import json, sys

d = json.load(sys.stdin)
schemas = d.get('components', {}).get('schemas', {})

# Find identity-related schemas
for name, s in schemas.items():
    if 'identity' in name.lower() or 'Identity' in name or 'review' in name.lower() or 'Review' in name:
        print(f'=== {name} ===')
        print(json.dumps(s, indent=2, ensure_ascii=False))
        print()

# Find user-related schemas
for name, s in schemas.items():
    if 'user' in name.lower() or 'User' in name:
        if 'identity' not in name.lower() and 'review' not in name.lower():
            print(f'=== {name} ===')
            print(json.dumps(s, indent=2, ensure_ascii=False))
            print()

# Also find the identity/review path
paths = d.get('paths', {})
for p, methods in paths.items():
    if 'identity' in p.lower():
        print(f'=== PATH: {p} ===')
        print(json.dumps(methods, indent=2, ensure_ascii=False))
        print()
