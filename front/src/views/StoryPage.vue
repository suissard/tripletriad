<template>
  <PageLayout title="MODE HISTOIRE" backRoute="/">
    <div class="story-container">
      <div v-if="!userStore.isLoggedIn" class="auth-notice">
        <p>Connectez-vous pour jouer au mode Histoire.</p>
      </div>

      <div v-else-if="isLoading" class="loading-state">
        <p>Chargement des histoires...</p>
      </div>

      <div v-else-if="stories.length === 0" class="no-quests">
        <div class="empty-icon">📖</div>
        <h3>Aucune histoire disponible</h3>
        <p>Les archives sont vides pour le moment.</p>
      </div>

      <div v-else class="stories-list">
        <AppCard v-for="story in stories" :key="story.id" class="story-card">
          <div class="story-header" @click="toggleStory(story.id)">
            <div class="story-info">
              <h3>{{ story.title }}</h3>
              <p class="story-desc">{{ story.description }}</p>
            </div>
            <div class="story-status">
              <span v-if="getStoryStatus(story.id) === 'completed'" class="status-badge completed">Terminé</span>
              <span v-else-if="getStoryStatus(story.id) === 'in_progress'" class="status-badge progress">En cours</span>
              <span v-else class="status-badge locked">Bloqué</span>
              <span class="chevron" :class="{ open: expandedStory === story.id }">▼</span>
            </div>
          </div>

          <div v-if="expandedStory === story.id" class="story-steps">

            <!-- Per-Story Unlock Prompt -->
            <div v-if="getStoryStatus(story.id) === 'locked'"
              class="unlock-story-prompt p-6 rounded-2xl flex flex-col items-center mx-auto my-4 w-full"
              style="background: rgba(255, 191, 0, 0.05); border: 1px solid rgba(255, 191, 0, 0.2);">
              <div class="lock-icon text-4xl mb-2 text-center">🔒</div>
              <h4 class="text-xl font-bold text-center mb-2 text-white">Histoire Bloquée</h4>
              <p class="text-center text-gray-400 mb-4 text-sm">Débloquez cette histoire pour explorer ses étapes et
                gagner des récompenses exclusives.</p>

              <div class="flex items-center gap-2 mb-4 text-primary">
                <span class="text-3xl font-black" style="color: #FFBF00">{{ unlockPrice || 500 }}</span>
                <span class="font-bold" style="color: #FFBF00">Coins</span>
              </div>

              <AppButton @click.stop="unlockStory(story.id)"
                :disabled="isUnlocking || userStore.user.coins < unlockPrice" variant="primary"
                style="width: 100%; max-width: 300px; height: 3rem; font-size: 1rem;">
                <span v-if="isUnlocking">Déblocage...</span>
                <span v-else-if="userStore.user.coins < unlockPrice">Fonds Insuffisants</span>
                <span v-else>Débloquer cette Histoire</span>
              </AppButton>
            </div>

            <!-- Story Steps (if unlocked) -->
            <div v-else v-for="(step, index) in story.steps" :key="step.id" class="step-item" :class="{
              'completed': isStepCompleted(story.id, step.id),
              'active': isStepActive(story.id, index),
              'locked': isStepLocked(story.id, index)
            }">
              <div class="step-header">
                <h4>Étape {{ index + 1 }} : {{ step.title }}</h4>
                <div class="step-status-icon">
                  <span v-if="isStepCompleted(story.id, step.id)">✅</span>
                  <span v-else-if="isStepLocked(story.id, index)">🔒</span>
                  <span v-else>⚔️</span>
                </div>
              </div>
              <p class="step-desc">{{ step.description }}</p>

              <div v-if="isStepActive(story.id, index)" class="step-actions">
                <AppButton @click.stop="startStep(story, step)" variant="primary">
                  {{ isStepCompleted(story.id, step.id) ? 'Rejouer l\'étape' : 'Jouer l\'étape' }}
                </AppButton>
              </div>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Dialogue Modal -->
      <Teleport to="body">
        <Transition name="vn-fade">
          <div v-if="showDialogueModal" class="vn-overlay" @click="advanceDialogue">
            <div v-if="currentStep" class="vn-container" @click.stop="advanceDialogue">

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
                <button class="vn-skip-btn" @click.stop="skipAllDialogue">Passer ⏭</button>
              </div>

              <!-- Dialogue Box Area -->
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
                      <div v-if="reward" class="reward-box-vn">
                        <h4>Récompense débloquée !</h4>
                        <div class="reward-card">
                          <TripleTriadCard v-if="reward" :name="reward.name" :topValue="reward.topValue"
                            :rightValue="reward.rightValue" :bottomValue="reward.bottomValue" :leftValue="reward.leftValue"
                            :element="reward.element" :image="reward.image?.url" />
                        </div>
                      </div>
                      <AppButton @click.stop="finishStep" variant="primary" size="xl" shadow glow class="finish-btn mt-6">
                        Quitter et continuer 🚪
                      </AppButton>
                    </div>
                  </div>
                </div>
              </Transition>

              <!-- Click Indicator -->
              <div v-if="!isDialogueFinished" class="vn-click-hint" @click.stop="advanceDialogue">Cliquez pour continuer ▼
              </div>

            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Embedded Combat Overlay -->
      <Teleport to="body">
        <Transition name="vn-fade">
          <div v-if="showDialogueModal && dialogueState === 'combat'" style="position: fixed; inset: 0; z-index: 2000;">
            <GameView />
          </div>
        </Transition>
      </Teleport>
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { marked } from 'marked';
import PageLayout from '../components/PageLayout.vue';
import GameView from './GameView.vue';
import { state as gameState, normalizeCard, cardLibrary } from '../game/state.js';
import AppCard from '../components/ui/AppCard.vue';
import AppButton from '../components/ui/AppButton.vue';
import AppModal from '../components/ui/AppModal.vue';
import TripleTriadCard from '../components/TripleTriadCard.vue';
import { useUserStore } from '../stores/userStore.js';
import strapiService from '../api/strapi.js';

