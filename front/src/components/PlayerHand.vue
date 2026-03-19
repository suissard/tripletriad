<template>
  <div class="player-hand" :class="{ 'is-disabled': state.turn !== 'player' || state.busy }">
    <TransitionGroup name="hand-card" tag="div" class="hand-cards">
      <div
        v-for="(card, index) in state.pHand"
        :key="card.id"
        class="hand-card-slot"
        :class="{
          'is-selected': state.selectedCardIndex === index,
          'is-unaffordable': state.pMana < 1,
          'is-dragging-id': draggingCardId === card.id,
          'is-placing': card.isPlacing
        }"
        @pointerdown="onPointerDown($event, index, card.id)"
      >
        <TripleTriadCard
          :card="card"
          :flat="false"
          size="md"
          borderColor="#00d2ff"
          :disableZoom="true"
          :cardBack="state.editingDeck?.cardBack || 'default'"
          :isPremium="card.isPremium"
        />

      </div>
    </TransitionGroup>

    <!-- Turn indicator -->
    <div class="turn-indicator" v-if="state.gameState === 'playing'">
      <span v-if="state.turn === 'player'" class="turn-text turn-yours">🎯 À vous de jouer</span>
      <span v-else class="turn-text turn-opponent">⏳ Tour de l'adversaire...</span>
    </div>

    <!-- Ghost element for dragging -->
    <Teleport to="body">
      <div
        v-if="draggingCardId !== null"
        class="drag-ghost"
        :style="{
          transform: `translate(${dragPos.x}px, ${dragPos.y}px) scale(1.1) rotate(2deg)`,
          transition: isSnappingBack ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
        }"
        @transitionend="onSnapBackEnd"
      >
        <TripleTriadCard
          :card="getDraggingCard()"
          :flat="false"
          size="md"
          borderColor="#00d2ff"
          :disableZoom="true"
          :cardBack="state.editingDeck?.cardBack || 'default'"
          :isPremium="getDraggingCard()?.isPremium"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { state } from '../game/state.js';
import { selectCard, placeCard } from '../game/game-actions.js';
import TripleTriadCard from './TripleTriadCard.vue';

const draggingIndex = ref(null);
const draggingCardId = ref(null);
const dragPos = ref({ x: 0, y: 0 });
const startPos = ref({ x: 0, y: 0 });
const isSnappingBack = ref(false);
const hasMoved = ref(false);

let originalRect = null;
let pointerOffset = { x: 0, y: 0 };

function getDraggingCard() {
    if (draggingCardId.value === null) return null;
    return state.pHand.find(c => c.id === draggingCardId.value);
}

function onPointerDown(event, index, cardId) {
  if (state.turn !== 'player' || state.busy) return;
  if (state.pMana < 1) return;

  // Prevent default to avoid selection issues and native drag behavior
  event.preventDefault();

  const el = event.currentTarget;
  originalRect = el.getBoundingClientRect();

  // Calculate offset of pointer relative to the top-left of the card
  pointerOffset = {
    x: event.clientX - originalRect.left,
    y: event.clientY - originalRect.top
  };

  startPos.value = { x: event.clientX, y: event.clientY };
  hasMoved.value = false;
  isSnappingBack.value = false;

  // Set initial position of the ghost
  dragPos.value = {
    x: event.clientX - pointerOffset.x,
    y: event.clientY - pointerOffset.y
  };

  draggingIndex.value = index;
  draggingCardId.value = cardId;

  // Add global listeners
  document.addEventListener('pointermove', onPointerMove, { passive: false });
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerCancel);
}

