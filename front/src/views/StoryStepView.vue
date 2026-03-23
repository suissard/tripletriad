<template>
  <PageLayout :title="currentStep?.title || 'MODE HISTOIRE'" :backRoute="'/story?story=' + storyId">
    <div class="vn-view">
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner large">✨</div>
        <p>Chargement de l'étape...</p>
      </div>

      <div v-else-if="!currentStep" class="error-state">
        <p>Étape introuvable ou accès non autorisé.</p>
        <AppButton @click="router.push('/story')" variant="primary">Retour aux archives</AppButton>
      </div>

      <div v-else class="vn-container">
        <!-- Header always visible -->
        <div class="vn-header">
          <h2>{{ currentStep.title }}</h2>
          <div class="vn-controls">
            <button class="vn-quit-btn" @click.stop="quitStep">Quitter 🚪</button>
          </div>
        </div>

        <!-- Dynamic Components based on Situation type -->
        <template v-if="currentSituation">
          <SituationDialogue
            v-if="currentSituation.__component === 'story.situation-dialogue'"
            :situation="currentSituation"
            @next="nextSituation"
          />

          <SituationChoice
            v-else-if="currentSituation.__component === 'story.situation-choice'"
            :situation="currentSituation"
            @choice="handleChoice"
          />

          <SituationBattle
            v-else-if="currentSituation.__component === 'story.situation-battle'"
            @play-combat="playCombat"
          />

          <SituationSuccess
            v-else-if="currentSituation.__component === 'story.situation-success'"
            :situation="currentSituation"
            @finish="finishStep(true)"
          />

          <SituationGameOver
            v-else-if="currentSituation.__component === 'story.situation-game-over'"
            :situation="currentSituation"
            @quit="quitStep"
            @restart="restartStep"
          />
        </template>
      </div>

      <!-- Reward Celebration Modal -->
      <RewardModal
        :show="showRewardModal"
        :reward="reward"
        :coins="rewardCoins"
        title="Récompense débloquée !"
        :subtitle="currentStep?.title ? `Étape : ${currentStep.title}` : ''"
        @claimed="onRewardClaimed"
        @close="onRewardClaimed"
      />
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageLayout from '../components/PageLayout.vue';
import { state as gameState, normalizeCard, cardLibrary } from '../game/state.js';
import AppButton from '../components/ui/AppButton.vue';
import RewardModal from '../components/RewardModal.vue';
import { useUserStore } from '../stores/userStore.js';
import strapiService from '../api/strapi.js';

import SituationDialogue from '../components/story/SituationDialogue.vue';
import SituationChoice from '../components/story/SituationChoice.vue';
import SituationBattle from '../components/story/SituationBattle.vue';
import SituationSuccess from '../components/story/SituationSuccess.vue';
import SituationGameOver from '../components/story/SituationGameOver.vue';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

const isLoading = ref(true);
const currentStory = ref(null);
const currentStep = ref(null);
const currentSituation = ref(null);
const isReplay = ref(false);
const reward = ref(null);
const rewardCoins = ref(0);
const showRewardModal = ref(false);

const storyId = computed(() => Number(route.params.storyId));
const stepIndex = computed(() => Number(route.params.stepIndex));

onMounted(async () => {
  if (!userStore.isLoggedIn && !userStore.isOfflineStoryMode) {
    router.push('/story');
    return;
  }
  await fetchConfig();
  await loadStepData();
});

async function fetchConfig() {
  try {
    await strapiService.getGameConfig();
  } catch (err) {
    console.error('Failed to fetch config details:', err);
  }
}

