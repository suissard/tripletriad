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

      <div v-else class="vn-container" @click="advanceDialogue">
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

        <!-- Header -->
        <div class="vn-header">
          <h2>{{ currentStep.title }}</h2>
          <div class="vn-controls">
            <button class="vn-quit-btn" @click.stop="quitStep">Quitter 🚪</button>
            <button v-if="currentSituation && currentSituation.__component === 'story.situation-dialogue'" class="vn-skip-btn" @click.stop="skipAllDialogue">Passer ⏭</button>
          </div>
        </div>

        <!-- Dialogue Area -->
        <div v-if="currentSituation && currentSituation.__component === 'story.situation-dialogue'" class="vn-dialogue-area">
          <div class="vn-chat-log" ref="chatLogRef">
            <div v-for="(line, idx) in displayedLines" :key="idx" class="dialogue-line" :class="{
              'narration': line.isNarration,
              'hero': !line.isNarration && line.position === 'left',
              'npc': !line.isNarration && line.position === 'right',
              'is-latest': idx === displayedLines.length - 1
            }">
              <img v-if="line.card && !line.isNarration" :src="getAvatarUrl(line.card)" class="dialogue-avatar" />
              <div class="dialogue-content">
                <strong v-if="!line.isNarration && line.name" class="speaker-name">{{ line.name }}</strong>
                <span v-html="marked(line.sentence)"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Action Area (Centered) -->
        <Transition name="vn-fade">
          <div v-if="currentSituation && isSituationFinished" class="vn-modal-overlay">
            <div class="vn-modal-content fade-in-up">

              <!-- Choice Situation -->
              <div v-if="currentSituation.__component === 'story.situation-choice'" class="vn-choice-actions">
                <h3 class="modal-title">{{ currentSituation.text || 'Que voulez-vous faire ?' }}</h3>
                <div class="choices-container">
                  <AppButton v-for="(option, idx) in currentSituation.options" :key="idx"
                    @click.stop="handleChoice(option)"
                    :variant="isChoiceSelectable(option) ? 'primary' : 'ghost'"
                    :disabled="!isChoiceSelectable(option)"
                    class="choice-btn">
                    {{ option.text }}
                    <span v-if="!isChoiceSelectable(option)" class="text-xs text-red-400 ml-2">(Conditions non remplies)</span>
                  </AppButton>
                </div>
              </div>

              <!-- Battle Situation -->
              <div v-else-if="currentSituation.__component === 'story.situation-battle'" class="vn-battle-actions">
                <h3 class="modal-title">Un combat se prépare...</h3>
                <AppButton @click.stop="playCombat" variant="danger" size="xl" shadow glow class="combat-btn mt-4">
                  Entrer en combat ⚔️
                </AppButton>
              </div>

              <!-- Success Situation -->
              <div v-else-if="currentSituation.__component === 'story.situation-success'" class="vn-success-actions">
                <h3 class="modal-title text-green-400">Succès !</h3>
                <p class="mb-6">{{ currentSituation.message || 'Vous avez terminé cette étape.' }}</p>
                <AppButton @click.stop="finishStep(true)" variant="primary" size="xl" shadow glow class="finish-btn">
                  Terminer l'étape 🎉
                </AppButton>
              </div>

              <!-- Game Over Situation -->
              <div v-else-if="currentSituation.__component === 'story.situation-game-over'" class="vn-gameover-actions">
                <h3 class="modal-title text-red-500">Game Over</h3>
                <p class="mb-6">{{ currentSituation.message || 'Vous avez échoué.' }}</p>
                <div class="flex gap-4 justify-center">
                  <AppButton @click.stop="quitStep" variant="ghost">Quitter</AppButton>
                  <AppButton @click.stop="restartStep" variant="primary" shadow glow>Recommencer l'étape 🔄</AppButton>
                </div>
              </div>

              <!-- Dialogue transition button (in case click doesn't work) -->
              <div v-else-if="currentSituation.__component === 'story.situation-dialogue'" class="vn-end-actions">
                <AppButton @click.stop="nextSituation" variant="ghost" class="mt-4">
                  Continuer
                </AppButton>
              </div>

            </div>
          </div>
        </Transition>

        <!-- Click Indicator -->
        <div v-if="currentSituation && currentSituation.__component === 'story.situation-dialogue' && !isSituationFinished" class="vn-click-hint" @click.stop="advanceDialogue">Cliquez pour continuer ▼</div>
      </div>

      <!-- Reward Celebration Modal -->
      <RewardModal
        :show="showRewardModal"
        :reward="reward"
        :coins="rewardCoins"
        title="Récompense débloquée !"
        :subtitle="currentStep?.title ? \`Étape : \${currentStep.title}\` : ''"
        @claimed="onRewardClaimed"
        @close="onRewardClaimed"
      />
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { marked } from 'marked';
import PageLayout from '../components/PageLayout.vue';
import { state as gameState, normalizeCard, cardLibrary } from '../game/state.js';
import AppButton from '../components/ui/AppButton.vue';
import RewardModal from '../components/RewardModal.vue';
import { useUserStore } from '../stores/userStore.js';
import strapiService from '../api/strapi.js';

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

// VN Dialogue state
const displayedLines = ref([]);
const activeLineIndex = ref(0);
const dialogueTimer = ref(null);
const isSituationFinished = ref(false);
const chatLogRef = ref(null);

const activeSpeakerPosition = computed(() => {
  if (displayedLines.value.length === 0) return null;
  const lastLine = displayedLines.value[displayedLines.value.length - 1];
  if (lastLine.isNarration) return null;
  return lastLine.position || 'left';
});

const leftSpeakerPortrait = computed(() => {
  if (currentSituation.value?.__component !== 'story.situation-dialogue') {
    return userStore.user.avatar || null;
  }
  for (let i = displayedLines.value.length - 1; i >= 0; i--) {
    const line = displayedLines.value[i];
    if (line.position === 'left' && line.card) return getAvatarUrl(line.card);
  }
  return userStore.user.avatar || null;
});

const rightSpeakerPortrait = computed(() => {
  if (currentSituation.value?.__component !== 'story.situation-dialogue') return null;
  for (let i = displayedLines.value.length - 1; i >= 0; i--) {
    const line = displayedLines.value[i];
    if (line.position === 'right' && line.card) return getAvatarUrl(line.card);
  }
  return null;
});

onMounted(async () => {
  if (!userStore.isLoggedIn) {
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
    await userStore.fetchUserStoryProgresses();
    const storiesRes = await strapiService.find('stories', {
      filters: { id: storyId.value },
      populate: {
        steps: {
          populate: {
            situations: {
              populate: {
                dialogues: { populate: { card: { populate: ['image'] } } },
                options: true,
                rewardCards: { populate: ['image'] }
              }
            },
            playerDeck: { populate: { cards: { populate: ['image'] } } },
            enemyDeck: { populate: { cards: { populate: ['image'] } } }
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
  isSituationFinished.value = false;

  if (situation.__component === 'story.situation-dialogue') {
    startDialogueSequence();
  } else if (situation.__component === 'story.situation-reward') {
    await processReward(situation);
  } else {
    // Battle, Choice, GameOver, Success
    isSituationFinished.value = true;
  }
}

async function nextSituation() {
  if (!currentSituation.value) return;
  const nextId = currentSituation.value.nextSituationId;

  if (!nextId) {
    finishStep(true);
    return;
  }

  // Save progress on transition
  await userStore.saveStepProgress(storyId.value, currentStep.value.id, nextId);
  await loadSituation(nextId);
}

function getProgress(storyId) {
  if (!userStore.storyProgresses) return null;
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
  const p = getProgress(storyId);
  return p && p.completedSteps && p.completedSteps.includes(stepId);
}

function isStepActive(storyId, stepIdx) {
  const p = getProgress(storyId);
  if (!p) return false;
  const completedCount = p.completedSteps ? p.completedSteps.length : 0;
  return stepIdx <= completedCount;
}

// Dialog Logic
function startDialogueSequence() {
  displayedLines.value = [];
  activeLineIndex.value = 0;
  isSituationFinished.value = false;
  showNextLine();
}

function showNextLine() {
  if (!currentSituation.value || !currentSituation.value.dialogues) {
     isSituationFinished.value = true;
     return;
  }
  const dialoguesArray = currentSituation.value.dialogues;
  if (activeLineIndex.value >= dialoguesArray.length) {
    isSituationFinished.value = true;
    return;
  }

  const nextLine = dialoguesArray[activeLineIndex.value];
  displayedLines.value.push(nextLine);
  activeLineIndex.value++;

  nextTick(() => {
    if (chatLogRef.value) chatLogRef.value.scrollTop = chatLogRef.value.scrollHeight;
  });

  const textLength = nextLine.sentence ? nextLine.sentence.length : 10;
  const delay = Math.min(Math.max(1500, textLength * 60), 10000);
  dialogueTimer.value = setTimeout(() => {
    showNextLine();
  }, delay);
}

function advanceDialogue() {
  if (currentSituation.value?.__component !== 'story.situation-dialogue') return;
  if (isSituationFinished.value) {
     nextSituation();
     return;
  }
  clearTimeout(dialogueTimer.value);
  showNextLine();
}

function skipAllDialogue() {
  if (currentSituation.value?.__component !== 'story.situation-dialogue') return;
  clearTimeout(dialogueTimer.value);
  const dialoguesArray = currentSituation.value.dialogues || [];
  displayedLines.value = [...dialoguesArray];
  activeLineIndex.value = dialoguesArray.length;
  isSituationFinished.value = true;
  nextTick(() => {
    if (chatLogRef.value) chatLogRef.value.scrollTop = chatLogRef.value.scrollHeight;
  });
}

// Choice Logic
function isChoiceSelectable(option) {
  if (!option.conditions || option.conditions.length === 0) return true;
  for (const condition of option.conditions) {
    if (condition.type === 'hasCoin') {
      if (userStore.user.coins < parseInt(condition.value, 10)) return false;
    }
    // Add other conditions here if needed
  }
  return true;
}

async function handleChoice(option) {
  if (!isChoiceSelectable(option)) return;

  const historyEntry = {
    situationId: currentSituation.value.situationId,
    action: 'choice',
    result: option.nextSituationId,
    timestamp: new Date().toISOString()
  };

  const nextId = option.nextSituationId;
  const res = await userStore.saveStepProgress(storyId.value, currentStep.value.id, nextId, historyEntry);
  if (res) {
    await loadSituation(nextId);
  } else {
    console.error("Failed to save choice progress");
  }
}

// Reward Logic
async function processReward(situation) {
  try {
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

  clearTimeout(dialogueTimer.value);
  try {
    const playerDeckId = currentSituation.value.playerDeck || currentStep.value.playerDeck?.id;
    const enemyDeckId = currentSituation.value.enemyDeck || currentStep.value.enemyDeck?.id;

    // Simplification for now: we use the decks from step if not specific to situation
    let playerDeckCards = currentStep.value.playerDeck?.cards || [];
    let enemyDeckCards = currentStep.value.enemyDeck?.cards || [];

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
  clearTimeout(dialogueTimer.value);
  router.push(`/story?story=${storyId.value}`);
}

async function restartStep() {
  clearTimeout(dialogueTimer.value);
  const firstSituation = currentStep.value.situations[0];
  await userStore.saveStepProgress(storyId.value, currentStep.value.id, firstSituation.situationId, {
    action: 'start',
    timestamp: new Date().toISOString()
  });
  await loadSituation(firstSituation.situationId);
}

async function finishStep(completed = false) {
  clearTimeout(dialogueTimer.value);

  if (completed) {
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

function getAvatarUrl(card) {
  if (!card) return '';
  let url = card.imageUrl || card.img;
  if (!url && card.image?.url) {
    url = card.image.url.startsWith('http') ? card.image.url : `${strapiService.MEDIA_URL}${card.image.url}`;
  }
  if (!url) {
    const seed = card.id || card.documentId || card.name || '0';
    url = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
  }
  return url;
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
  cursor: pointer;
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

.vn-skip-btn, .vn-quit-btn {
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

.vn-skip-btn:hover, .vn-quit-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.vn-quit-btn {
  background: rgba(255, 50, 50, 0.15);
  border-color: rgba(255, 50, 50, 0.3);
}

.vn-quit-btn:hover {
  background: rgba(255, 50, 50, 0.25);
}

.vn-dialogue-area {
  position: absolute;
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 800px;
  height: 60vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  z-index: 10;
  pointer-events: none;
}

.vn-chat-log {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding: 1rem;
  padding-bottom: 3rem;
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 100%);
  pointer-events: auto;
}

.vn-chat-log::-webkit-scrollbar { width: 4px; }
.vn-chat-log::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }

.dialogue-line {
  padding: 1rem 1.5rem;
  border-radius: 16px;
  background: rgba(20, 20, 30, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 1.1rem;
  display: flex;
  align-items: flex-start;
  gap: 15px;
  max-width: 85%;
  animation: slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(20px);
}

.dialogue-line.is-latest { border-color: rgba(255, 255, 255, 0.4); }

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
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.4rem;
}

.dialogue-line.hero {
  align-self: flex-start;
  background: rgba(0, 100, 200, 0.2);
  border-left: 4px solid #00d2ff;
}
.dialogue-line.hero .speaker-name { color: #00d2ff; }

.dialogue-line.npc {
  align-self: flex-end;
  background: rgba(200, 50, 50, 0.2);
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
  color: #ccc;
}

.vn-modal-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 50;
  pointer-events: auto;
}

.vn-modal-content {
  background: rgba(15, 15, 25, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 3rem;
  max-width: 480px;
  width: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.modal-title { font-size: 1.5rem; color: white; margin-bottom: 2rem; text-transform: uppercase; }

.choices-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}
.choice-btn {
  width: 100%;
}

.vn-click-hint {
  position: absolute;
  bottom: 2%;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  letter-spacing: 2px;
  animation: pulse-hint 2s infinite;
}

@keyframes slide-up-fade { to { opacity: 1; transform: translateY(0); } }
@keyframes pulse-hint {
  0%, 100% { opacity: 0.3; transform: translateX(-50%) translateY(0); }
  50% { opacity: 0.7; transform: translateX(-50%) translateY(-5px); }
}

.vn-fade-enter-active, .vn-fade-leave-active { transition: opacity 0.5s ease; }
.vn-fade-enter-from, .vn-fade-leave-to { opacity: 0; }

.portrait-slide-left-enter-active, .portrait-slide-left-leave-active,
.portrait-slide-right-enter-active, .portrait-slide-right-leave-active {
  transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.portrait-slide-left-enter-from, .portrait-slide-left-leave-to { opacity: 0; transform: translateX(-30px); }
.portrait-slide-right-enter-from, .portrait-slide-right-leave-to { opacity: 0; transform: translateX(30px); }

.fade-in-up {
  animation: slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.loading-spinner { animation: rotate 1.5s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
