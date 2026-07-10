import json, sys
d = json.load(sys.stdin)

# Check profile response schema
paths = d.get('paths', {})
profile_path = '/admin/users/{user_id}/profile'
get_op = paths.get(profile_path, {}).get('get', {})
resp_200 = get_op.get('responses', {}).get('200', {})
content = resp_200.get('content', {}).get('application/json', {})
ref = content.get('schema', {}).get('$ref', '')
print(f'Profile response $ref: {ref}')

if ref:
    parts = ref.split('/')
    obj = d
    for part in parts[1:]:
        obj = obj[part]
    print(json.dumps(obj, indent=2, ensure_ascii=False))
