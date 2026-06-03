<template>
  <div class="game-board-container" :class="{ 'is-targeting': state.targeting?.active }" ref="containerRef">
    <div class="game-board" ref="boardRef" :style="{ gridTemplateColumns: `repeat(${state.boardWidth}, 1fr)`, gridTemplateRows: `repeat(${state.boardHeight}, auto)` }">
      <div
        v-for="(cell, index) in state.board"
        :key="index"
        class="board-slot"
        :data-slot-index="index"
        :class="{
          'slot-empty': !cell,
          'slot-highlight': !cell && state.selectedCardIndex !== null && state.turn === 'player',
          'slot-occupied': !!cell,
          'slot-player': cell && cell.owner === state.pId,
          'slot-ai': cell && cell.owner === state.aiId,
          'slot-skill-positive': skillPreviewMap && skillPreviewMap.get(index) === 'positive',
          'slot-skill-negative': skillPreviewMap && skillPreviewMap.get(index) === 'negative',
          'slot-skill-occupied-boost': skillPreviewMap && skillPreviewMap.has(index) && cell && cell.owner === state.pId,
          'is-impact': lastPlacedIndex === index,
          'is-drag-over': state.hoveredSlotIndex === index,
          'slot-capture-preview': !cell && previewMap && previewMap.has(index),
          'slot-capture-combo': !cell && previewMap && previewMap.has(index) && previewMap.get(index).comboCaptures.length > 0,
          'slot-targeting-valid': state.targeting?.active && state.targeting.validSlots.includes(index),
          'slot-targeting-invalid': state.targeting?.active && !state.targeting.validSlots.includes(index),
          'slot-targeting-reach-filtered': state.targeting?.active && !state.targeting.validSlots.includes(index) && isSlotWithinReach(index),
          'slot-targeting-affected': state.targeting?.active && getAffectedPreviewSlots.includes(index),
          'slot-targeting-source': state.targeting?.active && state.targeting.step?.sourceSlotId === index
        }"
        :style="getCaptureSlotStyle(index)"
        @click="handleSlotClick(index)"
        @mouseenter="handleSlotMouseEnter(index)"
        @mouseleave="handleSlotMouseLeave(index)"
      >
        <!-- Empty slot marker -->
        <div v-if="!cell && (!state.targeting?.active || state.targeting.step?.sourceSlotId !== index)" class="slot-marker">
          <span class="slot-index">{{ index + 1 }}</span>
        </div>

        <!-- Placed Card Preview during targeting -->
        <div 
          v-if="!cell && state.targeting?.active && state.targeting.step?.sourceSlotId === index"
          class="board-card-wrapper owner-player is-placing-preview"
        >
          <TripleTriadCard
            :card="state.targeting.step.card"
            :flat="true"
            size="100%"
            borderColor="#8800ff"
            :disableZoom="true"
            :dimOnHover="false"
            owner="player"
            :isPremium="state.targeting.step.card.isPremium"
            :showCraftingActions="false"
            :cardFrame="state.pFrame"
            :cardBack="state.pBack"
            :bonus="factionBonuses[state.targeting.step.card.factionCode] || 0"
          />
        </div>

        <!-- Capture halo under occupied cards that will be captured -->
        <div
          v-if="cell && capturedIndicesInfo[index]"
          class="capture-halo"
          :class="{
            'halo-direct': capturedIndicesInfo[index].type === 'direct',
            'halo-combo': capturedIndicesInfo[index].type === 'combo'
          }"
          :style="{ animationDelay: capturedIndicesInfo[index].delay + 'ms' }"
        ></div>

        <!-- Occupied card -->
        <Transition name="card-place" appear>
          <div v-if="cell" class="board-card-wrapper" :class="'owner-' + cell.owner">
            <TripleTriadCard
              :card="cell.data"
              :flat="true"
              size="100%"
              :borderColor="cell.owner === state.pId ? '#00d2ff' : '#ff0055'"
              :disableZoom="false"
              :dimOnHover="false"
              :owner="cell.owner"
              :isPremium="cell.data.isPremium"
              :showCraftingActions="false"
              :cardFrame="cell.owner === state.pId ? state.pFrame : state.aiFrame"
              :cardBack="cell.owner === state.pId ? state.pBack : state.aiBack"
              :bonus="factionBonuses[cell.data.factionCode] || 0"
            />
          </div>
        </Transition>
      </div>
      
      <BrokenGlassOverlay ref="glassOverlay" />
    </div>

    <!-- SVG overlay for luminous lines -->
    <svg
      v-if="previewLines.length > 0"
      class="preview-lines-svg"
      :style="svgStyle"
    >
      <defs>
        <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <line
        v-for="(line, li) in previewLines"
        :key="li"
        :x1="line.x1" :y1="line.y1"
        :x2="line.x2" :y2="line.y2"
        :stroke="line.isCombo ? '#FFD700' : '#00d2ff'"
        :stroke-width="line.isCombo ? 3 : 2.5"
        stroke-linecap="round"
        :filter="line.isCombo ? 'url(#glow-gold)' : 'url(#glow-cyan)'"
        :stroke-dasharray="line.length"
        :stroke-dashoffset="line.length"
        :style="{ animation: `draw-line 0.6s ease forwards ${line.delay}ms` }"
        :opacity="0.85"
      />
    </svg>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue';
