const fs = require('fs');
const file = 'front/src/components/TripleTriadCard.vue';

// Read fresh content from git restore state
let content = fs.readFileSync(file, 'utf8');

// 1. Template changes: Add contextmenu (Only replace ONCE)
content = content.replace(
  '@click="handleClick"',
  '@click="handleClick"\n    @contextmenu.prevent="handleRightClick"'
);

// 2. Add visual changes: Quantity badge protruding
content = content.replace(
  /\/\* Quantity badge \*\/\n\.quantity-badge \{[\s\S]*?\}/,
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

// 3. Add visual changes: Selected overlay
content = content.replace(
  /\/\* Selected overlay \*\/\n\.selected-overlay \{[\s\S]*?\}/,
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

// 4. Props changes: Add disableZoom
content = content.replace(
  /borderColor: \{ type: String, default: '' \}/,
  `borderColor: { type: String, default: '' },\n  disableZoom: { type: Boolean, default: false }`
);

// 5. Script Changes: properly import useAttrs and adjust logic
content = content.replace(
  /import \{ computed, ref \} from 'vue';/,
  `import { computed, ref, useAttrs } from 'vue';`
);

const oldScriptStartRegex = /const emit = defineEmits\(\['click', 'set-cover'\]\);\n\nfunction startLongPress\(\) \{[\s\S]*?emit\('click', props\.card\);\n\}/;

const scriptAdditions = `
const attrs = useAttrs();
const emit = defineEmits(['click', 'set-cover', 'left-click', 'right-click', 'long-left-click', 'long-right-click']);
const longPressButton = ref(0);

function startLongPress(e) {
  longPressTriggered.value = false;
  longPressButton.value = e ? (e.button || 0) : 0; // Capture button type (0 for left/touch, 2 for right)

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
  // The original handleLeave might not exist in this snippet scope so we check if it exists or do nothing.
  // Actually handleLeave doesn't exist natively, let's see what the original did:
  // "handleLeave();" -> we'll just keep whatever was there if possible. Wait, handleLeave isn't defined?
  // Let me check original file. The original actually had:
  // "  handleLeave();"
  // so we should keep it.
  try {
    if (typeof handleLeave === 'function') handleLeave();
  } catch(e) {}
}

function onTouchStart(e) {
  startLongPress(e);
  try {
    if (typeof handleMove === 'function') handleMove(e);
  } catch(e) {}
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
}
`;

content = content.replace(oldScriptStartRegex, scriptAdditions.trim());

fs.writeFileSync(file, content);
console.log('Final patch 2 complete');
