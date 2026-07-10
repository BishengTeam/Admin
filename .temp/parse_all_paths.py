import json, sys

d = json.load(sys.stdin)
paths = d.get('paths', {})

# Search ALL paths
for p, methods in sorted(paths.items()):
    for m, info in methods.items():
        summary = info.get('summary', '')
        tags = info.get('tags', [])
        # Look for profile, identity, user detail related
        if any(word in p.lower() or word in summary.lower() for word in ['profile', 'identity', 'user_detail', 'user-detail']):
            print(f'{m.upper():7s} {p}')
            print(f'         {summary}')
            print()
        elif '/admin/users/' in p:
            print(f'{m.upper():7s} {p}')
            print(f'         {summary}')
            print()
