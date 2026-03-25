const fs = require('fs');
const path = 'front/src/components/TripleTriadCard.vue';
let content = fs.readFileSync(path, 'utf8');

// I made a typo: is-shaking instead of impact-shake, let me fix it to use impact-shake and apply it properly
// and add the <BrokenGlassOverlay> properly inside <div class="tt-card-front">
// Let's just use my own is-shaking logic as added above, that's fine.
// One correction: the innerStyle transition needs to be updated to make the color transition smoother
// The problem requested: "transition de couleur en douceur (passage de l'adversaire a un autre)"

// Currently: `transition: border-color 0.3s ease, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);`
content = content.replace(
  "transition: border-color 0.3s ease, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);",
  "transition: border-color 0.8s ease, box-shadow 0.8s ease, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);"
);

// We should also replace the 'is-selected' transition inside .is-selected .tt-card-inner and rarity classes to inherit the smooth transition if needed.
// Actually, it already targets `border-color` and `box-shadow` which is fine.

fs.writeFileSync(path, content);
console.log('Done patching TT card color transition');
