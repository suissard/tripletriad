<template>
  <div 
    ref="containerRef"
    class="tt-card" 
    :class="[
      sizeClass, 
      rarityClass,
      { 
        'is-unowned': unowned, 
        'is-selected': selected, 
        'is-cover': isCover, 
        'is-premium': isPremiumCard,
        'is-flat': flat
      }
    ]"
    :style="cardStyle"
    @click="handleClick"
    @mousedown="startLongPress"
    @mouseup="cancelLongPress"
    @mouseleave="cancelLongPress"
    @mousemove="handleMove"
    @touchstart="onTouchStart"
    @touchmove="handleMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <div class="tt-card-inner" :style="!flat ? innerStyle : {}">

      <!-- Premium Glare/Holo -->
      <template v-if="isPremiumCard && !flat">
        <!-- Per-card SVG filter for unique holo texture -->
        <svg width="0" height="0" style="position:absolute">
          <filter :id="holoFilterId" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" :baseFrequency="holoFrequency" :numOctaves="holoOctaves" :seed="premiumSeed" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
            <feBlend in="SourceGraphic" in2="mono" mode="color-burn" />
          </filter>
        </svg>
        <div class="glare" :style="glareStyle"></div>
        <div class="holo-container" :style="holoStyle">
          <div class="holo-gradient" :style="{ filter: holoFilterUrl }"></div>
        </div>
      </template>

      <!-- CARD CONTENT (Unified layout) -->
      <template v-if="!showDetails">
        <!-- Card image -->
        <img v-if="card.img" :src="card.img" class="card-img" :alt="card.name" />

        <!-- Name bar -->
        <div class="card-name-bar">{{ card.name }}</div>

        <!-- Stats cross -->
        <div class="card-stats-cross">
          <span class="stat stat-top">{{ card.topValue }}</span>
          <span class="stat stat-left">{{ card.leftValue }}</span>
          <span class="stat stat-right">{{ card.rightValue }}</span>
          <span class="stat stat-bottom">{{ card.bottomValue }}</span>
        </div>

        <!-- Level stars -->
        <div class="card-level-stars" v-if="card.level">
          <span class="star" v-for="n in Math.min(card.level, 10)" :key="n">★</span>
        </div>

        <!-- Element badge -->
        <div class="card-element" v-if="card.element && card.element !== 'None'">
          {{ elementEmoji }}
        </div>

        <!-- Quantity badge -->
        <div class="quantity-badge" v-if="quantity >= 1">×{{ quantity }}</div>

        <!-- Selected check -->
        <div class="selected-overlay" v-if="selected">✓</div>

        <!-- Cover badge -->
        <div class="cover-badge" v-if="isCover">★</div>

        <!-- Unowned lock -->
        <div class="unowned-overlay" v-if="unowned">🔒</div>
      </template>

      <!-- DETAIL MODE -->
      <template v-else>
        <h3 class="detail-name">{{ card.name }}</h3>
        <div class="detail-level">Niveau {{ card.level }}</div>
        <div class="detail-element" v-if="card.element && card.element !== 'None'">Élément : {{ card.element }}</div>
        <div class="detail-img-container">
          <img :src="card.img" class="detail-img" alt="Card Art" />
          <div class="detail-stats-cross">
            <div class="stat top">{{ card.topValue }}</div>
            <div class="stat right">{{ card.rightValue }}</div>
            <div class="stat bottom">{{ card.bottomValue }}</div>
            <div class="stat left">{{ card.leftValue }}</div>
          </div>
        </div>
        <p class="detail-desc" v-if="card.description">{{ card.description }}</p>
        <div class="detail-status" v-if="unowned">🔒 Non possédée</div>
        <div class="detail-status owned" v-else>✅ Possédée ({{ quantity }})</div>

        <!-- Crafting UI -->
        <div class="crafting-controls">
          <button class="craft-btn" @click.stop="handleCraft" :disabled="!canCraft">
            Créer (-{{ craftCost }} ✨)
          </button>
          <button class="disenchant-btn" @click.stop="handleDisenchant" v-if="!unowned && quantity > 0">
            Désenchanter (+{{ disenchantGain }} ✨)
          </button>
        </div>
      </template>

      <!-- Premium Border Animation -->
      <div v-if="isPremiumCard" class="premium-border-layer"></div>
    </div>
    
    <!-- Traveling light border for premium (outside tt-card-inner, behind it) -->
    <div v-if="isPremiumCard" class="premium-travel-border" :style="{ '--rarity-color': rarityColor, ...(!flat ? innerStyle : {}) }"></div>
  </div>

  <!-- FULLSCREEN ZOOM OVERLAY -->
  <Teleport to="body">
    <Transition name="zoom-fade">
      <div v-if="isZoomed" class="zoom-overlay" @click="isZoomed = false">
        <div class="zoom-card-container" @click.stop>
          <div class="tt-card card-size-zoom" :class="[rarityClass, { 'is-premium': isPremiumCard }]">
            <div class="tt-card-inner">
              <template v-if="isPremiumCard">
                <div class="premium-border-layer"></div>
              </template>
              <img v-if="card.img" :src="card.img" class="card-img" :alt="card.name" />
              <div class="card-name-bar">{{ card.name }}</div>
              <div class="card-stats-cross">
                <span class="stat stat-top">{{ card.topValue }}</span>
                <span class="stat stat-left">{{ card.leftValue }}</span>
                <span class="stat stat-right">{{ card.rightValue }}</span>
                <span class="stat stat-bottom">{{ card.bottomValue }}</span>
              </div>
              <div class="card-level-stars" v-if="card.level">
                <span class="star" v-for="n in Math.min(card.level, 10)" :key="n">★</span>
              </div>
              <div class="card-element" v-if="card.element && card.element !== 'None'">{{ elementEmoji }}</div>
            </div>
          </div>
          <div class="zoom-card-info">
            <h2>{{ card.name }}</h2>
            <p v-if="card.description" class="zoom-desc">{{ card.description }}</p>
            <div class="zoom-stats">
              <span>⬆ {{ card.topValue }}</span>
              <span>➡ {{ card.rightValue }}</span>
              <span>⬇ {{ card.bottomValue }}</span>
              <span>⬅ {{ card.leftValue }}</span>
            </div>
            <div class="zoom-meta">
              <span>Niveau {{ card.level }}</span>
              <span v-if="card.element && card.element !== 'None'">{{ elementEmoji }} {{ card.element }}</span>
              <span v-if="isPremiumCard" class="zoom-premium-badge">🌟 PREMIUM</span>
            </div>
          </div>
          <button class="zoom-close" @click="isZoomed = false">✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>


