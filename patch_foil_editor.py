import re

with open('front/src/admin/views/FoilEditorView.vue', 'r') as f:
    content = f.read()

# Add Parallax Slider
slider_html = """
                  <div>
                    <div class="flex justify-between items-center mb-1.5 px-1">
                      <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Parallax</label>
                      <span class="text-[9px] font-bold text-white/50">{{ activeLayer.parallaxDepth.toFixed(1) }}</span>
                    </div>
                    <input type="range" v-model.number="activeLayer.parallaxDepth" min="0" max="5" step="0.1" class="w-full h-0.5 bg-white/10 rounded-full appearance-none accent-primary/70">
                  </div>
"""

content = re.sub(
    r'(<label class="text-\[9px\] font-black text-gray-500 uppercase tracking-widest">Vitesse</label>\s*<span class="text-\[9px\] font-bold text-white/50">{{ activeLayer.foilSpeed.toFixed\(1\) }}</span>\s*</div>\s*<input type="range" v-model.number="activeLayer.foilSpeed" min="0" max="5" step="0.1" class="w-full h-0.5 bg-white/10 rounded-full appearance-none accent-primary/70">\s*</div>)',
    r'\1' + slider_html,
    content
)

# Add to saveEffect
content = re.sub(
    r'(foilSpeed: l\.foilSpeed,)',
    r'\1\n        parallaxDepth: l.parallaxDepth,',
    content
)

# Add to createDefaultLayer
content = re.sub(
    r'(foilSpeed: 1\.0,)',
    r'\1\n    parallaxDepth: 1.0,',
    content
)

with open('front/src/admin/views/FoilEditorView.vue', 'w') as f:
    f.write(content)
