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
            :class="[{ 'is-premium': isPremium, 'is-unowned': unowned }]"
            :style="cardZoomStyle"
            @click.stop="$emit('close')"
            @mousemove="handleMove"
            @mouseleave="handleLeave"
            @touchstart="handleMove"
            @touchmove="handleMove"
            @touchend="handleLeave"
          >
            <TripleTriadCard
              v-if="zoomCard"
              :card="zoomCard"
              size="zoom"
              :tiltX="tilt.x"
              :tiltY="tilt.y"
              :interactive="false"
              :disable-zoom="true"
              :card-frame="baseFrameUrl"
              :is-premium="isPremium"
              :unowned="unowned"
              :bonus="bonus"
            />
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

              <!-- Skills List -->
              <div v-if="skillDetails.length" class="zoom-skills-list">
                <div v-for="s in skillDetails" :key="s.type" class="zoom-skill-item">
                  <div class="zoom-skill-header">
                    <span class="zoom-skill-name">
                      {{ s.name }} 
                      <span v-if="s.value" class="skill-value">+{{ s.value }}</span>
                      <span v-if="s.counter" class="skill-counter">({{ s.counter }}x)</span>
                    </span>
                    <div class="zoom-skill-params">
                      <span class="param-badge trigger" :title="'Se déclenche: ' + s.triggerLabel">
                        🕒 {{ s.triggerLabel }}
                      </span>
                      <span class="param-badge origin" v-if="s.isManual" title="Le joueur doit cibler une case">
                        📍 {{ s.originDesc }}
                      </span>
                      <span class="param-badge origin fixed" v-else-if="s.originType !== 'self'">
                        📍 {{ s.originDesc }}
                      </span>
                      <span class="param-badge target" :title="'Portée: ' + s.range">
                        🎯 {{ s.patternLabels }} <span v-if="s.range > 1">({{ s.range }})</span>
                      </span>
                      <span v-if="s.filter && s.filter !== 'none'" class="param-badge filter">
                        🔍 {{ s.filterLabel }}
                      </span>
                    </div>
                  </div>
                  <span class="zoom-skill-desc">{{ s.description }}</span>
                </div>
              </div>

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
            
            <!-- TAB: FRAMES (Visual Only) -->
            <template v-if="activeTab === 'frames'">
              <h2>Cadres de carte</h2>
              <p class="zoom-desc">Prévisualisez différents cadres sur cette carte. Ces changements sont purement visuels et ne sont pas enregistrés.</p>
              
              <div class="zoom-variants">
                <div class="variants-list">
                  <div 
                    class="variant-thumb" 
                    :class="{ 'is-active': selectedPreviewFrame === null }"
                    @click="selectedPreviewFrame = null"
                  >
                    <div class="no-frame-preview">❌</div>
                  </div>
                  <div
                    v-for="frame in userStore.cardFrames"
                    :key="frame.id"
                    class="variant-thumb"
                    :class="{ 'is-active': selectedPreviewFrame === frame.image }"
                    @click="selectedPreviewFrame = frame.image"
                    :title="frame.name"
                  >
                    <img :src="frame.image" />
                  </div>
                </div>
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
import { ref, computed, watch, onUnmounted, defineAsyncComponent } from 'vue';
import ElementIcon from "./ElementIcon.vue";
import HoloOverlay from "./HoloOverlay.vue";
import { useUserStore } from '../stores/userStore.js';
import { GameEngine } from '../game/GameEngine.js';
import { skillRegistry } from '../../../shared/skills/index';
import PurchaseButton from './ui/PurchaseButton.vue';

const TripleTriadCard = defineAsyncComponent(() => import('./TripleTriadCard.vue'));

const props = defineProps({
  show: Boolean,
  card: { type: Object, required: true },
  isPremium: Boolean,
  quantity: Number,
  unowned: Boolean,
  borderWidth: { type: Number, default: 2 },
  showDefaultInfo: { type: Boolean, default: true },
  showCraftingActions: { type: Boolean, default: true },
  bonus: { type: Number, default: 0 },
  cardFrame: { type: String, default: null }
});

const emit = defineEmits(['close']);
const userStore = useUserStore();

// --- TABS ---
const tabs = [
  { id: 'info', icon: '📋', label: 'Infos' },
  { id: 'variants', icon: '🎨', label: 'Illustrations' },
  { id: 'frames', icon: '🖼️', label: 'Cadres' },
  { id: 'crafting', icon: '⚒️', label: 'Artisanat' }
];
const activeTab = ref('info');
const selectedPreviewFrame = ref(null);

