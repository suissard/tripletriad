<template>
  <div class="player-hand" :class="{ 'is-disabled': state.turn !== 'player' || state.busy }">
    
    <ArchedFanContainer
      :items="state.pHand"
      :selected-index="state.selectedCardIndex"
      :arc-size="0.06"
      :radius="handRadius"
      :hover-delta="0.005"
      :arc-center="0.75"
      vertical-offset="620%"
      height="140px"
      item-class="hand-card-slot"
      @click="onCardClick"
      @pointerdown="onPointerDownFromFan"
    >
      <template #default="{ item: card, index }">
        <div 
          class="card-wrapper"
          :class="{
            'is-dragging-id': draggingCardId === card.id,
            'is-placing': card.isPlacing
          }"
        >
          <TripleTriadCard
            :card="card"
            :flat="false"
            size="md"
            borderColor="#00d2ff"
            :disableZoom="false"
            :dimOnHover="false"
            :cardBack="state.pBack"
            :isPremium="card.isPremium"
            :showCraftingActions="false"
            :cardFrame="state.pFrame"
            :bonus="factionBonuses[card.factionCode] || 0"
          />
        </div>
      </template>
    </ArchedFanContainer>

    <!-- Turn indicator & Deck count -->
    <div class="hand-footer" v-if="state.gameState === 'playing'">
      <div class="turn-indicator">
        <span v-if="state.turn === 'player'" class="turn-text turn-yours">🎯 À vous de jouer</span>
        <span v-else class="turn-text turn-opponent">⏳ Tour de l'adversaire...</span>
      </div>
      <div class="deck-info">
        <span class="deck-icon">🃏</span>
        <span class="deck-count">{{ state.pDeck.length }} restantes</span>
      </div>
    </div>

    <!-- Ghost element for dragging -->
    <Teleport to="body">
      <div
        v-if="draggingCardId !== null"
        class="drag-ghost"
        :style="{
          transform: `translate(${dragPos.x}px, ${dragPos.y}px) scale(1.1) rotate(2deg)`,
          transition: isSnappingBack ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'opacity 0.2s ease, transform 0.1s linear'
        }"
        :class="{ 'is-over-valid': state.hoveredSlotIndex !== null && state.board[state.hoveredSlotIndex] === null }"
        @transitionend="onSnapBackEnd"
      >
        <TripleTriadCard
          :card="getDraggingCard()"
          :flat="false"
          size="md"
          borderColor="#00d2ff"
          :disableZoom="false"
          :dimOnHover="false"
          :cardBack="state.pBack"
          :isPremium="getDraggingCard()?.isPremium"
          :showCraftingActions="false"
          :cardFrame="state.pFrame"
          :bonus="getDraggingCard() ? (factionBonuses[getDraggingCard().factionCode] || 0) : 0"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { state, factionBonuses } from '../game/state.js';
import { selectCard, placeCard } from '../game/game-actions.js';
import TripleTriadCard from './TripleTriadCard.vue';
import ArchedFanContainer from './ui/ArchedFanContainer.vue';

const draggingIndex = ref(null);
const draggingCardId = ref(null);
const dragPos = ref({ x: 0, y: 0 });
const startPos = ref({ x: 0, y: 0 });
const isSnappingBack = ref(false);
const hasMoved = ref(false);

let originalRect = null;
let pointerOffset = { x: 0, y: 0 };

const handRadius = computed(() => {
    // Even flatter radius
    return '800px';
});

function getDraggingCard() {
    if (draggingCardId.value === null) return null;
    return state.pHand.find(c => c.id === draggingCardId.value);
}

function onCardClick({ index }) {
    if (!hasMoved.value) {
        selectCard(index);
    }
}

function onPointerDownFromFan({ event, item: card, index }) {
  if (state.turn !== 'player' || state.busy) return;

  event.preventDefault();

  const el = event.currentTarget;
  originalRect = el.getBoundingClientRect();

  pointerOffset = {
    x: event.clientX - originalRect.left,
    y: event.clientY - originalRect.top
  };

  startPos.value = { x: event.clientX, y: event.clientY };
  hasMoved.value = false;
  isSnappingBack.value = false;

  dragPos.value = {
    x: event.clientX - pointerOffset.x,
    y: event.clientY - pointerOffset.y
  };

  draggingIndex.value = index;
  draggingCardId.value = card.id;
  state.selectedCardIndex = index;

  document.addEventListener('pointermove', onPointerMove, { passive: false });
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerCancel);
}

