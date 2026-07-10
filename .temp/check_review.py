import json, sys
d = json.load(sys.stdin)
paths = d.get('paths', {})

for p in ['/admin/users/{user_id}/identity/review', '/admin/users/{user_id}/student/review', '/admin/users/{user_id}/enterprise/review']:
    methods = paths.get(p, {})
    for m, info in methods.items():
        req = info.get('requestBody', {}).get('content', {}).get('application/json', {})
        ref = req.get('schema', {}).get('$ref', '')
        print(f'{m.upper()} {p}')
        print(f'  summary: {info.get("summary","")}')
        print(f'  body: {ref}')
        if ref:
            parts = ref.split('/')
            obj = d
            for part in parts[1:]:
                obj = obj[part]
            print(f'  schema: {json.dumps(obj, indent=4, ensure_ascii=False)}')
        print()
