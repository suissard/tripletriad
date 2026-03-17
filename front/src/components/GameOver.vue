<template>
  <div id="game-over" v-if="state.gameOver">
      <h1 :style="{ color: resultColor }" style="font-size: 4rem; text-shadow: 0 0 20px currentColor;">{{ resultText }}</h1>
      <div class="game-over-buttons">
          <AppButton variant="primary" fullWidth @click="handleReplay">REJOUER 🔄</AppButton>
          <AppButton variant="primary" fullWidth @click="handleQuit">QUITTER 🚪</AppButton>
      </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { state, resetGame, webrtc } from '../game/state.js';
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

import { refillHand, cardLibrary, normalizeCard } from '../game/state.js';

function handleReplay() {
    const wasOnline = state.online;
    const currentDeck = state.deck; // Save current player deck
    
    // Si c'était en ligne, on nettoie le WebRTC et l'URL pour forcer 
    // la création d'une nouvelle Room au lieu d'une boucle infinie.
    if (wasOnline) {
        webrtc.close();
        if (route.query.match) {
            router.replace({ query: {} });
        }
        resetGame(30, false);
        state.deck = currentDeck;
        state.menuView = 'multi';
        state.gameState = 'menu';
        router.push('/');
        return;
    }

    // AI match instant replay logic
    const aiDeck = [];
    for (let i = 0; i < 5; i++) {
        const randomCard = cardLibrary[Math.floor(Math.random() * cardLibrary.length)];
        aiDeck.push(normalizeCard(randomCard));
    }

    const startingTurn = Math.random() < 0.5 ? 'player' : 'ai';

    resetGame(30, false, startingTurn);
    state.gameState = 'menu';
    state.menuView = 'main'; // Doesn't matter, CoinToss is overlay
    state.coinTossResult = startingTurn;
    state.showCoinToss = true;
    router.push('/');

    // The actual match start will be handled after the coin toss animation
    state.pendingAiGame = async () => {
        state.gameState = 'playing';

        // Initialize AI match in backend for logging
        await import('../game/state.js').then(m => m.initAIMatch());

        // Draw AI hand first
        state.deck = aiDeck;
        refillHand('ai');

        // Then set and draw player hand
        state.deck = currentDeck;
        refillHand('player');
    };
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