async function loadStepData() {
  isLoading.value = true;
  try {
    if (userStore.isOfflineStoryMode) {
      await fetchLocalStepData();
      return;
    }
    
    await userStore.fetchUserStoryProgresses();
    const storiesRes = await strapiService.find('stories', {
      filters: { id: storyId.value },
      populate: {
        steps: {
          populate: {
            situations: {
              on: {
                'story.situation-reward': {
                  populate: { rewardCards: { populate: ['image'] } }
                },
                'story.situation-battle': {
                  populate: { 
                    playerDeck: { populate: { cards: { populate: ['image'] } } },
                    enemyDeck: { populate: { cards: { populate: ['image'] } } }
                  }
                },
                'story.situation-dialogue': {
                  populate: { 
                    dialogues: { populate: { card: { populate: ['image'] } } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (storiesRes.data && storiesRes.data.length > 0) {
      currentStory.value = storiesRes.data[0];
      const stepIdx = stepIndex.value - 1;
      currentStep.value = currentStory.value.steps[stepIdx];

      if (currentStep.value) {
        if (!isStepActive(storyId.value, stepIdx)) {
          router.push('/story');
          return;
        }

        isReplay.value = isStepCompleted(storyId.value, currentStep.value.id);
        
        const p = getProgress(storyId.value);

        // Handling return from battle
        if (route.query.result && route.query.fromSituation) {
           const battleSituation = currentStep.value.situations.find(s => s.situationId === route.query.fromSituation);
           if (battleSituation) {
              const nextId = route.query.result === 'win' ? battleSituation.onWinSituationId : battleSituation.onLoseSituationId;

              // Save battle result
              await userStore.saveStepProgress(storyId.value, currentStep.value.id, nextId, {
                situationId: battleSituation.situationId,
                action: 'battle',
                result: route.query.result,
                timestamp: new Date().toISOString()
              });

              await loadSituation(nextId);
           } else {
              // fallback
              await loadSituation(currentStep.value.situations[0].situationId);
           }
        } else if (p && p.currentStep && Number(p.currentStep.id || p.currentStep) === Number(currentStep.value.id) && p.currentSituationId) {
           // Resume from saved situation
           await loadSituation(p.currentSituationId);
        } else {
           // Start fresh
           await userStore.saveStepProgress(storyId.value, currentStep.value.id, currentStep.value.situations[0].situationId, {
             situationId: currentStep.value.situations[0].situationId,
             action: 'start',
             timestamp: new Date().toISOString()
           });
           await loadSituation(currentStep.value.situations[0].situationId);
        }
      }
    }
  } catch (error) {
    console.error('Failed to load step data:', error);
  } finally {
    isLoading.value = false;
  }
}

async function fetchLocalStepData() {
  try {
    const modules = import.meta.glob('../../../../shared/data/stories/*.json', { eager: true });
    // Identify which story it is. StoryId in offline mode is "local-N" where N is 1-based index
    const storyIdx = String(route.params.storyId).startsWith('local-') 
      ? parseInt(String(route.params.storyId).replace('local-', '')) - 1
      : 0;

    const moduleEntries = Object.entries(modules);
    if (storyIdx < 0 || storyIdx >= moduleEntries.length) {
      throw new Error("Story not found");
    }

    const storyData = moduleEntries[storyIdx][1].default || moduleEntries[storyIdx][1];
    currentStory.value = storyData;
    
    // In local JSON, we might have steps array or situations array (single step)
    let steps = [];
    if (storyData.steps) {
      steps = storyData.steps;
    } else if (storyData.situations) {
      steps = [{
        title: storyData.title,
        description: storyData.description,
        situations: storyData.situations
      }];
    }

    const stepIdx = stepIndex.value - 1;
    currentStep.value = steps[stepIdx];

    if (currentStep.value) {
      isReplay.value = false;
      
      // Handling return from battle
      if (route.query.result && route.query.fromSituation) {
         const battleSituation = currentStep.value.situations.find(s => s.situationId === route.query.fromSituation);
         if (battleSituation) {
            const nextId = route.query.result === 'win' ? battleSituation.onWinSituationId : battleSituation.onLoseSituationId;
            await loadSituation(nextId);
         } else {
            await loadSituation(currentStep.value.situations[0].situationId);
         }
      } else {
         await loadSituation(currentStep.value.situations[0].situationId);
      }
    }
  } catch (err) {
    console.error('Failed to load local step data:', err);
    router.push('/story');
  }
}

async function loadSituation(situationId) {
  if (!situationId || !currentStep.value) {
    finishStep(true);
    return;
  }

  const situation = currentStep.value.situations.find(s => s.situationId === situationId);
  if (!situation) {
    console.error(`Situation ${situationId} not found`);
    finishStep(true);
    return;
  }

  currentSituation.value = situation;

  if (situation.__component === 'story.situation-reward') {
    await processReward(situation);
  }
}

async function nextSituation() {
  if (!currentSituation.value) return;
  const nextId = currentSituation.value.nextSituationId;

  // Save progress on transition
  if (!userStore.isOfflineStoryMode) {
    await userStore.saveStepProgress(storyId.value, currentStep.value.id, nextId);
  }
  await loadSituation(nextId);
}

function getProgress(storyId) {
  if (userStore.isOfflineStoryMode || !userStore.storyProgresses) return null;
  return userStore.storyProgresses.find(p => {
    const storyData = p.story?.data || p.story;
    if (!storyData) return false;
    return (storyData.id && Number(storyData.id) === Number(storyId)) || 
           (storyData.documentId && String(storyData.documentId) === String(storyId)) ||
           (!isNaN(Number(p.story)) && Number(p.story) === Number(storyId)) ||
           (String(p.story) === String(storyId));
  });
}

function isStepCompleted(storyId, stepId) {
  if (userStore.isOfflineStoryMode) return false;
  const p = getProgress(storyId);
  return p && p.completedSteps && p.completedSteps.includes(stepId);
}

function isStepActive(storyId, stepIdx) {
  if (userStore.isOfflineStoryMode) return true;
  const p = getProgress(storyId);
  if (!p) return false;
  const completedCount = p.completedSteps ? p.completedSteps.length : 0;
  return stepIdx <= completedCount;
}

// Choice Logic
async function handleChoice(option) {
  const historyEntry = {
    situationId: currentSituation.value.situationId,
    action: 'choice',
    result: option.nextSituationId,
    timestamp: new Date().toISOString()
  };

  const nextId = option.nextSituationId;
  
  if (!userStore.isOfflineStoryMode) {
    await userStore.saveStepProgress(storyId.value, currentStep.value.id, nextId, historyEntry);
  }
  
  await loadSituation(nextId);
}

async function processReward(situation) {
  try {
    if (userStore.isOfflineStoryMode) {
      // In offline mode, rewards are just skipped or shown as placeholders
      // For now, let's just proceed to next situation
      nextSituation();
      return;
    }
    const res = await userStore.claimSituationReward(storyId.value, currentStep.value.id, situation.situationId);
    if (res && (res.reward || res.coins)) {
      reward.value = res.reward;
      rewardCoins.value = res.coins || 0;
      showRewardModal.value = true;
    } else {
      // Already claimed or empty reward
      nextSituation();
    }
  } catch (error) {
    console.error('Error claiming reward:', error);
    nextSituation();
  }
}

function onRewardClaimed() {
  showRewardModal.value = false;
  nextSituation();
}

// Combat Logic
async function playCombat() {
  if (currentSituation.value?.__component !== 'story.situation-battle') return;

  try {
    let playerDeckCards = currentSituation.value.playerDeck?.cards || [];
    let enemyDeckCards = currentSituation.value.enemyDeck?.cards || [];

    if (playerDeckCards.length > 0) {
      gameState.playerDeckSelection = playerDeckCards.map(normalizeCard);
    } else {
      const pDeck = [];
      for (let i = 0; i < 15; i++) {
        pDeck.push(normalizeCard(cardLibrary[Math.floor(Math.random() * cardLibrary.length)]));
      }
      gameState.playerDeckSelection = pDeck;
    }

    if (enemyDeckCards.length > 0) {
      gameState.storyEnemyDeckConfig = enemyDeckCards.map(normalizeCard);
    } else {
      gameState.storyEnemyDeckConfig = [];
    }

    gameState.isStoryMatch = true;
    gameState.storyMatchData = { story: currentStory.value, step: currentStep.value };

    // Pass the situationId so we know where to return
    router.push({ 
      path: '/game', 
      query: { mode: 'story', storyId: currentStory.value.id, stepId: currentStep.value.id, fromSituation: currentSituation.value.situationId }
    });
  } catch (error) {
    console.error('Error starting combat:', error);
  }
}

function quitStep() {
  router.push(`/story?story=${storyId.value}`);
}

async function restartStep() {
  const firstSituation = currentStep.value.situations[0];
  if (!userStore.isOfflineStoryMode) {
    await userStore.saveStepProgress(storyId.value, currentStep.value.id, firstSituation.situationId, {
      action: 'start',
      timestamp: new Date().toISOString()
    });
  }
  await loadSituation(firstSituation.situationId);
}

async function finishStep(completed = false) {
  if (completed && !userStore.isOfflineStoryMode) {
     // Trigger legacy claimStepReward with no situationId to complete the step
     try {
       const token = localStorage.getItem('tt_jwt');
       await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/player-story-progress/claim-step-reward`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ storyId: storyId.value, stepId: currentStep.value.id })
       });
       await userStore.fetchUserStoryProgresses(true);
     } catch (e) {
       console.error("Failed to mark step as completed");
     }
  }
  router.push(`/story?story=${storyId.value}`);
}
</script>

<style scoped>
.vn-view {
  width: 100%;
  height: 100%;
  background: var(--color-bg, #0a0a14);
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 1.5rem;
  color: white;
}

.vn-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.vn-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 20;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent);
}

.vn-header h2 {
  margin: 0;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
  font-size: 1.25rem;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.vn-controls {
  display: flex;
  gap: 1rem;
}

.vn-quit-btn {
  background: rgba(255, 50, 50, 0.15);
  border: 1px solid rgba(255, 50, 50, 0.3);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  backdrop-filter: blur(5px);
  transition: all 0.3s;
  font-weight: 600;
}

.vn-quit-btn:hover {
  background: rgba(255, 50, 50, 0.25);
  transform: scale(1.05);
}

.loading-spinner { animation: rotate 1.5s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