const userStore = useUserStore();
const isLoading = ref(true);
const stories = ref([]);
const expandedStory = ref(null);

// Modal state
const showDialogueModal = ref(false);
const currentStory = ref(null);
const currentStep = ref(null);
const dialogueState = ref('start'); // 'start' or 'end'
const reward = ref(null);
const isReplay = ref(false);

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

const activeSpeakerAvatar = computed(() => {
  if (displayedLines.value.length === 0) return null;
  const lastLine = displayedLines.value[displayedLines.value.length - 1];
  if (lastLine.isNarration || !lastLine.card) return null;
  return getAvatarUrl(lastLine.card);
});

// Persistent portraits based on decks or current speaker
const leftSpeakerPortrait = computed(() => {
  // If current speaker is on left and has a specific card, override
  if (activeSpeakerPosition.value === 'left' && activeSpeakerAvatar.value) {
    return activeSpeakerAvatar.value;
  }
  
  // Fallback to first card of player deck (Hero) or specific hero asset
  const playerDeck = currentStep.value?.playerDeck?.cards || [];
  if (playerDeck.length > 0) return getAvatarUrl(playerDeck[0]);
  
  // Final fallback to user avatar
  return userStore.user.avatar;
});

const rightSpeakerPortrait = computed(() => {
  // If current speaker is on right and has a specific card, override
  if (activeSpeakerPosition.value === 'right' && activeSpeakerAvatar.value) {
    return activeSpeakerAvatar.value;
  }
  
  // Fallback to first card of enemy deck (NPC)
  const enemyDeck = currentStep.value?.enemyDeck?.cards || [];
  if (enemyDeck.length > 0) return getAvatarUrl(enemyDeck[0]);
  
  return null;
});

const unlockPrice = ref(500);
const isUnlocking = ref(false);

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await fetchConfig();
    await fetchStories();
  } else {
    isLoading.value = false;
  }
});

async function fetchConfig() {
  try {
    const config = await strapiService.getGameConfig();
    if (config && (config.storyUnlockPrice !== undefined && config.storyUnlockPrice !== null)) {
      unlockPrice.value = config.storyUnlockPrice;
    } else {
      unlockPrice.value = 500;
    }
  } catch (err) {
    console.error('Failed to fetch config details:', err);
    unlockPrice.value = 500;
  }
}