import { state, factionBonuses } from '../game/state.js';
import { placeCard } from '../game/game-actions.js';
import { computeAllPreviews } from '../game/capture-preview.js';
import { getTargetCells } from '../../../shared/skills/helpers';
import { skillRegistry } from '../../../shared/skills/index';
import { SkillEngine } from '../../../shared/skills/SkillEngine';
import TripleTriadCard from './TripleTriadCard.vue';
import BrokenGlassOverlay from './BrokenGlassOverlay.vue';

const lastPlacedIndex = ref(null);
const boardRef = ref(null);
const containerRef = ref(null);
const glassOverlay = ref(null);
let glassTriggered = false;

// ---- Targeting Preview Logic ----
const hoveredTargetSlotIndex = ref(null);

function handleSlotMouseEnter(index) {
  if (state.targeting?.active) {
    hoveredTargetSlotIndex.value = index;
  }
}

function handleSlotMouseLeave(index) {
  if (state.targeting?.active && hoveredTargetSlotIndex.value === index) {
    hoveredTargetSlotIndex.value = null;
  }
}

watch(() => state.targeting?.active, (isActive) => {
  if (!isActive) {
    hoveredTargetSlotIndex.value = null;
  }
});

const getAffectedPreviewSlots = computed(() => {
  if (!state.targeting?.active || hoveredTargetSlotIndex.value === null) return [];
  
  // Only preview if the hovered slot is valid
  if (!state.targeting.validSlots.includes(hoveredTargetSlotIndex.value)) return [];

  const step = state.targeting.step;
  if (!step || !step.skill || !step.card) return [];

  const w = state.boardWidth || 3;
  const h = state.boardHeight || 3;

  const sourceSlotId = step.sourceSlotId;
  if (sourceSlotId === undefined) return [];

  if (step.skill.type === 'teleportation') {
    return [hoveredTargetSlotIndex.value];
  }

  // Translate to modular skill if needed
  const translatedSkill = SkillEngine.translateLegacySkill(step.skill) || step.skill;

  // Build a temporary 2D board representing the state WITH the card placed at sourceSlotId
  const tempBoard2D = [];
  for (let y0 = 0; y0 < h; y0++) {
    const row = [];
    for (let x0 = 0; x0 < w; x0++) {
      const idx = y0 * w + x0;
      let cell = state.board[idx];
      if (idx === sourceSlotId) {
        // Temporarily put the placed card there
        cell = { data: step.card, owner: 'player' };
      }
      row.push(cell ? { 
        data: cell.data, 
        owner: cell.owner === 'player' ? 'PLAYER_1' : 'PLAYER_2' 
      } : null);
    }
    tempBoard2D.push(row);
  }

  const sx = sourceSlotId % w;
  const sy = Math.floor(sourceSlotId / w);
  const hx = hoveredTargetSlotIndex.value % w;
  const hy = Math.floor(hoveredTargetSlotIndex.value / w);

  const ctx = {
    board: tempBoard2D,
    x: sx,
    y: sy,
    card: step.card,
    owner: 'PLAYER_1',
    skill: translatedSkill,
    targets: [{ x: hx, y: hy }]
  };

  try {
    const affectedCells = getTargetCells(ctx);
    // Map back to 1D index
    return affectedCells.map(c => c.y * w + c.x);
  } catch (e) {
    console.error('[Preview] Error computing getTargetCells:', e);
    return [];
  }
});

