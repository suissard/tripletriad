<template>
  <Teleport to="body">
    <Transition name="zoom-fade">
      <div v-if="show" class="zoom-overlay" @click="$emit('close')">
        <div class="zoom-card-container" @click.stop>

          <!-- LEFT TAB BAR -->
          <div class="tab-bar">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="tab-btn"
              :class="{ 'is-active': activeTab === tab.id }"
              :title="tab.label"
              @click="activeTab = tab.id"
            >
              <span class="tab-icon">{{ tab.icon }}</span>
              <span class="tab-label">{{ tab.label }}</span>
            </button>
          </div>

          <!-- CENTER: CARD -->
          <div
            ref="cardRef"
            class="tt-card-zoom-wrapper"
            :class="[rarityClass, { 'is-premium': isPremium, 'is-unowned': unowned }]"
            :style="cardZoomStyle"
            @click.stop="$emit('close')"
            @mousemove="handleMove"
            @mouseleave="handleLeave"
            @touchstart="handleMove"
            @touchmove="handleMove"
            @touchend="handleLeave"
          >
            <div class="zoom-card-inner">
              <template v-if="isPremium">
                <div class="glare" :style="glareStyle"></div>
                <HoloOverlay
                  :seed="premiumSeed"
                  :always-visible="true"
                  :supertype="card.supertype"
                  :subtypes="card.subtypes"
                  :tiltX="tilt.x"
                  :tiltY="tilt.y"
                />
              </template>
              <img :src="currentImageUrl" class="card-img" :alt="card.name" />
              <div class="card-stats-cross">
                <div class="stat stat-top" :class="{ 'is-boosted': bonus > 0 && card.top < 100 }">{{ card.topValue }}</div>
                <div class="stat stat-left" :class="{ 'is-boosted': bonus > 0 && card.left < 100 }">{{ card.leftValue }}</div>
                <div class="stat stat-right" :class="{ 'is-boosted': bonus > 0 && card.right < 100 }">{{ card.rightValue }}</div>
                <div class="stat stat-bottom" :class="{ 'is-boosted': bonus > 0 && card.bottom < 100 }">{{ card.bottomValue }}</div>
                <div class="card-name-bar" :style="{'--rarity-color': rarityColor}">{{ card.name }}</div>
              </div>
              <div class="card-elements" v-if="cardElementsList.length">
                <ElementIcon v-for="el in cardElementsList" :key="el" :element="el" :active="true" class="element-icon" />
              </div>
            </div>
          </div>

          <!-- RIGHT PANEL -->
          <div class="zoom-card-info">
            <!-- TAB: INFO -->
            <template v-if="activeTab === 'info' && showDefaultInfo">
              <h2>{{ card.name }}</h2>
              <div class="zoom-meta">
                <span v-if="factionDisplay" class="faction-info">Faction: {{ factionDisplay }}</span>
                <span :style="{ color: rarityColor }" class="zoom-rarity-badge">{{ rarityLabel }}</span>
                <span v-if="isPremium" class="zoom-premium-badge">🌟 PREMIUM</span>
              </div>
              <p v-if="card.description" class="zoom-desc">{{ card.description }}</p>
              <slot name="extra" />
              <div class="zoom-ownership">
                <div v-if="unowned" class="ownership-status unowned">🔒 Non possédée</div>
                <div v-else class="ownership-status owned">✅ Possédée ({{ quantity }})</div>
              </div>
            </template>

            <!-- TAB: VARIANTS -->
            <template v-if="activeTab === 'variants'">
              <h2>Illustrations</h2>
              <div v-if="card.variantUrls && card.variantUrls.length > 1" class="zoom-variants">
                <p class="variants-title">Choisir l'illustration :</p>
                <div class="variants-list">
                  <div
                    v-for="(vUrl, idx) in card.variantUrls"
                    :key="idx"
                    class="variant-thumb"
                    :class="{ 'is-active': currentVariantIndex === idx }"
                    @click="setVariant(idx)"
                  >
                    <img :src="vUrl" />
                  </div>
                </div>
              </div>
              <div v-else class="no-variants">
                <p class="variants-empty">Aucune illustration alternative disponible.</p>
              </div>
            </template>

            <!-- TAB: CRAFTING -->
            <template v-if="activeTab === 'crafting' && showCraftingActions">
              <h2>Artisanat</h2>
              <div class="zoom-ownership" style="margin-top: 0;">
                <div v-if="unowned" class="ownership-status unowned">🔒 Non possédée</div>
                <div v-else class="ownership-status owned">✅ Possédée ({{ quantity }})</div>
              </div>
              <div class="zoom-actions">
                <PurchaseButton
                  :amount="craftCost"
                  type="dust"
                  label="Créer"
                  variant="primary"
                  :action="handleCraft"
                  class="zoom-action-btn craft"
                />
                <button class="zoom-action-btn disenchant" v-if="!unowned && quantity > 0" @click.stop="handleDisenchant">
                  <span>Désenchanter</span>
                  <span class="gain">+{{ disenchantGain }} ✨</span>
                </button>
              </div>
            </template>

            <slot />
          </div>

          <button class="zoom-close" @click="$emit('close')">✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import ElementIcon from "./ElementIcon.vue";
