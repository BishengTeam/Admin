import json,sys
d=json.load(sys.stdin)
paths=d.get('paths',{})

# Check for pending review query endpoints
for p in paths:
    if 'review' in p.lower() or 'pending' in p.lower() or 'audit' in p.lower():
        methods=paths.get(p,{})
        for m, info in methods.items():
            summary=info.get('summary','')
            print(f'{m.upper()} {p}: {summary}')

# Also check if there's a batch or list review endpoint
print('\n--- Checking for batch review endpoints ---')
for p in ['/admin/reviews/pending','/admin/reviews/batch']:
    methods=paths.get(p,{})
    if methods:
        for m in methods:
            print(f'{m.upper()} {p}: FOUND')
    else:
        print(f'{p}: NOT FOUND')