const isSlotWithinReach = (index) => {
  if (!state.targeting?.active || !state.targeting.step) return false;
  const step = state.targeting.step;
  if (step.origin_type !== 'manual' || step.sourceSlotId === undefined) return true;
  
  const reach = step.origin_reach !== undefined && step.origin_reach !== null && step.origin_reach !== 0 ? step.origin_reach : 99;
  const w = state.boardWidth || 3;
  const sourceX = step.sourceSlotId % w;
  const sourceY = Math.floor(step.sourceSlotId / w);
  const x = index % w;
  const y = Math.floor(index / w);
  
  const dist = Math.abs(x - sourceX) + Math.abs(y - sourceY);
  return dist <= reach;
};

// ---- Capture Preview Logic ----

const previewMap = computed(() => {
  // Compute preview whenever a card is selected or being dragged
  const cardIdx = state.selectedCardIndex;
  if (cardIdx === null || cardIdx === undefined) return null;
  if (state.turn !== 'player' || state.busy) return null;

  const card = state.pHand[cardIdx];
  if (!card) return null;

  return computeAllPreviews(card);
});

// Build a flat map of which occupied slots are captured (across all preview slots)
// For the hovered slot specifically, or all if just selected
const activePreviewSlot = computed(() => {
  if (state.hoveredSlotIndex !== null && previewMap.value && previewMap.value.has(state.hoveredSlotIndex)) {
    return state.hoveredSlotIndex;
  }
  return null;
});

const capturedIndicesInfo = computed(() => {
  const info = {};
  if (!previewMap.value) return info;

  // If hovering a specific slot, show only captures for that slot
  // Otherwise show captures for ALL strategic slots
  const slotsToShow = activePreviewSlot.value !== null
    ? [activePreviewSlot.value]
    : [...previewMap.value.keys()];

  let delayCounter = 0;

  for (const slotIdx of slotsToShow) {
    const preview = previewMap.value.get(slotIdx);
    if (!preview) continue;

    for (const cap of preview.directCaptures) {
      if (!info[cap.index]) {
        info[cap.index] = { type: 'direct', delay: delayCounter * 80, fromSlot: slotIdx };
        delayCounter++;
      }
    }
    for (const cap of preview.comboCaptures) {
      if (!info[cap.index]) {
        info[cap.index] = { type: 'combo', delay: 300 + delayCounter * 80, fromSlot: slotIdx };
        delayCounter++;
      }
    }
  }

  return info;
});

// ---- Skill Preview Logic ----

const skillPreviewMap = computed(() => {
  const map = new Map();
  if (state.hoveredSlotIndex === null || state.selectedCardIndex === null || state.turn !== 'player') return map;
  
  const card = state.pHand[state.selectedCardIndex];
  if (!card || !card.skills || card.skills.length === 0) return map;

  const w = state.boardWidth;
  const h = state.boardHeight;
  const x = state.hoveredSlotIndex % w;
  const y = Math.floor(state.hoveredSlotIndex / w);

  // Convert flat board to 2D for getting targets accurately
  const board2D = [];
  for (let r = 0; r < h; r++) {
      board2D.push(state.board.slice(r * w, (r + 1) * w));
  }
  
  // Temporarily place the card to simulate its position
  board2D[y][x] = { data: card, owner: state.pId };

  for (const skill of card.skills) {
     const handler = skillRegistry.getHandler(skill.type);
     if (!handler) continue;
     
     const effectType = handler.effectType || 'neutral';
     if (effectType === 'neutral') continue;
     
     const ctx = {
       board: board2D,
       state: state,
       x, y,
       card: card,
       skill: skill,
       owner: state.pId
     };
     
     const targets = getTargetCells(ctx);
     for (const t of targets) {
       const flatIndex = t.y * w + t.x;
       map.set(flatIndex, effectType);
     }
  }

  return map;
});

