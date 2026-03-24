<template>
  <PageLayout title="MODE HISTOIRE" backRoute="/">
    <div class="story-container">
      <div v-if="!userStore.isLoggedIn && !userStore.isOfflineStoryMode" class="auth-notice">
        <p>Connectez-vous pour jouer au mode Histoire ou jouez en mode invité.</p>
        <div class="auth-actions">
           <AppButton @click="userStore.toggleOfflineStoryMode(true)" variant="secondary" outline>Mode Invité (Hors Ligne)</AppButton>
        </div>
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
        <AppCard v-for="story in stories" :key="story.id" class="story-card" 
          @click="getStoryStatus(story.documentId || story.id) !== 'locked' ? router.push({ name: 'story-steps', params: { storyId: story.documentId || story.id } }) : handleLockedStoryClick(story)">
          <div class="story-header">
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
              <span v-if="getStoryStatus(story.documentId || story.id) === 'completed'" class="status-badge completed">Terminé</span>
              <span v-else-if="getStoryStatus(story.documentId || story.id) === 'in_progress'" class="status-badge progress">En cours</span>
              <span v-else class="status-badge locked">Bloqué</span>
              <span class="view-steps-btn">Voir les étapes →</span>
            </div>
          </div>
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

      <div v-if="userStore.isOfflineStoryMode" class="offline-notice">
        <div class="offline-badge">MODE HORS LIGNE</div>
        <p>Toutes les histoires sont débloquées. Votre progression ne sera pas sauvegardée.</p>
        <AppButton @click="userStore.toggleOfflineStoryMode(false); router.push('/')" size="sm" variant="secondary" outline>Quitter le mode hors ligne</AppButton>
      </div>
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
const expandedStory = ref(null); // Keep for legacy or remove if no longer used. Actually, let's remove it if we don't need it.
const unlockPrice = ref(500);
const isUnlocking = ref(false);

const showRefusalModal = ref(false);
const refusalTitle = ref('');
const refusalMessage = ref('');
const canUnlockStory = ref(false);
const pendingStoryId = ref(null);

onMounted(async () => {
  if (userStore.isOfflineStoryMode) {
    await fetchLocalStories();
    await restoreStateFromUrl();
  } else if (userStore.isLoggedIn) {
    await fetchConfig();
    await fetchStories();
    await restoreStateFromUrl();
  } else {
    isLoading.value = false;
  }
});

watch(() => userStore.isOfflineStoryMode, async (newVal) => {
  if (newVal) {
    await fetchLocalStories();
  } else if (userStore.isLoggedIn) {
    await fetchStories();
  } else {
    stories.value = [];
  }
});

async function restoreStateFromUrl() {
  const { story } = route.query;
  const storyId = route.params.storyId ? Number(route.params.storyId) : (story ? Number(story) : null);

  if (storyId) {
    const status = getStoryStatus(storyId);
    if (status === 'locked') {
      const storyObj = stories.value.find(s => Number(s.id) === Number(storyId));
      if (storyObj) handleLockedStoryClick(storyObj);
      return;
    }
    // Instead of expanding, we navigate if deep linked via query
    router.push({ name: 'story-steps', params: { storyId: storyObj.documentId || storyId } });
  }
}

function handleLockedStoryClick(story) {
  refusalTitle.value = "Histoire verrouillée";
  refusalMessage.value = "Vous devez débloquer cette histoire avant de pouvoir y accéder.";
  canUnlockStory.value = true;
  pendingStoryId.value = story.documentId || story.id;
  showRefusalModal.value = true;
}

async function handleUnlockFromModal() {
  if (!pendingStoryId.value) return;
  await unlockStory(pendingStoryId.value);
  if (getStoryStatus(pendingStoryId.value) !== 'locked') {
    showRefusalModal.value = false;
    router.push({ name: 'story-steps', params: { storyId: pendingStoryId.value } });
  }
}

