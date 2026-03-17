<template>
  <div 
    ref="containerRef"
    class="tt-card" 
    :class="[
      rarityClass,
      { 
        'is-unowned': unowned, 
        'is-selected': selected, 
        'is-cover': isCover, 
        'is-premium': isPremiumCard,
        'is-flat': flat,
        'has-custom-border': !!borderColor,
        'is-flipping': isFlipping
      }
    ]"
    :style="cardStyle"
    @click="handleClick"
    @contextmenu.prevent="handleRightClick"
    @mousedown="startLongPress"
    @mouseup="cancelLongPress"
    @mouseleave="cancelLongPress"
    @mousemove="handleMove"
    @touchstart="onTouchStart"
    @touchmove="handleMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <div 
      class="tt-card-inner" 
      :class="{ 'is-flipped': faceDown }"
      :style="!flat ? innerStyle : { transform: faceDown ? 'rotateY(180deg)' : 'none' }"
    >
      <!-- FRONT SIDE -->
      <div class="tt-card-front">
        <!-- 3D Glare Layout -->
        <template v-if="!flat && isPremiumCard">
          <div class="glare" :style="glareStyle"></div>
        </template>

        <!-- Premium Holo Effect -->
        <template v-if="isPremiumCard && !flat">
          <!-- Per-card SVG filter for unique holo texture -->
          <svg width="0" height="0" style="position:absolute">
            <filter :id="holoFilterId" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
              <feTurbulence type="fractalNoise" :baseFrequency="holoFrequency" :numOctaves="holoOctaves" :seed="premiumSeed" result="noise" />
              <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
              <feBlend in="SourceGraphic" in2="mono" mode="color-burn" />
            </filter>
          </svg>
          <div class="holo-container" :style="holoStyle">
            <div class="holo-gradient" :style="{ filter: holoFilterUrl }"></div>
          </div>
        </template>

        <!-- CARD CONTENT (Unified layout) -->
        <template v-if="card.revealed !== false || $attrs.forceFace">
          <!-- Card image -->
          <img :src="card.imageUrl || `https://api.dicebear.com/9.x/bottts/png?seed=${(card.id || 0) * 42}&backgroundColor=transparent`" class="card-img" :alt="card.name" />

          <!-- Name bar -->
          <div class="card-name-bar">{{ card.name }}</div>

          <!-- Stats cross -->
          <div class="card-stats-cross">
            <span class="stat stat-top">{{ card.topValue }}</span>
            <span class="stat stat-left">{{ card.leftValue }}</span>
            <span class="stat stat-right">{{ card.rightValue }}</span>
            <span class="stat stat-bottom">{{ card.bottomValue }}</span>
          </div>

          <!-- Element badges -->
          <div class="card-elements" v-if="cardElementsList.length">
            <ElementIcon v-for="el in cardElementsList" :key="el" :element="el" :active="elementActive" class="element-icon" />
          </div>

          <!-- Selected check -->
          <div class="selected-overlay" v-if="selected">✓</div>

          <!-- Cover badge -->
          <div class="cover-badge" v-if="isCover">★</div>

          <!-- Unowned lock -->
          <div class="unowned-overlay" v-if="unowned">🔒</div>
        </template>

        <!-- BASE CARD FACE (Fallback revealed false) -->
        <template v-else>
          <AnimatedCardBack v-if="cardBack === 'animated'" class="card-back-img" /><img v-else src="/card-back.svg" class="card-back-img" alt="Card Back" />
          <!-- Unowned lock -->
          <div class="unowned-overlay" v-if="unowned">🔒</div>
        </template>
      </div>

      <!-- BACK SIDE -->
      <div class="tt-card-back">
        <AnimatedCardBack v-if="cardBack === 'animated'" class="card-back-img" /><img v-else src="/card-back.svg" class="card-back-img" alt="Card Back" />
        <!-- Unowned lock (show it on back too if unowned) -->
        <div class="unowned-overlay" v-if="unowned">🔒</div>
      </div>

      <!-- Premium Border Animation (Sibling of front/back, inside inner for 3D flip) -->
      <div v-if="isPremiumCard" class="premium-border-layer" :style="premiumBorderStyle"></div>
    </div>
    
    <!-- Traveling light border for premium (outside tt-card-inner, behind it) -->
    <div v-if="isPremiumCard" class="premium-travel-border" :style="{ '--rarity-color': borderColor || rarityColor, ...(!flat ? innerStyle : {}) }"></div>

    <!-- Quantity badge (outside inner to avoid clipping) -->
    <div class="quantity-badge" v-if="quantity >= 1" :style="!flat ? tiltStyle : {}">×{{ quantity }}</div>
  </div>

  <!-- FULLSCREEN ZOOM OVERLAY -->
  <Teleport to="body">
    <Transition name="zoom-fade">
      <div v-if="isZoomed" class="zoom-overlay" @click="isZoomed = false">
        <div class="zoom-card-container" @click.stop>
          <div class="tt-card-zoom-wrapper" :class="[rarityClass, { 'is-premium': isPremiumCard }]" :style="{ '--card-border-width': `${borderWidth * (SIZES.zoom / 150)}px`, '--card-border-offset': `-${borderWidth * (SIZES.zoom / 150)}px` }">
            <div class="zoom-card-inner">
              <template v-if="isPremiumCard">
                <svg width="0" height="0" style="position:absolute">
                  <filter :id="holoFilterId + '-zoom'" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
                    <feTurbulence type="fractalNoise" :baseFrequency="holoFrequency" :numOctaves="holoOctaves" :seed="premiumSeed" result="noise" />
                    <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
                    <feBlend in="SourceGraphic" in2="mono" mode="color-burn" />
                  </filter>
                </svg>
                <template v-if="isPremiumCard">
                  <div class="glare" :style="{ background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 60%)' }"></div>
                  <div class="holo-container" :style="[{ opacity: 1, mixBlendMode: 'color-dodge' }, holoStyle]">
                    <div class="holo-gradient" :style="{ filter: `url(#${holoFilterId}-zoom)` }"></div>
                  </div>
                  <div class="premium-border-layer" :style="premiumBorderStyle"></div>
                </template>
              </template>

              <!-- Card face (Always revealed in zoom) -->
              <img v-if="card.imageUrl || card.img" :src="card.imageUrl || card.img" class="card-img" :alt="card.name" />
              <div class="card-name-bar">{{ card.name }}</div>
              <div class="card-stats-cross">
                <span class="stat stat-top">{{ card.topValue }}</span>
                <span class="stat stat-left">{{ card.leftValue }}</span>
                <span class="stat stat-right">{{ card.rightValue }}</span>
                <span class="stat stat-bottom">{{ card.bottomValue }}</span>
              </div>
              <div class="card-elements" v-if="cardElementsList.length">
                <ElementIcon v-for="el in cardElementsList" :key="el" :element="el" :active="props.elementActive" class="element-icon" />
              </div>
            </div>
          </div>

          <div class="zoom-card-info">
            <h2>{{ card.name }}</h2>
            <div class="zoom-meta">
              <span>Niveau {{ cardLevel }}</span>
              <span v-if="cardElementsList.length">Éléments: {{ cardElementsList.join(', ') }}</span>
              <span v-if="card.faction && card.faction !== 'neutre'">Faction: {{ card.faction }}</span>
              <span v-if="isPremiumCard" class="zoom-premium-badge">🌟 PREMIUM</span>
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
          <button class="zoom-close" @click="isZoomed = false">✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>