// ---- SVG Lines ----

const slotRects = ref({});

function updateSlotRects() {
  if (!boardRef.value || !containerRef.value) return;
  
  const slots = boardRef.value.querySelectorAll('.board-slot');
  const containerRect = containerRef.value.getBoundingClientRect();
  const rects = {};

  slots.forEach((el) => {
    const idx = parseInt(el.getAttribute('data-slot-index'), 10);
    const r = el.getBoundingClientRect();
    rects[idx] = {
      cx: r.left - containerRect.left + r.width / 2,
      cy: r.top - containerRect.top + r.height / 2,
      width: r.width,
      height: r.height
    };
  });

  slotRects.value = rects;
}

const svgStyle = computed(() => {
  if (!containerRef.value) return {};
  return {
    width: '100%',
    height: '100%'
  };
});

const previewLines = computed(() => {
  const lines = [];
  if (!previewMap.value) return lines;

  const rects = slotRects.value;
  if (!rects || Object.keys(rects).length === 0) return lines;

  // If hovering a specific slot, only draw lines for that slot
  const slotsToShow = activePreviewSlot.value !== null
    ? [activePreviewSlot.value]
    : [...previewMap.value.keys()];

  let lineDelay = 0;

  for (const slotIdx of slotsToShow) {
    const preview = previewMap.value.get(slotIdx);
    if (!preview) continue;

    const from = rects[slotIdx];
    if (!from) continue;

    for (const cap of preview.directCaptures) {
      const to = rects[cap.index];
      if (!to) continue;

      const dx = to.cx - from.cx;
      const dy = to.cy - from.cy;
      const length = Math.sqrt(dx * dx + dy * dy);

      lines.push({
        x1: from.cx, y1: from.cy,
        x2: to.cx, y2: to.cy,
        length,
        isCombo: false,
        delay: lineDelay * 100
      });
      lineDelay++;
    }

    for (const cap of preview.comboCaptures) {
      const comboFrom = rects[cap.sourceIndex];
      const to = rects[cap.index];
      if (!comboFrom || !to) continue;

      const dx = to.cx - comboFrom.cx;
      const dy = to.cy - comboFrom.cy;
      const length = Math.sqrt(dx * dx + dy * dy);

      lines.push({
        x1: comboFrom.cx, y1: comboFrom.cy,
        x2: to.cx, y2: to.cy,
        length,
        isCombo: true,
        delay: 400 + lineDelay * 100
      });
      lineDelay++;
    }
  }

  return lines;
});

// Watch for preview map changes to update slot rects
watch(previewMap, async (val) => {
  if (val) {
    await nextTick();
    updateSlotRects();
  }
}, { immediate: true });

// Also recompute on hover changes
watch(() => state.hoveredSlotIndex, async () => {
  if (previewMap.value) {
    await nextTick();
    updateSlotRects();
  }
});

// Recompute on window resize
let resizeObserver = null;
onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateSlotRects();
    });
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// ---- Slot styling helpers ----

function getCaptureSlotStyle(index) {
  if (!previewMap.value || !previewMap.value.has(index) || state.board[index] !== null) return {};

  const preview = previewMap.value.get(index);
  const total = preview.totalCaptures;
  const hasCombo = preview.comboCaptures.length > 0;

  // Intensity scales with number of captures
  const baseOpacity = Math.min(0.15 + total * 0.08, 0.45);

  if (hasCombo) {
    return {
      '--preview-color': '#FFD700',
      '--preview-opacity': baseOpacity,
      '--preview-glow': `0 0 ${12 + total * 4}px rgba(255, 215, 0, ${baseOpacity})`,
    };
  }

  return {
    '--preview-color': '#00d2ff',
    '--preview-opacity': baseOpacity,
    '--preview-glow': `0 0 ${10 + total * 3}px rgba(0, 210, 255, ${baseOpacity})`,
  };
}

// ---- Existing logic ----

