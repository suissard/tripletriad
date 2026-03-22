<template>
  <PageLayout title="MODE HISTOIRE" backRoute="/">
    <div class="story-container">
      <div v-if="!userStore.isLoggedIn" class="auth-notice">
        <p>Connectez-vous pour jouer au mode Histoire.</p>
      </div>
      <div v-else-if="isLoading" class="loading-state">
        <div class="loading-spinner large">✨</div>
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
              <!-- Story-level reward preview -->
              <div v-if="story.rewardCards?.length" class="story-rewards-badge">
                <span class="reward-badge-icon">🏆</span>
                <span class="reward-badge-label">Récompenses de l'histoire :</span>
                <div class="reward-mini-cards">
                  <img v-for="card in story.rewardCards.slice(0, 4)" :key="card.id"
                    :src="getRewardCardThumb(card)" :alt="card.name" :title="card.name"
                    class="reward-mini-img" />
                  <span v-if="story.rewardCards.length > 4" class="reward-more">+{{ story.rewardCards.length - 4 }}</span>
                </div>
              </div>
            </div>
            <div class="story-status">
              <span v-if="getStoryStatus(story.id) === 'completed'" class="status-badge completed">Terminé</span>
              <span v-else-if="getStoryStatus(story.id) === 'in_progress'" class="status-badge progress">En cours</span>
              <span v-else class="status-badge locked">Bloqué</span>
              <span class="chevron" :class="{ open: expandedStory === story.id }">▼</span>
            </div>
          </div>

          <Transition name="expand">
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
                  :loading="isUnlocking"
                  style="width: 100%; max-width: 300px; height: 3rem; font-size: 1rem;">
                  <span v-if="userStore.user.coins < unlockPrice">Fonds Insuffisants</span>
                  <span v-else>Débloquer cette Histoire</span>
                </AppButton>
              </div>

              <!-- Story Steps (if unlocked) -->
              <div v-else v-for="(step, index) in story.steps" :key="step.id" 
                class="step-item" 
                @click="isStepActive(story.id, index) ? startStep(story, step) : null"
                :class="{
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

                <!-- Step reward preview -->
                <div v-if="step.rewardCards?.length" class="step-rewards" :class="{ 'is-claimed': isStepCompleted(story.id, step.id) }">
                  <span class="step-reward-label">
                    <span v-if="isStepCompleted(story.id, step.id)">✅ Obtenue</span>
                    <span v-else>🎁 Récompense</span>
                  </span>
                  <div class="step-reward-cards">
                    <img v-for="card in step.rewardCards.slice(0, 3)" :key="card.id"
                      :src="getRewardCardThumb(card)" :alt="card.name" :title="card.name"
                      class="step-reward-img" />
                    <span v-if="step.rewardCards.length > 3" class="reward-more">+{{ step.rewardCards.length - 3 }}</span>
                  </div>
                </div>

                <div v-if="isStepActive(story.id, index)" class="step-actions">
                  <AppButton @click.stop="startStep(story, step)" variant="primary">
                    {{ isStepCompleted(story.id, step.id) ? 'Rejouer l\'étape' : 'Jouer l\'étape' }}
                  </AppButton>
                </div>
              </div>
            </div>
          </Transition>
        </AppCard>
      </div>

       <!-- Access Refusal / Purchase Modal -->
       <AppModal v-model="showRefusalModal" title="Accès Verrouillé">
         <div class="refusal-modal-content">
           <div class="refusal-icon">🔒</div>
           <h3>{{ refusalTitle }}</h3>
           <p>{{ refusalMessage }}</p>
           
           <div v-if="canUnlockStory" class="unlock-offer">
             <div class="price-tag">
               <span class="price-val">{{ unlockPrice }}</span>
               <span class="price-unit">Coins</span>
             </div>
             <AppButton @click="handleUnlockFromModal" :loading="isUnlocking" 
               :disabled="userStore.user.coins < unlockPrice" variant="primary" glow>
               Débloquer l'Histoire
             </AppButton>
             <p v-if="userStore.user.coins < unlockPrice" class="funds-error">Fonds insuffisants</p>
           </div>
           
           <AppButton v-else @click="showRefusalModal = false" variant="secondary" outline>
             Retour aux archives
           </AppButton>
         </div>
       </AppModal>
     </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageLayout from '../components/PageLayout.vue';