function onPointerMove(event) {
  if (draggingCardId.value === null) return;
  event.preventDefault();

  const dx = event.clientX - startPos.value.x;
  const dy = event.clientY - startPos.value.y;

  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    hasMoved.value = true;
  }

  dragPos.value = {
    x: event.clientX - pointerOffset.x,
    y: event.clientY - pointerOffset.y
  };
  
  if (hasMoved.value) {
    const elementsUnderPointer = document.elementsFromPoint(event.clientX, event.clientY);
    const boardSlot = elementsUnderPointer.find(el => el.classList && el.classList.contains('board-slot'));
    
    if (boardSlot) {
      const slotIndexStr = boardSlot.getAttribute('data-slot-index');
      if (slotIndexStr !== null) {
        state.hoveredSlotIndex = parseInt(slotIndexStr, 10);
      } else {
        state.hoveredSlotIndex = null;
      }
    } else {
      state.hoveredSlotIndex = null;
    }
  }
}

async function onPointerUp(event) {
  state.hoveredSlotIndex = null;
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
  document.removeEventListener('pointercancel', onPointerCancel);

  if (draggingCardId.value === null) return;

  if (!hasMoved.value) {
    draggingIndex.value = null;
    draggingCardId.value = null;
    return;
  }

  const ghostEl = document.querySelector('.drag-ghost');
  if (ghostEl) ghostEl.style.pointerEvents = 'none';

  const elementsUnderPointer = document.elementsFromPoint(event.clientX, event.clientY);
  const boardSlot = elementsUnderPointer.find(el => el.classList && el.classList.contains('board-slot'));

  if (boardSlot) {
    const slotIndexStr = boardSlot.getAttribute('data-slot-index');
    if (slotIndexStr !== null) {
      const slotIndex = parseInt(slotIndexStr, 10);
      state.selectedCardIndex = draggingIndex.value;
      if (state.board[slotIndex] === null) {
          const p = placeCard(slotIndex);
          draggingIndex.value = null;
          draggingCardId.value = null;
          await p;
          return;
      }
    }
  }

  if (state.selectedCardIndex !== draggingIndex.value) {
    selectCard(draggingIndex.value);
  }

  snapBack();
}

function onPointerCancel() {
  state.hoveredSlotIndex = null;
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
  document.removeEventListener('pointercancel', onPointerCancel);
  
  if (draggingCardId.value !== null && hasMoved.value) {
      snapBack();
  } else {
      draggingIndex.value = null;
      draggingCardId.value = null;
  }
}

function snapBack() {
    isSnappingBack.value = true;
    dragPos.value = {
        x: originalRect.left,
        y: originalRect.top
    };
}

function onSnapBackEnd() {
    if (isSnappingBack.value) {
        draggingIndex.value = null;
        draggingCardId.value = null;
        isSnappingBack.value = false;
    }
}

onUnmounted(() => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);
});
</script>

<style scoped>
.player-hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 32px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 24px;
  border: 1px solid rgba(0, 210, 255, 0.15);
  backdrop-filter: blur(12px);
  transition: opacity 0.3s;
  touch-action: none;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.player-hand.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

@media (max-width: 900px) {
  .player-hand {
    padding: 12px;
    gap: 4px;
    border-radius: 16px;
  }
}

:deep(.hand-card-slot) {
  width: clamp(90px, 12vw, 130px);
  aspect-ratio: 4/6;
  border-radius: 10px;
}

/* Dim the original card while it's being dragged via the ghost */
.card-wrapper.is-dragging-id,
.card-wrapper.is-placing {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.1s;
}

:deep(.hand-card-slot.is-selected)::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 12px;
  border: 2px solid #00d2ff;
  box-shadow: 0 0 20px rgba(0, 210, 255, 0.5), 0 0 40px rgba(0, 210, 255, 0.2);
  animation: selected-pulse 1.5s ease-in-out infinite;
  pointer-events: none;
  z-index: -1;
}

.hand-footer {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding: 0 4px;
}

.turn-indicator {
  display: flex;
}

.deck-info {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 10px;
  border-radius: 20px;
  border: 1px solid rgba(0, 210, 255, 0.2);
}

.deck-icon {
  font-size: 0.9rem;
}

.deck-count {
  font-size: 0.75rem;
  font-weight: bold;
  color: #00d2ff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.turn-text {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.turn-yours {
  color: #00d2ff;
  text-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
}

.turn-opponent {
  color: #888;
}

@keyframes selected-pulse {
  0%   { box-shadow: 0 0 20px rgba(0, 210, 255, 0.5), 0 0 40px rgba(0, 210, 255, 0.2); }
  50%  { box-shadow: 0 0 30px rgba(0, 210, 255, 0.8), 0 0 60px rgba(0, 210, 255, 0.3); }
  100% { box-shadow: 0 0 20px rgba(0, 210, 255, 0.5), 0 0 40px rgba(0, 210, 255, 0.2); }
}
</style>

<style>
/* Global styles for ghost */
.drag-ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  pointer-events: none;
  will-change: transform;
  transition: filter 0.2s ease, opacity 0.2s ease;
  opacity: 0.8;
}

.drag-ghost.is-over-valid {
  opacity: 1;
}

@media (max-width: 900px) {
  .drag-ghost :deep(.tt-card) {
    transform: scale(0.85);
    transform-origin: top left;
  }
}
</style>
