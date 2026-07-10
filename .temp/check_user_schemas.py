import json,sys
d=json.load(sys.stdin)
schemas=d.get('components',{}).get('schemas',{})

# Check user detail schema
for name in schemas:
    if 'User' in name and 'Detail' not in name and 'Admin' not in name and 'Response' not in name and 'Paginated' not in name:
        print(f'=== {name} ===')
        props=schemas[name].get('properties',{})
        for k,v in props.items():
            anyof=v.get('anyOf',[{}])
            t=anyof[0].get('type','?') if anyof else v.get('type','?')
            print(f'  {k}: {t}')
        print()

# Check UserProfileDetail
print('=== UserProfileDetail ===')
s=schemas.get('UserProfileDetail',{})
if s:
    for k,v in s.get('properties',{}).items():
        anyof=v.get('anyOf',[{}])
        t=anyof[0].get('type','?') if anyof else v.get('type','?')
        print(f'  {k}: {t}')
