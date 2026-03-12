<template>
  <div id="game-over" v-if="state.gameOver">
      <h1 :style="{ color: resultColor }" style="font-size: 4rem; text-shadow: 0 0 20px currentColor;">{{ resultText }}</h1>
      <div class="game-over-buttons">
          <HoloButton @click="handleReplay">REJOUER 🔄</HoloButton>
          <HoloButton @click="handleQuit">QUITTER 🚪</HoloButton>
      </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { state, resetGame, webrtc } from '../game/state.js';
import HoloButton from './HoloButton.vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

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
    const wasOnline = state.online;
    
    // Si c'était en ligne, on nettoie le WebRTC et l'URL pour forcer 
    // la création d'une nouvelle Room au lieu d'une boucle infinie.
    if (wasOnline) {
        webrtc.close();
        if (route.query.match) {
            router.replace({ query: {} });
        }
    }

    resetGame();

    // On retourne directement au bon menu de sélection de Deck
    // Le composant App réagira et nous renverra au Menu Principal via router
    state.menuView = wasOnline ? 'multi-deck' : 'ai';
    router.push('/');
}

function handleQuit() {
    if (state.online) {
        webrtc.close();
        if (route.query.match) {
            router.replace({ query: {} });
        }
    }
    resetGame();
    state.menuView = 'main';
    router.push('/');
}
</script>

<style scoped>
#game-over { 
    position: absolute; inset: 0; background: rgba(0,0,0,0.9); 
    display: flex; flex-direction: column; justify-content: center; align-items: center; 
    z-index: 100; pointer-events: auto;
}
.game-over-buttons {
    display: flex;
    gap: 20px;
    margin-top: 30px;
}
</style>