function onPointerMove(event) {
  if (draggingCardId.value === null) return;

  // Prevent scrolling on touch devices while dragging
  event.preventDefault();

  const dx = event.clientX - startPos.value.x;
  const dy = event.clientY - startPos.value.y;

  // Small threshold to distinguish a click from a drag
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    hasMoved.value = true;
  }

  dragPos.value = {
    x: event.clientX - pointerOffset.x,
    y: event.clientY - pointerOffset.y
  };
  
  // Track hovered board slot
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
  state.hoveredSlotIndex = null; // Clear highlight on release
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
  document.removeEventListener('pointercancel', onPointerCancel);

  if (draggingCardId.value === null) return;

  if (!hasMoved.value) {
    // Treat as a click
    selectCard(draggingIndex.value);
    draggingIndex.value = null;
    return;
  }

  // Find the drop target
  // Hide ghost temporarily to let elementFromPoint see underneath
  const ghostEl = document.querySelector('.drag-ghost');
  if (ghostEl) {
      ghostEl.style.pointerEvents = 'none';
  }

  const elementsUnderPointer = document.elementsFromPoint(event.clientX, event.clientY);
  const boardSlot = elementsUnderPointer.find(el => el.classList && el.classList.contains('board-slot'));

  if (boardSlot) {
    const slotIndexStr = boardSlot.getAttribute('data-slot-index');
    if (slotIndexStr !== null) {
      const slotIndex = parseInt(slotIndexStr, 10);

      // Select the card first so placeCard knows which one to place
      state.selectedCardIndex = draggingIndex.value;

      // Attempt to place
      if (state.board[slotIndex] === null) {
          const p = placeCard(slotIndex);
          draggingIndex.value = null;
          draggingCardId.value = null; // Hide ghost immediately
          await p;
          return; // Success
      }
    }
  }

  // Snap back if dropped outside valid slot or slot was occupied
  snapBack();
}

function onPointerCancel(event) {
  state.hoveredSlotIndex = null; // Clear highlight on cancel
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
    // Animate back to original rectangle position
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
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 16px;
  border: 1px solid rgba(0, 210, 255, 0.15);
  backdrop-filter: blur(8px);
  transition: opacity 0.3s;
  /* Prevent touch actions like zooming/panning on the hand container */
  touch-action: none;
}

.player-hand.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

@media (max-width: 900px) {
  .player-hand {
    padding: 6px 8px;
    gap: 4px;
    border-radius: 10px;
    width: 100%;
  }
}

.hand-cards {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

@media (max-width: 900px) {
  .hand-cards {
    gap: 4px;
  }
}

.hand-card-slot {
  position: relative;
  cursor: grab;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  border-radius: 10px;
  /* Ensure pointers work properly */
  touch-action: none;
  user-select: none;
}

.hand-card-slot:active {
  cursor: grabbing;
}

@media (max-width: 900px) {
  .hand-card-slot :deep(.tt-card) {
    transform: scale(0.85);
  }
}

.hand-card-slot:hover:not(.is-unaffordable) {
  transform: translateY(-8px) scale(1.05);
  z-index: 5;
}

.hand-card-slot.is-selected {
  transform: translateY(-16px) scale(1.08);
  z-index: 10;
}

/* Dim the original card while it's being dragged via the ghost */
.hand-card-slot.is-dragging-id,
.hand-card-slot.is-placing {
  opacity: 0;
  pointer-events: none;
  transform: none !important;
  transition: opacity 0.1s;
}

.hand-card-slot.is-selected::after {
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

.hand-card-slot.is-unaffordable {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(60%);
}

.mana-cost {
  position: absolute;
  top: -6px;
  right: -6px;
  background: rgba(52, 152, 219, 0.9);
  border: 2px solid #3498db;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
  color: white;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.mana-icon {
  display: none;
}

.turn-indicator {
  margin-top: 4px;
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

/* Card enter/leave transitions */
.hand-card-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.hand-card-leave-active {
  transition: all 0.3s ease-in;
  position: absolute;
}

.hand-card-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.5);
}

.hand-card-leave-to {
  opacity: 0;
  transform: translateY(-30px) scale(0.8);
}

.hand-card-move {
  transition: transform 0.4s ease;
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
  pointer-events: none; /* Let pointer events pass through to find drop target */
  will-change: transform;
  /* Same size as regular card */
  /* Remove scaling from ghost itself if it's applied in transform, or let transform handle it */
  transition: filter 0.2s ease;
  opacity: 0.85;
}

/* Important: Make sure the ghost renders exactly like a hand card.
   We reuse TripleTriadCard inside it. If we need scale corrections for mobile,
   we handle it in the style binding or CSS. */
@media (max-width: 900px) {
  .drag-ghost :deep(.tt-card) {
    transform: scale(0.85);
    transform-origin: top left;
  }
}
</style>
