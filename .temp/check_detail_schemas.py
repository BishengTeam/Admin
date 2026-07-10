import json,sys
d=json.load(sys.stdin)
schemas=d.get('components',{}).get('schemas',{})

for name in ['RealnameAdminResponse','StudentResponse','EnterpriseResponse']:
    s=schemas.get(name,{})
    if s:
        print(f'=== {name} ===')
        print(json.dumps(s.get('properties',{}),indent=2,ensure_ascii=False))
        print()