import HoloOverlay from "./HoloOverlay.vue";
import { useUserStore } from '../stores/userStore.js';
import { GameEngine } from '../../../shared/GameEngine.ts';
import PurchaseButton from './ui/PurchaseButton.vue';

const props = defineProps({
  show: Boolean,
  card: { type: Object, required: true },
  isPremium: Boolean,
  quantity: Number,
  unowned: Boolean,
  borderWidth: { type: Number, default: 2 },
  showDefaultInfo: { type: Boolean, default: true },
  showCraftingActions: { type: Boolean, default: true },
  bonus: { type: Number, default: 0 }
});

const emit = defineEmits(['close']);
const userStore = useUserStore();

// --- TABS ---
const tabs = [
  { id: 'info', icon: '📋', label: 'Infos' },
  { id: 'variants', icon: '🎨', label: 'Illustrations' },
  { id: 'crafting', icon: '⚒️', label: 'Artisanat' }
];
const activeTab = ref('info');

// --- VARIANT LOGIC ---
const initialVariantIndex = ref(0);
const currentVariantIndex = ref(0);

const currentImageUrl = computed(() => {
  if (props.card.variantUrls && props.card.variantUrls.length > currentVariantIndex.value) {
    return props.card.variantUrls[currentVariantIndex.value];
  }
  return props.card.imageUrl;
});

const userCardDocId = computed(() => {
  if (!userStore.isLoggedIn || !props.card.id) return null;
  const uc = userStore.collection.find(c => c.cardId === props.card.id);
  return uc ? uc.userCardDocumentId || uc.id : null;
});

function setVariant(idx) {
  currentVariantIndex.value = idx;
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    activeTab.value = 'info';
    if (userStore.isLoggedIn && props.card.id) {
      const uc = userStore.collection.find(c => c.cardId === props.card.id);
      if (uc && uc.selectedVariantIndex !== undefined) {
        initialVariantIndex.value = uc.selectedVariantIndex;
        currentVariantIndex.value = uc.selectedVariantIndex;
        return;
      }
    }
    initialVariantIndex.value = 0;
    currentVariantIndex.value = 0;
  } else {
    saveVariantIfNeeded();
  }
});

function saveVariantIfNeeded() {
  if (currentVariantIndex.value !== initialVariantIndex.value && userCardDocId.value) {
    userStore.updateCardVariant(userCardDocId.value, currentVariantIndex.value);
    initialVariantIndex.value = currentVariantIndex.value;
  }
}

onUnmounted(() => {
  saveVariantIfNeeded();
});

// --- 3D TILT ---
const ZOOM_SIZE = 350;
const cardRef = ref(null);
const tilt = ref({ x: 0, y: 0 });
const mousePos = ref({ x: 50, y: 50 });

function handleMove(e) {
  const el = cardRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
  const x = clientX - rect.left, y = clientY - rect.top;
  const xPct = (x / rect.width) * 100, yPct = (y / rect.height) * 100;
  mousePos.value = { x: xPct, y: yPct };
  tilt.value = { x: ((y / rect.height) - 0.5) * -30, y: ((x / rect.width) - 0.5) * 30 };
}

function handleLeave() {
  tilt.value = { x: 0, y: 0 };
  mousePos.value = { x: 50, y: 50 };
}

// --- CARD LEVEL / RARITY ---
const cardLevel = computed(() => {
  if (props.card.level) return props.card.level;
  return GameEngine.calculateCardLevel({
    top: props.card.topValue,
    right: props.card.rightValue,
    bottom: props.card.bottomValue,
    left: props.card.leftValue
  });
});