import AppCard from '../components/ui/AppCard.vue';
import AppButton from '../components/ui/AppButton.vue';
import AppModal from '../components/ui/AppModal.vue';
import { useUserStore } from '../stores/userStore.js';
import strapiService from '../api/strapi.js';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

const isLoading = ref(true);
const stories = ref([]);
const expandedStory = ref(null);
const unlockPrice = ref(500);
const isUnlocking = ref(false);

const showRefusalModal = ref(false);
const refusalTitle = ref('');
const refusalMessage = ref('');
const canUnlockStory = ref(false);
const pendingStoryId = ref(null);

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await fetchConfig();
    await fetchStories();
    await restoreStateFromUrl();
  } else {
    isLoading.value = false;
  }
});

function updateUrl() {
  let newPath = '/story';
  let query = {};

  if (expandedStory.value) {
    query.story = expandedStory.value.toString();
  }

  const currentQueryStr = JSON.stringify(route.query);
  const newQueryStr = JSON.stringify(query);

  if (route.path !== newPath || currentQueryStr !== newQueryStr) {
    router.replace({ path: newPath, query });
  }
}

watch(expandedStory, updateUrl);

async function restoreStateFromUrl() {
  const { story } = route.query;
  const storyId = route.params.storyId ? Number(route.params.storyId) : (story ? Number(story) : null);

  if (storyId) {
    const status = getStoryStatus(storyId);
    if (status === 'locked') {
      refusalTitle.value = "Histoire verrouillée";
      refusalMessage.value = "Vous devez débloquer cette histoire avant de pouvoir y accéder.";
      canUnlockStory.value = true;
      pendingStoryId.value = storyId;
      showRefusalModal.value = true;
      return;
    }
    expandedStory.value = storyId;
  }
}

async function handleUnlockFromModal() {
  if (!pendingStoryId.value) return;
  await unlockStory(pendingStoryId.value);
  if (getStoryStatus(pendingStoryId.value) !== 'locked') {
    showRefusalModal.value = false;
    restoreStateFromUrl();
  }
}

async function fetchConfig() {
  try {
    const config = await strapiService.getGameConfig();
    if (config && config.storyUnlockPrice !== undefined) {
      unlockPrice.value = config.storyUnlockPrice;
    }
  } catch (err) {
    console.error('Failed to fetch config details:', err);
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

    if (!response.ok) throw new Error('Failed to unlock');

    const data = await response.json();
    userStore.user.coins = data.coins;
    userStore.syncLocalUserWallets();

    if (data.progress) {
      if (!data.progress.story) data.progress.story = { id: storyId };
      userStore.storyProgresses.push(data.progress);
    }

    await userStore.fetchUserStoryProgresses(true);
    await fetchStories();
  } catch (err) {
    console.error(err);
  } finally {
    isUnlocking.value = false;
  }
}

async function fetchStories() {
  isLoading.value = true;
  try {
    await userStore.fetchUserStoryProgresses();
    const storiesRes = await strapiService.find('stories', {
      populate: {
        rewardCards: { populate: ['image'] },
        steps: { populate: { rewardCards: { populate: ['image'] } } }
      }
    });
    stories.value = storiesRes.data;
  } catch (error) {
    console.error('Failed to fetch stories:', error);
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
           (!isNaN(Number(p.story)) && Number(p.story) === Number(storyId));
  });
}

function getStoryStatus(storyId) {
  const p = getProgress(storyId);
  if (!p) return 'locked';
  return p.status || p.progressStatus || 'locked';
}

function isStepCompleted(storyId, stepId) {
  const p = getProgress(storyId);
  return p && p.completedSteps && p.completedSteps.includes(stepId);
}

function isStepActive(storyId, stepIndex) {
  const p = getProgress(storyId);
  if (!p) return false;
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
  const stepIdx = story.steps.findIndex(s => s.id === step.id);
  router.push(`/story/${story.id}/step/${stepIdx + 1}`);
}

