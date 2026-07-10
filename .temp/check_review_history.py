import json,sys
d=json.load(sys.stdin)
paths=d.get('paths',{})
p=paths.get('/admin/reviews',{})
g=p.get('get',{})
resp=g.get('responses',{}).get('200',{}).get('content',{}).get('application/json',{})
ref=resp.get('schema',{}).get('$ref','')
print(f'GET /admin/reviews response: {ref}')
if ref:
    parts=ref.split('/')
    obj=d
    for part in parts[1:]: obj=obj[part]
    # Find paginated data wrapper
    data_ref=obj.get('properties',{}).get('data',{}).get('anyOf',[{}])[0].get('$ref','')
    print(f'data ref: {data_ref}')
    if data_ref:
        parts2=data_ref.split('/')
        obj2=d
        for part in parts2[1:]: obj2=obj2[part]
        items_ref=obj2.get('properties',{}).get('items',{}).get('items',{}).get('$ref','')
        print(f'items ref: {items_ref}')
        if items_ref:
            parts3=items_ref.split('/')
            obj3=d
            for part in parts3[1:]: obj3=obj3[part]
            print(json.dumps(obj3,indent=2,ensure_ascii=False))
