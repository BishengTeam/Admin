import json,sys
d=json.load(sys.stdin)
paths=d.get('paths',{})

# Check individual detail endpoints mentioned in section 6
for p in ['/admin/users/{user_id}/identity','/admin/users/{user_id}/student','/admin/users/{user_id}/enterprise']:
    methods=paths.get(p,{})
    for m, info in methods.items():
        summary=info.get('summary','')
        resp=info.get('responses',{}).get('200',{}).get('content',{}).get('application/json',{})
        ref=resp.get('schema',{}).get('$ref','')
        print(f'{m.upper()} {p}: {summary} → {ref}')
    if not methods:
        print(f'{p}: NOT FOUND')
