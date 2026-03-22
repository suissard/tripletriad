<template>
  <Teleport to="body">
    <Transition name="zoom-fade">
      <div v-if="show" class="zoom-overlay" @click="$emit('close')">
        <div class="zoom-card-container">
          <div class="tt-card-zoom-wrapper" :class="[rarityClass, { 'is-premium': isPremium }]" :style="cardZoomStyle" @click="$emit('close')">
            <div class="zoom-card-inner">
              <template v-if="isPremium">
                <svg width="0" height="0" style="position:absolute">
                  <filter :id="holoFilterId + '-zoom'" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
                    <feTurbulence type="fractalNoise" :baseFrequency="holoFrequency" :numOctaves="holoOctaves" :seed="premiumSeed" result="noise" />
                    <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
                    <feBlend in="SourceGraphic" in2="mono" mode="color-burn" />
                  </filter>
                </svg>
                <div class="glare" :style="{ background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 60%)' }"></div>
                <div class="holo-container" :style="[{ opacity: 1, mixBlendMode: 'color-dodge' }, holoStyle]">
                  <div class="holo-gradient" :style="{ filter: `url(#${holoFilterId}-zoom)` }"></div>
                </div>
                <div class="premium-border-layer" :style="premiumBorderStyle"></div>
              </template>

              <!-- Card face (Always revealed in zoom) -->
              <img v-if="card.imageUrl || card.img" :src="card.imageUrl || card.img || `https://api.dicebear.com/9.x/bottts/svg?seed=${(card.id || 0) * 42}&backgroundColor=transparent`" class="card-img" :alt="card.name" />
              <img v-else :src="`https://api.dicebear.com/9.x/bottts/svg?seed=${(card.id || 0) * 42}&backgroundColor=transparent`" class="card-img" :alt="card.name" />
              <div class="card-name-bar">{{ card.name }}</div>
              <div class="card-stats-cross">
                <span class="stat stat-top">{{ card.topValue }}</span>
                <span class="stat stat-left">{{ card.leftValue }}</span>
                <span class="stat stat-right">{{ card.rightValue }}</span>
                <span class="stat stat-bottom">{{ card.bottomValue }}</span>
              </div>
              <div class="card-elements" v-if="cardElementsList.length">
                <ElementIcon v-for="el in cardElementsList" :key="el" :element="el" :active="true" class="element-icon" />
              </div>
            </div>
          </div>

          <div class="zoom-card-info" @click.stop>
            <h2>{{ card.name }}</h2>
            <div class="zoom-meta">
              <span>Niveau {{ cardLevel }}</span>
              <span v-if="cardElementsList.length">Éléments: {{ cardElementsList.join(', ') }}</span>
              <span v-if="card.faction && card.faction !== 'neutre'">Faction: {{ card.faction }}</span>
              <span v-if="isPremium" class="zoom-premium-badge">🌟 PREMIUM</span>
            </div>

            <p v-if="card.description" class="zoom-desc">{{ card.description }}</p>

            <div class="zoom-stats">
              <div class="zoom-stat-grid">
                <span>⬆ HAUT: {{ card.topValue }}</span>
                <span>⬅ GAUCHE: {{ card.leftValue }}</span>
                <span>➡ DROITE: {{ card.rightValue }}</span>
                <span>⬇ BAS: {{ card.bottomValue }}</span>
              </div>
            </div>

            <div class="zoom-ownership">
              <div v-if="unowned" class="ownership-status unowned">🔒 Non possédée</div>
              <div v-else class="ownership-status owned">✅ Possédée ({{ quantity }})</div>
            </div>

            <!-- Crafting/Disenchanting Buttons -->
            <div class="zoom-actions">
              <button class="zoom-action-btn craft" @click.stop="handleCraft" :disabled="!canCraft">
                <span>Créer</span>
                <span class="cost">-{{ craftCost }} ✨</span>
              </button>
              <button class="zoom-action-btn disenchant" v-if="!unowned && quantity > 0" @click.stop="handleDisenchant">
                <span>Désenchanter</span>
                <span class="gain">+{{ disenchantGain }} ✨</span>
              </button>
            </div>
          </div>
          <button class="zoom-close" @click="$emit('close')">✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import ElementIcon from "./ElementIcon.vue";
