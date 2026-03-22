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
            <button class="vn-skip-btn" @click.stop="skipAllDialogue">Passer ⏭</button>
          </div>
        </div>

        <!-- Dialogue Area -->
        <div class="vn-dialogue-area">
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
          <div v-if="isDialogueFinished" class="vn-modal-overlay">
            <div class="vn-modal-content fade-in-up">
              <div v-if="dialogueState === 'start'" class="vn-start-actions">
                <h3 class="modal-title">L'heure de la bataille a sonné !</h3>
                <AppButton @click.stop="playCombat" variant="danger" size="xl" shadow glow class="combat-btn">
                  {{ isReplay ? 'Rejouer l\'étape' : 'Entrer en combat' }} ⚔️
                </AppButton>
              </div>

              <div v-if="dialogueState === 'end'" class="vn-end-actions">
                <AppButton @click.stop="finishStep" variant="primary" size="xl" shadow glow class="finish-btn mt-6">
                  Quitter et continuer 🚪
                </AppButton>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Click Indicator -->
        <div v-if="!isDialogueFinished" class="vn-click-hint" @click.stop="advanceDialogue">Cliquez pour continuer ▼</div>
      </div>

      <!-- Reward Celebration Modal -->
      <RewardModal
        :show="showRewardModal"
        :reward="reward"
        title="Récompense débloquée !"
        :subtitle="currentStep?.title ? `Étape : ${currentStep.title}` : ''"
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
const dialogueState = ref('start'); // 'start' or 'end'
const isReplay = ref(false);
const reward = ref(null);
const showRewardModal = ref(false);

const storyId = computed(() => Number(route.params.storyId));
const stepIndex = computed(() => Number(route.params.stepIndex));

// VN Dialogue state
const displayedLines = ref([]);
const activeLineIndex = ref(0);
const dialogueTimer = ref(null);
const isDialogueFinished = ref(false);
const chatLogRef = ref(null);

const activeSpeakerPosition = computed(() => {
  if (displayedLines.value.length === 0) return null;
  const lastLine = displayedLines.value[displayedLines.value.length - 1];
  if (lastLine.isNarration) return null;
  return lastLine.position || 'left';
});

const leftSpeakerPortrait = computed(() => {
  for (let i = displayedLines.value.length - 1; i >= 0; i--) {
    const line = displayedLines.value[i];
    if (line.position === 'left' && line.card) return getAvatarUrl(line.card);
  }
  const playerDeck = currentStep.value?.playerDeck?.cards || [];
  if (playerDeck.length > 0) return getAvatarUrl(playerDeck[0]);
  return userStore.user.avatar;
});

const rightSpeakerPortrait = computed(() => {
  for (let i = displayedLines.value.length - 1; i >= 0; i--) {
    const line = displayedLines.value[i];
    if (line.position === 'right' && line.card) return getAvatarUrl(line.card);
  }
  const enemyDeck = currentStep.value?.enemyDeck?.cards || [];
  if (enemyDeck.length > 0) return getAvatarUrl(enemyDeck[0]);
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
        rewardCards: { populate: ['image'] },
        steps: {
          populate: {
            rewardCards: { populate: ['image'] },
            startDialogue: { populate: { card: { populate: ['image'] } } },
            endDialogue: { populate: { card: { populate: ['image'] } } },
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
        // Access check
        if (!isStepActive(storyId.value, stepIdx)) {
          router.push('/story');
          return;
        }

        isReplay.value = isStepCompleted(storyId.value, currentStep.value.id);
        
        // Handle combat results if present
        if (route.query.result === 'win') {
          await handleMatchWin();
        } else if (route.query.result === 'loss') {
          dialogueState.value = 'start';
          startDialogueSequence();
        } else {
          // Normal start
          const lineIdx = route.query.line ? Number(route.query.line) : 0;
          dialogueState.value = route.query.dialogue || 'start';
          startDialogueSequence(lineIdx);
        }
      }
    }
  } catch (error) {
    console.error('Failed to load step data:', error);
  } finally {
    isLoading.value = false;
  }
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

function startDialogueSequence(resumeIndex = 0) {
  displayedLines.value = [];
  activeLineIndex.value = 0;
  isDialogueFinished.value = false;

  const currentDialogueArray = dialogueState.value === 'start' ? currentStep.value.startDialogue : currentStep.value.endDialogue;

  if (!currentDialogueArray || currentDialogueArray.length === 0) {
    isDialogueFinished.value = true;
    return;
  }

  if (resumeIndex > 0) {
    const limit = Math.min(resumeIndex, currentDialogueArray.length);
    displayedLines.value = currentDialogueArray.slice(0, limit);
    activeLineIndex.value = limit;
    if (activeLineIndex.value >= currentDialogueArray.length) {
      isDialogueFinished.value = true;
    } else {
      showNextLine();
    }
  } else {
    showNextLine();
  }
}

function showNextLine() {
  clearTimeout(dialogueTimer.value);
  const currentDialogueArray = dialogueState.value === 'start' ? currentStep.value.startDialogue : currentStep.value.endDialogue;
  if (!currentDialogueArray || activeLineIndex.value >= currentDialogueArray.length) {
    isDialogueFinished.value = true;
    return;
  }

  const nextLine = currentDialogueArray[activeLineIndex.value];
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
  if (isDialogueFinished.value) return;
  showNextLine();
}

function skipAllDialogue() {
  clearTimeout(dialogueTimer.value);
  const currentDialogueArray = dialogueState.value === 'start' ? currentStep.value.startDialogue : currentStep.value.endDialogue;
  displayedLines.value = [...(currentDialogueArray || [])];
  activeLineIndex.value = currentDialogueArray ? currentDialogueArray.length : 0;
  isDialogueFinished.value = true;
  nextTick(() => {
    if (chatLogRef.value) chatLogRef.value.scrollTop = chatLogRef.value.scrollHeight;
  });
}

function quitStep() {
  clearTimeout(dialogueTimer.value);
  router.push(`/story?story=${storyId.value}`);
}

async function playCombat() {
  clearTimeout(dialogueTimer.value);
  try {
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

    router.push({ 
      path: '/game', 
      query: { mode: 'story', storyId: currentStory.value.id, stepId: currentStep.value.id } 
    });
  } catch (error) {
    console.error('Error starting combat:', error);
  }
}

async function handleMatchWin() {
  if (isReplay.value) {
    dialogueState.value = 'end';
    startDialogueSequence();
    return;
  }
  try {
    const token = localStorage.getItem('tt_jwt');
    const response = await fetch(`${strapiService.MEDIA_URL}/api/player-story-progress/claim-step-reward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ storyId: storyId.value, stepId: currentStep.value.id })
    });

    if (!response.ok) {
      dialogueState.value = 'end';
      startDialogueSequence();
      return;
    }

    const data = await response.json();
    reward.value = data.reward;
    await userStore.fetchUserStoryProgresses(true);

    if (data.reward) {
      showRewardModal.value = true;
    } else {
      dialogueState.value = 'end';
      startDialogueSequence();
    }
  } catch (error) {
    console.error('Error claiming step reward:', error);
    dialogueState.value = 'end';
    startDialogueSequence();
  }
}

function onRewardClaimed() {
  showRewardModal.value = false;
  dialogueState.value = 'end';
  startDialogueSequence();
}

function finishStep() {
  clearTimeout(dialogueTimer.value);
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
