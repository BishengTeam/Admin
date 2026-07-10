import json, sys

d = json.load(sys.stdin)
paths = d.get('paths', {})

for p, methods in paths.items():
    if 'banner' not in p.lower():
        continue
    print(f'=== {p} ===')
    for m, info in methods.items():
        print(f'  {m.upper()}')
        if 'summary' in info:
            print(f'    摘要: {info["summary"]}')
        if 'description' in info:
            print(f'    描述: {info["description"]}')
        if 'parameters' in info:
            for pm in info['parameters']:
                req = pm.get('required', False)
                print(f'    参数: {pm["name"]} ({pm["in"]}) - 必填={req}')
        if 'requestBody' in info:
            content = info['requestBody'].get('content', {}).get('application/json', {})
            schema = content.get('schema', {})
            if '$ref' in schema:
                ref_path = schema['$ref']
                print(f'    请求体: {ref_path}')
                parts = ref_path.split('/')
                obj = d
                for part in parts[1:]:
                    obj = obj[part]
                if 'properties' in obj:
                    required = obj.get('required', [])
                    for prop_name, prop in obj['properties'].items():
                        is_req = prop_name in required
                        print(f'      {prop_name}: {prop.get("type", "?")} {"(必填)" if is_req else ""}')
            else:
                if 'properties' in schema:
                    for prop_name, prop in schema['properties'].items():
                        print(f'      {prop_name}: {prop.get("type", "?")}')
        if 'responses' in info:
            for code, resp in info['responses'].items():
                desc = resp.get('description', '')
                print(f'    响应 {code}: {desc}')
        print()
