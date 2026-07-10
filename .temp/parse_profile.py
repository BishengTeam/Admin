import json, sys

d = json.load(sys.stdin)
schemas = d.get('components', {}).get('schemas', {})

# Find all schemas related to user detail / profile
for name in sorted(schemas.keys()):
    s = schemas[name]
    props = s.get('properties', {})
    # Find schemas that have lots of personal fields
    personal_fields = ['real_name', 'id_card', 'identity', 'school', 'email', 'phone', 'avatar', 'nickname', 'gender', 'birthday']
    matches = [f for f in personal_fields if f in props]
    if matches:
        print(f'=== {name} (matches: {matches}) ===')
        print(json.dumps(s, indent=2, ensure_ascii=False))
        print()

# Also print the user detail path with its response schema reference
paths = d.get('paths', {})
path = paths.get('/admin/users/{user_id}', {})
get_op = path.get('get', {})
print('=== GET /admin/users/{user_id} response ===')
print(json.dumps(get_op.get('responses', {}), indent=2, ensure_ascii=False))
