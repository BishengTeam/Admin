import json, sys

d = json.load(sys.stdin)
schemas = d.get('components', {}).get('schemas', {})

# Check AdminUserListItem for identity or status fields
for name in ['AdminUserListItem', 'AdminUserBrief']:
    if name in schemas:
        print(f'=== {name} ===')
        print(json.dumps(schemas[name], indent=2, ensure_ascii=False))
        print()

# Also check PaginatedData_AdminUserListItem
for name in schemas:
    if 'AdminUser' in name or 'Paginated' in name and 'Admin' in name:
        if name not in ['AdminUserListItem', 'AdminUserBrief', 'AdminUserUpdate']:
            print(f'=== {name} ===')
            print(json.dumps(schemas[name], indent=2, ensure_ascii=False))
            print()
