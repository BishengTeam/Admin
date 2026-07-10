import json, sys
d=json.load(sys.stdin)
schemas=d.get('components',{}).get('schemas',{})

# Check order response schema
for name in schemas:
    if 'Order' in name or 'order' in name.lower():
        print(f'=== {name} ===')
        props = schemas[name].get('properties',{})
        keys=list(props.keys())
        print(f'fields: {keys}')
        if 'order_kind' in props:
            print(f'order_kind: {json.dumps(props["order_kind"],ensure_ascii=False)}')
        if 'product_type' in props:
            print(f'product_type: {json.dumps(props["product_type"],ensure_ascii=False)}')
        if 'cert_type' in props:
            print(f'cert_type: {json.dumps(props["cert_type"],ensure_ascii=False)}')
        print()
