<template>
  <div class="game-board">
    <div
      v-for="(cell, index) in state.board"
      :key="index"
      class="board-slot"
      :class="{
        'slot-empty': !cell,
        'slot-highlight': !cell && state.selectedCardIndex !== null && state.turn === 'player',
        'slot-occupied': !!cell,
        'slot-player': cell && cell.owner === 'player',
        'slot-ai': cell && cell.owner === 'ai',
        'is-shaking': lastPlacedIndex === index,
        'is-drag-over': dragOverIndex === index
      }"
      @click="handleSlotClick(index)"
      @dragover="onDragOver"
      @dragenter="onDragEnter(index)"
      @dragleave="onDragLeave(index)"
      @drop="onDrop($event, index)"
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
            :borderColor="cell.owner === 'player' ? '#00d2ff' : '#ff0055'"
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
const dragOverIndex = ref(null);

function onDragEnter(index) {
  if (state.turn !== 'player' || state.busy || state.board[index]) return;
  dragOverIndex.value = index;
}

function onDragLeave(index) {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null;
  }
}

function handleSlotClick(index) {
  if (state.board[index] !== null) return;
  if (state.selectedCardIndex === null) return;
  triggerPlacement(index);
}

function onDragOver(event) {
  if (state.turn !== 'player' || state.busy) return;
  event.preventDefault();
}

function onDrop(event, index) {
  if (state.board[index] !== null) return;
  if (state.turn !== 'player' || state.busy) return;
  
  const cardIndex = parseInt(event.dataTransfer.getData('text/plain'), 10);
  if (isNaN(cardIndex)) return;
  
  state.selectedCardIndex = cardIndex;
  dragOverIndex.value = null;
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
</script>

<style scoped>
.game-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 8px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 0, 0, 0.2);
  aspect-ratio: 3 / 3.5;
  max-width: 380px;
  width: 100%;
  flex-shrink: 0;
  margin: 0 auto;
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
  overflow: hidden;
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

/* Card placement animation */
.card-place-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card-place-enter-from {
  opacity: 0;
  transform: scale(0.3) translateY(30px);
}

.board-slot.is-shaking {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

/* Slot pulse animation */
@keyframes slot-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(0, 210, 255, 0.1); }
  50%  { box-shadow: 0 0 12px 2px rgba(0, 210, 255, 0.15); }
  100% { box-shadow: 0 0 0 0 rgba(0, 210, 255, 0.1); }
}
</style>
