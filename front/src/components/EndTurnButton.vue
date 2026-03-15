<template>
  <div class="end-turn-container" v-if="state.gameState === 'playing'">
    <button
      class="btn btn-primary glass-panel end-turn-btn"
      :class="{ ready: isReady, disabled: state.turn !== 'player' }"
      @click="onEndTurn"
      :disabled="state.turn !== 'player'"
      style="width: 250px;"
    >
      {{ state.turn === 'player' ? 'Fin de Tour' : (state.online ? 'Tour de l\'Adversaire' : 'Tour de l\'IA') }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { state, confirmAction } from '../game/state.js';
import { handleEndTurn } from '../game/game-actions.js';

const isReady = computed(() => {
  if (state.turn !== 'player') return false;
  if (state.pMana === 0) return true;

  // Check if player has affordable cards
  const affordableCard = state.pHand.find(c => (c.level || 1) <= state.pMana);
  return !affordableCard;
});

import { sendGameLog } from '../game/logger.js';

const onEndTurn = async () => {
  if (state.turn !== 'player') return;

  if (!isReady.value) {
    const confirm = await confirmAction('Fin de Tour', 'Il vous reste du Mana et des cartes jouables. Êtes-vous sûr de vouloir terminer votre tour ?');
    if (!confirm) return;
  }

  sendGameLog('click', { type: 'player', id: state.pId }, { bouton: 'fin_de_tour' });

  handleEndTurn();
};
</script>

<style scoped>
.end-turn-container {
  pointer-events: auto;
  z-index: 20;
}


.end-turn-btn.ready {
  box-shadow: 0 0 20px rgba(241, 196, 15, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.5);
  animation: pulse-glow 2s infinite;
  background: linear-gradient(to bottom, #f1c40f 0%, #ffffff 50%, #f39c12 100%);
  color: #000;
}

.end-turn-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

@keyframes pulse-glow {
  0% { box-shadow: 0 0 20px rgba(241, 196, 15, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.5); }
  50% { box-shadow: 0 0 40px rgba(241, 196, 15, 1), inset 0 0 20px rgba(255, 255, 255, 0.8); }
  100% { box-shadow: 0 0 20px rgba(241, 196, 15, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.5); }
}
</style>