async function fetchLocalStories() {
  isLoading.value = true;
  try {
    // Vite handles relative paths in glob
    const modules = import.meta.glob('../../../../shared/data/stories/*.json', { eager: true });
    
    const localStories = Object.entries(modules).map(([path, module], index) => {
      const storyData = module.default || module;
      // Map local format to UI format if needed
      // Our UI expects steps: [ { title, description, rewardCards: [] } ]
      // The JSON has situations at root or steps.
      
      let steps = [];
      if (storyData.steps) {
        steps = storyData.steps.map(step => {
          return {
            ...step,
            rewardCards: step.rewardCards || []
          };
        });
      } else if (storyData.situations) {
        // Single step story
        steps = [{
          id: `local-step-${index}`,
          title: storyData.title,
          description: storyData.description,
          situations: storyData.situations,
          rewardCards: []
        }];
      }

      return {
        id: `local-${index + 1}`,
        idReal: index + 1, // Useful for mapping to local files if needed
        title: storyData.title,
        description: storyData.description,
        steps: steps,
        rewardCards: storyData.rewardCards || []
      };
    });

    stories.value = localStories;
  } catch (err) {
    console.error('Failed to load local stories:', err);
  } finally {
    isLoading.value = false;
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
        steps: { 
          populate: { 
            situations: { 
              on: {
                'story.situation-reward': {
                  populate: { rewardCards: { populate: ['image'] } }
                }
              }
            } 
          } 
        }
      }
    });

    // Map steps to extract rewardCards from situations for easier display in template
    stories.value = storiesRes.data.map(story => {
      const steps = (story.steps || []).map(step => {
        const rewardSituation = step.situations?.find(s => s.__component === 'story.situation-reward');
        return {
          ...step,
          rewardCards: rewardSituation?.rewardCards || []
        };
      });
      return {
        ...story,
        steps
      };
    });
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
  if (userStore.isOfflineStoryMode) return 'in_progress';
  const p = getProgress(storyId);
  if (!p) return 'locked';
  return p.status || p.progressStatus || 'locked';
}

function isStepCompleted(storyId, stepId) {
  if (userStore.isOfflineStoryMode) return false;
  const p = getProgress(storyId);
  return p && p.completedSteps && p.completedSteps.includes(stepId);
}

function isStepActive(storyId, stepIndex) {
  if (userStore.isOfflineStoryMode) return true;
  const p = getProgress(storyId);
  if (!p) return false;
  const completedCount = p.completedSteps ? p.completedSteps.length : 0;
  return stepIndex <= completedCount;
}

function isStepLocked(storyId, stepIndex) {
  if (userStore.isOfflineStoryMode) return false;
  const p = getProgress(storyId);
  if (!p) return true;
  const completedCount = p.completedSteps ? p.completedSteps.length : 0;
  return stepIndex > completedCount;
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

.auth-notice, .loading-state, .no-quests, .offline-notice {
  text-align: center;
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.auth-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.offline-notice {
  margin-top: 3rem;
  border-color: var(--color-primary);
  background: rgba(0, 210, 255, 0.05);
}

.offline-badge {
  display: inline-block;
  background: var(--color-primary);
  color: black;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.7rem;
  margin-bottom: 1rem;
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

.story-status { display: flex; align-items: center; gap: 1.5rem; }

.status-badge { padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }

.status-badge.completed { background: rgba(0, 255, 100, 0.15); color: #00ff64; border: 1px solid rgba(0, 255, 100, 0.3); }
.status-badge.progress { background: rgba(0, 210, 255, 0.15); color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.3); }
.status-badge.locked { background: rgba(255, 255, 255, 0.05); color: #aaa; border: 1px solid rgba(255, 255, 255, 0.1); }

.view-steps-btn {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary);
  opacity: 0.7;
  transition: all 0.2s ease;
}

.story-card:hover .view-steps-btn {
  opacity: 1;
  transform: translateX(5px);
}

.story-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
}

.story-header:hover { background: rgba(255, 255, 255, 0.03); }

.story-info h3 { margin: 0 0 0.5rem 0; color: var(--color-primary, #00d2ff); font-size: 1.4rem; }

.story-desc { margin: 0; font-size: 0.95rem; opacity: 0.7; line-height: 1.4; }

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

.story-rewards-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 191, 0, 0.08);
  border: 1px solid rgba(255, 191, 0, 0.2);
  border-radius: 30px;
  width: fit-content;
}

.reward-badge-icon { font-size: 1.2rem; }
.reward-badge-label { font-size: 0.8rem; color: #FFD700; font-weight: 600; text-transform: uppercase; }
.reward-mini-cards { display: flex; align-items: center; margin-left: 0.5rem; }
.reward-mini-img {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #1a1a1a;
  margin-left: -12px;
  object-fit: cover;
  background: #333;
}
.reward-mini-img:first-child { margin-left: 0; }
.reward-more { font-size: 0.75rem; color: #FFD700; margin-left: 0.5rem; font-weight: bold; }

.loading-spinner { display: inline-block; animation: rotate 1.5s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
