<template>
  <div 
    ref="containerRef"
    class="triple-triad-card" 
    :class="[
      variantClass, 
      rarityClass, 
      { locked: isLocked, selected: isSelected, iscover: isCover, 'is-premium': card.isPremium, 'premium-active': isActive }
    ]"
    :style="card.isPremium ? mouseStyle : {}"
    @click="$emit('click', card)"
    @mousemove="handleMove"
    @mouseleave="handleLeave"
    @touchstart="handleMove"
    @touchmove="handleMove"
    @touchend="handleLeave"
    @touchcancel="handleLeave"
  >

    <!-- Premium Elements -->
    <template v-if="card.isPremium">
      <div class="holo-container" :style="holoStyle">
        <div class="holo-gradient"></div>
      </div>
      <div class="glare"></div>
    </template>


    <!-- VARIANT: DETAIL (The big overlay view) -->
    <template v-if="variant === 'detail'">
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
      <p class="detail-desc">{{ card.description }}</p>
      <div class="detail-status" v-if="isLocked">
        🔒 Non possédée
      </div>
      <div class="detail-status owned" v-else>
        ✅ Possédée ({{ quantity }})
      </div>

      <!-- Crafting UI -->
      <div class="crafting-controls">
        <button
          class="craft-btn"
          @click.stop="handleCraft"
          :disabled="!canCraft"
        >
          Créer (-{{ craftCost }} ✨)
        </button>
        <button
          class="disenchant-btn"
          @click.stop="handleDisenchant"
          v-if="!isLocked && quantity > 0"
        >
          Désenchanter (+{{ disenchantGain }} ✨)
        </button>
      </div>
    </template>


    <!-- VARIANT: LARGE (Collection Grid) -->
    <template v-else-if="variant === 'large'">
      <div class="card-name">{{ card.name }}</div>
      <img :src="card.img" class="card-img" alt="Card Art" />
      <div class="card-mana" v-if="card.manaCost !== undefined">💧 {{ card.manaCost }}</div>
      <div class="owned-badge" v-if="!isLocked && quantity > 0">x{{ quantity }}</div>
      <div class="locked-overlay" v-if="isLocked">🔒</div>
    </template>

    <!-- VARIANT: MINI (Deck Builder) -->
    <template v-else-if="variant === 'mini'">
      <div class="quantity-badge" v-if="!isLocked && quantity > 1">{{ badgeText }}</div>
      <div class="card-mini-info">
        <div class="card-name-mini">{{ card.name }}</div>
        <div class="card-level">Lvl {{ card.level }}</div>
      </div>
      <img :src="card.img" class="card-img" alt="Card Art" />
      <div class="card-stats">
        <span>{{ card.topValue }}</span>
        <span>{{ card.rightValue }}</span>
        <span>{{ card.bottomValue }}</span>
        <span>{{ card.leftValue }}</span>
      </div>
      <div class="selection-overlay" v-if="isSelected">✓</div>
      <div class="cover-overlay" v-if="isCover">C</div>
      <!-- Cover button emitted to parent if needed -->
      <button v-if="isSelected && !isCover" class="set-cover-btn" @click.stop="$emit('set-cover', card.id)">Cover</button>
      <div class="locked-overlay" v-if="isLocked">🔒</div>
    </template>
  </div>
</template>


<script setup>
import { computed, ref } from 'vue';
import { state, craftCard, disenchantCard } from '../game/state.js';

