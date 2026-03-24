const fs = require('fs');
const path = 'front/src/components/TripleTriadCard.vue';
let content = fs.readFileSync(path, 'utf8');

// Import BrokenGlassOverlay
content = content.replace(
  "import AnimatedCardBack from \"./AnimatedCardBack.vue\";",
  "import AnimatedCardBack from \"./AnimatedCardBack.vue\";\nimport BrokenGlassOverlay from \"./BrokenGlassOverlay.vue\";"
);

// Add BrokenGlassOverlay inside tt-card-front, after cover-badge/unowned-overlay
content = content.replace(
  "<!-- BASE CARD FACE (Fallback revealed false) -->",
  "<!-- Broken Glass Impact Effect for Captures -->\n          <BrokenGlassOverlay v-if=\"card.impactDirection\" :direction=\"card.impactDirection\" />\n\n        <!-- BASE CARD FACE (Fallback revealed false) -->"
);

// We also need to add impact-shake animation trigger.
// watch property for impactDirection
content = content.replace(
  "// --- Capture Flip Animation ---",
  "// --- Capture Impact Animation ---\nconst isShaking = ref(false);\nwatch(() => props.card.impactDirection, (newVal) => {\n  if (newVal) {\n    isShaking.value = true;\n    setTimeout(() => { isShaking.value = false; }, 300);\n  }\n});\n\n// --- Capture Flip Animation ---"
);

// Add is-shaking class to tt-card
content = content.replace(
  "'is-flipping': isFlipping,",
  "'is-flipping': isFlipping,\n        'is-shaking': isShaking,"
);

// Stop isFlipping if we have an impactDirection (we want glass break instead of flip on capture)
content = content.replace(
  "watch(() => props.borderColor, (newVal, oldVal) => {\n  if (oldVal && newVal !== oldVal) {\n    isFlipping.value = true;",
  "watch(() => props.borderColor, (newVal, oldVal) => {\n  if (oldVal && newVal !== oldVal && !props.card.impactDirection) {\n    isFlipping.value = true;"
);

// Add the hammer-hit keyframes for is-shaking
content = content.replace(
  "@keyframes flip-360 {",
  "@keyframes hammer-hit {\n    0% { transform: translate(0, 0); filter: brightness(1); }\n    10% { transform: translate(-4px, 3px); filter: brightness(1.3); }\n    20% { transform: translate(3px, -2px); filter: brightness(1); }\n    30% { transform: translate(-2px, 1px); }\n    40% { transform: translate(0, 0); }\n}\n.tt-card.is-shaking:not(.is-flat) {\n    animation: hammer-hit 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;\n}\n\n@keyframes flip-360 {"
);

fs.writeFileSync(path, content);
console.log('Done patching TripleTriadCard');
