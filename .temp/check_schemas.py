import json, sys

d = json.load(sys.stdin)
schemas = d.get('components', {}).get('schemas', {})

for name in ['UserProfileDetail', 'UserIdentityResponse', 'AdminUserIdentityResponse']:
    if name in schemas:
        print(f'=== {name} ===')
        print(json.dumps(schemas[name], indent=2, ensure_ascii=False))
        print()

# Also check what schema the new identity/profile endpoints return
paths = d.get('paths', {})
for p in ['/admin/users/{user_id}/profile', '/admin/users/{user_id}/identity']:
    if p in paths:
        get_op = paths[p].get('get', {})
        resp = get_op.get('responses', {}).get('200', {})
        content = resp.get('content', {}).get('application/json', {})
        schema_ref = content.get('schema', {}).get('$ref', '')
        print(f'=== {p} response schema ===')
        print(f'  $ref: {schema_ref}')
        if schema_ref:
            parts = schema_ref.split('/')
            obj = d
            for part in parts[1:]:
                obj = obj[part]
            print(json.dumps(obj, indent=2, ensure_ascii=False))
        print()
