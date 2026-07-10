import json, sys

d = json.load(sys.stdin)
schemas = d.get('components', {}).get('schemas', {})

for name in ['BannerCreate', 'BannerUpdate', 'BannerResponse', 'Banner']:
    if name in schemas:
        s = schemas[name]
        print(f'=== {name} ===')
        print(json.dumps(s, indent=2, ensure_ascii=False))
        print()

# Also dump all banner related schemas
for name, s in schemas.items():
    if 'banner' in name.lower() or 'Banner' in name:
        if name not in ['BannerCreate', 'BannerUpdate', 'BannerResponse', 'Banner']:
            print(f'=== {name} ===')
            print(json.dumps(s, indent=2, ensure_ascii=False))
            print()
