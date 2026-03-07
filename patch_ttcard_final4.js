const fs = require('fs');
const file = 'front/src/components/TripleTriadCard.vue';
let content = fs.readFileSync(file, 'utf8');

// Use precise replace matching so we don't accidentally match multiple times or overwrite wrong parts.

content = content.replace(
  '@click="handleClick"',
  '@click="handleClick"\n    @contextmenu.prevent="handleRightClick"'
);

// Quantity badge
content = content.replace(
  /\/\* Quantity badge \*\/\n\.quantity-badge \{[\s\S]*?box-shadow: 0 2px 5px rgba\(0,0,0,0\.5\);\n\}/,
  `/* Quantity badge */
.quantity-badge {
  position: absolute;
  top: -0.5em; /* Protrudes outside */
  right: -0.5em; /* Protrudes outside */
  background: #ff0055;
  color: white;
  font-size: 0.95em;
  font-weight: bold;
  padding: 0.1em 0.5em;
  border-radius: 1em;
  z-index: 10; /* Ensures it is on top */
  box-shadow: 0 2px 5px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,255,255,0.2);
}`
);

// Selected overlay
content = content.replace(
  /\/\* Selected overlay \*\/\n\.selected-overlay \{[\s\S]*?text-shadow: 0 0 10px rgba\(0,0,0,0\.8\);\n\}/,
  `/* Selected overlay */
.selected-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4em;
  color: #00ffaa;
  font-weight: bold;
  z-index: 8;
  border-radius: inherit;
  text-shadow: 0 0 15px rgba(0,255,170,0.8), 0 0 5px black;
  box-shadow: inset 0 0 20px rgba(0,255,170,0.5);
}`
);

// Props
content = content.replace(
  /borderColor: \{ type: String, default: '' \}\n\}\);/,
  `borderColor: { type: String, default: '' },\n  disableZoom: { type: Boolean, default: false }\n});`
);

// Script imports
content = content.replace(
  /import \{ computed, ref \} from 'vue';/,
  `import { computed, ref, useAttrs } from 'vue';`
);

// Script logical replacement
// From "const isZoomed = ref(false);" down to the end of handleClick()
const oldScriptRegex = /const emit = defineEmits\(\['click', 'set-cover'\]\);\n\nfunction startLongPress\(\) \{[\s\S]*?function handleClick\(\) \{[\s\S]*?emit\('click', props\.card\);\n\}/;

const newScript = `
const emit = defineEmits(['click', 'set-cover', 'left-click', 'right-click', 'long-left-click', 'long-right-click']);

const longPressButton = ref(0);

function startLongPress(e) {
  longPressTriggered.value = false;
  longPressButton.value = e ? (e.button || 0) : 0;

  longPressTimer.value = setTimeout(() => {
    longPressTriggered.value = true;
    if (longPressButton.value === 0) {
      emit('long-left-click', props.card);
      if (!props.disableZoom) {
        isZoomed.value = true;
      }
    } else if (longPressButton.value === 2) {
      emit('long-right-click', props.card);
    }
  }, 500);
}

function cancelLongPress() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
  handleLeave();
}

function onTouchStart(e) {
  startLongPress(e);
  handleMove(e);
}

function onTouchEnd() {
  cancelLongPress();
}

function handleRightClick(e) {
  if (longPressTriggered.value) {
    longPressTriggered.value = false;
    return;
  }
  emit('right-click', props.card);
}

function handleClick() {
  if (longPressTriggered.value) {
    longPressTriggered.value = false;
    return;
  }
  emit('left-click', props.card);
  emit('click', props.card);
}`;

content = content.replace(oldScriptRegex, newScript.trim());

// We must also update the template to pass the event argument to startLongPress
// @mousedown="startLongPress" does it automatically.
// @touchstart="onTouchStart" does it automatically.

fs.writeFileSync(file, content);
console.log('Final clean patch applied');
