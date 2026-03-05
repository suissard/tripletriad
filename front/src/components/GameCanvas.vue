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
    if (!state.online) {
        resetGame();
    }
    initScene(container.value);
    initInput();
    
    if (state.gameState === 'playing') {
        if (!state.online || state.isHost) {
            refillHand('player');
            refillHand('ai');
        } else {
            refillHand('ai');
            refillHand('player');
        }
    }
});

watch(() => state.gameState, (newState) => {
    if (newState === 'playing') {
        if (!state.online || state.isHost) {
            refillHand('player');
            refillHand('ai');
        } else {
            refillHand('ai');
            refillHand('player');
        }
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