<script setup>
import { computed, ref, useAttrs, watch } from "vue";
import AnimatedCardBack from "./AnimatedCardBack.vue";
import ElementIcon from "./ElementIcon.vue";
import { state } from '../game/state.js';
import { useUserStore } from '../stores/userStore.js';
import { GameEngine } from '../../../shared/GameEngine.ts';

const userStore = useUserStore();

const props = defineProps({
  card: { type: Object, required: true },
  size: { type: [String, Number], default: 'md' },
  ratio: { type: Number, default: 2.5 / 3.5 },
  ratioContent: { type: Number, default: 0.08 },
  flat: { type: Boolean, default: false },
  unowned: { type: Boolean, default: false },
  cardBack: { type: String, default: "default" },
  isPremium: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  isCover: { type: Boolean, default: false },
  quantity: { type: Number, default: 0 },
  borderColor: { type: String, default: '' },
  borderWidth: { type: Number, default: 2 },
  disableZoom: { type: Boolean, default: false },
  faceDown: { type: Boolean, default: false }
,
  elementActive: {
    type: Boolean,
    default: true
  }
});

const SIZES = {
  xs: 70,
  sm: 90,
  md: 150,
  lg: 180,
  xl: 350,
  zoom: 350
};

// --- Long Press / Zoom ---
const isZoomed = ref(false);
const isFlipping = ref(false);
const longPressTimer = ref(null);
const longPressTriggered = ref(false);

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
}

// --- Computed ---
const isPremiumCard = computed(() => {
  if (props.card.revealed === false) return false;
  return props.isPremium || props.card.isDrawnPremium;
});

