<template>
  <div id="game-over" v-if="state.gameOver">
      <h1 :style="{ color: resultColor }" style="font-size: 4rem; text-shadow: 0 0 20px currentColor;">{{ resultText }}</h1>
      <HoloButton @click="handleReplay" style="margin-top: 20px;">RETOURNER AU MENU 🏠</HoloButton>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { state, resetGame } from '../game/state.js';
import { resetScene, refillHand } from '../game/three-scene.js';
import HoloButton from './HoloButton.vue';

const resultText = computed(() => {
    if (state.winner === 'player') return "VICTOIRE ! 🏆";
    if (state.winner === 'ai') return "DÉFAITE 💀";
    return "ÉGALITÉ 🤝";
});

const resultColor = computed(() => {
    if (state.winner === 'player') return "#00d2ff";
    if (state.winner === 'ai') return "#ff0055";
    return "white";
});

function handleReplay() {
    resetScene();
    resetGame();
    // refillHand is handled by watch in GameCanvas.vue when gameState is changed back to playing
}
</script>

<style scoped>
#game-over { 
    position: absolute; inset: 0; background: rgba(0,0,0,0.9); 
    display: flex; flex-direction: column; justify-content: center; align-items: center; 
    z-index: 100; pointer-events: auto;
}
</style>