watch(() => state.comboCount, async (newVal, oldVal) => {
  if (newVal > (oldVal || 0) && boardRef.value) {
     const intensity = Math.min(newVal * 2, 10);
     boardRef.value.animate([
       { transform: `translate3d(-${intensity}px, 0, 0)` },
       { transform: `translate3d(${intensity}px, 0, 0)` },
       { transform: `translate3d(-${intensity/2}px, 0, 0)` },
       { transform: `translate3d(${intensity/2}px, 0, 0)` },
       { transform: 'translate3d(0, 0, 0)' }
     ], { duration: 400, easing: 'ease-in-out' });
  }

  if (newVal >= 4 && !glassTriggered && state.comboActiveIndex !== null) {
    glassTriggered = true;
    await nextTick();
    triggerGlassEffect(state.comboActiveIndex);
  }
  
  if (newVal === 0) {
    glassTriggered = false;
  }
});

function triggerGlassEffect(slotIndex) {
  if (!glassOverlay.value || !boardRef.value) return;
  
  const slotEls = boardRef.value.querySelectorAll('.board-slot');
  const slotEl = slotEls[slotIndex];
  if (!slotEl) return;
  
  const boardRect = boardRef.value.getBoundingClientRect();
  const slotRect = slotEl.getBoundingClientRect();

  const x = slotRect.left - boardRect.left + slotRect.width / 2;
  const y = slotRect.top - boardRect.top + slotRect.height / 2;

  glassOverlay.value.triggerImpactAt(x, y);
}

function handleSlotClick(index) {
  console.log(`[Targeting-Flow] [GameBoard.vue] Clicked slot index ${index}. Active targeting state:`, JSON.stringify(state.targeting));
  if (state.targeting?.active) {
    if (state.targeting.validSlots.includes(index)) {
      console.log(`[Targeting-Flow] [GameBoard.vue] Slot ${index} is in valid slots list. Invoking state.targeting.resolve(index)`);
      state.targeting.resolve(index);
    } else {
      console.warn(`[Targeting-Flow] [GameBoard.vue] Slot ${index} is NOT in valid slots list:`, state.targeting.validSlots);
    }
    return;
  }
  if (state.board[index] !== null) {
    console.log(`[Targeting-Flow] [GameBoard.vue] Slot ${index} is not empty. Ignoring click.`);
    return;
  }
  if (state.selectedCardIndex === null) {
    console.log(`[Targeting-Flow] [GameBoard.vue] No card selected. Ignoring click.`);
    return;
  }
  triggerPlacement(index);
}

async function triggerPlacement(index) {
  lastPlacedIndex.value = index;
  // Clear preview before placing
  state.capturePreview = null;
  await placeCard(index);
  
  setTimeout(() => {
    if (lastPlacedIndex.value === index) lastPlacedIndex.value = null;
  }, 500);
}

defineExpose({
    setDragOver(index) {
        state.hoveredSlotIndex = index;
    }
});
</script>

<style scoped>
.game-board-container {
  position: relative;
  width: 100%;
  max-width: min(500px, 95vw);
  margin: 0 auto;
}

.game-board {
  display: grid;
  gap: 20px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-height: 70vh;
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .game-board {
    gap: 8px;
    padding: 10px;
    border-radius: 10px;
  }
}

.board-slot {
  position: relative;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  aspect-ratio: 1 / 1;
  z-index: 2;
}

.board-slot.slot-empty:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.board-slot.slot-highlight {
  background: rgba(0, 210, 255, 0.04);
  border-color: rgba(0, 210, 255, 0.15);
  animation: slot-pulse 3s ease-in-out infinite;
}

.board-slot.slot-highlight:hover {
  background: rgba(0, 210, 255, 0.1);
  border-color: rgba(0, 210, 255, 0.4);
}

.board-slot.slot-occupied {
  cursor: default;
}

