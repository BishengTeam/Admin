import json, sys

d = json.load(sys.stdin)
paths = d.get('paths', {})

checks = [
    '/admin/users/{user_id}/profile',
    '/admin/users/{user_id}/student/review',
    '/admin/users/{user_id}/enterprise/review',
    '/admin/users/{user_id}/identity/review',
]

for p in checks:
    methods = paths.get(p, {})
    print(f'{p}')
    for m, info in methods.items():
        print(f'  {m.upper()}: {info.get("summary", "")}')
    if not methods:
        print(f'  (not found)')
    print()

# Also check profile response schema
get_op = paths.get('/admin/users/{user_id}/profile', {}).get('get', {})
resp = get_op.get('responses', {}).get('200', {})
content = resp.get('content', {}).get('application/json', {})
ref = content.get('schema', {}).get('$ref', '')
print(f'GET profile response schema: {ref}')