<script setup>
import { computed, ref } from 'vue';
import { state, craftCard, disenchantCard } from '../game/state.js';

const props = defineProps({
  card: { type: Object, required: true },
  size: { type: String, default: 'md', validator: v => ['xs', 'sm', 'md', 'lg', 'xl'].includes(v) },
  flat: { type: Boolean, default: false },
  unowned: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  isCover: { type: Boolean, default: false },
  quantity: { type: Number, default: 0 },
  showDetails: { type: Boolean, default: false },
  borderColor: { type: String, default: '' }
});

// --- Long Press / Zoom ---
const isZoomed = ref(false);
const longPressTimer = ref(null);
const longPressTriggered = ref(false);

const emit = defineEmits(['click', 'set-cover']);

function startLongPress() {
  longPressTriggered.value = false;
  longPressTimer.value = setTimeout(() => {
    longPressTriggered.value = true;
    isZoomed.value = true;
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
  startLongPress();
  handleMove(e);
}

function onTouchEnd() {
  cancelLongPress();
}

function handleClick() {
  if (longPressTriggered.value) {
    longPressTriggered.value = false;
    return; // Don't emit click if it was a long press
  }
  emit('click', props.card);
}

// --- Computed ---
const isPremiumCard = computed(() => props.isPremium || props.card.isPremium || props.card.isDrawnPremium);
const sizeClass = computed(() => `card-size-${props.size}`);

const rarityClass = computed(() => {
  const level = props.card.level || 1;
  if (level >= 9) return 'rarity-legendary';
  if (level >= 7) return 'rarity-epic';
  if (level >= 5) return 'rarity-rare';
  if (level >= 3) return 'rarity-uncommon';
  return 'rarity-common';
});

const rarityColor = computed(() => {
  if (props.borderColor) return props.borderColor;
  const level = props.card.level || 1;
  if (level >= 9) return '#ffc107';
  if (level >= 7) return '#9c27b0';
  if (level >= 5) return '#2196f3';
  if (level >= 3) return '#4caf50';
  return '#a0a0a0';
});

const cardStyle = computed(() => {
  const style = {};
  if (isPremiumCard.value && !props.flat) Object.assign(style, mouseStyle.value);
  if (props.borderColor) style['--border-color'] = props.borderColor;
  return style;
});

const elementEmoji = computed(() => {
  const map = { Fire: '🔥', Ice: '❄️', Thunder: '⚡', Earth: '🌍', Poison: '☠️', Wind: '🌪️', Water: '💧', Holy: '✨' };
  return map[props.card.element] || '';
});

// --- CRAFTING ---
const getRarity = (level) => {
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

const craftCost = computed(() => craftingRatios[getRarity(props.card.level || 1)].craft);
const disenchantGain = computed(() => craftingRatios[getRarity(props.card.level || 1)].disenchant);
const canCraft = computed(() => state.user.dust >= craftCost.value);

async function handleCraft() { if (canCraft.value) await craftCard(props.card.id); }
async function handleDisenchant() { if (props.quantity > 0) await disenchantCard(props.card.id); }

// --- 3D TILT ---
const containerRef = ref(null);
const isActive = ref(false);
const tilt = ref({ x: 0, y: 0 });
const mousePos = ref({ x: 50, y: 50 });

const innerStyle = computed(() => ({
  transform: `rotateX(${tilt.value.x}deg) rotateY(${tilt.value.y}deg)`,
  transition: tilt.value.x === 0 && tilt.value.y === 0 ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'
}));

const glareStyle = computed(() => ({
  background: `radial-gradient(circle at ${mousePos.value.x}% ${mousePos.value.y}%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 60%)`,
  opacity: tilt.value.x === 0 && tilt.value.y === 0 ? 0 : 0.6,
  transition: tilt.value.x === 0 && tilt.value.y === 0 ? 'opacity 0.5s ease-out' : 'opacity 0.1s ease-out'
}));

const mouseStyle = ref({ '--mx': '50%', '--my': '50%', '--posx': '50%', '--posy': '50%' });

// --- HOLO ---
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
  const userPart = state.user?.id || 'anon';
  return hashCode(`${cardPart}-${userPart}`);
});

const holoStyle = computed(() => {
  if (!isPremiumCard.value) return {};
  const rng = sfc32(premiumSeed.value);
  const isImageMode = state.premiumMode === 'image';
  if (isImageMode) {
    return { '--c1': 'rgba(255, 255, 255, 0.7)', '--c2': 'rgba(200, 200, 200, 0.5)', '--c3': 'rgba(255, 255, 255, 0.8)' };
  }
  return {
    '--c1': `hsla(${rng() * 360}, 100%, 70%, 0.6)`,
    '--c2': `hsla(${rng() * 360}, 100%, 70%, 0.6)`,
    '--c3': `hsla(${rng() * 360}, 100%, 70%, 0.6)`
  };
});

// Unique SVG filter per card
const holoFilterId = computed(() => `holo-pattern-${premiumSeed.value}`);
const holoFilterUrl = computed(() => `url(#${holoFilterId.value})`);

// Vary texture params from seed
const holoFrequency = computed(() => {
  const rng = sfc32(premiumSeed.value + 42);
  const fineness = state.holoFineness || 0.05;
  const base = fineness * 0.4;
  const range = fineness * 1.6;
  const f = (base + rng() * range).toFixed(4);
  const f2 = (base + rng() * range).toFixed(4);
  return `${f} ${f2}`;
});
const holoOctaves = computed(() => {
  const rng = sfc32(premiumSeed.value + 99);
  return 2 + Math.floor(rng() * 4); // 2-5 octaves
});

function handleMove(e) {
  if (props.flat || !isPremiumCard.value) return;
  isActive.value = true;
  const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
  const el = containerRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = clientX - rect.left, y = clientY - rect.top;
  const xPct = (x / rect.width) * 100, yPct = (y / rect.height) * 100;
  mousePos.value = { x: xPct, y: yPct };
  tilt.value = { x: ((y / rect.height) - 0.5) * -30, y: ((x / rect.width) - 0.5) * 30 };
  mouseStyle.value = { '--mx': `${xPct}%`, '--my': `${yPct}%`, '--posx': `${100 - xPct}%`, '--posy': `${100 - yPct}%` };
}

function handleLeave() {
  if (props.flat || !isPremiumCard.value) return;
  isActive.value = false;
  tilt.value = { x: 0, y: 0 };
  mousePos.value = { x: 50, y: 50 };
  mouseStyle.value = { '--mx': '50%', '--my': '50%', '--posx': '50%', '--posy': '50%' };
}
</script>

<style scoped>
/* ============================================ */
/*  BASE                                        */
/* ============================================ */
.tt-card {
  position: relative;
  aspect-ratio: 2.5 / 3.5;
  border-radius: 8px;
  overflow: visible;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.tt-card:hover:not(.is-flat) {
  transform: translateY(-4px) scale(1.03);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6);
  z-index: 5;
}

.tt-card.is-premium:not(.is-flat) {
  perspective: 1000px;
}

.tt-card-inner {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
  transform-style: preserve-3d;
  border-radius: inherit;
  overflow: hidden;
  background: #1a1a2e;
  border: 2px solid #333;
  box-sizing: border-box;
}

/* ============================================ */
/*  SIZES                                       */
/* ============================================ */
.card-size-xs { width: 70px; font-size: 7px; }
.card-size-sm { width: 100px; font-size: 9px; }
.card-size-md { width: 150px; font-size: 12px; }
.card-size-lg { width: 180px; font-size: 14px; }
.card-size-xl { width: 350px; font-size: 20px; }

/* ============================================ */
/*  CARD CONTENT                                */
/* ============================================ */
.card-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.7;
  z-index: 1;
}