import { state } from '../game/state.js';
import { useUserStore } from '../stores/userStore.js';
import { GameEngine } from '../../../shared/GameEngine.ts';

const userStore = useUserStore();

const props = defineProps({
  show: Boolean,
  card: { type: Object, required: true },
  isPremium: Boolean,
  quantity: Number,
  unowned: Boolean,
  borderWidth: { type: Number, default: 2 }
});

const emit = defineEmits(['close']);

const ZOOM_SIZE = 350;

const cardLevel = computed(() => {
  if (props.card.level) return props.card.level;
  return GameEngine.calculateCardLevel({
    top: props.card.topValue,
    right: props.card.rightValue,
    bottom: props.card.bottomValue,
    left: props.card.leftValue
  });
});

const rarityClass = computed(() => {
  if (props.card.rarity) return `rarity-${props.card.rarity.toLowerCase()}`;
  const level = cardLevel.value;
  if (level >= 9) return 'rarity-legendary';
  if (level >= 7) return 'rarity-epic';
  if (level >= 5) return 'rarity-rare';
  if (level >= 3) return 'rarity-uncommon';
  return 'rarity-common';
});

const rarityColor = computed(() => {
  if (props.card.rarity) {
    const map = {
      'Common': '#a0a0a0',
      'Uncommon': '#4caf50',
      'Rare': '#2196f3',
      'Epic': '#9c27b0',
      'Legendary': '#ffc107'
    };
    return map[props.card.rarity] || '#a0a0a0';
  }
  const level = cardLevel.value;
  if (level >= 9) return '#ffc107';
  if (level >= 7) return '#9c27b0';
  if (level >= 5) return '#2196f3';
  if (level >= 3) return '#4caf50';
  return '#a0a0a0';
});

const cardZoomStyle = computed(() => {
  const scale = ZOOM_SIZE / 150;
  return {
    '--card-border-width': `${props.borderWidth * scale}px`,
    '--card-border-offset': `-${props.borderWidth * scale}px`
  };
});

const premiumBorderStyle = computed(() => {
  const c = rarityColor.value;
  return {
    '--premium-border-gradient': `linear-gradient(135deg, ${c}, transparent, ${c}, transparent, ${c}) border-box`,
    '--premium-border-glow': c
  };
});

const cardElementsList = computed(() => {
  if (!props.card) return [];
  const elements = props.card.elements;
  const element = props.card.element;
  let result = [];
  if (Array.isArray(elements)) result = elements;
  else if (typeof elements === 'string') result = elements.split(',').map(e => e.trim());
  else if (element && element !== 'None') result = [element];
  return [...new Set(result)].filter(e => e && e !== 'None');
});

// Crafting
const getRarityStr = (level) => {
  if (level <= 2) return 'common';
  if (level <= 4) return 'uncommon';
  if (level <= 6) return 'rare';
  if (level <= 8) return 'epic';
  return 'legendary';
};
const craftingRatios = {
  common: { disenchant: 10, craft: 40 },
  uncommon: { disenchant: 20, craft: 80 },
  rare: { disenchant: 50, craft: 200 },
  epic: { disenchant: 100, craft: 400 },
  legendary: { disenchant: 400, craft: 1600 }
};
const craftCost = computed(() => craftingRatios[getRarityStr(cardLevel.value)].craft);
const disenchantGain = computed(() => craftingRatios[getRarityStr(cardLevel.value)].disenchant);
const canCraft = computed(() => (userStore.user?.dust || 0) >= craftCost.value);

async function handleCraft() { if (canCraft.value) await userStore.craftCard(props.card.id); }
async function handleDisenchant() { if (props.quantity > 0) await userStore.disenchantCard(props.card.id); }

