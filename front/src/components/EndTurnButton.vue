<template>
  <div class="end-turn-container" v-if="state.gameState === 'playing'">
    <button
      class="end-turn-btn"
      :class="{ ready: isReady, disabled: state.turn !== 'player' }"
      @click="handleEndTurn"
      :disabled="state.turn !== 'player'"
    >
      {{ state.turn === 'player' ? 'Fin de Tour' : 'Tour de l\'IA' }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { state, confirmAction } from '../game/state.js';
import { endTurn } from '../game/engine.js';
import { refillHand } from '../game/three-scene.js';

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
  background: rgba(85, 85, 85, 0.8);
  border: 2px solid #333;
  color: #ccc;
  padding: 15px 30px;
  font-size: 1.2rem;
  font-weight: bold;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 2px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
}

.end-turn-btn:hover:not(.disabled) {
  background: rgba(100, 100, 100, 0.9);
  transform: scale(1.05);
}

.end-turn-btn.ready {
  background: linear-gradient(135deg, #f1c40f, #f39c12);
  color: #000;
  border-color: #f1c40f;
  box-shadow: 0 0 20px rgba(241, 196, 15, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.5);
  animation: pulse-glow 2s infinite;
}

.end-turn-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #222;
  border-color: #111;
}

@keyframes pulse-glow {
  0% { box-shadow: 0 0 20px rgba(241, 196, 15, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.5); }
  50% { box-shadow: 0 0 40px rgba(241, 196, 15, 1), inset 0 0 20px rgba(255, 255, 255, 0.8); }
  100% { box-shadow: 0 0 20px rgba(241, 196, 15, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.5); }
}
</style>
