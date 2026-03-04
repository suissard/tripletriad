<template>
  <div id="canvas-container" ref="container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { initScene, cleanupScene, refillHand } from '../game/three-scene.js';
import { initInput, cleanupInput } from '../game/input.js';
import { resetGame, state } from '../game/state.js';

const container = ref(null);

onMounted(() => {
    resetGame();
    initScene(container.value);
    initInput();
    
    // We only refill hand when state changes to 'playing'
});

watch(() => state.gameState, (newState) => {
    if (newState === 'playing') {
        refillHand('player');
        refillHand('ai');
    }
});

onBeforeUnmount(() => {
    cleanupInput();
    cleanupScene();
});
</script>

<style scoped>
#canvas-container { width: 100vw; height: 100vh; }
</style>
