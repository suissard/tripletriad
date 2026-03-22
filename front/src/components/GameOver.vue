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

function handleReplay() {
    const wasOnline = state.online;
    
    if (wasOnline) {
        webrtc.close();
        resetGame();
        state.menuView = 'multi';
        router.push('/');
        return;
    }

    // AI match: navigate back to /game?mode=ia with a hard reload for perfectly clean state
    resetGame();
    window.location.href = '/game?mode=ia';
}

function handleStoryWin() {
    const story = state.storyMatchData?.story;
    const step = state.storyMatchData?.step;
    const storyId = story?.id || story?.documentId || route.query.storyId;
    
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
            dialogue: 'end',
            line: 0
        } 
    });
}

function handleStoryRetry() {
    const storyId = route.query.storyId || state.storyMatchData?.story?.id || state.storyMatchData?.story?.documentId;
    const stepId = route.query.stepId || state.storyMatchData?.step?.id || state.storyMatchData?.step?.documentId;
    
    resetGame();
    
    // Hard reload to guarantee a completely clean starting state unpolluted by Vue reactivity
    window.location.href = `/game?mode=story&storyId=${storyId}&stepId=${stepId}`;
}

function handleStoryQuit() {
    const story = state.storyMatchData?.story;
    const step = state.storyMatchData?.step;
    const storyId = story?.id || story?.documentId || route.query.storyId;
    
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
            dialogue: 'start',
            line: 0
        } 
    });
}

function handleQuit() {
    if (state.online) {
        webrtc.close();
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