.card-name-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.85));
  color: white;
  font-size: 1.1em;
  font-weight: bold;
  padding: 2.5em 0.5em 0.4em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 3;
  text-shadow: 0 1px 3px black;
}

/* Stats cross overlay */
.card-stats-cross {
  position: absolute;
  top: 0.3em;
  left: 0.3em;
  width: 5em;
  height: 5em;
  z-index: 4;
}

.stat {
  position: absolute;
  color: #ffd700;
  font-weight: bold;
  font-size: 1.3em;
  text-shadow: 0 1px 3px black, 0 0 6px rgba(0,0,0,0.8);
  line-height: 1;
}

.stat-top    { top: 0;     left: 50%;  transform: translateX(-50%); }
.stat-bottom { bottom: 0;  left: 50%;  transform: translateX(-50%); }
.stat-left   { top: 50%;   left: 0;    transform: translateY(-50%); }
.stat-right  { top: 50%;   right: 0;   transform: translateY(-50%); }

/* Level stars */
.card-level-stars {
  position: absolute;
  top: 0.3em;
  right: 0.3em;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0;
  max-width: 4em;
  z-index: 4;
}

.star {
  color: gold;
  font-size: 0.8em;
  text-shadow: 0 0 3px rgba(0,0,0,0.8);
  line-height: 1;
}

