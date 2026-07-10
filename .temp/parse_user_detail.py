import json, sys

d = json.load(sys.stdin)
schemas = d.get('components', {}).get('schemas', {})

for name in ['AdminUserDetail', 'AdminUserBrief', 'AdminUserListResponse']:
    if name in schemas:
        print(f'=== {name} ===')
        print(json.dumps(schemas[name], indent=2, ensure_ascii=False))
        print()

# Also find the user detail path
paths = d.get('paths', {})
for p, methods in paths.items():
    if p == '/admin/users/{user_id}' or p == '/admin/users':
        print(f'=== PATH: {p} ===')
        print(json.dumps(methods, indent=2, ensure_ascii=False))
        print()
