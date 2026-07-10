import json, sys

d = json.load(sys.stdin)
paths = d.get('paths', {})
put_op = paths.get('/admin/users/{user_id}', {}).get('put', {})
req_body = put_op.get('requestBody', {})
content = req_body.get('content', {}).get('application/json', {})
schema_ref = content.get('schema', {}).get('$ref', '')

print(f'Request schema $ref: {schema_ref}')
if schema_ref:
    parts = schema_ref.split('/')
    obj = d
    for part in parts[1:]:
        obj = obj[part]
    print(json.dumps(obj, indent=2, ensure_ascii=False))

# Also get all user-related schemas in components
schemas = d.get('components', {}).get('schemas', {})
for name in sorted(schemas.keys()):
    if name.lower() in ['adminuserupdate', 'userprofileupdate']:
        print(f'\n=== {name} ===')
        print(json.dumps(schemas[name], indent=2, ensure_ascii=False))