/* Element badge */
.card-element {
  position: absolute;
  bottom: 3em;
  right: 0.4em;
  font-size: 1.4em;
  z-index: 4;
  filter: drop-shadow(0 1px 2px black);
}

/* Quantity badge */
.quantity-badge {
  position: absolute;
  top: 0.2em;
  right: 0.2em;
  background: #ff0055;
  color: white;
  font-size: 0.9em;
  font-weight: bold;
  padding: 0.1em 0.5em;
  border-radius: 1em;
  z-index: 8;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5);
}

/* Selected overlay */
.selected-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 210, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3em;
  color: rgba(0, 210, 255, 0.9);
  font-weight: bold;
  z-index: 8;
  border-radius: inherit;
  text-shadow: 0 0 10px rgba(0,0,0,0.8);
}

/* Cover badge */
.cover-badge {
  position: absolute;
  top: 0.3em;
  left: 50%;
  transform: translateX(-50%);
  color: gold;
  font-size: 1.8em;
  text-shadow: 0 0 8px gold;
  z-index: 9;
}

/* Unowned lock */
.unowned-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5em;
  z-index: 10;
  border-radius: inherit;
}

/* ============================================ */
/*  RARITY                                      */
/* ============================================ */
.rarity-common .tt-card-inner  { border-color: var(--border-color, #a0a0a0); }
.rarity-uncommon .tt-card-inner { border-color: var(--border-color, #4caf50); box-shadow: 0 0 8px rgba(76, 175, 80, 0.3); }
.rarity-rare .tt-card-inner     { border-color: var(--border-color, #2196f3); box-shadow: 0 0 10px rgba(33, 150, 243, 0.4); }
.rarity-epic .tt-card-inner     { border-color: var(--border-color, #9c27b0); box-shadow: 0 0 12px rgba(156, 39, 176, 0.5); }
.rarity-legendary .tt-card-inner { border-color: var(--border-color, #ffc107); box-shadow: 0 0 15px rgba(255, 193, 7, 0.6), 0 0 30px rgba(255, 193, 7, 0.2); }

/* Premium rarity — traveling light border */
.is-premium .tt-card-inner {
  border-color: transparent !important;
}

.premium-travel-border {
  display: none;
  position: absolute;
  inset: -3px;
  border-radius: inherit;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.premium-travel-border::before {
  content: '';
  position: absolute;
  inset: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    transparent 260deg,
    var(--rarity-color, #ffc107) 290deg,
    white 310deg,
    var(--rarity-color, #ffc107) 330deg,
    transparent 360deg
  );
  animation: travelBorder 2.5s linear infinite;
}

@keyframes travelBorder {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.is-premium .premium-travel-border {
  display: block;
}

/* Selection border */
.is-selected .tt-card-inner { border-color: var(--border-color, #00d2ff); box-shadow: 0 0 12px rgba(0, 210, 255, 0.4); }
.is-cover .tt-card-inner    { border-color: var(--border-color, gold); box-shadow: 0 0 12px rgba(255, 215, 0, 0.5); }

/* ============================================ */
/*  PREMIUM                                     */
/* ============================================ */
.glare {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  mix-blend-mode: overlay;
  z-index: 5;
  pointer-events: none;
}

.holo-container {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  mix-blend-mode: color-dodge;
}

.holo-gradient {
  width: 100%;
  height: 100%;
  background-image: linear-gradient(
    var(--holo-angle, 115deg),
    transparent 5%,
    var(--c1) 15%,
    transparent 28%,
    var(--c2) 35%,
    transparent 45%,
    var(--c3) 55%,
    transparent 65%,
    var(--c4, var(--c1)) 75%,
    transparent 85%,
    var(--c5, var(--c2)) 95%,
    transparent 100%
  );
  background-size: var(--holo-bg-size, 300% 300%);
  background-position: var(--posx, 50%) var(--posy, 50%);
  opacity: 0.8;
}

.tt-card.is-premium:hover .holo-container { opacity: 1; }

.premium-border-layer {
  position: absolute;
  top: -3px; left: -3px; right: -3px; bottom: -3px;
  border-radius: inherit;
  border: 3px solid transparent;
  background: linear-gradient(135deg, #ffce00, #ff5722, #e91e63, #9c27b0, #00bcd4, #4caf50, #ffce00) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  background-size: 400% 400%;
  animation: rainbowBorder 4s linear infinite;
  box-shadow: 0 0 15px rgba(255, 206, 0, 0.4);
  pointer-events: none;
  z-index: 6;
}

@keyframes rainbowBorder {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* ============================================ */
/*  DETAIL MODE                                 */
/* ============================================ */
.card-size-xl.tt-card {
  aspect-ratio: auto;
  min-height: 500px;
}

.card-size-xl .tt-card-inner {
  overflow-y: auto;
}

.detail-name { font-size: 1.5em; margin: 0.5em 0 0.3em; color: white; text-align: center; }
.detail-level { font-size: 0.9em; color: #aaa; text-align: center; margin-bottom: 0.2em; }
.detail-element { font-size: 0.85em; color: #4caf50; text-align: center; margin-bottom: 0.8em; }

.detail-img-container {
  position: relative;
  width: 60%;
  aspect-ratio: 1;
  margin: 0 auto 1em auto;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 0.5em;
  box-sizing: border-box;
}

.detail-img { width: 100%; height: 100%; object-fit: contain; }

.detail-stats-cross {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.detail-stats-cross .stat {
  position: absolute;
  background: rgba(0,0,0,0.8);
  color: #ffc107;
  padding: 0.2em 0.5em;
  border-radius: 4px;
  font-size: 0.9em;
  border: 1px solid #ffc107;
}

.detail-stats-cross .top { top: 0.3em; left: 50%; transform: translateX(-50%); }
.detail-stats-cross .right { right: 0.3em; top: 50%; transform: translateY(-50%); }
.detail-stats-cross .bottom { bottom: 0.3em; left: 50%; transform: translateX(-50%); }
.detail-stats-cross .left { left: 0.3em; top: 50%; transform: translateY(-50%); }

.detail-desc { font-style: italic; color: #ccc; margin: 0 1em 1em; font-size: 0.7em; line-height: 1.5; text-align: center; }

.detail-status {
  font-weight: bold;
  padding: 0.5em;
  border-radius: 5px;
  background: rgba(255,0,0,0.2);
  border: 1px solid red;
  color: white;
  text-align: center;
  margin: 0 1em;
  font-size: 0.7em;
}

.detail-status.owned {
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid #4caf50;
  color: #4caf50;
}

.crafting-controls {
  margin: 0.8em 1em;
  display: flex;
  gap: 0.5em;
  justify-content: center;
}

.craft-btn, .disenchant-btn {
  padding: 0.4em 0.8em;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
  font-size: 0.6em;
}

.craft-btn { background: #2196f3; }
.craft-btn:hover:not(:disabled) { background: #1976d2; }
.craft-btn:disabled { background: #555; color: #888; cursor: not-allowed; }
.disenchant-btn { background: #f44336; }
.disenchant-btn:hover { background: #d32f2f; }
</style>

<!-- Unscoped styles for the Teleported zoom overlay -->
<style>
/* Zoom card size */
.card-size-zoom { width: min(350px, 70vw); font-size: 24px; aspect-ratio: 2.5 / 3.5; }

/* Card inner rendering for zoom (scoped styles don't apply in Teleport) */
.zoom-overlay .tt-card { border-radius: 8px; overflow: visible; position: relative; }
.zoom-overlay .tt-card-inner {
  width: 100%; height: 100%; position: relative; border-radius: inherit;
  overflow: hidden; background: #1a1a2e; border: 2px solid #333; box-sizing: border-box;
}
.zoom-overlay .card-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.7; z-index: 1; }
.zoom-overlay .card-name-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.85));
  color: white; font-size: 1.1em; font-weight: bold;
  padding: 2.5em 0.5em 0.4em; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  z-index: 3; text-shadow: 0 1px 3px black;
}
.zoom-overlay .card-stats-cross { position: absolute; top: 0.3em; left: 0.3em; width: 5em; height: 5em; z-index: 4; }
.zoom-overlay .stat { position: absolute; color: #ffd700; font-weight: bold; font-size: 1.3em; text-shadow: 0 1px 3px black, 0 0 6px rgba(0,0,0,0.8); line-height: 1; }
.zoom-overlay .stat-top    { top: 0; left: 50%; transform: translateX(-50%); }
.zoom-overlay .stat-bottom { bottom: 0; left: 50%; transform: translateX(-50%); }
.zoom-overlay .stat-left   { top: 50%; left: 0; transform: translateY(-50%); }
.zoom-overlay .stat-right  { top: 50%; right: 0; transform: translateY(-50%); }
.zoom-overlay .card-level-stars { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-wrap: wrap; justify-content: flex-end; max-width: 4em; z-index: 4; }
.zoom-overlay .star { color: gold; font-size: 0.8em; text-shadow: 0 0 3px rgba(0,0,0,0.8); line-height: 1; }
.zoom-overlay .card-element { position: absolute; bottom: 3em; right: 0.4em; font-size: 1.4em; z-index: 4; filter: drop-shadow(0 1px 2px black); }
/* Rarity borders in zoom */
.zoom-overlay .rarity-common .tt-card-inner  { border-color: #a0a0a0; }
.zoom-overlay .rarity-uncommon .tt-card-inner { border-color: #4caf50; box-shadow: 0 0 8px rgba(76, 175, 80, 0.3); }
.zoom-overlay .rarity-rare .tt-card-inner     { border-color: #2196f3; box-shadow: 0 0 10px rgba(33, 150, 243, 0.4); }
.zoom-overlay .rarity-epic .tt-card-inner     { border-color: #9c27b0; box-shadow: 0 0 12px rgba(156, 39, 176, 0.5); }
.zoom-overlay .rarity-legendary .tt-card-inner { border-color: #ffc107; box-shadow: 0 0 15px rgba(255, 193, 7, 0.6), 0 0 30px rgba(255, 193, 7, 0.2); }
/* Premium border in zoom */
.zoom-overlay .premium-border-layer {
  position: absolute; top: -3px; left: -3px; right: -3px; bottom: -3px;
  border-radius: inherit; border: 3px solid transparent;
  background: linear-gradient(135deg, #ffce00, #ff5722, #e91e63, #9c27b0, #00bcd4, #4caf50, #ffce00) border-box;
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask-composite: exclude; background-size: 400% 400%;
  animation: rainbowBorder 4s linear infinite; box-shadow: 0 0 15px rgba(255, 206, 0, 0.4);
  pointer-events: none; z-index: 6;
}

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

/* Transition */
.zoom-fade-enter-active   { transition: all 0.3s ease-out; }
.zoom-fade-leave-active    { transition: all 0.2s ease-in; }
.zoom-fade-enter-from      { opacity: 0; transform: scale(0.8); }
.zoom-fade-leave-to        { opacity: 0; transform: scale(0.9); }

/* Responsive */
@media (max-width: 768px) {
  .zoom-card-container {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  .zoom-card-info { max-width: 80vw; }
  .zoom-stats { justify-content: center; }
  .zoom-meta { justify-content: center; }
}
</style>
