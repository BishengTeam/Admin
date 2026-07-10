import json,sys
d=json.load(sys.stdin)
paths=d.get('paths',{})
p=paths.get('/admin/users',{})
g=p.get('get',{})
for param in g.get('parameters',[]):
    name=param.get('name','')
    print(f'  {name}: {param.get("schema",{}).get("type","")} — {param.get("description","")}')
