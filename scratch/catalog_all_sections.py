import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's inspect all major sections in dashboard.html
# Look for panel-header, section-title, or h1/h2 tags
matches = re.findall(r'(<(?:div class="[^"]*panel-header[^"]*"|h[12])[^>]*>[\s\S]*?</(?:div|h[12])>)', html)
print(f"Total header blocks found: {len(matches)}")
for i, m in enumerate(matches):
    clean = re.sub(r'<[^>]+>', ' ', m)
    clean = ' '.join(clean.split())
    # Find if it has an id
    id_m = re.search(r'id=["\']([^"\']+)["\']', m)
    id_str = f" [id={id_m.group(1)}]" if id_m else " [NO ID]"
    print(f"{i+1:2d}:{id_str} {clean[:90]}")
