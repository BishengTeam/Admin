import json, sys

d = json.load(sys.stdin)
paths = d.get('paths', {})
p = paths.get('/admin/users/{user_id}/profile', {})
put_op = p.get('put', {})
req_body = put_op.get('requestBody', {}).get('content', {}).get('application/json', {})
schema_ref = req_body.get('schema', {}).get('$ref', '')

print(f'PUT /admin/users/{{user_id}}/profile')
print(f'Summary: {put_op.get("summary", "")}')
print(f'Request schema: {schema_ref}')

if schema_ref:
    parts = schema_ref.split('/')
    obj = d
    for part in parts[1:]:
        obj = obj[part]
    print(json.dumps(obj, indent=2, ensure_ascii=False))

# Also check if PUT /admin/users/{user_id} still exists
old = paths.get('/admin/users/{user_id}', {})
print(f'\nPUT /admin/users/{{user_id}} exists: {"put" in old}')