const cardLevel = computed(() => {
  if (props.card.level) return props.card.level; // Fallback if still present in some data
  return GameEngine.calculateCardLevel({
    top: props.card.topValue,
    right: props.card.rightValue,
    bottom: props.card.bottomValue,
    left: props.card.leftValue
  });
});

const rarityClass = computed(() => {
  if (props.card.revealed === false) return 'rarity-common';
  if (props.card.rarity) return `rarity-${props.card.rarity.toLowerCase()}`;
  const level = cardLevel.value;
  if (level >= 9) return 'rarity-legendary';
  if (level >= 7) return 'rarity-epic';
  if (level >= 5) return 'rarity-rare';
  if (level >= 3) return 'rarity-uncommon';
  return 'rarity-common';
});

const rarityColor = computed(() => {
  if (props.borderColor) return props.borderColor;
  if (props.card.revealed === false) return '#a0a0a0';
  
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

const cardStyle = computed(() => {
  const width = typeof props.size === 'number' ? props.size : (SIZES[props.size] || 150);
  
  // Proportional border scaling: 150px (md) is the baseline (scale 1.0)
  const scale = width / 150;
  const effectiveBorderWidth = props.borderWidth * scale;

  const style = {
    width: `${width}px`,
    aspectRatio: props.ratio || (2.5 / 3.5),
    fontSize: `${width * props.ratioContent}px`
  };
  
  if (!props.flat) Object.assign(style, mouseStyle.value);
  if (props.borderColor) {
    style['--border-color'] = props.borderColor;
    style['--border-glow'] = props.borderColor;
  }
  style['--card-border-width'] = `${effectiveBorderWidth}px`;
  style['--card-border-offset'] = `-${effectiveBorderWidth}px`;
  return style;
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
  if (Array.isArray(elements)) {
    result = elements;
  } else if (typeof elements === 'string') {
    result = elements.split(',').map(e => e.trim());
  } else if (element && element !== 'None') {
    result = [element];
  }
  
  return [...new Set(result)].filter(e => e && e !== 'None');
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

const craftCost = computed(() => craftingRatios[getRarity(cardLevel.value)].craft);
const disenchantGain = computed(() => craftingRatios[getRarity(cardLevel.value)].disenchant);
const canCraft = computed(() => (userStore.user?.dust || 0) >= craftCost.value);

async function handleCraft() { if (canCraft.value) await userStore.craftCard(props.card.id); }
async function handleDisenchant() { if (props.quantity > 0) await userStore.disenchantCard(props.card.id); }

// --- 3D TILT ---
const containerRef = ref(null);
const isActive = ref(false);
const tilt = ref({ x: 0, y: 0 });
const mousePos = ref({ x: 50, y: 50 });

const tiltStyle = computed(() => ({
  transform: `rotateX(${tilt.value.x}deg) rotateY(${tilt.value.y}deg)`,
  transition: (tilt.value.x === 0 && tilt.value.y === 0) ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'
}));

const innerStyle = computed(() => {
  const rotationY = tilt.value.y + (props.faceDown ? 180 : 0);
  return {
    transform: `rotateX(${tilt.value.x}deg) rotateY(${rotationY}deg)`,
    transition: (tilt.value.x === 0 && tilt.value.y === 0) ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.1s ease-out'
  };
});

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
  const userPart = userStore.user?.id || 'anon';
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
  if (props.flat) return;
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
  if (props.flat) return;
  isActive.value = false;
  tilt.value = { x: 0, y: 0 };
  mousePos.value = { x: 50, y: 50 };
  mouseStyle.value = { '--mx': '50%', '--my': '50%', '--posx': '50%', '--posy': '50%' };
}

// --- Capture Flip Animation ---
watch(() => props.borderColor, (newVal, oldVal) => {
  if (oldVal && newVal !== oldVal) {
    isFlipping.value = true;
    setTimeout(() => {
      isFlipping.value = false;
    }, 600);
  }
});
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
  z-index: 5;
}

.tt-card:active:not(.is-flat) {
  transform: translateY(-4px) scale(1.01);
}

.tt-card:not(.is-flat) {
  perspective: 1000px;
}

.tt-card-inner {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
  transform-style: preserve-3d;
  border-radius: inherit;
  /* overflow: hidden; */ /* Removing absolute overflow to allow 3D backfaces */
  background: #1a1a2e;
  border: var(--card-border-width, 2px) solid #333;
  box-sizing: border-box;
  transition: border-color 0.3s ease, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Ensure children are clipped only on their own side if needed */
.tt-card-front, .tt-card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: inherit;
  overflow: hidden; /* Local overflow for each side */
  display: flex;
  flex-direction: column;
}

.tt-card-back {
  transform: rotateY(180deg);
  background: #1a1a2e;
  border: inherit;
}

.card-back-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.9;
}

.tt-card.is-flipping .tt-card-inner {
  animation: flip-360 0.6s cubic-bezier(0.45, 0.05, 0.55, 0.95);
}

@keyframes flip-360 {
  0% { transform: rotateY(0deg); filter: brightness(1); }
  50% { transform: rotateY(180deg); filter: brightness(2); }
  100% { transform: rotateY(360deg); filter: brightness(1); }
}

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
  font-size: 1.6em;
  text-shadow: 0 1px 3px black, 0 0 8px rgba(0,0,0,0.9);
  line-height: 1;
}