const rarityInfo = computed(() => {
  const rarityMapping = {
    'common': 'common', 'commun': 'common',
    'uncommon': 'uncommon', 'peu commun': 'uncommon',
    'rare': 'rare',
    'epic': 'epic', 'épique': 'epic',
    'legendary': 'legendary', 'légendaire': 'legendary'
  };
  const colors = {
    'common': '#a0a0a0', 'uncommon': '#4caf50',
    'rare': '#2196f3', 'epic': '#9c27b0', 'legendary': '#ffc107'
  };
  const explicitRarity = props.card.drawnRarity || props.card.rarity;
  if (explicitRarity) {
    const normalized = rarityMapping[explicitRarity.toLowerCase()] || 'common';
    return { name: normalized, color: colors[normalized] };
  }
  const level = cardLevel.value;
  let name = 'common';
  if (level >= 9) name = 'legendary';
  else if (level >= 7) name = 'epic';
  else if (level >= 5) name = 'rare';
  else if (level >= 3) name = 'uncommon';
  return { name, color: colors[name] };
});

const rarityClass = computed(() => `rarity-${rarityInfo.value.name}`);
const rarityColor = computed(() => rarityInfo.value.color);

const rarityLabel = computed(() => {
  const r = props.card.rarity || getRarityStr(cardLevel.value);
  const map = {
    'Common': 'Commune', 'Uncommon': 'Peu Commune', 'Rare': 'Rare',
    'Epic': 'Épique', 'Legendary': 'Légendaire',
    'common': 'Commune', 'uncommon': 'Peu Commune', 'rare': 'Rare',
    'epic': 'Épique', 'legendary': 'Légendaire'
  };
  return map[r] || r;
});

const factionDisplay = computed(() => {
  if (!props.card.faction) return null;
  const faction = props.card.faction;
  const name = typeof faction === 'object' ? faction.name : faction;
  if (!name || name.toLowerCase() === 'neutre' || name.toLowerCase() === 'neutral') return null;
  return name;
});

const cardZoomStyle = computed(() => {
  const scale = ZOOM_SIZE / 150;
  return {
    '--card-border-width': `${props.borderWidth * scale}px`,
    '--border-color': rarityColor.value,
    '--border-glow': rarityColor.value,
    transform: `rotateX(${tilt.value.x}deg) rotateY(${tilt.value.y}deg)`,
    transition: (tilt.value.x === 0 && tilt.value.y === 0) ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'
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

// --- CRAFTING ---
const getRarityStr = (level) => {
  if (level <= 2) return 'common';
  if (level <= 4) return 'uncommon';
  if (level <= 6) return 'rare';
  if (level <= 8) return 'epic';
  return 'legendary';
};
const craftingRatios = computed(() => {
  return userStore.gameConfig?.craftingRatios || {
    "common": { craft: 40, disenchant: 10 },
    "uncommon": { craft: 80, disenchant: 20 },
    "rare": { craft: 200, disenchant: 50 },
    "epic": { craft: 400, disenchant: 100 },
    "legendary": { craft: 1600, disenchant: 400 }
  };
});
const craftCost = computed(() => craftingRatios.value[getRarityStr(cardLevel.value)].craft);
const disenchantGain = computed(() => craftingRatios.value[getRarityStr(cardLevel.value)].disenchant);
const canCraft = computed(() => (userStore.user?.dust || 0) >= craftCost.value);

async function handleCraft() { if (canCraft.value) await userStore.craftCard(props.card.id); }
async function handleDisenchant() { if (props.quantity > 0) await userStore.disenchantCard(props.card.id); }

// --- HOLO ---
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash);
}
const premiumSeed = computed(() => {
  const cardPart = props.card.id || props.card.name || '0';
  const userPart = userStore.user?.id || 'anon';
  return hashCode(`${cardPart}-${userPart}`);
});

const glareStyle = computed(() => {
  return {
    background: `radial-gradient(circle at ${mousePos.value.x}% ${mousePos.value.y}%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 60%)`,
    opacity: tilt.value.x === 0 && tilt.value.y === 0 ? 0 : 1,
    transition: tilt.value.x === 0 && tilt.value.y === 0 ? 'opacity 0.5s ease-out' : 'opacity 0.1s ease-out'
  };
});
</script>

<style scoped>
/* ========== OVERLAY ========== */
.zoom-overlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(0, 0, 0, 0.92);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(10px);
  cursor: pointer;
}