.board-slot.slot-player {
  background: color-mix(in srgb, #00d2ff 35%, rgba(0, 0, 0, 0.3));
  border: 4px solid rgba(0, 210, 255, 0.9);
  box-shadow: 
    inset 0 0 50px rgba(0, 210, 255, 0.4),
    0 0 20px rgba(0, 210, 255, 0.3);
}

.board-slot.slot-ai {
  background: color-mix(in srgb, #ff0055 35%, rgba(0, 0, 0, 0.3));
  border: 4px solid rgba(255, 0, 85, 0.9);
  box-shadow: 
    inset 0 0 50px rgba(255, 0, 85, 0.4),
    0 0 20px rgba(255, 0, 85, 0.3);
}

/* ---- Targeting session styles ---- */
.game-board-container.is-targeting,
.is-targeting .board-slot.slot-targeting-valid,
.is-targeting .board-slot.slot-targeting-valid * {
  cursor: url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2796%27%20height%3D%2796%27%20viewBox%3D%270%200%2096%2096%27%20fill%3D%27none%27%20stroke%3D%27%2300d2ff%27%20stroke-width%3D%272%27%3E%3Ccircle%20cx%3D%2748%27%20cy%3D%2748%27%20r%3D%2730%27%2F%3E%3Ccircle%20cx%3D%2748%27%20cy%3D%2748%27%20r%3D%2710%27%20stroke-dasharray%3D%274%2C4%27%20stroke-width%3D%271.5%27%2F%3E%3Ccircle%20cx%3D%2748%27%20cy%3D%2748%27%20r%3D%273%27%20fill%3D%27%2300d2ff%27%2F%3E%3Cpath%20d%3D%27M48%206v16M48%2074v16M6%2048h16M74%2048h16%27%2F%3E%3C%2Fsvg%3E") 48 48, crosshair !important;
}
.board-slot.slot-targeting-valid {
  cursor: crosshair;
  z-index: 20 !important;
  box-shadow: 
    0 -12px 18px -7px rgba(136, 0, 255, 0.8),
    0 12px 18px -7px rgba(136, 0, 255, 0.8),
    -12px 0 18px -7px rgba(136, 0, 255, 0.8),
    12px 0 18px -7px rgba(136, 0, 255, 0.8) !important;
}
.board-slot.slot-targeting-valid.slot-empty {
  background: rgba(136, 0, 255, 0.1) !important;
  border-color: rgba(136, 0, 255, 0.4) !important;
  box-shadow: 
    0 -8px 10px -6px rgba(136, 0, 255, 0.4),
    0 8px 10px -6px rgba(136, 0, 255, 0.4),
    -8px 0 10px -6px rgba(136, 0, 255, 0.4),
    8px 0 10px -6px rgba(136, 0, 255, 0.4) !important;
}
.board-slot.slot-targeting-valid:hover {
  transform: scale(1.05) !important;
  box-shadow: 
    0 -16px 22px -6px rgba(136, 0, 255, 0.95),
    0 16px 22px -6px rgba(136, 0, 255, 0.95),
    -16px 0 22px -6px rgba(136, 0, 255, 0.95),
    16px 0 22px -6px rgba(136, 0, 255, 0.95) !important;
}
.board-slot.slot-targeting-valid.slot-empty:hover {
  background: rgba(136, 0, 255, 0.2) !important;
  border-color: rgba(136, 0, 255, 0.7) !important;
}
.board-slot.slot-targeting-invalid {
  opacity: 0.25 !important;
  filter: grayscale(80%) brightness(0.6) !important;
  cursor: not-allowed !important;
  pointer-events: auto !important;
}
.board-slot.slot-targeting-reach-filtered {
  opacity: 0.65 !important;
  filter: none !important;
  border: 1.5px dashed rgba(136, 0, 255, 0.5) !important;
  background: rgba(136, 0, 255, 0.05) !important;
  cursor: not-allowed !important;
  pointer-events: auto !important;
}
.board-slot.slot-targeting-affected {
  opacity: 1.0 !important;
  filter: none !important;
  z-index: 30 !important;
  box-shadow: 
    -10px -10px 18px -7px rgba(255, 159, 0, 0.8),
    10px -10px 18px -7px rgba(255, 159, 0, 0.8),
    -10px 10px 18px -7px rgba(255, 159, 0, 0.8),
    10px 10px 18px -7px rgba(255, 159, 0, 0.8) !important;
}
.board-slot.slot-targeting-affected.slot-empty {
  background: rgba(255, 159, 0, 0.1) !important;
  border-color: rgba(255, 159, 0, 0.4) !important;
  box-shadow: 
    -6px -6px 12px -7px rgba(255, 159, 0, 0.4),
    6px -6px 12px -7px rgba(255, 159, 0, 0.4),
    -6px 6px 12px -7px rgba(255, 159, 0, 0.4),
    6px 6px 12px -7px rgba(255, 159, 0, 0.4) !important;
}
.board-slot.slot-targeting-source {
  z-index: 40 !important;
  box-shadow: 
    0 -12px 18px -7px rgba(136, 0, 255, 0.8),
    0 12px 18px -7px rgba(136, 0, 255, 0.8),
    -12px 0 18px -7px rgba(136, 0, 255, 0.8),
    12px 0 18px -7px rgba(136, 0, 255, 0.8) !important;
}
.board-slot.slot-targeting-source.slot-empty {
  border-color: #8800ff !important;
  background: rgba(136, 0, 255, 0.15) !important;
}

.board-card-wrapper.is-placing-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 50;
  pointer-events: none;
  transform: translateY(-12px) scale(1.08) translateZ(20px);
  filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.65)) brightness(1.25);
  transition: transform 0.3s ease, filter 0.3s ease;
  animation: floating-preview 3s infinite ease-in-out;
}