// Holo effects
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash);
}
function sfc32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
const premiumSeed = computed(() => {
  const cardPart = props.card.id || props.card.name || '0';
  const userPart = userStore.user?.id || 'anon';
  return hashCode(`${cardPart}-${userPart}`);
});
const holoStyle = computed(() => {
  if (!props.isPremium) return {};
  const rng = sfc32(premiumSeed.value);
  if (state.premiumMode === 'image') return { '--c1': 'rgba(255, 255, 255, 0.7)', '--c2': 'rgba(200, 200, 200, 0.5)', '--c3': 'rgba(255, 255, 255, 0.8)' };
  return { '--c1': `hsla(${rng() * 360}, 100%, 70%, 0.6)`, '--c2': `hsla(${rng() * 360}, 100%, 70%, 0.6)`, '--c3': `hsla(${rng() * 360}, 100%, 70%, 0.6)` };
});
const holoFilterId = computed(() => `holo-pattern-${premiumSeed.value}`);
const holoFrequency = computed(() => {
  const rng = sfc32(premiumSeed.value + 42);
  const fineness = state.holoFineness || 0.05;
  const base = fineness * 0.4;
  const range = fineness * 1.6;
  return `${(base + rng() * range).toFixed(4)} ${(base + rng() * range).toFixed(4)}`;
});
const holoOctaves = computed(() => 2 + Math.floor(sfc32(premiumSeed.value + 99)() * 4));
</script>

<style scoped>
.zoom-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  cursor: pointer;
}

.zoom-card-container {
  display: flex;
  align-items: center;
  gap: 40px;
  cursor: default;
  position: relative;
  max-width: 90vw;
}

.zoom-card-info {
  color: white;
  max-width: 300px;
}

.zoom-card-info h2 {
  font-size: 2rem;
  margin: 0 0 0.5em;
  text-shadow: 0 0 15px rgba(255, 206, 0, 0.5);
}

.zoom-desc {
  font-style: italic;
  color: #bbb;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 1em;
}

.zoom-stats {
  display: flex;
  gap: 15px;
  font-size: 1.3rem;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 1em;
}

.zoom-meta {
  display: flex;
  gap: 15px;
  font-size: 0.9rem;
  color: #aaa;
  flex-wrap: wrap;
}

.zoom-premium-badge {
  color: #ffce00;
  font-weight: bold;
  text-shadow: 0 0 8px rgba(255, 206, 0, 0.6);
}

