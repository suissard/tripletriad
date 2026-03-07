<template>
  <div class="end-turn-container" v-if="state.gameState === 'playing'">
    <HoloButton
      class="end-turn-btn"
      :class="{ ready: isReady, disabled: state.turn !== 'player' }"
      @click="handleEndTurn"
      :disabled="state.turn !== 'player'"
      :width="'250px'"
    >
      {{ state.turn === 'player' ? 'Fin de Tour' : 'Tour de l\'IA' }}
    </HoloButton>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { state, confirmAction } from '../game/state.js';
import { endTurn } from '../game/engine.js';
import { refillHand } from '../game/three-scene.js';
import HoloButton from './HoloButton.vue';

const isReady = computed(() => {
  if (state.turn !== 'player') return false;
  if (state.pMana === 0) return true;

  // Check if player has affordable cards
  const affordableCard = state.pHand.find(c => (c.userData?.data?.level || 1) <= state.pMana);
  return !affordableCard;
});

const handleEndTurn = async () => {
  if (state.turn !== 'player') return;

  if (!isReady.value) {
    const confirm = await confirmAction('Fin de Tour', 'Il vous reste du Mana et des cartes jouables. Êtes-vous sûr de vouloir terminer votre tour ?');
    if (!confirm) return;
  }

  state.turn = 'ai'; // Temporarily set to avoid double clicks while animating
  endTurn('player');
  refillHand('player');

  if (!state.online) {
      setTimeout(async () => {
          const { aiPlay } = await import('../game/input.js');
          aiPlay();
      }, 800);
  }
};
</script>

<style scoped>
.end-turn-container {
  position: absolute;
  right: 200px; /* Offset from ActionLog */
  top: 50%;
  transform: translateY(-50%);
  pointer-events: auto;
  z-index: 20;
}

.end-turn-btn {
  /* HoloButton handles base styling, adding specific animation for ready state */
}

.end-turn-btn.ready :deep(.coreButton) {
  box-shadow: 0 0 20px rgba(241, 196, 15, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.5);
  animation: pulse-glow 2s infinite;
}

.end-turn-btn.ready :deep(.innerLayer) {
   background: linear-gradient(to bottom, #f1c40f 0%, #ffffff 50%, #f39c12 100%);
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
