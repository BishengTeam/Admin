import json, sys

d = json.load(sys.stdin)
schemas = d.get('components', {}).get('schemas', {})

for name in ['AdminUserListItem', 'AdminUserUpdate', 'AdminUserBrief', 'AdminUserDetail', 'AdminIdentityReview', 'UserIdentityResponse']:
    if name in schemas:
        print(f'=== {name} ===')
        print(json.dumps(schemas[name], indent=2, ensure_ascii=False))
        print()