const baseFrameUrl = computed(() => {
  if (selectedPreviewFrame.value) return selectedPreviewFrame.value;
  return props.cardFrame;
});

const zoomCard = computed(() => {
  if (!props.card) return null;
  return {
    ...props.card,
    selectedVariantIndex: currentVariantIndex.value
  };
});

const targetLabels = {
  self: 'Soi-même',
  adjacent: 'Adjacents',
  top: 'Haut',
  bottom: 'Bas',
  left: 'Gauche',
  right: 'Droite',
  all: 'Plateau',
  allies: 'Alliés',
  enemies: 'Ennemis',
  row: 'Ligne',
  column: 'Colonne',
  diagonals: 'Diagonales',
  cross: 'En croix'
};

const filterLabels = {
  allies: 'Alliés',
  enemies: 'Ennemis',
  empty: 'Cases vides',
  self: 'Soi-même'
};

const originTypeLabels = {
  self: 'Soi-même',
  fixed: 'Fixé',
  manual: 'Manuel',
  manual_constrained: 'Manuel (portée limitée)'
};

const originDirectionLabels = {
  top: 'Haut', bottom: 'Bas', left: 'Gauche', right: 'Droite',
  top_left: 'Haut-Gauche', top_right: 'Haut-Droite',
  bottom_left: 'Bas-Gauche', bottom_right: 'Bas-Droite'
};

const triggerLabels = {
  onEnterPlay: 'Placement',
  onEndOfTurn: 'Fin de tour',
  onStartOfTurn: 'Début de tour',
  onCapture: 'Capture',
  onCaptured: 'Capturé',
  onDeath: 'Mort',
  passive: 'Passif'
};

const skillDetails = computed(() => {
  if (!props.card.skills) return [];
  return props.card.skills.map(s => {
    const type = typeof s === 'string' ? s : s.type;
    const handler = skillRegistry.getHandler(type);

    // Patterns : format [{value: 'adjacent'}, ...] ou string legacy
    const rawPatterns = s.patterns || [{ value: 'adjacent' }];
    const patternLabels = rawPatterns
      .map(p => {
        const key = typeof p === 'string' ? p : p.value;
        return targetLabels[key] || key;
      })
      .join(' + ');

    const originType = s.origin_type || 'self';
    const filter = s.filter || 'none';
    const trigger = s.trigger || 'onEnterPlay';

    // Description de l'origine
    let originDesc = originTypeLabels[originType] || originType;
    if (originType === 'fixed' && s.origin_direction) {
      const reach = s.origin_reach || 1;
      originDesc = `${reach} case${reach > 1 ? 's' : ''} vers ${originDirectionLabels[s.origin_direction] || s.origin_direction}`;
    }
    if (originType === 'manual_constrained' && s.origin_reach) {
      originDesc = `Manuel (rayon ${s.origin_reach})`;
    }

    return {
      type,
      name: handler ? handler.name : type,
      description: handler ? handler.description : '',
      value: s.value,
      counter: s.counter,
      range: s.range || 1,
      patternLabels,
      originType,
      originDesc,
      isManual: originType === 'manual' || originType === 'manual_constrained',
      filter,
      filterLabel: filterLabels[filter] || filter,
      trigger,
      triggerLabel: triggerLabels[trigger] || trigger
    };
  });
});

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
    selectedPreviewFrame.value = null;
    userStore.fetchCardFrames();
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
  return {
    perspective: '1200px'
  };
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

.zoom-skills-list {
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.zoom-skill-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.zoom-skill-name {
  color: #ffd700;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
}

.zoom-skill-desc {
  color: #ddd;
  font-size: 0.8rem;
  line-height: 1.4;
}

.zoom-skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.zoom-skill-params {
  display: flex;
  gap: 8px;
}

.param-badge {
  font-size: 0.7em;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: #ccc;
  display: flex;
  align-items: center;
  gap: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.param-badge.target { border: 1px solid rgba(0, 210, 255, 0.3); color: #00d2ff; }
.param-badge.filter { border: 1px solid rgba(255, 215, 0, 0.3); color: #ffd700; }
.param-badge.origin { border: 1px solid rgba(255, 100, 255, 0.3); color: #ff64ff; }
.param-badge.trigger { border: 1px solid rgba(34, 197, 94, 0.3); color: #22c55e; }

.skill-value {
  color: #4aff4a;
}

.skill-counter {
  color: #00d2ff;
  font-style: italic;
  font-size: 0.9em;
}

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
.no-frame-preview {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.1); font-size: 1.5rem;
}
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
