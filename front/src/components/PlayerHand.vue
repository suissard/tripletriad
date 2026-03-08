<template>
  <div class="player-hand" :class="{ 'is-disabled': state.turn !== 'player' || state.busy }">
    <TransitionGroup name="hand-card" tag="div" class="hand-cards">
      <div
        v-for="(card, index) in state.pHand"
        :key="card.id + '-' + index"
        class="hand-card-slot"
        :class="{
          'is-selected': state.selectedCardIndex === index,
          'is-unaffordable': state.pMana < 1,
          'is-dragging': draggingIndex === index
        }"
        draggable="true"
        @dragstart="onDragStart($event, index)"
        @dragend="onDragEnd"
        @click="handleSelect(index)"
      >
        <TripleTriadCard
          :card="card"
          :flat="true"
          size="sm"
          borderColor="#00d2ff"
          :disableZoom="true"
          :isPremium="card.isPremium"
        />

      </div>
    </TransitionGroup>

    <!-- Turn indicator -->
    <div class="turn-indicator" v-if="state.gameState === 'playing'">
      <span v-if="state.turn === 'player'" class="turn-text turn-yours">🎯 À vous de jouer</span>
      <span v-else class="turn-text turn-opponent">⏳ Tour de l'adversaire...</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { state } from '../game/state.js';
import { selectCard } from '../game/game-actions.js';
import TripleTriadCard from './TripleTriadCard.vue';

const draggingIndex = ref(null);

function handleSelect(index) {
  if (state.turn !== 'player' || state.busy) return;
  selectCard(index);
}

function onDragStart(event, index) {
  if (state.turn !== 'player' || state.busy) {
    event.preventDefault();
    return;
  }
  
  if (state.pMana < 1) {
    event.preventDefault();
    return;
  }

  draggingIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', index.toString());
  
  // Selection feedback
  state.selectedCardIndex = index;
}

function onDragEnd() {
  draggingIndex.value = null;
}
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
}

.player-hand.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.hand-cards {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

.hand-card-slot {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border-radius: 10px;
}

.hand-card-slot:hover:not(.is-unaffordable) {
  transform: translateY(-8px) scale(1.05);
  z-index: 5;
}

.hand-card-slot.is-selected {
  transform: translateY(-16px) scale(1.08);
  z-index: 10;
}

.hand-card-slot.is-dragging {
  transform: scale(1.1) rotate(2deg);
  cursor: grabbing;
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