/* ========== CONTAINER ========== */
.zoom-card-container {
  display: flex; align-items: center; gap: 24px;
  cursor: default; position: relative;
  max-width: 90vw; perspective: 1200px;
}

/* ========== TAB BAR (LEFT) ========== */
.tab-bar {
  display: flex; flex-direction: column; gap: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 8px 6px;
  backdrop-filter: blur(12px);
}

.tab-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: transparent; border: none; color: rgba(255, 255, 255, 0.45);
  padding: 10px 12px; border-radius: 8px;
  cursor: pointer; transition: all 0.25s ease;
  min-width: 64px;
}
.tab-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
}
.tab-btn.is-active {
  background: rgba(255, 215, 0, 0.12);
  color: #ffd700;
  box-shadow: inset 0 0 0 1px rgba(255, 215, 0, 0.25);
}
.tab-icon { font-size: 1.4rem; line-height: 1; }
.tab-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

/* ========== CARD (CENTER) ========== */
.tt-card-zoom-wrapper {
  width: min(350px, 60vw); font-size: 24px;
  aspect-ratio: 1 / 1; position: relative;
  transform-style: preserve-3d; will-change: transform;
  flex-shrink: 0;
}
.zoom-card-inner {
  width: 100%; height: 100%; position: relative; border-radius: 8px;
  overflow: hidden; background: #1a1a2e; border: 2px solid #333; box-sizing: border-box;
}
.zoom-card-inner:hover .card-stats-cross,
.zoom-card-inner:hover .card-elements { opacity: 0.15; }

.is-unowned .zoom-card-inner {
  filter: grayscale(1) contrast(0.8) brightness(1.1);
}

