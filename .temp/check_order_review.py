import json,sys
d=json.load(sys.stdin)
paths=d.get('paths',{})

# Check order review endpoints
for p in ['/admin/orders/{order_id}/review','/admin/orders/{order_id}/refund','/admin/orders/{order_id}']:
    methods=paths.get(p,{})
    for m, info in methods.items():
        print(f'{m.upper()} {p}: {info.get("summary","")}')
    if not methods:
        print(f'{p}: NOT FOUND')

# Check if order review exists via /admin/reviews
p=paths.get('/admin/reviews',{})
print(f'\n/admin/reviews POST: {"FOUND" if "post" in p else "MISSING"}')
