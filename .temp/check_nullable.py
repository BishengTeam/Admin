import json,sys
d=json.load(sys.stdin)
s=d['components']['schemas']['OrderResponse']
props=s['properties']
for f in ['candidate_name','candidate_phone','candidate_idcard']:
    print(json.dumps(props.get(f,{}),indent=2,ensure_ascii=False))