.rarity-common .zoom-card-inner  { border-color: var(--border-color, #a0a0a0); }
.rarity-uncommon .zoom-card-inner { border-color: var(--border-color, #4caf50); box-shadow: 0 0 8px var(--border-glow, rgba(76, 175, 80, 0.3)); }
.rarity-rare .zoom-card-inner     { border-color: var(--border-color, #2196f3); box-shadow: 0 0 10px var(--border-glow, rgba(33, 150, 243, 0.4)); }
.rarity-epic .zoom-card-inner     { border-color: var(--border-color, #9c27b0); box-shadow: 0 0 12px var(--border-glow, rgba(156, 39, 176, 0.5)); }
.rarity-legendary .zoom-card-inner { border-color: var(--border-color, #ffc107); box-shadow: 0 0 15px var(--border-glow, rgba(255, 193, 7, 0.6)), 0 0 30px var(--border-glow, rgba(255, 193, 7, 0.2)); }

.glare {
  position: absolute; inset: 0; border-radius: inherit;
  mix-blend-mode: overlay; z-index: 5; pointer-events: none;
}
.card-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }

.card-name-bar {
  position: absolute; bottom: 28%; left: 0; right: 0;
  background: transparent; color: white;
  font-size: 1.8rem; font-weight: 900;
  padding: 0.2em; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  z-index: 5;
  text-shadow: 0 0 15px var(--rarity-color, #000), 0 0 5px var(--rarity-color, #000), 0 2px 4px rgba(0,0,0,1);
  text-transform: uppercase; letter-spacing: 1px;
}
.card-stats-cross {
  position: absolute; inset: 0; z-index: 4;
  pointer-events: none; transition: opacity 0.3s ease;
}
.stat {
  position: absolute; color: #ffd700; font-weight: 900; font-size: 4rem;
  text-shadow: 0 2px 4px black, 0 0 10px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.5);
  line-height: 1; display: flex; align-items: center; justify-content: center;
}
.stat-top    { top: 8%; left: 50%; transform: translateX(-50%); }
.stat-bottom { bottom: 6%; left: 50%; transform: translateX(-50%); }
.stat-left   { top: 50%; left: 6%; transform: translateY(-50%); }
.stat-right  { top: 50%; right: 6%; transform: translateY(-50%); }

.stat.is-boosted {
  color: #4aff4a !important;
  text-shadow: 0 0 15px rgba(74, 255, 74, 0.8), 0 2px 4px black !important;
}

.card-elements {
  position: absolute; top: 4%; left: 4%;
  display: flex; flex-direction: column; gap: 0.2em;
  z-index: 4; transition: opacity 0.3s ease;
}
.element-icon { width: 1.5em; height: 1.5em; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8)); }

/* ========== RIGHT PANEL ========== */
.zoom-card-info {
  color: white; max-width: 300px; min-width: 220px;
}
.zoom-card-info h2 {
  font-size: 1.8rem; margin: 0 0 0.5em;
  text-shadow: 0 0 15px rgba(255, 206, 0, 0.5);
}
.zoom-desc {
  font-style: italic; color: #bbb;
  font-size: 0.95rem; line-height: 1.6; margin: 0 0 1em;
}
.zoom-meta {
  display: flex; gap: 15px; font-size: 0.9rem; color: #aaa; flex-wrap: wrap;
  margin-bottom: 1em;
}
.zoom-premium-badge, .zoom-rarity-badge { font-weight: bold; text-transform: uppercase; }
.zoom-premium-badge { color: #ffce00; text-shadow: 0 0 8px rgba(255, 206, 0, 0.6); }

.zoom-ownership {
  margin: 1rem 0; padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px; display: inline-block;
}
.ownership-status.owned { color: #4caf50; font-weight: bold; }
.ownership-status.unowned { color: #ff5252; opacity: 0.8; }

/* ========== VARIANTS ========== */
.zoom-variants {
  margin: 1rem 0; padding: 10px;
  background: rgba(255, 255, 255, 0.05); border-radius: 8px;
}
.variants-title { margin: 0 0 8px 0; font-size: 0.9rem; color: #bbb; }
.variants-list { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; flex-wrap: wrap; }
.variant-thumb {
  width: 60px; height: 60px; border-radius: 6px; overflow: hidden;
  border: 2px solid transparent; cursor: pointer;
  transition: all 0.2s; flex-shrink: 0;
}
.variant-thumb:hover { transform: translateY(-2px); border-color: rgba(255, 255, 255, 0.5); }
.variant-thumb.is-active { border-color: #ffd700; box-shadow: 0 0 8px rgba(255, 215, 0, 0.6); }
.variant-thumb img { width: 100%; height: 100%; object-fit: cover; }
.variants-empty { color: #666; font-style: italic; font-size: 0.9rem; }

/* ========== CRAFTING ========== */
.zoom-actions { display: flex; flex-direction: column; gap: 12px; margin-top: 1.5rem; }
.zoom-action-btn {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.8rem 1.2rem; border-radius: 6px; border: none;
  font-weight: bold; font-size: 1rem; cursor: pointer;
  transition: all 0.2s; color: white; min-width: 220px;
}
.zoom-action-btn.craft { background: #1976d2; }
.zoom-action-btn.craft:hover:not(:disabled) { background: #2196f3; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4); }
.zoom-action-btn.craft:disabled { background: #444; color: #888; cursor: not-allowed; }
.zoom-action-btn.disenchant { background: #c62828; }
.zoom-action-btn.disenchant:hover { background: #f44336; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4); }
.cost, .gain { font-size: 0.85em; opacity: 0.9; margin-left: 10px; }

/* ========== CLOSE ========== */
.zoom-close {
  position: absolute; top: -20px; right: -20px;
  background: rgba(255, 0, 85, 0.8); border: none; color: white;
  width: 40px; height: 40px; border-radius: 50%;
  font-size: 1.2rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.zoom-close:hover { background: #ff0055; transform: scale(1.1); }

/* ========== TRANSITIONS ========== */
.zoom-fade-enter-active   { transition: all 0.3s ease-out; }
.zoom-fade-leave-active    { transition: all 0.2s ease-in; }
.zoom-fade-enter-from      { opacity: 0; transform: scale(0.8); }
.zoom-fade-leave-to        { opacity: 0; transform: scale(0.9); }

/* ========== RESPONSIVE ========== */
@media (max-width: 768px) {
  .zoom-card-container { flex-direction: column; gap: 16px; max-height: 90vh; overflow-y: auto; }
  .tab-bar { flex-direction: row; justify-content: center; order: 2; }
  .tab-btn { min-width: 50px; padding: 8px 10px; }
  .tab-label { font-size: 0.55rem; }
  .tt-card-zoom-wrapper { order: 1; width: min(280px, 60vw); }
  .zoom-card-info { order: 3; max-width: 100%; text-align: center; }
}
</style>