async function unlockStory(storyId) {
  if (userStore.user.coins < unlockPrice.value) return;
  isUnlocking.value = true;
  try {
    const token = localStorage.getItem('tt_jwt');
    const response = await fetch(`${strapiService.MEDIA_URL}/api/player-story-progress/unlock-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ storyId })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to unlock');
    }

    const data = await response.json();
    userStore.user.coins = data.coins;
    userStore.syncLocalUserWallets();

    // Ensure the new progress object has a reference to the story
    // since strapi.entityService.create might not populate it by default
    if (data.progress) {
      if (!data.progress.story) {
        data.progress.story = { id: storyId, documentId: storyId }; // We don't know the exact documentId format for the story, so we spoof both or use storyId
      }
      userStore.storyProgresses.push(data.progress);
    }

    // Force refresh to be absolutely sure the list is coherent
    await userStore.fetchUserStoryProgresses(true);
    await fetchStories();

  } catch (err) {
    console.error(err);
    alert('Erreur lors du déblocage: ' + err.message);
  } finally {
    isUnlocking.value = false;
  }
}

async function fetchStories() {
  isLoading.value = true;
  try {
    // Ensure story progresses are loaded from store
    await userStore.fetchUserStoryProgresses();

    const storiesRes = await strapiService.find('stories', {
      populate: {
        steps: {
          populate: {
            startDialogue: {
              populate: {
                card: { populate: ['image'] }
              }
            },
            endDialogue: {
              populate: {
                card: { populate: ['image'] }
              }
            },
            playerDeck: {
              populate: { cards: { populate: ['image'] } }
            },
            enemyDeck: {
              populate: { cards: { populate: ['image'] } }
            }
          }
        }
      }
    });

    stories.value = storiesRes.data;

    console.log('Loaded progress:', userStore.storyProgresses);

  } catch (error) {
    console.error('Failed to fetch stories:', error);
  } finally {
    isLoading.value = false;
  }
}

function getProgress(storyId) {
  return userStore.storyProgresses.find(p => {
    if (!p.story) return false;

    // Check if relation is populated
    if (typeof p.story === 'object') {
      const matchId = p.story.id && Number(p.story.id) === Number(storyId);
      const matchDocId = p.story.documentId && String(p.story.documentId) === String(storyId);
      return matchId || matchDocId;
    }

    // If not populated, it's just an id/documentId string or number
    const matchRawId = !isNaN(Number(p.story)) && !isNaN(Number(storyId)) && Number(p.story) === Number(storyId);
    const matchRawDocId = String(p.story) === String(storyId);

    return matchRawId || matchRawDocId;
  });
}

function getStoryStatus(storyId) {
  const p = getProgress(storyId);
  return p ? p.status : 'locked';
}

function isStepCompleted(storyId, stepId) {
  const p = getProgress(storyId);
  return p && p.completedSteps && p.completedSteps.includes(stepId);
}

function isStepActive(storyId, stepIndex) {
  const p = getProgress(storyId);
  if (!p) return false;

  const story = stories.value.find(s => s.id === storyId);
  if (!story) return false;

  const completedCount = p.completedSteps ? p.completedSteps.length : 0;
  return stepIndex <= completedCount;
}

function isStepLocked(storyId, stepIndex) {
  const p = getProgress(storyId);
  if (!p) return true;
  const completedCount = p.completedSteps ? p.completedSteps.length : 0;
  return stepIndex > completedCount;
}

function toggleStory(storyId) {
  expandedStory.value = expandedStory.value === storyId ? null : storyId;
}

function startStep(story, step) {
  isReplay.value = isStepCompleted(story.id, step.id);
  currentStory.value = story;
  currentStep.value = step;
  dialogueState.value = 'start';
  reward.value = null;
  showDialogueModal.value = true;
  startDialogueSequence();
}

function startDialogueSequence() {
  displayedLines.value = [];
  activeLineIndex.value = 0;
  isDialogueFinished.value = false;

  const currentDialogueArray = dialogueState.value === 'start' ? currentStep.value.startDialogue : currentStep.value.endDialogue;

  if (!currentDialogueArray || currentDialogueArray.length === 0) {
    isDialogueFinished.value = true;
    return;
  }

  showNextLine();
}

function showNextLine() {
  clearTimeout(dialogueTimer.value);

  const currentDialogueArray = dialogueState.value === 'start' ? currentStep.value.startDialogue : currentStep.value.endDialogue;

  if (activeLineIndex.value >= currentDialogueArray.length) {
    isDialogueFinished.value = true;
    return;
  }

  const nextLine = currentDialogueArray[activeLineIndex.value];
  displayedLines.value.push(nextLine);
  activeLineIndex.value++;

  nextTick(() => {
    if (chatLogRef.value) {
      chatLogRef.value.scrollTop = chatLogRef.value.scrollHeight;
    }
  });

  // Calculate reading time
  // Minimum 1.5s, roughly 40ms per char
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
    if (chatLogRef.value) {
      chatLogRef.value.scrollTop = chatLogRef.value.scrollHeight;
    }
  });
}

async function playCombat() {
  clearTimeout(dialogueTimer.value);
  try {
    // Setup Story Match state
    let playerDeckCards = currentStep.value.playerDeck?.cards || [];
    let enemyDeckCards = currentStep.value.enemyDeck?.cards || [];

    // Normalize and configure player deck
    if (playerDeckCards.length > 0) {
      gameState.playerDeckSelection = playerDeckCards.map(normalizeCard);
    } else {
      const pDeck = [];
      for (let i = 0; i < 15; i++) {
        pDeck.push(normalizeCard(cardLibrary[Math.floor(Math.random() * cardLibrary.length)]));
      }
      gameState.playerDeckSelection = pDeck;
    }

    // Configure AI enemy deck
    if (enemyDeckCards.length > 0) {
      gameState.storyEnemyDeckConfig = enemyDeckCards.map(normalizeCard);
    } else {
      gameState.storyEnemyDeckConfig = []; // fallback to GameView random logic
    }

    gameState.isStoryMatch = true;
    gameState.storyMatchData = { story: currentStory.value, step: currentStep.value };

    // Setup the callback that GameOver will trigger
    gameState.onStoryMatchEnd = async (won) => {
      // Clean up game state match flag
      gameState.isStoryMatch = false;
      gameState.onStoryMatchEnd = null;
      gameState.gameState = 'menu'; // Return to idle state

      if (won) {
        if (isReplay.value) {
          // Replay -> Skip reward claiming which might fail on backend
          dialogueState.value = 'end';
          startDialogueSequence();
          return;
        }

        // Submit reward to backend
        try {
          const token = localStorage.getItem('tt_jwt');
          const response = await fetch(`${strapiService.MEDIA_URL}/api/player-story-progress/claim-step-reward`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              storyId: currentStory.value.id,
              stepId: currentStep.value.id
            })
          });

          if (!response.ok) {
            // Log error but don't crash the dialogue progression
            console.error('Failed to claim reward:', await response.text());
            dialogueState.value = 'end';
            startDialogueSequence();
            return;
          }

          const data = await response.json();
          reward.value = data.reward;

          const idx = userStore.storyProgresses.findIndex(p => p.id === data.progress.id);
          if (idx !== -1) {
            userStore.storyProgresses[idx] = data.progress;
          } else {
            userStore.storyProgresses.push(data.progress);
          }

          // Transition to end dialogue seamlessly
          dialogueState.value = 'end';
          startDialogueSequence();
        } catch (error) {
          console.error('Error claiming step reward:', error);
          // Fallback to end dialogue even on error
          dialogueState.value = 'end';
          startDialogueSequence();
        }
      } else {
        //- **Story-Specific Match Ending:** The "GameOver" screen adapts automatically:
        //  - Victory offers "CONTINUER L'HISTOIRE" and natively grants the API-driven rewards and triggers the concluding dialogue sequence.
        //  - Defeat offers "RÉESSAYER" (instant rematch) or "ABANDONNER" (retreat).
        //- **Bug Fix (Story Resumption):** Fixed an issue where replaying a story step would cause the flow to break after winning (due to attempting to re-claim an already owned reward). Now, replaying correctly skips reward processing and goes straight to the closing dialogue. Added robustness by using dynamic API URLs instead of hardcoded `localhost` links.
        // Player abandoned or lost cleanly -> Just re-open start dialogue
        dialogueState.value = 'start';
        startDialogueSequence();
      }
    };

    // Switch view overlay
    dialogueState.value = 'combat';

    // Trigger GameView init
    gameState.gameState = 'coin-toss';
    gameState.coinTossResult = Math.random() < 0.5 ? 'player' : 'ai';
    gameState.showCoinToss = true;

  } catch (error) {
    console.error('Error starting combat:', error);
    alert('Une erreur est survenue.');
  }
}

function finishStep() {
  clearTimeout(dialogueTimer.value);
  showDialogueModal.value = false;
  currentStory.value = null;
  currentStep.value = null;
  reward.value = null;
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
.story-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom) + 80px);
}

.auth-notice,
.loading-state,
.no-quests,
.locked-state {
  text-align: center;
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.locked-state {
  border: 1px solid rgba(255, 191, 0, 0.2);
  background: rgba(0, 0, 0, 0.2);
}

.empty-icon,
.lock-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.stories-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.story-card {
  overflow: hidden;
  transition: all 0.3s ease;
}

.story-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 1rem;
}

.story-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.story-info h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-primary, #00d2ff);
}

.story-desc {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.8;
}

.story-status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.status-badge.completed {
  background: rgba(0, 255, 100, 0.2);
  color: #00ff64;
}

.status-badge.progress {
  background: rgba(0, 210, 255, 0.2);
  color: #00d2ff;
}

.status-badge.locked {
  background: rgba(255, 255, 255, 0.1);
  color: #aaa;
}

.chevron {
  transition: transform 0.3s;
}

.chevron.open {
  transform: rotate(180deg);
}

.story-steps {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.2);
}

.step-item {
  padding: 1rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
}

.step-item.active {
  border-color: var(--color-primary, #00d2ff);
  background: rgba(0, 210, 255, 0.05);
}

.step-item.locked {
  opacity: 0.5;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.step-header h4 {
  margin: 0;
}

.step-desc {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.8;
}

.step-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}


/* VN Overlay Styles */
.vn-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(10, 10, 20, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

.vn-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Background Portraits */
.vn-portrait-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
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

.vn-portrait.left {
  left: -5%;
  transform-origin: bottom left;
}

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

/* Header */
.vn-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 20;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent);
}

.vn-header h2 {
  margin: 0;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
  font-size: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 2px;
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
  pointer-events: auto;
}

.vn-skip-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

/* Dialogue Area */
.vn-dialogue-area {
  position: absolute;
  bottom: 5%;
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
  /* Let overlay catch clicks */
}

.vn-chat-log {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding: 2rem;
  padding-bottom: 4rem;
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 100%);
  pointer-events: auto;
}

.vn-chat-log::-webkit-scrollbar {
  width: 6px;
}

.vn-chat-log::-webkit-scrollbar-track {
  background: transparent;
}

.vn-chat-log::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}

/* Refined Chat Bubbles */
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
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  animation: slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(20px);
}

.dialogue-line.is-latest {
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
}

:deep(.dialogue-content p) {
  margin: 0;
  display: block;
  line-height: 1.5;
  color: #eee;
}

.speaker-name {
  display: block;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
  opacity: 0.9;
}

.dialogue-line.hero {
  align-self: flex-start;
  background: rgba(0, 100, 200, 0.2);
  border-left: 4px solid #00d2ff;
  border-bottom-left-radius: 4px;
  text-align: left;
}

.dialogue-line.hero .speaker-name {
  color: #00d2ff;
}

.dialogue-line.npc {
  align-self: flex-end;
  background: rgba(200, 50, 50, 0.2);
  border-right: 4px solid #ff6464;
  border-bottom-right-radius: 4px;
  flex-direction: row-reverse;
  text-align: right;
}

.dialogue-line.npc .speaker-name {
  color: #ff6464;
}

.narration {
  background: transparent;
  border: none;
  font-style: italic;
  text-align: center;
  align-self: center;
  max-width: 90%;
  color: #bbb;
  box-shadow: none;
}

.narration::before,
.narration::after {
  content: "—";
  margin: 0 10px;
  opacity: 0.5;
}

/* Modal Action Area (Centered) */
.vn-modal-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 50;
  pointer-events: auto;
}

.vn-modal-content {
  background: rgba(20, 20, 35, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 32px;
  padding: 3rem;
  max-width: 500px;
  width: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 210, 255, 0.1);
  text-align: center;
}

.modal-title {
  color: white;
  font-size: 1.8rem;
  margin-bottom: 2rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
}

.vn-start-actions, .vn-end-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.combat-btn, .finish-btn {
  font-size: 1.4rem !important;
  height: 4.5rem !important;
  width: 100%;
}

.reward-box-vn {
  background: rgba(0, 255, 100, 0.05);
  border: 1px solid rgba(0, 255, 100, 0.2);
  padding: 1.5rem;
  border-radius: 24px;
  text-align: center;
  backdrop-filter: blur(10px);
  margin-bottom: 1rem;
}

.reward-box-vn h4 {
  color: #00ff64;
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.vn-click-hint {
  position: absolute;
  bottom: 2%;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  letter-spacing: 2px;
  font-weight: bold;
  animation: pulse-hint 2s infinite;
  cursor: pointer;
  pointer-events: auto;
}

/* Animations */
@keyframes slide-up-fade {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pop-in {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulse-hint {

  0%,
  100% {
    opacity: 0.3;
    transform: translateX(-50%) translateY(0);
  }

  50% {
    opacity: 0.8;
    transform: translateX(-50%) translateY(-5px);
  }
}

/* Transitions */
.vn-fade-enter-active,
.vn-fade-leave-active {
  transition: opacity 0.5s ease;
}

.vn-fade-enter-from,
.vn-fade-leave-to {
  opacity: 0;
}

.portrait-slide-left-enter-active,
.portrait-slide-left-leave-active,
.portrait-slide-right-enter-active,
.portrait-slide-right-leave-active {
  transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.portrait-slide-left-enter-from,
.portrait-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-50px) scale(0.95);
}

.portrait-slide-right-enter-from,
.portrait-slide-right-leave-to {
  opacity: 0;
  transform: translateX(50px) scale(0.95);
}

.fade-in-up {
  animation: slide-up-fade 0.5s ease forwards;
}

.dialogue-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.5);
}
</style>
