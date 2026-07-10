import json,sys
d=json.load(sys.stdin)
schemas=d.get('components',{}).get('schemas',{})

# Check RealnameAdminResponse for new fields
s=schemas.get('RealnameAdminResponse',{})
if s:
    props=s.get('properties',{})
    print('=== RealnameAdminResponse ===')
    for k,v in props.items():
        anyof=v.get('anyOf',[{}])
        t=anyof[0].get('type','?') if anyof else v.get('type','?')
        print(f'  {k}: {t}')

# Check UserDetailResponse or similar
for name in schemas:
    if 'UserDetail' in name or 'UserResponse' in name:
        print(f'\n=== {name} ===')
        props=schemas[name].get('properties',{})
        for k,v in props.items():
            anyof=v.get('anyOf',[{}])
            t=anyof[0].get('type','?') if anyof else v.get('type','?')
            print(f'  {k}: {t}')
