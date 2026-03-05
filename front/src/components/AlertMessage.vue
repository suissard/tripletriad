<template>
  <div id="alerts" ref="alertEl">{{ state.alerts }}</div>
</template>

<script setup>
import { watch, ref } from 'vue';
import gsap from 'gsap';
import { state } from '../game/state.js';

const alertEl = ref(null);

watch(() => state.alerts, (newVal) => {
    if(newVal && alertEl.value) {
        gsap.fromTo(alertEl.value, 
            { scale: 0, opacity: 1 }, 
            { scale: 1.5, opacity: 0, duration: 1.5, ease: "expo.out" }
        );
    }
});
</script>

<style scoped>
#alerts { 
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
    text-align: center; pointer-events: none; font-size: 4rem; font-weight: bold; 
    color: #ffd700; text-shadow: 0 0 20px #ff8c00; opacity: 0; z-index: 20;
}
</style>