.stat-top    { top: 0;     left: 50%;  transform: translateX(-50%); }
.stat-bottom { bottom: 0;  left: 50%;  transform: translateX(-50%); }
.stat-left   { top: 50%;   left: 0;    transform: translateY(-50%); }
.stat-right  { top: 50%;   right: 0;   transform: translateY(-50%); }

/* Element badges */
.card-elements {
  position: absolute;
  top: 10%;
  bottom: 18%; /* Increased from 8% to avoid overlap with name bar */
  right: 5%;
  display: flex;
  flex-direction: column-reverse; /* Start from bottom */
  flex-wrap: wrap-reverse; /* Wrap towards the left */
  align-content: flex-end; /* Align columns to the right */
  justify-content: flex-start; /* Align items to the bottom (because of column-reverse) */
  gap: 0.3em;
  z-index: 10;
}

.element-icon {
  width: 1.5em;
  height: 1.5em;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));
}

/* Quantity badge */
.quantity-badge {
  position: absolute;
  top: -0.6em;
  right: -0.6em;
  background: #ff0055;
  color: white;
  font-size: 0.95em;
  font-weight: bold;
  padding: 0.2em 0.6em;
  border-radius: 1em;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,255,255,0.2);
}

/* Selected overlay */
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
.rarity-uncommon .tt-card-inner { border-color: var(--border-color, #4caf50); box-shadow: 0 0 8px var(--border-glow, rgba(76, 175, 80, 0.3)); }
.rarity-rare .tt-card-inner     { border-color: var(--border-color, #2196f3); box-shadow: 0 0 10px var(--border-glow, rgba(33, 150, 243, 0.4)); }
.rarity-epic .tt-card-inner     { border-color: var(--border-color, #9c27b0); box-shadow: 0 0 12px var(--border-glow, rgba(156, 39, 176, 0.5)); }
.rarity-legendary .tt-card-inner { border-color: var(--border-color, #ffc107); box-shadow: 0 0 15px var(--border-glow, rgba(255, 193, 7, 0.6)), 0 0 30px var(--border-glow, rgba(255, 193, 7, 0.2)); }

/* Premium rarity — traveling light border */
.is-premium .tt-card-inner {
  border-color: transparent !important;
  overflow: visible !important;
}

.premium-travel-border {
  display: none;
  position: absolute;
  inset: 0;
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
    var(--rarity-color, white) 310deg,
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
  top: var(--card-border-offset, -2px); 
  left: var(--card-border-offset, -2px); 
  right: var(--card-border-offset, -2px); 
  bottom: var(--card-border-offset, -2px);
  box-sizing: border-box;
  border-radius: inherit;
  border: var(--card-border-width, 2px) solid transparent;
  backface-visibility: hidden;
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
.card-size-xl.is-premium .tt-card-inner {
  overflow: visible !important;
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

/* Unscoped styles for the Teleported zoom overlay */
<style>
/* Zoom card size */
.card-size-zoom { width: min(350px, 70vw); font-size: 24px; aspect-ratio: 2.5 / 3.5; }

/* Card inner rendering for zoom (scoped styles don't apply in Teleport) */
.zoom-overlay .tt-card { border-radius: 8px; overflow: visible; position: relative; }
.zoom-overlay .tt-card-inner {
  width: 100%; height: 100%; position: relative; border-radius: inherit;
  overflow: hidden; background: #1a1a2e; border: 2px solid #333; box-sizing: border-box;
}

/* Premium Zoom Effect Styles */
.zoom-overlay .premium-border-layer {
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
  box-shadow: 0 0 15px rgba(255, 206, 0, 0.4);
  pointer-events: none;
  z-index: 6;
}

.zoom-overlay .holo-container {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  z-index: 5;
  pointer-events: none;
}

.zoom-overlay .holo-gradient {
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

.zoom-overlay .glare {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  mix-blend-mode: overlay;
  z-index: 5;
  pointer-events: none;
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
.zoom-overlay .card-elements { position: absolute; top: 10%; bottom: 18%; right: 5%; display: flex; flex-direction: column-reverse; flex-wrap: wrap-reverse; align-content: flex-end; justify-content: flex-start; gap: 0.3em; z-index: 4; }
.zoom-overlay .element-icon { width: 1.5em; height: 1.5em; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8)); }
/* Rarity borders in zoom */
.zoom-overlay .rarity-common .tt-card-inner  { border-color: var(--border-color, #a0a0a0); }
.zoom-overlay .rarity-uncommon .tt-card-inner { border-color: var(--border-color, #4caf50); box-shadow: 0 0 8px var(--border-glow, rgba(76, 175, 80, 0.3)); }
.zoom-overlay .rarity-rare .tt-card-inner     { border-color: var(--border-color, #2196f3); box-shadow: 0 0 10px var(--border-glow, rgba(33, 150, 243, 0.4)); }
.zoom-overlay .rarity-epic .tt-card-inner     { border-color: var(--border-color, #9c27b0); box-shadow: 0 0 12px var(--border-glow, rgba(156, 39, 176, 0.5)); }
.zoom-overlay .rarity-legendary .tt-card-inner { border-color: var(--border-color, #ffc107); box-shadow: 0 0 15px var(--border-glow, rgba(255, 193, 7, 0.6)), 0 0 30px var(--border-glow, rgba(255, 193, 7, 0.2)); }
/* Premium border in zoom */
.zoom-overlay .premium-border-layer {
  position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px;
  box-sizing: border-box;
  border-radius: inherit; border: 2px solid transparent;
  background: var(--premium-border-gradient, linear-gradient(135deg, var(--border-color, #ffc107), transparent, var(--border-color, #ffc107)) border-box);
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask-composite: exclude; background-size: 400% 400%;
  animation: rainbowBorder 4s linear infinite; box-shadow: 0 0 15px var(--premium-border-glow, rgba(255, 206, 0, 0.4));
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
</style>

<!-- Unscoped styles for the Teleported zoom overlay -->
<style>
@keyframes rainbowBorder {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Zoom card size */
.card-size-zoom { width: min(350px, 70vw); font-size: 24px; aspect-ratio: 2.5 / 3.5; }

/* Card inner rendering for zoom (scoped styles don't apply in Teleport) */
.zoom-overlay .tt-card-zoom-wrapper { width: min(350px, 70vw); font-size: 24px; aspect-ratio: 2.5 / 3.5; position: relative; }
.zoom-overlay .zoom-card-inner {
  width: 100%; height: 100%; position: relative; border-radius: 8px;
  overflow: hidden; background: #1a1a2e; border: 2px solid #333; box-sizing: border-box;
}
.zoom-overlay .is-premium .zoom-card-inner {
  overflow: visible !important;
  border-color: transparent !important;
}

/* Premium Zoom Effect Styles */
.zoom-overlay .premium-border-layer {
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

.zoom-overlay .holo-container {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  z-index: 5;
  pointer-events: none;
}

.zoom-overlay .holo-gradient {
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

.zoom-overlay .glare {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  mix-blend-mode: overlay;
  z-index: 5;
  pointer-events: none;
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
.zoom-overlay .card-elements { position: absolute; top: 10%; bottom: 8%; right: 5%; display: flex; flex-direction: column-reverse; flex-wrap: wrap-reverse; align-content: flex-end; justify-content: flex-start; gap: 0.3em; z-index: 4; }
.zoom-overlay .element-icon { width: 1.5em; height: 1.5em; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8)); }

/* ACTIONS & OWNERSHIP */
.zoom-overlay .zoom-ownership {
  margin: 1.5rem 0;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  display: inline-block;
}
.zoom-overlay .ownership-status.owned { color: #4caf50; font-weight: bold; }
.zoom-overlay .ownership-status.unowned { color: #ff5252; opacity: 0.8; }

.zoom-overlay .zoom-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 1.5rem;
}
.zoom-overlay .zoom-action-btn {
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
.zoom-overlay .zoom-action-btn.craft { background: #1976d2; }
.zoom-overlay .zoom-action-btn.craft:hover:not(:disabled) { background: #2196f3; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4); }
.zoom-overlay .zoom-action-btn.craft:disabled { background: #444; color: #888; cursor: not-allowed; }

.zoom-overlay .zoom-action-btn.disenchant { background: #c62828; }
.zoom-overlay .zoom-action-btn.disenchant:hover { background: #f44336; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4); }

.zoom-overlay .cost, .zoom-overlay .gain { font-size: 0.85em; opacity: 0.9; margin-left: 10px; }

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