@keyframes floating-preview {
  0%, 100% {
    transform: translateY(-12px) scale(1.08) translateZ(20px);
    filter: drop-shadow(0 15px 25px rgba(136, 0, 255, 0.6)) brightness(1.2);
  }
  50% {
    transform: translateY(-20px) scale(1.1) translateZ(40px);
    filter: drop-shadow(0 25px 35px rgba(136, 0, 255, 0.9)) brightness(1.4);
  }
}

.board-slot.is-drag-over {
  background: rgba(0, 210, 255, 0.2);
  border-color: #00d2ff;
  box-shadow: 
    0 0 30px rgba(0, 210, 255, 0.6),
    inset 0 0 20px rgba(0, 210, 255, 0.3);
  transform: scale(1.05);
  z-index: 15;
}

/* ---- Capture Preview Styles ---- */

.board-slot.slot-capture-preview {
  background: color-mix(in srgb, var(--preview-color, #00d2ff) calc(var(--preview-opacity, 0.15) * 100%), transparent);
  border-color: var(--preview-color, #00d2ff);
  box-shadow: var(--preview-glow, none);
  animation: capture-slot-pulse 2s ease-in-out infinite;
}

.board-slot.slot-capture-preview:hover {
  box-shadow:
    0 0 20px color-mix(in srgb, var(--preview-color, #00d2ff) 60%, transparent),
    inset 0 0 15px color-mix(in srgb, var(--preview-color, #00d2ff) 20%, transparent);
  transform: scale(1.03);
  border-width: 2.5px;
}

.board-slot.slot-capture-combo {
  animation: capture-combo-pulse 1.8s ease-in-out infinite;
}

/* ---- Skill Preview Styles ---- */

.board-slot.slot-skill-positive {
  background: color-mix(in srgb, rgba(34, 197, 94, 0.25) 100%, transparent);
  border-color: #22c55e;
  box-shadow: 0 0 15px rgba(34, 197, 94, 0.4), inset 0 0 10px rgba(34, 197, 94, 0.2);
  animation: skill-positive-pulse 2s ease-in-out infinite;
}

.board-slot.slot-skill-negative {
  background: color-mix(in srgb, rgba(239, 68, 68, 0.25) 100%, transparent);
  border-color: #ef4444;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(239, 68, 68, 0.2);
  animation: skill-negative-pulse 2s ease-in-out infinite;
}

.board-slot.slot-skill-occupied-boost {
  border-width: 3px;
  filter: brightness(1.4);
}

@keyframes skill-positive-pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.3), inset 0 0 5px rgba(34, 197, 94, 0.1); }
  50% { box-shadow: 0 0 25px rgba(34, 197, 94, 0.6), inset 0 0 15px rgba(34, 197, 94, 0.3); }
}

@keyframes skill-negative-pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.3), inset 0 0 5px rgba(239, 68, 68, 0.1); }
  50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.6), inset 0 0 15px rgba(239, 68, 68, 0.3); }
}