.zoom-close {
  position: absolute;
  top: -20px;
  right: -20px;
  background: rgba(255, 0, 85, 0.8);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.zoom-close:hover {
  background: #ff0055;
  transform: scale(1.1);
}

.zoom-fade-enter-active   { transition: all 0.3s ease-out; }
.zoom-fade-leave-active    { transition: all 0.2s ease-in; }
.zoom-fade-enter-from      { opacity: 0; transform: scale(0.8); }
.zoom-fade-leave-to        { opacity: 0; transform: scale(0.9); }

/* Global-like styles for teleported content */
.tt-card-zoom-wrapper { 
  width: min(350px, 70vw); 
  font-size: 24px; 
  aspect-ratio: 2.5 / 3.5; 
  position: relative; 
}

.zoom-card-inner {
  width: 100%; height: 100%; position: relative; border-radius: 8px;
  overflow: hidden; background: #1a1a2e; border: 2px solid #333; box-sizing: border-box;
}

.rarity-common .zoom-card-inner  { border-color: var(--border-color, #a0a0a0); }
.rarity-uncommon .zoom-card-inner { border-color: var(--border-color, #4caf50); box-shadow: 0 0 8px var(--border-glow, rgba(76, 175, 80, 0.3)); }
.rarity-rare .zoom-card-inner     { border-color: var(--border-color, #2196f3); box-shadow: 0 0 10px var(--border-glow, rgba(33, 150, 243, 0.4)); }
.rarity-epic .zoom-card-inner     { border-color: var(--border-color, #9c27b0); box-shadow: 0 0 12px var(--border-glow, rgba(156, 39, 176, 0.5)); }
.rarity-legendary .zoom-card-inner { border-color: var(--border-color, #ffc107); box-shadow: 0 0 15px var(--border-glow, rgba(255, 193, 7, 0.6)), 0 0 30px var(--border-glow, rgba(255, 193, 7, 0.2)); }

.is-premium .zoom-card-inner {
  overflow: visible !important;
  border-color: transparent !important;
}

.premium-border-layer {
  position: absolute;
  top: var(--card-border-offset, -2px); 
  left: var(--card-border-offset, -2px); 
  right: var(--card-border-offset, -2px); 
  bottom: var(--card-border-offset, -2px);
  box-sizing: border-box;
  border-radius: inherit;
  border: var(--card-border-width, 2px) solid transparent;
  background: var(--premium-border-gradient, linear-gradient(135deg, var(--border-color, #ffc107), transparent, var(--border-color, #ffc107)) border-box);
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  background-size: 400% 400%;
  animation: rainbowBorder 4s linear infinite;
  box-shadow: 0 0 15px var(--premium-border-glow, rgba(255, 206, 0, 0.4));
  pointer-events: none;
  z-index: 6;
}

@keyframes rainbowBorder {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.holo-container {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  z-index: 5;
  pointer-events: none;
}

.holo-gradient {
  width: 100%;
  height: 100%;
  background-image: linear-gradient(
    115deg,
    transparent 5%,
    var(--c1) 15%,
    transparent 28%,
    var(--c2) 35%,
    transparent 45%,
    var(--c3) 55%,
    transparent 65%,
    var(--c1) 75%,
    transparent 85%,
    var(--c2) 95%,
    transparent 100%
  );
  background-size: 300% 300%;
  background-position: 50% 50%;
  opacity: 0.8;
}

.glare {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  mix-blend-mode: overlay;
  z-index: 5;
  pointer-events: none;
}

.card-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.7; z-index: 1; }

.card-name-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.85));
  color: white; font-size: 1.1em; font-weight: bold;
  padding: 2.5em 0.5em 0.4em; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  z-index: 3; text-shadow: 0 1px 3px black;
}

.card-stats-cross { position: absolute; top: 0.3em; left: 0.3em; width: 5em; height: 5em; z-index: 4; }
.stat { position: absolute; color: #ffd700; font-weight: bold; font-size: 1.3em; text-shadow: 0 1px 3px black, 0 0 6px rgba(0,0,0,0.8); line-height: 1; }
.stat-top    { top: 0; left: 50%; transform: translateX(-50%); }
.stat-bottom { bottom: 0; left: 50%; transform: translateX(-50%); }
.stat-left   { top: 50%; left: 0; transform: translateY(-50%); }
.stat-right  { top: 50%; right: 0; transform: translateY(-50%); }

.card-elements { position: absolute; top: 10%; bottom: 8%; right: 5%; display: flex; flex-direction: column-reverse; flex-wrap: wrap-reverse; align-content: flex-end; justify-content: flex-start; gap: 0.3em; z-index: 4; }
.element-icon { width: 1.5em; height: 1.5em; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8)); }

.zoom-ownership {
  margin: 1.5rem 0;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  display: inline-block;
}
.ownership-status.owned { color: #4caf50; font-weight: bold; }
.ownership-status.unowned { color: #ff5252; opacity: 0.8; }

.zoom-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 1.5rem;
}
.zoom-action-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1.2rem;
  border-radius: 6px;
  border: none;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
  min-width: 220px;
}
.zoom-action-btn.craft { background: #1976d2; }
.zoom-action-btn.craft:hover:not(:disabled) { background: #2196f3; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4); }
.zoom-action-btn.craft:disabled { background: #444; color: #888; cursor: not-allowed; }

.zoom-action-btn.disenchant { background: #c62828; }
.zoom-action-btn.disenchant:hover { background: #f44336; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4); }

.cost, .gain { font-size: 0.85em; opacity: 0.9; margin-left: 10px; }

.zoom-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 20px;
  background: rgba(0, 0, 0, 0.3);
  padding: 10px 15px;
  border-radius: 6px;
  border: 1px solid rgba(255, 215, 0, 0.2);
}
</style>
