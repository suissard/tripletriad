<template>
  <PageLayout :title="currentStep?.title || currentStory?.title || 'MODE HISTOIRE'" :backRoute="'/story?story=' + storyId">
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
            <button v-if="isDialogueActive" class="vn-skip-btn" @click.stop="skipDialogue">Passer ⏭</button>
            <button class="vn-quit-btn" @click.stop="quitStep">Quitter 🚪</button>
          </div>
        </div>

        <!-- Persistent UI Layer (Portraits & Log) -->
        <div class="vn-persistent-layer" @click="handleGlobalClick">
          <!-- Background Portraits -->
          <div class="vn-portrait-layer">
            <Transition name="portrait-slide-left">
              <img v-if="leftSpeakerPortrait" :src="leftSpeakerPortrait"
                class="vn-portrait left" :class="{ 'is-dimmed': activeSpeakerPosition !== 'left' }" />
            </Transition>
            <Transition name="portrait-slide-right">
              <img v-if="rightSpeakerPortrait" :src="rightSpeakerPortrait"
                class="vn-portrait right" :class="{ 'is-dimmed': activeSpeakerPosition !== 'right' }" />
            </Transition>
          </div>

          <!-- Dialogue Area -->
          <div class="vn-dialogue-area">
            <div class="vn-chat-log" ref="chatLogRef">
              <div v-for="(line, idx) in persistentLog" :key="idx" class="dialogue-line" :style="getLineStyle(line)" :class="{
                'narration': line.isNarration,
                'hero': !line.isNarration && line.position === 'left',
                'npc': !line.isNarration && line.position === 'right',
                'is-latest': idx === persistentLog.length - 1 && !isChoiceActive
              }">
                <img v-if="line.card && !line.isNarration" :src="getAvatarUrl(line.card)" class="dialogue-avatar" />
                <div class="dialogue-content">
                  <strong v-if="!line.isNarration && line.name" class="speaker-name">{{ line.name }}</strong>
                  <div class="sentence" v-html="marked(line.sentence)"></div>
                </div>
              </div>

              <!-- Choice follows the discussion -->
              <div v-if="isChoiceActive" class="choice-tile fade-in-up" :style="getSituationStyle(currentSituation)">
                <h3 class="choice-title">{{ currentSituation.text || 'Que voulez-vous faire ?' }}</h3>
                <div class="choices-list">
                  <template v-for="(option, idx) in currentSituation.options" :key="idx">
                     <PurchaseButton 
                       v-if="getCoinCondition(option)"
                       :amount="parseInt(getCoinCondition(option).value, 10)"
                       type="coins"
                       :label="option.text"
                       variant="primary"
                       @click.stop="handleChoice(option)"
                       class="choice-item"
                       :class="['status-' + getOptionCompletionStatus(option)]"
                     >
                       <template #extra-icons v-if="getOptionCompletionStatus(option) !== 'new'">
                          <span v-if="getOptionCompletionStatus(option) === 'completed'" class="status-icon completed" title="Étape déjà complétée">✅</span>
                          <span v-else-if="getOptionCompletionStatus(option) === 'seen'" class="status-icon seen" title="Déjà vu">👁️</span>
                       </template>
                     </PurchaseButton>
                    <AppButton v-else
                      @click.stop="handleChoice(option)"
                      :variant="isChoiceSelectable(option) ? 'primary' : 'ghost'"
                      :disabled="!isChoiceSelectable(option)"
                      class="choice-item"
                      :class="['status-' + getOptionCompletionStatus(option)]"
                    >
                      <div class="choice-content-wrap">
                        <span class="choice-text">{{ option.text }}</span>
                        <div class="completion-icons" v-if="getOptionCompletionStatus(option) !== 'new'">
                          <span v-if="getOptionCompletionStatus(option) === 'completed'" class="status-icon completed" title="Étape déjà complétée">✅</span>
                          <span v-else-if="getOptionCompletionStatus(option) === 'seen'" class="status-icon seen" title="Déjà vu">👁️</span>
                        </div>
                      </div>
                      <span v-if="!isChoiceSelectable(option)" class="text-xs text-red-400 ml-2">(Conditions non remplies)</span>
                    </AppButton>
                  </template>
                </div>
              </div>

              <!-- Battle follows the discussion -->
              <div v-if="currentSituation?.__component === 'story.situation-battle'" class="choice-tile fade-in-up battle-tile" :style="getSituationStyle(currentSituation)">
                <h3 class="choice-title">Un combat se prépare : {{ currentSituation.enemyDeckName }}</h3>
                <AppButton @click.stop="playCombat" variant="danger" size="xl" shadow glow class="combat-btn">
                  Entrer en combat ⚔️
                </AppButton>
              </div>

              <!-- Success/End follows the discussion -->
              <div v-if="currentSituation?.__component === 'story.situation-success'" class="choice-tile fade-in-up success-tile" :style="getSituationStyle(currentSituation)">
                <h3 class="choice-title">Félicitations !</h3>
                <p class="mb-6 opacity-80">{{ currentSituation.message }}</p>
                <AppButton @click.stop="finishStep(true)" variant="success" size="lg">
                  Terminer l'étape ✨
                </AppButton>
              </div>

              <!-- Game Over follows the discussion -->
              <div v-if="currentSituation?.__component === 'story.situation-game-over'" class="choice-tile fade-in-up game-over-tile" :style="getSituationStyle(currentSituation)">
                <h3 class="choice-title">Fin de l'aventure</h3>
                <p class="mb-6 opacity-80">{{ currentSituation.message }}</p>
                <div class="flex gap-4">
                  <AppButton @click.stop="restartStep" variant="ghost">Recommencer 🔄</AppButton>
                  <AppButton @click.stop="quitStep" variant="primary">Quitter 🚪</AppButton>
                </div>
              </div>

              <!-- Click Indicator -->
              <div v-if="isDialogueActive" class="vn-click-hint">
                {{ isDialogueFinished ? 'Dialogue fini — Cliquez pour la suite' : 'Cliquez pour continuer ▼' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Hidden Driver Components (Logic only) -->
        <template v-if="currentSituation">
          <SituationDialogue
            v-if="currentSituation.__component === 'story.situation-dialogue'"
            :situation="currentSituation"
            @line="onDialogueLine"
            @finished-state="onDialogueFinishedState"
            @next="nextSituation"
            ref="dialogueDriverRef"
            class="hidden-driver"
          />
        </template>
        
        <!-- Footer Note -->
        <div class="vn-footer-note">Un clic permet de passer au dialogue suivant</div>
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
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { marked } from 'marked';
import PageLayout from '../components/PageLayout.vue';
import { state as gameState, normalizeCard, cardLibrary } from '../game/state.js';
import AppButton from '../components/ui/AppButton.vue';
import RewardModal from '../components/RewardModal.vue';
import { useUserStore } from '../stores/userStore.js';
import strapiService from '../api/strapi.js';
import { getStrapiUrl, getStrapiMediaUrl } from '../utils/url.js';

import SituationDialogue from '../components/story/SituationDialogue.vue';
import SituationBattle from '../components/story/SituationBattle.vue';
import SituationSuccess from '../components/story/SituationSuccess.vue';
import SituationGameOver from '../components/story/SituationGameOver.vue';
import PurchaseButton from '../components/ui/PurchaseButton.vue';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

const getLineStyle = (line) => {
  if (!line.color) return {};
  return { backgroundColor: line.color, borderColor: line.color };
};

const getSituationStyle = (situation) => {
  if (!situation?.color) return {};
  return { backgroundColor: situation.color, borderColor: situation.color };
};

const isLoading = ref(true);
const currentStory = ref(null);
const currentStep = ref(null);
const currentSituation = ref(null);
const persistentLog = ref([]);
const chatLogRef = ref(null);
const dialogueDriverRef = ref(null);
const isDialogueFinished = ref(false);

const isReplay = ref(false);
const reward = ref(null);
const rewardCoins = ref(0);
const showRewardModal = ref(false);

const storyId = computed(() => route.params.storyId);
const stepIndex = computed(() => Number(route.params.stepIndex));

const isChoiceActive = computed(() => currentSituation.value?.__component === 'story.situation-choice');
const isDialogueActive = computed(() => currentSituation.value?.__component === 'story.situation-dialogue');

const activeSpeakerPosition = computed(() => {
  if (persistentLog.value.length === 0) return null;
  const lastLine = persistentLog.value[persistentLog.value.length - 1];
  if (lastLine.isNarration) return null;
  return lastLine.position || 'left';
});

const leftSpeakerPortrait = computed(() => {
  for (let i = persistentLog.value.length - 1; i >= 0; i--) {
    const line = persistentLog.value[i];
    if (line.position === 'left' && line.card) return getAvatarUrl(line.card);
  }
  return userStore.user?.avatar || null;
});

const rightSpeakerPortrait = computed(() => {
  for (let i = persistentLog.value.length - 1; i >= 0; i--) {
    const line = persistentLog.value[i];
    if (line.position === 'right' && line.card) return getAvatarUrl(line.card);
  }
  return null;
});

onMounted(async () => {
  if (!userStore.isLoggedIn && !userStore.isOfflineStoryMode) {
    router.push('/story');
    return;
  }
  await loadStepData();
});

// fetchConfig removed, handled by userStore

async function loadStepData() {
  isLoading.value = true;
  persistentLog.value = [];
  try {
    if (userStore.isOfflineStoryMode) {
      await fetchLocalStepData();
      return;
    }
    
    await userStore.fetchUserStoryProgresses(true);
    const storiesRes = await strapiService.find('stories', {
      filters: { 
        $or: [
          { documentId: { $eq: storyId.value } },
          { id: { $eq: !isNaN(Number(storyId.value)) ? Number(storyId.value) : -1 } }
        ]
      },
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
                },
                'story.situation-choice': {
                  populate: {
                    options: { populate: ['conditions'] }
                  }
                },
                'story.situation-success': true,
                'story.situation-game-over': true
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
        console.log('StoryStepView: Checking isStepActive for', { storyId: storyId.value, stepIdx });
        if (!isStepActive(storyId.value, stepIdx) && route.query.restarted !== 'true') {
          console.warn('StoryStepView: Step not active, proceed with caution...');
          // Removed redirect to allow more flexible navigation and testing
        }

        isReplay.value = isStepCompleted(storyId.value, currentStep.value.id);
        const p = getProgress(storyId.value);

        // Handling return from battle
        const result = route.query.result;
        let fromSituationId = route.query.fromSituation;
        
        if (result) {
           console.log(`StoryStepView: Returning from battle with result: ${result}`);
           
           // If fromSituation is missing from URL, try to recover it from DB progress
           if (!fromSituationId && p && p.currentSituationId) {
              const currentInDb = currentStep.value.situations.find(s => s.situationId === p.currentSituationId);
              if (currentInDb?.__component === 'story.situation-battle') {
                 console.log(`StoryStepView: Recovered fromSituation from DB: ${p.currentSituationId}`);
                 fromSituationId = p.currentSituationId;
              }
           }

           const battleSituation = fromSituationId ? currentStep.value.situations.find(s => s.situationId === fromSituationId) : null;
           
           if (battleSituation) {
              const nextId = result === 'win' ? battleSituation.onWinSituationId : battleSituation.onLoseSituationId;
              console.log(`StoryStepView: Battle found (${battleSituation.situationId}). Advancing to: ${nextId}`);

              await userStore.saveStepProgress(storyId.value, currentStep.value.id, nextId, {
                situationId: battleSituation.situationId,
                action: 'battle',
                result: result,
                timestamp: new Date().toISOString()
              });

              await loadSituation(nextId);
           } else {
              console.warn('StoryStepView: No battle situation identified for return. Falling back to DB progress or start.');
              if (p && p.currentSituationId) {
                 await loadSituation(p.currentSituationId);
              } else {
                 await loadSituation(currentStep.value.situations[0].situationId);
              }
           }
        } else if (p && p.currentStep && (Number(p.currentStep.id || p.currentStep) === Number(currentStep.value.id)) && p.currentSituationId) {
           console.log(`StoryStepView: Resuming from DB progress situation: ${p.currentSituationId}`);
           await loadSituation(p.currentSituationId);
        } else {
           console.log('StoryStepView: Starting fresh step.');
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
    const modules = import.meta.glob('../../../shared/data/stories/*.json', { eager: true });
    const storyIdx = String(route.params.storyId).startsWith('local-') 
      ? parseInt(String(route.params.storyId).replace('local-', '')) - 1
      : 0;

    const moduleEntries = Object.entries(modules);
    if (storyIdx < 0 || storyIdx >= moduleEntries.length) throw new Error("Story not found");

    const storyData = moduleEntries[storyIdx][1].default || moduleEntries[storyIdx][1];
    currentStory.value = storyData;
    
    let steps = storyData.steps || [{
      title: storyData.title,
      situations: storyData.situations
    }];

    const stepIdx = stepIndex.value - 1;
    currentStep.value = steps[stepIdx];

    if (currentStep.value) {
      if (route.query.result && route.query.fromSituation) {
         const battleSituation = currentStep.value.situations.find(s => s.situationId === route.query.fromSituation);
         const nextId = battleSituation ? (route.query.result === 'win' ? battleSituation.onWinSituationId : battleSituation.onLoseSituationId) : currentStep.value.situations[0].situationId;
         await loadSituation(nextId);
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

  let situation = currentStep.value.situations.find(s => s.situationId === situationId);
  
  // If not found in current step, search in all steps
  if (!situation && currentStory.value?.steps) {
    const foundStep = currentStory.value.steps.find(step => 
       step.situations?.some(s => s.situationId === situationId)
    );
    if (foundStep) {
      console.log(`StoryStepView: Jumping to step ${foundStep.title} for situation ${situationId}`);
      currentStep.value = foundStep;
      situation = foundStep.situations.find(s => s.situationId === situationId);
      
      const newStepIdx = currentStory.value.steps.indexOf(foundStep);
      
      // Update progress on jump to ensure it's "unlocked"
      if (!userStore.isOfflineStoryMode) {
        await userStore.saveStepProgress(storyId.value, foundStep.id, situationId);
      }

      // Update URL to reflect new step index
      router.replace({ 
        path: `/story/${storyId.value}/step/${newStepIdx + 1}`,
        query: route.query 
      });
    }
  }

  if (!situation) {
    console.error(`Situation ${situationId} not found in any step of story`);
    finishStep(true);
    return;
  }

  currentSituation.value = situation;
  isDialogueFinished.value = false;

  if (situation.__component === 'story.situation-reward') {
    await processReward(situation);
  }

  nextTick(() => {
    scrollToBottom();
  });
}

function scrollToBottom() {
  if (chatLogRef.value) {
    chatLogRef.value.scrollTop = chatLogRef.value.scrollHeight;
  }
}

async function nextSituation() {
  if (!currentSituation.value) return;
  const nextId = currentSituation.value.nextSituationId;
  if (!userStore.isOfflineStoryMode) {
    await userStore.saveStepProgress(storyId.value, currentStep.value.id, nextId);
  }
  await loadSituation(nextId);
}

function onDialogueLine(line) {
  persistentLog.value.push(line);
  nextTick(() => {
    scrollToBottom();
  });
}

function onDialogueFinishedState(isFinished) {
  isDialogueFinished.value = isFinished;
}

function handleGlobalClick() {
  if (isDialogueActive.value && dialogueDriverRef.value) {
    dialogueDriverRef.value.advanceDialogue();
  }
}

function skipDialogue() {
  if (dialogueDriverRef.value) {
    dialogueDriverRef.value.skipAllDialogue();
  }
}

function getAvatarUrl(card) {
  if (!card) return '';
  // card might be a raw Strapi object, normalizeCard handles both
  return normalizeCard(card).imageUrl;
}

function getProgress(storyId) {
  if (userStore.isOfflineStoryMode || !userStore.storyProgresses) return null;
  return userStore.storyProgresses.find(p => {
    const storyData = p.story?.data || p.story;
    if (!storyData) return false;
    return (storyData.id && Number(storyData.id) === Number(storyId)) || 
           (storyData.documentId && String(storyData.documentId) === String(storyId)) ||
           (!isNaN(Number(p.story)) && Number(p.story) === Number(storyId));
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
  if (!p) {
    console.warn('isStepActive: No progress found for story', storyId);
    return false;
  }
  
  // Linear progression check
  const completedCount = p.completedSteps ? p.completedSteps.length : 0;
  if (stepIdx <= completedCount) {
    console.log(`isStepActive: Step ${stepIdx} is accessible (linear: ${completedCount})`);
    return true;
  }

  // Current session check
  const step = currentStory.value?.steps[stepIdx];
  if (step && p.currentStep) {
    const pStepId = p.currentStep.id || p.currentStep.documentId || p.currentStep;
    console.log(`isStepActive: Comparing step ${step.id}/${step.documentId} with progress.currentStep ${pStepId}`);
    if (String(step.id) === String(pStepId) || String(step.documentId) === String(pStepId)) {
      console.log('isStepActive: Step is active because it is the current step in progress');
      return true;
    }
  }

  console.warn(`isStepActive: Step ${stepIdx} is LOCKED`, {
    completedCount,
    currentStep: p.currentStep,
    stepId: step?.id,
    stepDocId: step?.documentId
  });
  return false;
}

async function handleChoice(option) {
  const nextId = option.nextSituationId;
  if (!userStore.isOfflineStoryMode) {
    await userStore.saveStepProgress(storyId.value, currentStep.value.id, nextId, {
      situationId: currentSituation.value.situationId,
      action: 'choice',
      result: nextId,
      timestamp: new Date().toISOString()
    }, option.variables);
  }
  await loadSituation(nextId);
}

function isChoiceSelectable(option) {
  if (!option.conditions || option.conditions.length === 0) return true;
  for (const condition of option.conditions) {
    if (condition.type === 'hasCoin' && userStore.user.coins < parseInt(condition.value, 10)) return false;
  }
  return true;
}

function getCoinCondition(option) {
  return option.conditions?.find(c => c.type === 'hasCoin');
}

async function processReward(situation) {
  try {
    if (userStore.isOfflineStoryMode) {
      nextSituation();
      return;
    }
    const res = await userStore.claimSituationReward(storyId.value, currentStep.value.id, situation.situationId);
    if (res && (res.reward || res.coins)) {
      reward.value = res.reward;
      rewardCoins.value = res.coins || 0;
      showRewardModal.value = true;
    } else {
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

function getOptionCompletionStatus(option) {
  if (userStore.isOfflineStoryMode) return 'new';
  const nextId = option.nextSituationId;
  if (!nextId) return 'new';

  const storyProg = getProgress(storyId.value);
  if (!storyProg) return 'new';

  // Find target step
  let targetStep = null;
  if (currentStory.value?.steps) {
    targetStep = currentStory.value.steps.find(step =>
       step.situations?.some(s => String(s.situationId) === String(nextId))
    );
  }

  // If the target step is completed
  if (targetStep && (storyProg.completedSteps || []).includes(targetStep.id)) {
    return 'completed';
  }

  // If the target situation was already visited
  const isVisited = (storyProg.stepHistory || []).some(h => String(h.situationId) === String(nextId));
  if (isVisited) {
    return 'seen';
  }

  return 'new';
}

async function playCombat() {
  if (currentSituation.value?.__component !== 'story.situation-battle') return;
  try {
    let playerDeckCards = currentSituation.value.playerDeck?.cards || [];
    let enemyDeckCards = currentSituation.value.enemyDeck?.cards || [];

    gameState.playerDeckSelection = playerDeckCards.length > 0 ? playerDeckCards.map(normalizeCard) : Array(userStore.gameConfig?.cardsPerDeck || 15).fill(0).map(() => normalizeCard(cardLibrary[Math.floor(Math.random() * cardLibrary.length)]));
    gameState.storyEnemyDeckConfig = enemyDeckCards.length > 0 ? enemyDeckCards.map(normalizeCard) : [];

    gameState.isStoryMatch = true;
    gameState.storyMatchData = { story: currentStory.value, step: currentStep.value };

    router.push({ 
      path: '/game', 
      query: { mode: 'story', storyId: currentStory.value.documentId || currentStory.value.id, stepId: currentStep.value.id, fromSituation: currentSituation.value.situationId }
    });
  } catch (error) {
    console.error('Error starting combat:', error);
  }
}

function quitStep() {
  router.push(`/story/${currentStory.value?.documentId || storyId.value}/steps`);
}

async function restartStep() {
  const firstSituation = currentStep.value.situations[0];
  if (!userStore.isOfflineStoryMode) {
    isLoading.value = true;
    try {
      await userStore.saveStepProgress(storyId.value, currentStep.value.id, firstSituation.situationId, {
        action: 'start',
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to save progress on restart:', e);
    }
  }
  
  // Clear the URL query parameters and let it remount/reload
  // The key on router-view in App.vue ensures a fresh load
  await router.replace({ 
    path: `/story/${currentStory.value?.documentId || storyId.value}/step/${stepIndex.value}`,
    query: { restarted: 'true' } // Hint for loadStepData
  });
}

async function finishStep(completed = false) {
  if (completed && !userStore.isOfflineStoryMode) {
     try {
       // Save success variables if any
       const vars = (currentSituation.value?.__component === 'story.situation-success') ? currentSituation.value.variables : null;
       if (vars) {
         await userStore.saveStepProgress(storyId.value, currentStep.value.id, currentSituation.value.situationId, null, vars);
       }

       const token = localStorage.getItem('tt_jwt');
       await fetch(getStrapiUrl('/player-story-progress/claim-step-reward'), {
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
  router.push(`/story/${currentStory.value?.documentId || storyId.value}/steps`);
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

.vn-skip-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  backdrop-filter: blur(5px);
  transition: all 0.3s;
  font-weight: 600;
}

.vn-skip-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

/* Persistent Layer Styles */
.vn-persistent-layer {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.vn-portrait-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.vn-portrait {
  position: absolute;
  bottom: 0;
  height: 85vh;
  max-width: 50vw;
  object-fit: contain;
  opacity: 0.8;
  filter: drop-shadow(0 0 30px rgba(0, 210, 255, 0.3));
  mask-image: linear-gradient(to top, transparent 0%, black 30%);
  -webkit-mask-image: linear-gradient(to top, transparent 0%, black 30%);
}

.vn-portrait.left { left: -5%; transform-origin: bottom left; }
.vn-portrait.right {
  right: -5%;
  transform-origin: bottom right;
  filter: drop-shadow(0 0 30px rgba(255, 100, 100, 0.3));
}

.vn-portrait.is-dimmed {
  filter: brightness(0.3) grayscale(0.5);
  opacity: 0.6;
  transform: scale(0.95);
}

.vn-dialogue-area {
  position: absolute;
  bottom: 5%;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 800px;
  height: 70vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  z-index: 10;
  pointer-events: none;
}

.vn-chat-log {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  overflow-y: auto;
  padding: 2rem;
  padding-bottom: 5rem;
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 100%);
  pointer-events: auto;
}

.vn-chat-log::-webkit-scrollbar { width: 4px; }
.vn-chat-log::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }

.dialogue-line {
  padding: 1rem 1.5rem;
  border-radius: 16px;
  background: rgba(20, 20, 30, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 1.1rem;
  display: flex;
  align-items: flex-start;
  gap: 15px;
  max-width: 85%;
  animation: slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  color: #eee;
}

.dialogue-line.is-latest { border-color: rgba(255, 255, 255, 0.4); box-shadow: 0 0 15px rgba(255,255,255,0.1); }

.dialogue-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.speaker-name {
  display: block;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.4rem;
  font-weight: 700;
}

.dialogue-line.hero {
  align-self: flex-start;
  background: rgba(0, 100, 200, 0.2);
  border-left: 4px solid #00d2ff;
}
.dialogue-line.hero .speaker-name { color: #00d2ff; }

.dialogue-line.npc {
  align-self: flex-end;
  background: rgba(200, 50, 50, 0.15);
  border-right: 4px solid #ff6464;
  flex-direction: row-reverse;
  text-align: right;
}
.dialogue-line.npc .speaker-name { color: #ff6464; }

.narration {
  background: transparent;
  border: none;
  font-style: italic;
  text-align: center;
  align-self: center;
  color: #aaa;
  font-size: 1rem;
}

.choice-tile {
  background: rgba(30, 30, 50, 0.9);
  border: 1px solid rgba(100, 100, 255, 0.3);
  border-radius: 20px;
  padding: 2rem;
  margin: 1rem 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
}

.battle-tile { border-color: rgba(255, 50, 50, 0.4); background: rgba(50, 20, 20, 0.9); }
.success-tile { border-color: rgba(50, 255, 50, 0.4); background: rgba(20, 40, 20, 0.9); }
.game-over-tile { border-color: rgba(255, 100, 0, 0.4); background: rgba(40, 25, 15, 0.9); }

.choice-title { margin-bottom: 1.5rem; color: #fff; font-size: 1.25rem; text-transform: uppercase; letter-spacing: 1px; text-align: center; }
.choices-list { display: flex; flex-direction: column; gap: 0.8rem; width: 100%; max-width: 400px; }
.choice-item { width: 100%; }

.choice-content-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.completion-icons {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

.status-completed {
  border-left: 4px solid #00ff64 !important;
}

.status-seen {
  border-left: 4px solid #aaa !important;
}

.combat-btn { transform: scale(1.1); transition: all 0.3s; }
.combat-btn:hover { transform: scale(1.15); }

.mb-6 { margin-bottom: 1.5rem; }
.opacity-80 { opacity: 0.8; }
.flex { display: flex; }
.gap-4 { gap: 1rem; }

.vn-click-hint {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  margin-top: 1rem;
  animation: pulse-hint 2s infinite;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
}

.vn-footer-note {
  position: absolute;
  bottom: 10px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.15);
  pointer-events: none;
  z-index: 5;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hidden-driver { display: none; }

@keyframes slide-up-fade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse-hint {
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50% { opacity: 0.7; transform: translateY(-5px); }
}

.fade-in-up { animation: slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

/* Transitions */
.portrait-slide-left-enter-active, .portrait-slide-left-leave-active,
.portrait-slide-right-enter-active, .portrait-slide-right-leave-active {
  transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.portrait-slide-left-enter-from, .portrait-slide-left-leave-to { opacity: 0; transform: translateX(-30px); }
.portrait-slide-right-enter-from, .portrait-slide-right-leave-to { opacity: 0; transform: translateX(30px); }

.loading-spinner { animation: rotate 1.5s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
