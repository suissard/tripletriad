<template>
  <div id="game-over" v-if="state.gameOver">
      <h1 :style="{ color: resultColor }" style="font-size: 4rem; text-shadow: 0 0 20px currentColor;">{{ resultText }}</h1>
      <div class="game-over-buttons" v-if="state.isStoryMatch">
          <AppButton v-if="state.winner === state.pId" variant="primary" fullWidth @click="handleStoryWin">CONTINUER L'HISTOIRE ⏭</AppButton>
          <template v-else>
              <AppButton variant="primary" fullWidth @click="handleStoryRetry">RÉESSAYER 🔄</AppButton>
              <AppButton variant="danger" fullWidth @click="handleStoryQuit">ABANDONNER 🚪</AppButton>
          </template>
      </div>
      <div class="game-over-buttons" v-else>
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
    const currentDeck = state.pDeck; // Save current player deck
    
    // Si c'était en ligne, on nettoie le WebRTC et l'URL pour forcer 
    // la création d'une nouvelle Room au lieu d'une boucle infinie.
    if (wasOnline) {
        webrtc.close();
        if (route.query.match) {
            router.replace({ query: {} });
        }
        resetGame(30, false);
        state.pDeck = currentDeck;
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
        state.aiDeck = aiDeck;
        refillHand('ai');

        // Then set and draw player hand
        state.pDeck = currentDeck;
        refillHand('player');
    };
}

function handleStoryWin() {
    if (state.onStoryMatchEnd) {
        state.onStoryMatchEnd(true);
    }
}

function handleStoryRetry() {
    // Instant replay with same constraints
    const currentDeck = state.pDeck; // Save current player deck
    const startingTurn = Math.random() < 0.5 ? 'player' : 'ai';

    const aiDeck = [];
    if (state.storyEnemyDeckConfig && state.storyEnemyDeckConfig.length > 0) {
        aiDeck.push(...state.storyEnemyDeckConfig.map(normalizeCard));
    } else {
        for (let i = 0; i < 15; i++) {
            const randomCard = cardLibrary[Math.floor(Math.random() * cardLibrary.length)];
            aiDeck.push(normalizeCard(randomCard));
        }
    }

    resetGame(30, false, startingTurn);
    // Keep story match properties intact after reset
    state.isStoryMatch = true; 
    
    state.gameState = 'coin-toss';
    state.coinTossResult = startingTurn;
    state.showCoinToss = true;
    
    // The coin toss component finishing will trigger `onCoinTossFinished` in GameView
    // which handles refilling hands and starting the match.
}

function handleStoryQuit() {
    if (state.onStoryMatchEnd) {
        state.onStoryMatchEnd(false);
    }
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
