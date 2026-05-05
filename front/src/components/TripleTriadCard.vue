<script>
export default {
  inheritAttrs: false
}
</script>

<template>
  <div 
    v-bind="$attrs"
    ref="containerRef"
    class="tt-card" 
    :class="[
      sizeClass,
      { 
        'is-unowned': unowned, 
        'is-selected': selected, 
        'is-cover': isCover, 
        'is-premium': isPremiumCard,
        'is-flat': flat,
        'has-custom-border': !!borderColor,
        'is-flipping': isFlipping,
        'is-shaking': isShaking,
        'is-compact': compact,
        'dim-on-hover': dimOnHover
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
        <template v-if="!flat && isPremiumCard">
          <div class="glare" :style="glareStyle"></div>
        </template>

        <!-- Holographic Effects (Centralized Component) -->
        <HoloOverlay
          v-if="isPremiumCard && !faceDown && !flat"
          :layers="customFoilEffect?.layers || null"
          :seed="premiumSeed"
          :tiltX="tiltX !== null ? tiltX : tilt.x"
          :tiltY="tiltY !== null ? tiltY : tilt.y"
          :always-visible="alwaysVisible"
          :supertype="displayCard.supertype"
          :subtypes="displayCard.subtypes"
        />

        <!-- CARD CONTENT (Unified layout) -->
        <template v-if="displayCard.revealed !== false || $attrs.forceFace">
          <!-- Clipped visual stack (Shine, Glass, Image, Frame) -->
          <div class="card-visual-stack" style="position: absolute; inset: 0; overflow: hidden; border-radius: inherit; z-index: 1; pointer-events: none;">
            <!-- Card image -->
            <img :src="displayCard.imageUrl" class="card-img" :alt="displayCard.name" :style="imageStyle" style="pointer-events: auto;" />

            <!-- Card Frame Overlay -->
            <img v-if="displayFrameUrl" :src="displayFrameUrl" class="card-frame-overlay" alt="Card Frame" />

            <!-- Broken Glass Impact Effect (Clipped) -->
            <BrokenGlassOverlay v-if="displayCard.impactDirection" :direction="displayCard.impactDirection" />
            
            <!-- Reveal Shine Effect (Clipped) -->
            <div v-if="revealShine" class="reveal-shine"></div>
          </div>

          <!-- HP Bar (Moved to top) -->
          <HpBar v-if="displayCard.hp !== undefined" :hp="displayCard.hp" :default-hp="displayCard.defaultHp || 3" :owner="owner" />

          <!-- Element badges (Dynamic) -->
          <div class="card-elements" v-if="cardElementsList.length" :style="elementStyle">
            <ElementIcon v-for="el in cardElementsList" :key="el" :element="el" :active="elementActive" class="element-icon" />
          </div>

          <!-- Cover badge (Top-Right) -->
          <div class="cover-badge" v-if="isCover">★</div>

          <!--           <!-- Stats (Edge-aligned) -->
          <div class="card-stats-cross" :class="{ 'has-bonus': bonus > 0 }">
            <div class="stat stat-top" :class="{ 'is-boosted': bonus > 0 && normalizedCardData.top < 100 }" :style="statStyles.top">{{ displayCard.topValue }}</div>
            <div class="stat stat-left" :class="{ 'is-boosted': bonus > 0 && normalizedCardData.left < 100 }" :style="statStyles.left">{{ displayCard.leftValue }}</div>
            <div class="stat stat-right" :class="{ 'is-boosted': bonus > 0 && normalizedCardData.right < 100 }" :style="statStyles.right">{{ displayCard.rightValue }}</div>
            <div class="stat stat-bottom" :class="{ 'is-boosted': bonus > 0 && normalizedCardData.bottom < 100 }" :style="statStyles.bottom">{{ displayCard.bottomValue }}</div>
          </div>

          <!-- Name (Dynamic Position) -->
          <div class="card-name-bar" :style="[nameStyle, {'--rarity-color': actualRarityColor}]">{{ displayCard.name }}</div>

          <!-- Skills Indicators (Dynamic Keywords) -->
          <div class="card-skills-indicators" v-if="skillKeywords.length" :style="skillsStyle">
            <div v-for="s in skillKeywords" :key="s.type" class="skill-keyword-badge">
              {{ s.name }} 
              <span v-if="s.value" class="skill-value">+{{ s.value }}</span>
              <span v-if="s.duration" class="skill-duration">({{ s.duration }}t)</span>
            </div>
          </div>

          <!-- Selected check -->
          <div class="selected-overlay" v-if="selected">✓</div>

          <!-- Unowned lock -->
          <div class="unowned-overlay" v-if="unowned">🔒</div>
        </template>

        <!-- BASE CARD FACE (Fallback revealed false) -->
        <template v-else>
          <AnimatedCardBack v-if="cardBack === 'animated'" class="card-back-img" />
          <img v-else :src="activeCardBackUrl" class="card-back-img" alt="Card Back" />
          <!-- Unowned lock -->
          <div class="unowned-overlay" v-if="unowned">🔒</div>
        </template>
      </div>

      <!-- BACK SIDE -->
      <div class="tt-card-back" v-if="!compact">
        <AnimatedCardBack v-if="cardBack === 'animated'" class="card-back-img" />
        <img v-else :src="activeCardBackUrl" class="card-back-img" alt="Card Back" />
        <!-- Unowned lock (show it on back too if unowned) -->
        <div class="unowned-overlay" v-if="unowned">🔒</div>
      </div>

      <!-- Premium Border Animation (Sibling of front/back, inside inner for 3D flip) -->

    </div>
    



    <!-- Quantity badge (unified) -->
    <AppBadge 
      v-if="quantity >= 1" 
      variant="danger" 
      class="quantity-badge" 
      :style="!flat ? tiltStyle : {}"
    >
      ×{{ quantity }}
    </AppBadge>

    <!-- New badge (unified) -->
    <AppBadge 
      v-if="isNew" 
      variant="primary" 
      size="sm"
      bounce
      class="new-badge" 
      :style="newBadgeStyle"
    >
      NEW
    </AppBadge>
  </div>

  <!-- Card Detail Modal -->
  <CardDetailModal
    :show="isZoomed"
    :card="displayCard"
    :is-premium="isPremiumCard"
    :quantity="quantity"
    :unowned="unowned"
    :border-width="borderWidth"
    :show-default-info="showDetailInfo"
    :show-crafting-actions="showCraftingActions"
    :bonus="bonus"
    :card-frame="displayFrameUrl"
    @close="isZoomed = false"
  >
    <template #extra>
      <slot name="detail-extra" />
    </template>
    <slot name="detail" />
  </CardDetailModal>
</template>

<script setup>
import { computed, ref, useAttrs, watch } from "vue";
import AnimatedCardBack from "./AnimatedCardBack.vue";
import BrokenGlassOverlay from "./BrokenGlassOverlay.vue";
import ElementIcon from "./ElementIcon.vue";
import CardDetailModal from "./CardDetailModal.vue";
import HoloOverlay from "./HoloOverlay.vue";
import AppBadge from "./ui/AppBadge.vue";
import HpBar from './game/HpBar.vue';
import { useUserStore } from '../stores/userStore.js';
import { useEffectStore } from '../stores/effectStore.js';
import { getRarity } from '../game/constants.js';
import { GameEngine } from '../game/GameEngine.js';
import { skillRegistry } from '../../../shared/skills/index';
import { normalizeCard } from '../utils/cardUtils.js';

const props = defineProps({
  card: { type: Object, required: true },
  size: { type: [String, Number], default: 'md' },
  ratio: { type: Number, default: 1 / 1 },
  ratioContent: { type: Number, default: 0.08 },
  isPremium: { type: Boolean, default: false },
  isCover: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  flat: { type: Boolean, default: false },
  quantity: { type: Number, default: 0 },
  unowned: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  faceDown: { type: Boolean, default: false },
  interactive: { type: Boolean, default: true },
  cardBack: { type: String, default: "default" },
  cardFrame: { type: String, default: null }, // URL of the card frame image
  borderColor: { type: String, default: '' },
  borderWidth: { type: Number, default: 2 },
  disableZoom: { type: Boolean, default: false },
  height: { type: [String, Number], default: null },
  elementActive: { type: Boolean, default: true },
  showDetailOnHover: { type: Boolean, default: false },
  owner: { type: String, default: null },
  overrideEffect: { type: Object, default: null },
  tiltX: { type: Number, default: null },
  tiltY: { type: Number, default: null },
  alwaysVisible: { type: Boolean, default: false },
  isNew: { type: Boolean, default: false },
  revealShine: { type: Boolean, default: false },
  dimOnHover: { type: Boolean, default: true },
  showDetailInfo: { type: Boolean, default: true },
  showCraftingActions: { type: Boolean, default: true },
  bonus: { type: Number, default: 0 },
  overrideFrameCoords: { type: Object, default: null }
});

const userStore = useUserStore();
const effectStore = useEffectStore();

// Internal normalization to handle raw Strapi data or pre-normalized data
const normalizedCardData = computed(() => normalizeCard(props.card));

// Apply dynamic bonuses (Faction, etc.) to values
const displayCard = computed(() => {
  const card = { ...normalizedCardData.value };

  // Handle variant
  // Prefer direct variant index if passed or already populated
  let variantIndex = card.selectedVariantIndex || 0;

  // If not provided in the card object, try to find it in the user's collection
  if (!card.selectedVariantIndex && userStore.isLoggedIn && card.id) {
    const userCard = userStore.collection.find(c => c.cardId === card.id);
    if (userCard && userCard.selectedVariantIndex) {
      variantIndex = userCard.selectedVariantIndex;
    }
  }

  if (variantIndex > 0 && card.variantUrls && card.variantUrls.length > variantIndex) {
    card.imageUrl = card.variantUrls[variantIndex];
  }
  if (props.bonus > 0) {
    const sides = ['top', 'right', 'bottom', 'left'];
    sides.forEach(side => {
      const baseVal = card[side];
      if (baseVal < 100) {
        const newVal = Math.min(100, baseVal + props.bonus);
        card[side] = newVal;
        card[side + 'Value'] = newVal === 100 ? 'A' : String(newVal);
      }
    });
  }
  return card;
});

const currentFrame = computed(() => {
  const url = props.cardFrame || userStore.defaultFrame?.image;
  if (!url) return null;
  return userStore.cardFrames.find(f => f.image === url);
});

const displayFrameUrl = computed(() => {
  const f = currentFrame.value;
  if (!f) return null;
  
  // Select image based on rarity
  const rarity = rarityData.value.name; // 'common', 'uncommon', 'rare', 'epic', 'legendary'
  if (rarity === 'uncommon' && f.imageUncommon) return f.imageUncommon;
  if (rarity === 'rare' && f.imageRare) return f.imageRare;
  if (rarity === 'epic' && f.imageEpic) return f.imageEpic;
  if (rarity === 'legendary' && f.imageLegendary) return f.imageLegendary;
  
  return f.image;
});

const activeCardBackUrl = computed(() => {
  if (props.cardBack && props.cardBack !== 'default' && props.cardBack !== 'animated') {
     // If it's a URL (from props), use it.
     if (props.cardBack.startsWith('http') || props.cardBack.startsWith('/') || props.cardBack.startsWith('blob:')) {
       return props.cardBack;
     }
     
     // If it's an ID/Slug, try to find it in the store
     const found = userStore.cardBacks.find(b => b.documentId === props.cardBack || b.id === props.cardBack);
     if (found && found.image) return found.image;
  }
  
  // Fallback to user's default back or global default
  return userStore.defaultBack?.image || '/card-back.svg';
});

const imageStyle = computed(() => {
  const f = props.overrideFrameCoords || currentFrame.value;
  if (!f) return {};
  return {
    top: `${f.illustrationY ?? 0}%`,
    left: `${f.illustrationX ?? 0}%`,
    width: `${f.illustrationWidth ?? 100}%`,
    height: `${f.illustrationHeight ?? 100}%`,
    position: 'absolute',
    objectFit: 'cover',
    right: 'auto',
    bottom: 'auto'
  };
});

const statStyles = computed(() => {
  const f = props.overrideFrameCoords || currentFrame.value;
  if (!f) return {
    top: {}, left: {}, right: {}, bottom: {}
  };
  return {
    top: { left: `${f.topX ?? 50}%`, top: `${f.topY ?? 8}%` },
    bottom: { left: `${f.bottomX ?? 50}%`, top: `${f.bottomY ?? 94}%` },
    left: { left: `${f.leftX ?? 6}%`, top: `${f.leftY ?? 50}%` },
    right: { left: `${f.rightX ?? 94}%`, top: `${f.rightY ?? 50}%` }
  };
});

const elementStyle = computed(() => {
  const f = props.overrideFrameCoords || currentFrame.value;
  if (!f) return {};
  return {
    left: `${f.elementX ?? 4}%`,
    top: `${f.elementY ?? 4}%`
  };
});

const nameStyle = computed(() => {
  const f = props.overrideFrameCoords || currentFrame.value;
  if (!f) return {};
  return {
    left: `${f.nameX ?? 50}%`,
    top: `${f.nameY ?? 85}%`
  };
});

const skillsStyle = computed(() => {
  const f = props.overrideFrameCoords || currentFrame.value;
  if (!f) return {};
  return {
    left: `${f.skillsX ?? 50}%`,
    top: `${f.skillsY ?? 65}%`
  };
});

const skillKeywords = computed(() => {
  if (!displayCard.value.skills) return [];
  return displayCard.value.skills.map(s => {
    const type = typeof s === 'string' ? s : s.type;
    const handler = skillRegistry.getHandler(type);
    return {
      type,
      name: handler ? handler.name : type,
      value: s.value,
      duration: s.duration
    };
  });
});

const customFoilEffect = computed(() => {
  if (props.overrideEffect) return props.overrideEffect;
  if (displayCard.value?.overrideEffect) return displayCard.value.overrideEffect;
  if (!displayCard.value) return null;
  const id = displayCard.value.documentId || displayCard.value.id;
  if (!id) return null;
  return useEffectStore().getEffectForCard(id);
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
const hoverTimer = ref(null);

const emit = defineEmits(['click', 'set-cover', 'left-click', 'right-click', 'long-left-click', 'long-right-click']);

const longPressButton = ref(0);

function startLongPress(e) {
  if (!props.interactive) return;
  longPressTriggered.value = false;
  longPressButton.value = e ? (e.button || 0) : 0;

  longPressTimer.value = setTimeout(() => {
    longPressTriggered.value = true;
    if (longPressButton.value === 0) {
      emit('long-left-click', displayCard.value);
      if (!props.disableZoom) {
        isZoomed.value = true;
      }
    } else if (longPressButton.value === 2) {
      emit('long-right-click', displayCard.value);
    }
  }, 500);
}

function cancelLongPress() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
  if (hoverTimer.value) {
    clearTimeout(hoverTimer.value);
    hoverTimer.value = null;
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
  if (!props.interactive) return;
  if (longPressTriggered.value) {
    longPressTriggered.value = false;
    return;
  }
  emit('right-click', displayCard.value);
}

function handleClick() {
  if (!props.interactive) return;
  if (longPressTriggered.value) {
    longPressTriggered.value = false;
    return;
  }
  emit('left-click', displayCard.value);
  emit('click', displayCard.value);
}

// --- Computed ---
const isPremiumCard = computed(() => {
  if (displayCard.value.revealed === false) return false;
  return props.isPremium || displayCard.value.isDrawnPremium || !!customFoilEffect.value;
});

const cardLevel = computed(() => {
  if (displayCard.value.level) return displayCard.value.level; // Fallback if still present in some data
  return GameEngine.calculateCardLevel({
    topValue: displayCard.value.topValue,
    rightValue: displayCard.value.rightValue,
    bottomValue: displayCard.value.bottomValue,
    leftValue: displayCard.value.leftValue
  });
});

const rarityData = computed(() => {
  if (displayCard.value.revealed === false) return { name: 'common', color: '#a0a0a0' };
  
  const rarityMapping = {
    'common': 'common',
    'commun': 'common',
    'uncommon': 'uncommon',
    'peu commun': 'uncommon',
    'rare': 'rare',
    'epic': 'epic',
    'épique': 'epic',
    'legendary': 'legendary',
    'légendaire': 'legendary'
  };

  const reverseMapping = {
    'common': 'Commun',
    'uncommon': 'Peu Commun',
    'rare': 'Rare',
    'epic': 'Épique',
    'legendary': 'Légendaire'
  };

  const colors = {
    'common': '#a0a0a0',
    'uncommon': '#4caf50',
    'rare': '#2196f3',
    'epic': '#9c27b0',
    'legendary': '#ffc107'
  };

  // 1. Prioritize explicit rarity if provided (especially for boosters)
  const explicitRarity = displayCard.value.drawnRarity || displayCard.value.rarity;
  if (explicitRarity) {
    const normalizedName = rarityMapping[explicitRarity.toLowerCase()] || 'common';
    return {
      name: normalizedName,
      color: colors[normalizedName]
    };
  }

  // 2. Fallback to calculation from values
  const values = {
    top: displayCard.value.top,
    right: displayCard.value.right,
    bottom: displayCard.value.bottom,
    left: displayCard.value.left,
  };
  
  if (isNaN(values.top) || isNaN(values.right) || isNaN(values.bottom) || isNaN(values.left)) {
     return { name: 'common', color: '#a0a0a0' };
  }

  const r = getRarity(values);
  return { 
    name: rarityMapping[r.name.toLowerCase()] || 'common', 
    color: r.color 
  };
});



const actualRarityColor = computed(() => {
  if (displayCard.value.revealed === false) return '#a0a0a0';
  return rarityData.value.color;
});

const effectiveBorderColor = computed(() => {
  if (props.borderColor) return props.borderColor;
  return '#333'; // Neutral default
});

const cardStyle = computed(() => {
  const width = props.size;
  const widthPx = typeof width === 'number' ? width : (SIZES[width] || (typeof width === 'string' && width.includes('%') ? null : 150));
  
  // Proportional border scaling: 150px (md) is the baseline (scale 1.0)
  const scale = widthPx ? widthPx / 150 : 1;
  const effectiveBorderWidth = props.borderWidth * scale;

  const style = {
    width: widthPx ? `${widthPx}px` : width,
    fontSize: widthPx ? `${widthPx * props.ratioContent}px` : 'inherit'
  };

  if (props.height) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
    style.aspectRatio = 'auto';
  } else {
    style.aspectRatio = props.ratio || (1 / 1);
  }
  
  if (!props.flat && !props.compact) Object.assign(style, mouseStyle.value);
  
  // Always set the border color/glow variables so they are consistent across calculations and props
  style['--border-color'] = effectiveBorderColor.value;
  style['--border-glow'] = effectiveBorderColor.value;
  style['--rarity-color'] = actualRarityColor.value;
  
  style['--card-border-width'] = `${effectiveBorderWidth}px`;
  return style;
});



const cardElementsList = computed(() => {
  if (!displayCard.value) return [];
  const elements = displayCard.value.elements;
  const element = displayCard.value.element;
  
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

async function handleCraft() { if (canCraft.value) await userStore.craftCard(displayCard.value.id); }
async function handleDisenchant() { if (props.quantity > 0) await userStore.disenchantCard(displayCard.value.id); }

// --- 3D TILT ---
const containerRef = ref(null);
const isActive = ref(false);
const tilt = ref({ x: 0, y: 0 });
const mousePos = ref({ x: 50, y: 50 });

const sizeClass = computed(() => {
  if (typeof props.size === 'number') return '';
  return `card-size-${props.size}`;
});

const tiltStyle = computed(() => {
  const tx = props.tiltX !== null ? props.tiltX : tilt.value.x;
  const ty = props.tiltY !== null ? props.tiltY : tilt.value.y;
  return {
    transform: `rotateX(${tx}deg) rotateY(${ty}deg)`,
    transition: (tx === 0 && ty === 0) ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'
  };
});

const innerStyle = computed(() => {
  const tx = props.tiltX !== null ? props.tiltX : tilt.value.x;
  const ty = props.tiltY !== null ? props.tiltY : tilt.value.y;
  const rotationY = ty + (props.faceDown ? 180 : 0);
  return {
    transform: `rotateX(${tx}deg) rotateY(${rotationY}deg)`,
    transition: (tx === 0 && ty === 0) ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.1s ease-out'
  };
});

const newBadgeStyle = computed(() => {
  const base = !props.flat ? tiltStyle.value : { transform: '' };
  return {
    ...base,
    transform: (base.transform || '') + ' rotate(30deg)'
  };
});

const glareStyle = computed(() => {
  const tx = props.tiltX !== null ? props.tiltX : tilt.value.x;
  const ty = props.tiltY !== null ? props.tiltY : tilt.value.y;
  return {
    background: `radial-gradient(circle at ${mousePos.value.x}% ${mousePos.value.y}%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0) 60%)`,
    opacity: tx === 0 && ty === 0 ? 0 : 0.8,
    transition: tx === 0 && ty === 0 ? 'opacity 0.5s ease-out' : 'opacity 0.1s ease-out'
  };
});

const mouseStyle = ref({ '--mx': '50%', '--my': '50%', '--posx': '50%', '--posy': '50%' });

// --- HOLO SEED ---
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash);
}

const premiumSeed = computed(() => {
  const cardPart = displayCard.value.id || displayCard.value.name || '0';
  const userPart = userStore.user?.id || 'anon';
  return hashCode(`${cardPart}-${userPart}`);
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

  if (props.showDetailOnHover && !props.disableZoom && !isZoomed.value && !hoverTimer.value && !longPressTimer.value) {
    hoverTimer.value = setTimeout(() => {
      isZoomed.value = true;
      hoverTimer.value = null;
    }, 600);
  }
}

function handleLeave() {
  if (props.flat) return;
  isActive.value = false;
  tilt.value = { x: 0, y: 0 };
  mousePos.value = { x: 50, y: 50 };
  mouseStyle.value = { '--mx': '50%', '--my': '50%', '--posx': '50%', '--posy': '50%' };
}

// --- Capture Impact Animation ---
const isShaking = ref(false);
watch(() => displayCard.value?.impactDirection, (newVal) => {
  if (newVal) {
    isShaking.value = true;
    setTimeout(() => { isShaking.value = false; }, 300);
  }
});

// --- Capture Flip Animation ---
watch(() => props.borderColor, (newVal, oldVal) => {
  if (oldVal && newVal !== oldVal && !displayCard.value?.impactDirection) {
    isFlipping.value = true;
    isShaking.value = true; // Add shake on capture
    setTimeout(() => {
      isFlipping.value = false;
    }, 600);
    setTimeout(() => {
      isShaking.value = false;
    }, 300);
  }
});
</script>

<style scoped>
/* ============================================ */
/*  BASE                                        */
/* ============================================ */
.tt-card {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: visible;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  container-type: inline-size;
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 8px color-mix(in srgb, var(--rarity-color) 40%, transparent);
  transition: border-color 0.8s ease, box-shadow 0.8s ease, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.tt-card:hover .tt-card-inner {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6), 0 0 15px color-mix(in srgb, var(--rarity-color) 70%, transparent);
}

.is-unowned .tt-card-inner {
  border-color: #666 !important;
  box-shadow: none !important;
}

.is-unowned .tt-card-front > *:not(.unowned-overlay),
.is-unowned .tt-card-back > *:not(.unowned-overlay) {
  filter: grayscale(1) contrast(0.8) brightness(1.1);
}

/* Ensure children are clipped only on their own side if needed */
.tt-card-front, .tt-card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: inherit;
  overflow: visible; /* Allow stats to spill out if positioned near edges */
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
  opacity: 1.0;
}

.tt-card.is-flipping:not(.is-compact) .tt-card-inner {
  animation: flip-360 0.6s cubic-bezier(0.45, 0.05, 0.55, 0.95);
}

/* ============================================ */
/*  COMPACT MODE                                */
/* ============================================ */
.tt-card.is-compact .tt-card-inner {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  padding-right: 8px !important;
  overflow: hidden !important;
  background: #1a1a2e;
  box-shadow: none !important;
  transition: background 0.2s;
}

.tt-card.is-compact:hover .tt-card-inner {
  background: #2a2a45;
}

.tt-card.is-compact:hover .quantity-badge {
  display: none !important;
}

.tt-card.is-compact .tt-card-front {
  position: relative !important;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  width: 100% !important;
  height: 100% !important;
}

.tt-card.is-compact .card-img {
  position: absolute !important;
  inset: 0 !important;
  width: 66% !important;
  height: 100% !important;
  flex-shrink: 0 !important;
  opacity: 1.0 !important;
  border-right: none !important;
  object-fit: cover !important;
  mask-image: linear-gradient(to right, black 40%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black 40%, transparent 100%);
}

.tt-card.is-compact .card-name-bar {
  position: relative !important;
  background: transparent !important;
  text-align: left !important;
  padding: 0 10cqw !important;
  font-size: 12cqw !important;
  font-weight: 800 !important;
  flex: 1 !important;
  bottom: auto !important;
  left: auto !important;
  right: auto !important;
  text-shadow: 2px 2px 4px black;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block !important;
  letter-spacing: 1px;
}

.tt-card.is-compact .card-stats-cross {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  width: 40cqw !important;
  height: 40cqw !important;
  display: block !important;
  margin-left: 5cqw !important;
  z-index: 10 !important;
}

.tt-card.is-compact .stat {
  position: absolute !important;
  font-size: 11cqw !important;
  transform: none !important;
  text-shadow: 1px 1px 2px black;
  width: 12cqw;
  height: 12cqw;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tt-card.is-compact .stat-top    { top: 0 !important; left: 50% !important; transform: translateX(-50%) !important; }
.tt-card.is-compact .stat-bottom { bottom: 0 !important; left: 50% !important; transform: translateX(-50%) !important; }
.tt-card.is-compact .stat-left   { top: 50% !important; left: 0 !important; transform: translateY(-50%) !important; }
.tt-card.is-compact .stat-right  { top: 50% !important; right: 0 !important; transform: translateY(-50%) !important; }

.tt-card.is-compact .card-elements {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  gap: 4px !important;
  margin-left: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  z-index: 5 !important;
}

.tt-card.is-compact .element-icon {
  width: 28px !important;
  height: 28px !important;
}

.tt-card.is-compact .selected-overlay,
.tt-card.is-compact .card-skills-indicators {
  display: none !important;
}

.tt-card.is-compact .selected-overlay,
.tt-card.is-compact .unowned-overlay {
  font-size: 1.2em !important;
}

.tt-card.is-compact .cover-badge {
  position: absolute !important;
  top: -2px !important;
  left: 8px !important;
  font-size: 0.9em !important;
  transform: translateX(-50%) !important;
  text-shadow: 0 0 5px gold;
}

.tt-card.is-compact .card-stats-cross::before {
  display: none !important;
}

@keyframes hammer-hit {
    0% { transform: translate(0, 0); filter: brightness(1); }
    10% { transform: translate(-4px, 3px); filter: brightness(1.3); }
    20% { transform: translate(3px, -2px); filter: brightness(1); }
    30% { transform: translate(-2px, 1px); }
    40% { transform: translate(0, 0); }
}
.tt-card.is-shaking:not(.is-flat) {
    animation: hammer-hit 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
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
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 1.0;
  z-index: 1;
  border-radius: 6px;
}

.card-frame-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  z-index: 2;
  pointer-events: none;
  border-radius: 6px;
}

.card-name-bar {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 80%;
  background: transparent;
  color: white;
  font-size: 7cqw;
  font-weight: 900;
  padding: 0.2em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 5;
  text-shadow: 
    0 0 10px var(--rarity-color, #000),
    0 0 5px var(--rarity-color, #000),
    0 2px 4px rgba(0,0,0,1);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.card-skills-indicators {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 2px;
  z-index: 5;
  transition: opacity 0.3s ease;
}

.skill-dot {
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 0 3px white;
}

.skill-keyword-badge {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 5cqw;
  padding: 0.1em 0.4em;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(2px);
  white-space: nowrap;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 2px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.skill-value {
  color: #4aff4a;
  font-size: 0.9em;
}

.skill-duration {
  color: #00d2ff;
  font-size: 0.8em;
  font-style: italic;
}

/* Stats cross overlay - Expanded to full card */
.card-stats-cross {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.tt-card.dim-on-hover:hover .card-stats-cross,
.tt-card.dim-on-hover:hover .card-elements,
.tt-card.dim-on-hover:hover .cover-badge,
.tt-card.dim-on-hover:hover :deep(.hp-bar-container) {
  opacity: 0.15;
}

.stat {
  position: absolute;
  color: #ffd700;
  font-weight: 900;
  font-size: 20cqw;
  text-shadow: 
    0 0 10px rgba(0,0,0,1),
    0 2px 4px rgba(0,0,0,1),
    0 0 20px rgba(0,0,0,0.5);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease, opacity 0.3s ease;
  transform: translate(-50%, -50%);
}



/* Element badges - Dynamic position via frame */
.card-elements {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 0.2em;
  z-index: 10;
  transition: opacity 0.3s ease;
}

.element-icon {
  width: 1.5em;
  height: 1.5em;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));
}

.quantity-badge {
  position: absolute;
  top: -0.6em;
  right: -0.6em;
  z-index: 100;
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

/* Cover badge - Moved to top-right to avoid stat-top */
.cover-badge {
  position: absolute;
  top: 4%;
  right: 6%;
  color: gold;
  font-size: 1.5em;
  text-shadow: 0 0 8px gold, 0 1px 3px black;
  z-index: 9;
  transition: opacity 0.3s ease;
}

/* Unowned lock */
.unowned-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5em;
  z-index: 10;
  border-radius: inherit;
  opacity: 0.6;
  pointer-events: none;
}

/* ============================================ */
/*  RARITY                                      */
/* ============================================ */




/* Selection border */
.is-selected:not(.is-compact) .tt-card-inner { border-color: #00d2ff !important; box-shadow: 0 0 12px rgba(0, 210, 255, 0.4); }
.is-cover:not(.is-compact) .tt-card-inner    { border-color: gold !important; box-shadow: 0 0 12px rgba(255, 215, 0, 0.5); }
.is-compact.is-selected .tt-card-inner { border-color: #00d2ff !important; }
.is-compact.is-cover .tt-card-inner { border-color: gold !important; }

/* ============================================ */
/*  PREMIUM                                     */
/* ============================================ */
.glare {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  mix-blend-mode: overlay;
  z-index: 2;
  pointer-events: none;
}

.holo-container {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  z-index: 2;
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
  opacity: 1.0;
}

.tt-card.is-premium:hover .holo-container { opacity: 1; }



/* ============================================ */
/*  DETAIL MODE (OBSOLETE OVERRIDES)           */
/* ============================================ */
/* Removed specific xl overrides to keep cards square */


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
  position: relative;
  inset: 0;
  pointer-events: none;
  z-index: 4;
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

.new-badge {
  position: absolute;
  top: -0.8em;
  left: -0.8em;
  z-index: 100;
}

.reveal-shine {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: linear-gradient(
    120deg,
    transparent 0%,
    transparent 30%,
    rgba(255, 255, 255, 0.8) 50%,
    transparent 70%,
    transparent 100%
  );
  transform: translateX(-150%) skewX(-25deg);
  animation: shine-sweep 0.8s ease-in-out forwards;
  pointer-events: none;
}

@keyframes shine-sweep {
  0% { transform: translateX(-150%) skewX(-25deg); opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { transform: translateX(150%) skewX(-25deg); opacity: 0; }
}

.stat.is-boosted {
  color: #4aff4a !important;
  text-shadow: 0 0 8px rgba(74, 255, 74, 0.8), 2px 2px 4px black !important;
  font-weight: 900;
}
</style>

/* Unscoped styles for the Teleported zoom overlay */
<style>
/* Zoom card size */
.card-size-zoom { width: min(350px, 70vw); font-size: 24px; aspect-ratio: auto; }

/* Card inner rendering for zoom (scoped styles don't apply in Teleport) */
.zoom-overlay .tt-card { border-radius: 8px; overflow: visible; position: relative; }
.zoom-overlay .tt-card-inner {
  width: 100%; height: 100%; position: relative; border-radius: inherit;
  overflow: hidden; background: #1a1a2e; border: 2px solid #333; box-sizing: border-box;
}

/* Premium Zoom Effect Styles */


.zoom-overlay .holo-container {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  z-index: 2;
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
  opacity: 1.0;
}

</style>
