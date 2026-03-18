<template>
  <div class="game-board">
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
        'is-impact': lastPlacedIndex === index,
        'is-drag-over': dragOverIndex === index
      }"
      @click="handleSlotClick(index)"
    >
      <!-- Empty slot marker -->
      <div v-if="!cell" class="slot-marker">
        <span class="slot-index">{{ index + 1 }}</span>
      </div>

      <!-- Occupied card -->
      <Transition name="card-place" appear>
        <div v-if="cell" class="board-card-wrapper" :class="'owner-' + cell.owner">
          <TripleTriadCard
            :card="cell.data"
            :flat="true"
            size="sm"
            :borderColor="cell.owner === state.pId ? '#00d2ff' : '#ff0055'"
            :disableZoom="true"
            :isPremium="cell.data.isPremium"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { state } from '../game/state.js';
import { placeCard } from '../game/game-actions.js';
import TripleTriadCard from './TripleTriadCard.vue';

const lastPlacedIndex = ref(null);
const dragOverIndex = ref(null); // Used by pointermove if we implement global event bus

function handleSlotClick(index) {
  if (state.board[index] !== null) return;
  if (state.selectedCardIndex === null) return;
  triggerPlacement(index);
}

async function triggerPlacement(index) {
  lastPlacedIndex.value = index;
  await placeCard(index);
  
  // Clear shake after animation duration
  setTimeout(() => {
    if (lastPlacedIndex.value === index) lastPlacedIndex.value = null;
  }, 500);
}

// Option to expose a highlight method if PlayerHand wants to highlight the hovered slot
defineExpose({
    setDragOver(index) {
        dragOverIndex.value = index;
    }
});
</script>

<style scoped>
.game-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 20px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 0, 0, 0.2);
  max-width: 420px;
  width: 100%;
  flex-shrink: 0;
  margin: 0 auto;
}

@media (max-width: 900px) {
  .game-board {
    gap: 8px;
    padding: 10px;
    max-width: 320px;
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
  transition: all 0.25s ease;
  aspect-ratio: 2.5 / 3.5;
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
  border-color: transparent;
  background: transparent;
}

.board-slot.is-drag-over {
  background: rgba(0, 210, 255, 0.15);
  border-color: rgba(0, 210, 255, 0.6);
  box-shadow: 
    0 0 20px rgba(0, 210, 255, 0.3),
    inset 0 0 15px rgba(0, 210, 255, 0.2);
  transform: scale(1.02);
  z-index: 5;
}

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

/* Card placement animation: Natural falling from above */
.card-place-enter-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.card-place-enter-from {
  opacity: 0;
  transform: translateY(-200px) rotateX(-40deg) rotateZ(10deg) scale(1.2);
  filter: blur(4px);
}

/* Impact effect on the slot */
.board-slot.is-impact {
  animation: impact 0.4s ease-out both;
}

@keyframes impact {
  0% { transform: scale(1); }
  30% { transform: scale(0.96); }
  100% { transform: scale(1); }
}

/* Slot pulse animation */
@keyframes slot-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(0, 210, 255, 0.1); }
  50%  { box-shadow: 0 0 12px 2px rgba(0, 210, 255, 0.15); }
  100% { box-shadow: 0 0 0 0 rgba(0, 210, 255, 0.1); }
}
</style>
