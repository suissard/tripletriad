<template>
  <!-- Modal Overlay -->
  <div id="game-over" v-if="state.gameOver && showModal && !isHidden">
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

      <div class="visibility-toggle">
         <AppButton variant="secondary" @click="isHidden = true">👁️ Voir le plateau</AppButton>
      </div>
  </div>

  <!-- Button to restore modal if it is hidden -->
  <div class="restore-modal-btn" v-if="state.gameOver && showModal && isHidden">
      <AppButton variant="primary" @click="isHidden = false">📋 Voir les résultats</AppButton>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { state, resetGame, socketManager } from '../game/state.js';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const showModal = ref(false);
const isHidden = ref(false);

watch(() => state.gameOver, (newVal) => {
    if (newVal) {
        // Delay the modal appearance by 2.5 seconds
        setTimeout(() => {
            showModal.value = true;
            isHidden.value = false;
        }, 2500);
    } else {
        showModal.value = false;
        isHidden.value = false;
    }
}, { immediate: true });

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
    
    if (wasOnline) {
        socketManager.close();
        resetGame();
        state.menuView = 'multi';
        router.push('/');
        return;
    }

    // AI match: soft reset to trigger coin toss without reload
    resetGame(30, false);
    state.gameState = 'coin-toss';
    state.coinTossResult = Math.random() < 0.5 ? 'player' : 'ai';
    state.showCoinToss = true;
}

function handleStoryWin() {
    const story = state.storyMatchData?.story;
    const step = state.storyMatchData?.step;
    const storyId = story?.id || story?.documentId || route.query.storyId;
    const fromSituation = route.query.fromSituation;
    
    // Calculate step index before resetting
    let stepIndex = 1;
    if (story && step) {
        stepIndex = (story.steps?.findIndex(s => String(s.id) === String(step.id)) ?? 0) + 1;
    }

    // Clean up game state after extracting info
    resetGame();
    state.isStoryMatch = false;
    
    // Navigate back to story page with win result and explicit dialogue state
    router.push({ 
        path: `/story/${storyId}/step/${stepIndex}`, 
        query: { 
            result: 'win',
            fromSituation: fromSituation,
            dialogue: 'end',
            line: 0
        } 
    });
}

function handleStoryRetry() {
    resetGame(30, false);
    
    // Story match: soft reset to trigger coin toss without reload
    state.isStoryMatch = true;
    state.gameState = 'coin-toss';
    state.coinTossResult = Math.random() < 0.5 ? 'player' : 'ai';
    state.showCoinToss = true;
}

function handleStoryQuit() {
    const story = state.storyMatchData?.story;
    const step = state.storyMatchData?.step;
    const storyId = story?.id || story?.documentId || route.query.storyId;
    const fromSituation = route.query.fromSituation;
    
    // Calculate step index before resetting
    let stepIndex = 1;
    if (story && step) {
        stepIndex = (story.steps?.findIndex(s => String(s.id) === String(step.id)) ?? 0) + 1;
    }

    // Clean up game state
    resetGame();
    state.isStoryMatch = false;
    
    // Navigate back to story page with loss result
    router.push({ 
        path: `/story/${storyId}/step/${stepIndex}`, 
        query: { 
            result: 'loss',
            fromSituation: fromSituation,
            dialogue: 'start',
            line: 0
        } 
    });
}

function handleQuit() {
    if (state.online) {
        socketManager.close();
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
.visibility-toggle {
    margin-top: 40px;
}
.restore-modal-btn {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 101;
}
</style>