const props = defineProps({
  card: {
    type: Object,
    required: true
  },
  variant: {
    type: String,
    default: 'large',
    validator: (val) => ['mini', 'large', 'detail'].includes(val)
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  quantity: {
    type: Number,
    default: 0
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  isCover: {
    type: Boolean,
    default: false
  }
});

defineEmits(['click', 'set-cover']);

// CRAFTING LOGIC
const getRarity = (level) => {
  if (level <= 2) return 'common';
  if (level <= 4) return 'uncommon';
  if (level <= 6) return 'rare';
  if (level <= 8) return 'epic';
  return 'legendary';
};

const craftingRatios = {
  "common": { "disenchant": 10, "craft": 40 },
  "uncommon": { "disenchant": 20, "craft": 80 },
  "rare": { "disenchant": 50, "craft": 200 },
  "epic": { "disenchant": 100, "craft": 400 },
  "legendary": { "disenchant": 400, "craft": 1600 }
};

const craftCost = computed(() => {
  const level = props.card.level || 1;
  return craftingRatios[getRarity(level)].craft;
});

const disenchantGain = computed(() => {
  const level = props.card.level || 1;
  return craftingRatios[getRarity(level)].disenchant;
});

const canCraft = computed(() => {
  return state.user.dust >= craftCost.value;
});

async function handleCraft() {
  if (canCraft.value) {
    await craftCard(props.card.id);
  }
}

async function handleDisenchant() {
  if (props.quantity > 0) {
    await disenchantCard(props.card.id);
  }
}


const rarityClass = computed(() => {
  const level = props.card.level || 1;
  if (props.variant === 'mini') {
    // LeftDrawer/RightDrawer historically used 'rarity-*' classes for mini
    if (level >= 9) return 'rarity-legendary';
    if (level >= 7) return 'rarity-epic';
    if (level >= 5) return 'rarity-rare';
    if (level >= 3) return 'rarity-uncommon';
    return 'rarity-common';
  } else {
    // CollectionView historically used simpler names
    if (level <= 2) return 'common';
    if (level <= 4) return 'uncommon';
    if (level <= 6) return 'rare';
    if (level <= 8) return 'epic';
    return 'legendary';
  }
});

const variantClass = computed(() => {
  return `variant-${props.variant}`;
});

const badgeText = computed(() => {
  if (props.quantity >= 3) return 'x3+';
  return 'x' + props.quantity;
});


// --- PREMIUM LOGIC ---
const containerRef = ref(null);
const isActive = ref(false);

const mouseStyle = ref({
  '--mx': '50%',
  '--my': '50%',
  '--posx': '50%',
  '--posy': '50%',
  transform: ''
});

// Simple hash function for string -> number
function hashCode(str) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
      let chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Pseudo-random generator based on seed
function sfc32(a) {
  return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const premiumSeed = computed(() => {
  return props.card.name ? hashCode(props.card.name) : 1234;
});

const holoStyle = computed(() => {
  if (!props.card.isPremium) return {};

  const rng = sfc32(premiumSeed.value);
  const isImageMode = state.premiumMode === 'image';

  if (isImageMode) {
    return {
      '--c1': 'rgba(255, 255, 255, 0.7)',
      '--c2': 'rgba(200, 200, 200, 0.5)',
      '--c3': 'rgba(255, 255, 255, 0.8)'
    };
  } else {
    return {
      '--c1': `hsla(${rng() * 360}, 100%, 70%, 0.6)`,
      '--c2': `hsla(${rng() * 360}, 100%, 70%, 0.6)`,
      '--c3': `hsla(${rng() * 360}, 100%, 70%, 0.6)`
    };
  }
});

function handleMove(e) {
  if (!props.card.isPremium) return;
  isActive.value = true;

  let clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
  let clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

  const el = containerRef.value;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  let xPos = Math.max(rect.left, Math.min(clientX, rect.right));
  let yPos = Math.max(rect.top, Math.min(clientY, rect.bottom));

  const mouseX = (xPos - centerX) / (rect.width / 2);
  const mouseY = (yPos - centerY) / (rect.height / 2);

  const percentX = ((xPos - rect.left) / rect.width) * 100;
  const percentY = ((yPos - rect.top) / rect.height) * 100;

  // Use a slight 3D transform, less extreme than the full page version to not break layouts
  mouseStyle.value = {
    transform: `rotateX(${mouseY * -15}deg) rotateY(${mouseX * 15}deg) scale3d(1.03, 1.03, 1.03)`,
    '--mx': `${percentX}%`,
    '--my': `${percentY}%`,
    '--posx': `${100 - percentX}%`,
    '--posy': `${100 - percentY}%`
  };
}

function handleLeave() {
  if (!props.card.isPremium) return;
  isActive.value = false;
  mouseStyle.value = {
    transform: 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    '--mx': '50%',
    '--my': '50%',
    '--posx': '50%',
    '--posy': '50%'
  };
}

</script>

<style scoped>

/* --- PREMIUM EFFECTS --- */
.triple-triad-card.is-premium {
  transform-style: preserve-3d;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5), 0 0 10px rgba(255, 255, 255, 0.1);
  transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
  perspective: 1000px;
}

.triple-triad-card.is-premium:not(.premium-active) {
  transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

.triple-triad-card.is-premium:hover {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 255, 255, 0.3);
  z-index: 10;
}

.glare {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background-image: radial-gradient(
      farthest-corner circle at var(--mx, 50%) var(--my, 50%),
      rgba(255, 255, 255, 0.8) 0%,
      rgba(255, 255, 255, 0.2) 30%,
      transparent 60%
  );
  mix-blend-mode: overlay;
  opacity: 0;
  z-index: 20;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.holo-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  z-index: 15;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  mix-blend-mode: color-dodge;
}

.holo-gradient {
  width: 100%;
  height: 100%;
  background-image: linear-gradient(
      115deg,
      transparent 10%,
      var(--c1) 25%,
      transparent 40%,
      var(--c2) 55%,
      transparent 70%,
      var(--c3) 85%,
      transparent 100%
  );
  background-size: 300% 300%;
  background-position: var(--posx, 50%) var(--posy, 50%);
  filter: url(#fingerprint);
  opacity: 0.8;
}

.triple-triad-card.is-premium:hover .glare,
.triple-triad-card.is-premium:hover .holo-container,
.triple-triad-card.premium-active .glare,
.triple-triad-card.premium-active .holo-container {
  opacity: 1;
}

/* BASE STYLES */
.triple-triad-card {
  position: relative;
  background: #111;
  transition: transform 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.triple-triad-card:not(.variant-detail) {
  cursor: pointer;
}
.triple-triad-card:not(.variant-detail):hover {
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 10px 20px rgba(0,0,0,0.5);
  z-index: 2;
}

.locked-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  z-index: 10;
  border-radius: inherit;
}

/* RARITY COLORS (Shared) */
.common, .rarity-common { border-color: #a0a0a0; }
.uncommon, .rarity-uncommon { border-color: #4caf50; }
.rare, .rarity-rare { border-color: #2196f3; }
.epic, .rarity-epic { border-color: #9c27b0; }
.legendary, .rarity-legendary { border-color: #ffc107; box-shadow: 0 0 15px rgba(255, 193, 7, 0.5); }

/* --- VARIANT: LARGE --- */
.variant-large {
  aspect-ratio: 2.5 / 3.5;
  border: 2px solid #333;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.variant-large .card-name {
  position: absolute;
  top: 5px;
  width: 100%;
  text-align: center;
  font-size: 0.9rem;
  font-weight: bold;
  background: rgba(0,0,0,0.6);
  padding: 2px 0;
  z-index: 1;
  color: white;
}
.variant-large .card-img {
  width: 80%;
  height: auto;
}
.variant-large .card-mana {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(0, 0, 100, 0.8);
  border-radius: 50%;
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  border: 1px solid #00d2ff;
  z-index: 2;
  color: white;
}
.variant-large .owned-badge {
  position: absolute;
  bottom: 5px;
  right: 5px;
  background: #4caf50;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: bold;
}
.variant-large .locked-overlay {
  font-size: 3rem;
}

/* --- VARIANT: MINI --- */
.variant-mini {
  width: 100px;
  height: 140px;
  border: 2px solid #333;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 5px;
  background: #1a1a24;
}
.variant-mini.selected {
  border-color: #00d2ff;
  box-shadow: 0 0 15px rgba(0, 210, 255, 0.4);
}
.variant-mini.iscover {
  border-color: #ff0055;
  box-shadow: 0 0 15px rgba(255, 0, 85, 0.6);
}
.variant-mini .quantity-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff0055;
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  z-index: 5;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5);
}
.variant-mini .card-mini-info {
  width: 100%;
  text-align: center;
}
.variant-mini .card-name-mini {
  font-size: 0.75rem;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: white;
}
.variant-mini .card-level {
  font-size: 0.6rem;
  color: #aaa;
}
.variant-mini .card-img {
  width: 60px;
  height: 60px;
  object-fit: contain;
}
.variant-mini .card-stats {
  display: flex;
  justify-content: space-around;
  width: 100%;
  font-size: 0.7rem;
  font-weight: bold;
  color: #ffc107;
  background: rgba(0,0,0,0.5);
  padding: 2px 0;
  border-radius: 4px;
}
.variant-mini .selection-overlay {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 3rem;
  color: rgba(0, 210, 255, 0.8);
  font-weight: bold;
  pointer-events: none;
  z-index: 2;
  text-shadow: 0 0 10px rgba(0,0,0,0.8);
}
.variant-mini .cover-overlay {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 3rem;
  color: rgba(255, 0, 85, 0.8);
  font-weight: bold;
  pointer-events: none;
  z-index: 2;
  text-shadow: 0 0 10px rgba(0,0,0,0.8);
}
.variant-mini .set-cover-btn {
  position: absolute;
  bottom: 0px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: white;
  border: 1px solid #ff0055;
  font-size: 0.6rem;
  padding: 2px 5px;
  border-radius: 3px;
  cursor: pointer;
  z-index: 6;
}
.variant-mini .set-cover-btn:hover {
  background: #ff0055;
}

/* --- VARIANT: DETAIL --- */
.variant-detail {
  background: linear-gradient(135deg, #2a2a35, #111);
  border: 3px solid #555;
  border-radius: 12px;
  padding: 30px;
  width: 400px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0,0,0,0.8);
  transform: none !important;
}
.variant-detail:hover {
  transform: none !important;
  box-shadow: 0 20px 50px rgba(0,0,0,0.8);
}
.variant-detail .detail-name { 
  font-size: 2rem; 
  margin: 0 0 10px 0; 
  color: white;
}
.variant-detail .detail-level { 
  font-size: 1.2rem; 
  color: #aaa; 
  margin-bottom: 5px; 
}
.variant-detail .detail-element { 
  font-size: 1.1rem; 
  color: #4caf50; 
  margin-bottom: 15px; 
}
.variant-detail .detail-img-container {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto 20px auto;
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 10px;
}
.variant-detail .detail-img { 
  width: 100%; 
  height: 100%; 
  object-fit: contain; 
}
.variant-detail .detail-stats-cross {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
}
.variant-detail .stat {
  position: absolute;
  background: rgba(0,0,0,0.8);
  color: #ffc107;
  font-weight: bold;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 1.2rem;
  border: 1px solid #ffc107;
}
.variant-detail .stat.top { top: 10px; left: 50%; transform: translateX(-50%); }
.variant-detail .stat.right { right: 10px; top: 50%; transform: translateY(-50%); }
.variant-detail .stat.bottom { bottom: 10px; left: 50%; transform: translateX(-50%); }
.variant-detail .stat.left { left: 10px; top: 50%; transform: translateY(-50%); }
.variant-detail .detail-desc { 
  font-style: italic; 
  color: #ccc; 
  margin-bottom: 20px; 
  font-size: 1.1rem; 
  line-height: 1.5; 
}
.variant-detail .detail-status { 
  font-weight: bold; 
  padding: 10px; 
  border-radius: 5px; 
  background: rgba(255,0,0,0.2); 
  border: 1px solid red; 
  color: white;
}
.variant-detail
.detail-status.owned {
  background: rgba(76, 175, 80, 0.2); 
  border: 1px solid #4caf50; 
  color: #4caf50; 
}

/* CRAFTING STYLES */
.crafting-controls {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.craft-btn, .disenchant-btn {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.craft-btn {
  background: #2196f3;
}
.craft-btn:hover:not(:disabled) {
  background: #1976d2;
}
.craft-btn:disabled {
  background: #555;
  color: #888;
  cursor: not-allowed;
}

.disenchant-btn {
  background: #f44336;
}
.disenchant-btn:hover {
  background: #d32f2f;
}

</style>
