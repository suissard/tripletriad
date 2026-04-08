import re

with open('front/src/components/HoloOverlay.vue', 'r') as f:
    content = f.read()

# Update ctx and cty in getLayerStyle
content = re.sub(
    r'(const ctx = `calc\(var\(--tx\) \+ var\(--itx\)\)`;\s*const cty = `calc\(var\(--ty\) \+ var\(--ity\)\)`;)',
    r'const depth = layer.parallaxDepth !== undefined ? layer.parallaxDepth : 1.0;\n  const ctx = `calc((var(--tx) + var(--itx)) * ${depth})`;\n  const cty = `calc((var(--ty) + var(--ity)) * ${depth})`;',
    content
)

with open('front/src/components/HoloOverlay.vue', 'w') as f:
    f.write(content)