/* ---- Capture Halo under cards ---- */

.capture-halo {
  position: absolute;
  inset: -6px;
  border-radius: 14px;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  animation: halo-appear 0.5s ease forwards;
}

.capture-halo.halo-direct {
  background: radial-gradient(ellipse at center, rgba(0, 210, 255, 0.25) 0%, rgba(0, 210, 255, 0.08) 50%, transparent 75%);
  box-shadow:
    0 0 15px rgba(0, 210, 255, 0.4),
    0 0 30px rgba(0, 210, 255, 0.15),
    inset 0 0 10px rgba(0, 210, 255, 0.1);
  animation: halo-appear 0.5s ease forwards, halo-pulse-cyan 2s ease-in-out infinite 0.5s;
}

.capture-halo.halo-combo {
  background: radial-gradient(ellipse at center, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0.1) 50%, transparent 75%);
  box-shadow:
    0 0 20px rgba(255, 215, 0, 0.45),
    0 0 40px rgba(255, 215, 0, 0.15),
    inset 0 0 10px rgba(255, 215, 0, 0.1);
  animation: halo-appear 0.5s ease forwards, halo-pulse-gold 1.6s ease-in-out infinite 0.5s;
}

@keyframes halo-appear {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes halo-pulse-cyan {
  0%, 100% {
    box-shadow:
      0 0 15px rgba(0, 210, 255, 0.4),
      0 0 30px rgba(0, 210, 255, 0.15);
    opacity: 0.9;
  }
  50% {
    box-shadow:
      0 0 25px rgba(0, 210, 255, 0.6),
      0 0 50px rgba(0, 210, 255, 0.25);
    opacity: 1;
  }
}

@keyframes halo-pulse-gold {
  0%, 100% {
    box-shadow:
      0 0 20px rgba(255, 215, 0, 0.45),
      0 0 40px rgba(255, 215, 0, 0.15);
    opacity: 0.9;
  }
  50% {
    box-shadow:
      0 0 30px rgba(255, 215, 0, 0.7),
      0 0 60px rgba(255, 215, 0, 0.3);
    opacity: 1;
  }
}

@keyframes capture-slot-pulse {
  0%, 100% {
    border-color: color-mix(in srgb, var(--preview-color, #00d2ff) 40%, transparent);
  }
  50% {
    border-color: color-mix(in srgb, var(--preview-color, #00d2ff) 80%, transparent);
  }
}

@keyframes capture-combo-pulse {
  0%, 100% {
    border-color: rgba(255, 215, 0, 0.4);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.15);
  }
  50% {
    border-color: rgba(255, 215, 0, 0.9);
    box-shadow: 0 0 25px rgba(255, 215, 0, 0.4), 0 0 50px rgba(255, 215, 0, 0.15);
  }
}

/* ---- SVG Lines Overlay ---- */

.preview-lines-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 20;
  overflow: visible;
}

@keyframes draw-line {
  to {
    stroke-dashoffset: 0;
  }
}

/* ---- Existing styles ---- */

.slot-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.slot-index {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.08);
  font-weight: bold;
  user-select: none;
}

.board-card-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.board-card-wrapper :deep(.tt-card) {
  width: 100% !important;
  height: 100% !important;
}

/* Card placement animation */
.card-place-enter-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.card-place-enter-from {
  opacity: 0;
  transform: translateY(-40px) rotateX(-15deg) scale(1.1);
  filter: blur(2px);
}

/* Impact effect */
.board-slot.is-impact {
  animation: impact 0.4s ease-out both;
}

@keyframes impact {
  0% { transform: scale(1); }
  30% { transform: scale(0.96); }
  100% { transform: scale(1); }
}

@keyframes slot-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(0, 210, 255, 0.1); }
  50%  { box-shadow: 0 0 12px 2px rgba(0, 210, 255, 0.15); }
  100% { box-shadow: 0 0 0 0 rgba(0, 210, 255, 0.1); }
}
</style>
