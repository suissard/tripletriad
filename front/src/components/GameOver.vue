<template>
  <div id="game-over" v-if="state.gameOver">
      <h1 :style="{ color: resultColor }" style="font-size: 4rem; text-shadow: 0 0 20px currentColor;">{{ resultText }}</h1>
      <HoloButton @click="handleReplay" style="margin-top: 20px;">RETOURNER AU MENU 🏠</HoloButton>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { state, resetGame } from '../game/state.js';
import HoloButton from './HoloButton.vue';

const resultText = computed(() => {
    if (state.winner === state.pId) return "VICTOIRE ! 🏆";
    if (state.winner === state.aiId) return "DÉFAITE 💀";
    return "ÉGALITÉ 🤝";
});

const resultColor = computed(() => {
    if (state.winner === state.pId) return "#00d2ff";
    if (state.winner === state.aiId) return "#ff0055";
    return "white";
});

function handleReplay() {
    resetGame();
}
</script>

<style scoped>
#game-over { 
    position: absolute; inset: 0; background: rgba(0,0,0,0.9); 
    display: flex; flex-direction: column; justify-content: center; align-items: center; 
    z-index: 100; pointer-events: auto;
}
</style>
