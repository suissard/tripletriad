<template>
  <div class="opponent-hand">
    <TransitionGroup name="opp-card" tag="div" class="opp-cards">
      <div
        v-for="(card, index) in state.aiHand"
        :key="'ai-' + card.id + '-' + index"
        class="opp-card-slot"
      >
        <TripleTriadCard
          :card="{ ...card, revealed: false }"
          :flat="true"
          size="sm"
          borderColor="#ff0055"
          :disableZoom="true"
        />
      </div>
    </TransitionGroup>
    <div class="opp-label">
      <span class="opp-name">🤖 Adversaire</span>
      <span class="opp-count">{{ state.aiHand.length }} carte{{ state.aiHand.length > 1 ? 's' : '' }}</span>
    </div>
  </div>
</template>

<script setup>
import { state } from '../game/state.js';
import TripleTriadCard from './TripleTriadCard.vue';
</script>

<style scoped>
.opponent-hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 16px;
  border: 1px solid rgba(255, 0, 85, 0.15);
  backdrop-filter: blur(8px);
}

.opp-cards {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

@media (max-width: 900px) {
  .opp-cards { gap: 2px; }
  .opp-card-slot { transform: scale(0.65); transform-origin: top center; margin: -10px -5px; }
  .opponent-hand { padding: 4px; border-radius: 8px; gap: 4px; }
}

.opp-card-slot {

  transition: transform 0.2s ease;
}

.opp-card-slot :deep(.tt-card) {
  cursor: default;
}

.opp-card-slot :deep(.tt-card:hover:not(.is-flat)) {
  transform: none;
  box-shadow: none;
}

.opp-label {
  display: flex;
  align-items: center;
  gap: 12px;
}

.opp-name {
  color: #ff0055;
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(255, 0, 85, 0.3);
}

.opp-count {
  color: #888;
  font-size: 0.75rem;
}

/* Card transitions */
.opp-card-enter-active {
  transition: all 0.4s ease;
}

.opp-card-leave-active {
  transition: all 0.3s ease-in;
}

.opp-card-enter-from {
  opacity: 0;
  transform: translateX(-30px) scale(0.5);
}

.opp-card-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.opp-card-move {
  transition: transform 0.4s ease;
}
</style>