function getRewardCardThumb(card) {
  if (!card) return '';
  const cardData = card.attributes || card;
  let url = cardData.imageUrl || cardData.img;
  if (!url && cardData.image?.url) {
    url = cardData.image.url.startsWith('http') ? cardData.image.url : `${strapiService.MEDIA_URL}${cardData.image.url}`;
  }
  if (!url && cardData.image?.data?.attributes?.url) {
    const attrUrl = cardData.image.data.attributes.url;
    url = attrUrl.startsWith('http') ? attrUrl : `${strapiService.MEDIA_URL}${attrUrl}`;
  }
  if (!url) {
    const seed = cardData.id || card.id || cardData.name || '0';
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

.auth-notice, .loading-state, .no-quests {
  text-align: center;
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.empty-icon { font-size: 4rem; margin-bottom: 1rem; }

.stories-list { display: flex; flex-direction: column; gap: 1.5rem; }

.story-card { overflow: hidden; transition: all 0.3s ease; }

.story-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 1rem;
}

.story-header:hover { background: rgba(255, 255, 255, 0.05); }

.story-info h3 { margin: 0 0 0.5rem 0; color: var(--color-primary, #00d2ff); }

.story-desc { margin: 0; font-size: 0.9rem; opacity: 0.8; }

.story-status { display: flex; align-items: center; gap: 1rem; }

.status-badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }

.status-badge.completed { background: rgba(0, 255, 100, 0.2); color: #00ff64; }
.status-badge.progress { background: rgba(0, 210, 255, 0.2); color: #00d2ff; }
.status-badge.locked { background: rgba(255, 255, 255, 0.1); color: #aaa; }

.chevron { transition: transform 0.3s; }
.chevron.open { transform: rotate(180deg); }

.story-steps {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.2);
}

.step-item { padding: 1rem; border-radius: 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid transparent; }

.step-item.active {
  border-color: var(--color-primary, #00d2ff);
  background: rgba(0, 210, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.step-item.active:hover {
  background: rgba(0, 210, 255, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 210, 255, 0.2);
}

.step-item.locked { opacity: 0.5; }

.refusal-modal-content {
  text-align: center;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.refusal-icon { font-size: 4rem; }

.unlock-offer {
  background: rgba(255, 191, 0, 0.05);
  border: 1px solid rgba(255, 191, 0, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.price-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #FFBF00;
  font-weight: bold;
  font-size: 1.5rem;
}

.funds-error { color: #ff4444; font-size: 0.85rem; }

.step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.step-header h4 { margin: 0; }
.step-desc { margin: 0; font-size: 0.85rem; opacity: 0.8; }
.step-actions { margin-top: 1rem; display: flex; justify-content: flex-end; }

.story-rewards-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.8rem;
  padding: 0.4rem 0.8rem;
  background: rgba(255, 191, 0, 0.1);
  border: 1px dashed rgba(255, 191, 0, 0.3);
  border-radius: 30px;
  width: fit-content;
}

.reward-badge-icon { font-size: 1.2rem; }
.reward-badge-label { font-size: 0.85rem; color: #FFD700; font-weight: 600; }
.reward-mini-cards { display: flex; align-items: center; margin-left: 0.5rem; }
.reward-mini-img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 215, 0, 0.5);
  margin-left: -10px;
  object-fit: cover;
}
.reward-mini-img:first-child { margin-left: 0; }
.reward-more { font-size: 0.75rem; color: #FFD700; margin-left: 0.3rem; }

.step-rewards {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 1rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: fit-content;
}

.step-rewards.is-claimed {
  opacity: 0.6;
  border-color: rgba(0, 255, 100, 0.3);
  background: rgba(0, 255, 100, 0.05);
}

.step-reward-label { font-size: 0.85rem; color: rgba(255, 255, 255, 0.7); }
.step-rewards.is-claimed .step-reward-label { color: #00ff64; }
.step-reward-cards { display: flex; align-items: center; }
.step-reward-img {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  margin-left: -5px;
  object-fit: cover;
}
.step-reward-img:first-child { margin-left: 0; }

.expand-enter-active, .expand-leave-active { transition: all 0.4s ease; max-height: 2000px; overflow: hidden; }
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }

.loading-spinner { display: inline-block; animation: rotate 1.5s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
