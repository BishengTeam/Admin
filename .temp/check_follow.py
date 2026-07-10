import json,sys
d=json.load(sys.stdin)
paths=d.get('paths',{})

# Check /admin/reviews
p=paths.get('/admin/reviews',{})
for m, info in p.items():
    print(f'/admin/reviews {m.upper()}: {info.get("summary","")}')
    if m == 'post':
        rb = info.get('requestBody',{}).get('content',{}).get('application/json',{})
        ref = rb.get('schema',{}).get('$ref','')
        if ref:
            parts=ref.split('/')
            obj=d
            for part in parts[1:]: obj=obj[part]
            print(json.dumps(obj,indent=2,ensure_ascii=False))

# Check orders list params
p=paths.get('/admin/orders',{})
g=p.get('get',{})
for param in g.get('parameters',[]):
    print(f'orders param: {param.get("name")}')

# Check old review endpoints
for ep in ['/admin/users/{user_id}/identity/review','/admin/users/{user_id}/student/review','/admin/users/{user_id}/enterprise/review']:
    methods=paths.get(ep,{})
    print(f'{ep}: {"FOUND" if methods else "NOT FOUND"}')
