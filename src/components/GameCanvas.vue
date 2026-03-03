<template>
  <div id="canvas-container" ref="container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { initScene, cleanupScene, refillHand } from '../game/three-scene.js';
import { initInput, cleanupInput } from '../game/input.js';
import { resetGame } from '../game/state.js';

const container = ref(null);

onMounted(() => {
    resetGame();
    initScene(container.value);
    initInput();
    
    // Initial draw
    refillHand('player');
    refillHand('ai');
});

onBeforeUnmount(() => {
    cleanupInput();
    cleanupScene();
});
</script>

<style scoped>
#canvas-container { width: 100vw; height: 100vh; }
</style>
