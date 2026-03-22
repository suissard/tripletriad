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
    
    // Hand refilling is now managed entirely by GameView.js and game-actions.js
    // to prevent double-draw bugs on component remount.
});

// watcher removed as state transitions are handled by GameView

onBeforeUnmount(() => {
    cleanupInput();
    cleanupScene();
});
</script>

<style scoped>
#canvas-container { width: 100vw; height: 100vh; }
</style>
