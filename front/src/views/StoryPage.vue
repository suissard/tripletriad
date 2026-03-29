<template>
  <PageLayout title="Archives">
    <div class="story-container">
      <header class="page-header">
        <h1>Archives de Terra Nullius</h1>
        <p>Revivez les événements marquants et débloquez de nouvelles cartes.</p>

        <div class="filter-tabs">
          <button
            v-for="filter in ['all', 'progress', 'completed', 'locked']"
            :key="filter"
            class="filter-tab"
            :class="{ active: currentFilter === filter }"
            @click="currentFilter = filter"
          >
            {{ getFilterLabel(filter) }}
          </button>
        </div>
      </header>

      <div v-if="isLoading" class="loading-state">
        <span class="loading-spinner">⌛</span>
        <p>Décryptage des archives...</p>
      </div>

      <div v-else-if="!userStore.isLoggedIn && !userStore.isOfflineStoryMode" class="auth-notice">
        <div class="empty-icon">🔒</div>
        <h3>Accès Restreint</h3>
        <p>Identifiez-vous pour accéder aux archives ou jouez en mode hors-ligne.</p>
        <div class="auth-actions">
          <AppButton variant="primary" @click="router.push('/login')">S'identifier</AppButton>
          <AppButton variant="ghost" @click="toggleOffline">Jouer Hors-ligne</AppButton>
        </div>
      </div>

      <div v-else-if="userStore.isOfflineStoryMode" class="offline-notice">
        <div class="offline-badge">MODE HORS-LIGNE</div>
        <p>Vous consultez les histoires locales. La progression n'est pas sauvegardée sur le serveur.</p>
      </div>

      <div v-else-if="!isLoading && (!stories || stories.length === 0)" class="no-quests">
        <div class="empty-icon">📭</div>
        <h3>Aucune histoire disponible</h3>
        <p>Les archives sont vides pour le moment.</p>
      </div>

      <div v-else class="stories-grid">
        <AppCard v-for="story in filteredStories" :key="story.id" class="story-card"
          @click="getStoryStatus(story.documentId || story.id) !== 'locked' ? router.push({ name: 'story-steps', params: { storyId: story.documentId || story.id } }) : handleLockedStoryClick(story)"
          :class="getStoryStatus(story.documentId || story.id)"
          glow
        >
          <div class="story-cover">
            <img :src="getStoryCover(story)" :alt="story.title" class="cover-image" />
            <div class="story-status-overlay">
              <span class="status-badge" :class="getStoryStatus(story.documentId || story.id)">
                {{ getStatusLabel(getStoryStatus(story.documentId || story.id)) }}
              </span>
            </div>
          </div>

          <div class="story-content">
            <h3 class="story-title">{{ story.title }}</h3>
            <p class="story-desc">{{ story.description }}</p>

            <div class="story-progress-section">
              <div class="progress-labels">
                <span>Progression</span>
                <span>{{ getCompletedStepsCount(story) }} / {{ story.steps?.length || 0 }} Étapes</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-fill" :style="{ width: getProgressPercentage(story) + '%' }"></div>
              </div>
            </div>

            <div v-if="story.rewardCards && story.rewardCards.length > 0" class="story-rewards-mini">
              <span class="reward-icon">🎁</span>
              <div class="reward-mini-cards">
                <img v-for="(card, i) in story.rewardCards.slice(0, 3)" :key="card.id || i"
                     :src="getRewardCardThumb(card)" class="reward-mini-img" :title="card.name" />
                <span v-if="story.rewardCards.length > 3" class="reward-more">+{{ story.rewardCards.length - 3 }}</span>
              </div>
            </div>

            <div class="story-footer">
              <div class="story-actions-row">
                <AppButton
                  v-if="getStoryStatus(story.documentId || story.id) === 'in_progress'"
                  variant="primary"
                  class="resume-btn"
                  @click.stop="resumeStory(story)"
                  glow
                >
                  ▶️ Reprendre
                </AppButton>
                <AppButton
                  v-if="getStoryStatus(story.documentId || story.id) !== 'locked'"
                  variant="ghost"
                  class="view-steps-btn"
                >
                  {{ getStoryStatus(story.documentId || story.id) === 'completed' ? 'Revoir les étapes' : 'Étapes' }} ➔
                </AppButton>
                <AppButton
                  v-else
                  variant="danger"
                  class="view-steps-btn"
                >
                  🔒 Débloquer ({{ unlockPrice }} 🪙)
                </AppButton>
              </div>
            </div>
          </div>
        </AppCard>
      </div>

      <AppModal v-model="showUnlockModal" title="Archive Verrouillée">
        <div v-if="selectedLockedStory" class="refusal-modal-content">
          <div class="refusal-icon">🔒</div>
          <h3>Accès Refusé</h3>
          <p>Cette archive nécessite une habilitation supérieure.</p>

          <div class="unlock-offer">
            <p>Voulez-vous débloquer l'accès avec vos crédits ?</p>
            <div class="price-tag">
              <span>🪙</span> {{ unlockPrice }} Crédits
            </div>
            <p v-if="userStore.user.coins < unlockPrice" class="funds-error">
              Fonds insuffisants. Vous avez {{ userStore.user.coins }} 🪙.
            </p>
          </div>

          <AppButton
            variant="primary"
            :disabled="userStore.user.coins < unlockPrice || isUnlocking"
            @click="unlockStory(selectedLockedStory.documentId || selectedLockedStory.id)"
            glow
          >
            <span v-if="isUnlocking" class="loading-spinner">⌛</span>
            <span v-else>Autoriser le prélèvement</span>
          </AppButton>
        </div>
      </AppModal>

    </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import PageLayout from '../components/PageLayout.vue';
import AppCard from '../components/ui/AppCard.vue';
import AppButton from '../components/ui/AppButton.vue';
import AppModal from '../components/ui/AppModal.vue';
import { useUserStore } from '../stores/userStore.js';
import strapiService from '../api/strapi.js';
import { getStrapiUrl, getStrapiMediaUrl } from '../utils/url.js';

const router = useRouter();
const userStore = useUserStore();

const stories = ref([]);
const isLoading = ref(true);
const unlockPrice = ref(500);

const showUnlockModal = ref(false);
const selectedLockedStory = ref(null);
const isUnlocking = ref(false);
const currentFilter = ref('all');

onMounted(async () => {
  if (!userStore.isLoggedIn && !userStore.isOfflineStoryMode) {
    isLoading.value = false;
    return;
  }

  if (userStore.isOfflineStoryMode) {
    await fetchLocalStories();
  } else {
    await fetchConfig();
    await fetchStories();
  }
});

function resumeStory(story) {
  const p = getProgress(story.documentId || story.id);
  if (!p) return;

  const storyId = story.documentId || story.id;
  const stepId = p.currentStep?.documentId || p.currentStep?.id || p.currentStep;

  if (!stepId) {
    // If no specific step recorded, go to steps list
    router.push({ name: 'story-steps', params: { storyId } });
    return;
  }

  // Find step index
  const steps = story.steps || [];
  const stepIdx = steps.findIndex(s => String(s.documentId || s.id) === String(stepId));
  
  if (stepIdx !== -1) {
    router.push(`/story/${storyId}/step/${stepIdx + 1}`);
  } else {
    router.push({ name: 'story-steps', params: { storyId } });
  }
}

async function toggleOffline() {
  userStore.toggleOfflineStoryMode(true);
  await fetchLocalStories();
}

function getFilterLabel(filter) {
  const labels = {
    'all': 'Toutes',
    'progress': 'En cours',
    'completed': 'Terminées',
    'locked': 'Bloquées'
  };
  return labels[filter];
}

const filteredStories = computed(() => {
  if (!stories.value) return [];
  
  let baseStories = stories.value;
  if (currentFilter.value !== 'all') {
    baseStories = stories.value.filter(story => {
      const status = getStoryStatus(story.documentId || story.id);
      if (currentFilter.value === 'completed') return status === 'completed';
      if (currentFilter.value === 'locked') return status === 'locked';
      if (currentFilter.value === 'progress') return status === 'in_progress';
      return true;
    });
  }

  // Define status priorities correctly
  const statusScores = {
    'completed': 0,
    'in_progress': 1,
    'locked': 2
  };

  // Return a sorted copy of the results
  return [...baseStories].sort((a, b) => {
    const statusA = getStoryStatus(a.documentId || a.id);
    const statusB = getStoryStatus(b.documentId || b.id);
    
    const diff = (statusScores[statusA] ?? 3) - (statusScores[statusB] ?? 3);
    if (diff !== 0) return diff;
    
    // Sort secondary by title
    return (a.title || '').localeCompare(b.title || '');
  });
});

function handleLockedStoryClick(story) {
  selectedLockedStory.value = story;
  showUnlockModal.value = true;
}

async function fetchLocalStories() {
  isLoading.value = true;
  try {
    const modules = import.meta.glob('../../../shared/data/stories/*.json', { eager: true });
    
    const localStories = Object.entries(modules).map(([path, module], index) => {
      const storyData = module.default || module;
      let steps = [];
      if (storyData.steps) {
        steps = storyData.steps.map(step => ({ ...step, rewardCards: step.rewardCards || [] }));
      } else if (storyData.situations) {
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
        idReal: index + 1,
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
    const response = await fetch(getStrapiUrl('/player-story-progress/unlock-story'), {
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
    showUnlockModal.value = false;
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
        image: true,
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

  if (p.status === 'completed' || p.progressStatus === 'completed') return 'completed';

  // Calculate completion if not explicitly set
  const story = stories.value.find(s => String(s.documentId || s.id) === String(storyId));
  if (story && story.steps && p.completedSteps) {
      if (p.completedSteps.length >= story.steps.length) return 'completed';
  }

  return 'in_progress';
}

function getStatusLabel(status) {
  if (status === 'completed') return 'Terminée';
  if (status === 'in_progress') return 'En cours';
  return 'Bloquée';
}

function getCompletedStepsCount(story) {
  if (userStore.isOfflineStoryMode) return 0;
  const p = getProgress(story.documentId || story.id);
  return p && p.completedSteps ? p.completedSteps.length : 0;
}

function getProgressPercentage(story) {
  const total = story.steps?.length || 1;
  const completed = getCompletedStepsCount(story);
  return Math.min(100, Math.round((completed / total) * 100));
}

function getStoryCover(story) {
  const storyData = story.attributes || story;
  if (storyData.image?.url) {
    return storyData.image.url.startsWith('http') ? storyData.image.url : getStrapiMediaUrl(storyData.image.url);
  }
  // Fallback if no image
  const seed = storyData.id || storyData.documentId || storyData.title || '0';
  return `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1a1a1a`;
}

function getRewardCardThumb(card) {
  if (!card) return '';
  const cardData = card.attributes || card;
  let url = cardData.imageUrl || cardData.img;
  if (!url && cardData.image?.url) {
    url = cardData.image.url.startsWith('http') ? cardData.image.url : getStrapiMediaUrl(cardData.image.url);
  }
  if (!url && cardData.image?.data?.attributes?.url) {
    const attrUrl = cardData.image.data.attributes.url;
    url = attrUrl.startsWith('http') ? attrUrl : getStrapiMediaUrl(attrUrl);
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom) + 80px);
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-header h1 {
  font-size: 2.5rem;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
  text-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
}

.page-header p {
  color: #aaa;
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.filter-tabs {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-tab {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #aaa;
  padding: 0.5rem 1.5rem;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  font-size: 0.9rem;
}

.filter-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.filter-tab.active {
  background: color-mix(in srgb, var(--color-primary) 20%, transparent);
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: 0 0 15px color-mix(in srgb, var(--color-primary) 30%, transparent);
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

.stories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
}

.story-card {
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  padding: 0 !important; /* Override AppCard default padding */
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(10px);
}

.story-card:hover {
  transform: translateY(-5px);
  border-color: rgba(255, 255, 255, 0.3);
}

.story-card.in_progress:hover {
  border-color: var(--color-primary);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.story-card.completed {
  border-color: rgba(0, 255, 100, 0.3);
}

.story-card.completed:hover {
  border-color: rgba(0, 255, 100, 0.6);
  box-shadow: 0 10px 30px rgba(0, 255, 100, 0.15);
}

.story-card.locked {
  opacity: 0.7;
  filter: grayscale(0.8);
}

.story-card.locked:hover {
  filter: grayscale(0.5);
  border-color: #ff4444;
}

.story-cover {
  position: relative;
  height: 180px;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.story-card:hover .cover-image {
  transform: scale(1.05);
}

.story-status-overlay {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.status-badge {
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  backdrop-filter: blur(5px);
}

.status-badge.completed { background: rgba(0, 255, 100, 0.2); color: #00ff64; border: 1px solid rgba(0, 255, 100, 0.5); }
.status-badge.in_progress { background: color-mix(in srgb, var(--color-primary) 20%, transparent); color: var(--color-primary); border: 1px solid var(--color-primary); }
.status-badge.locked { background: rgba(0, 0, 0, 0.6); color: #aaa; border: 1px solid rgba(255, 255, 255, 0.2); }

.story-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.story-title {
  margin: 0 0 0.5rem 0;
  color: #fff;
  font-size: 1.3rem;
  font-weight: 700;
}

.story-card.in_progress .story-title { color: var(--color-primary); }
.story-card.completed .story-title { color: #00ff64; }

.story-desc {
  margin: 0 0 1.5rem 0;
  font-size: 0.9rem;
  opacity: 0.7;
  line-height: 1.5;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex-grow: 1;
}

.story-progress-section {
  margin-bottom: 1.5rem;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #aaa;
  margin-bottom: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
}

.progress-bar-container {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.5s ease-in-out;
}

.story-card.completed .progress-bar-fill {
  background: #00ff64;
}

.story-rewards-mini {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.reward-icon {
  font-size: 1.2rem;
}

.reward-mini-cards {
  display: flex;
  align-items: center;
}

.reward-mini-img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #222;
  margin-left: -10px;
  object-fit: cover;
  background: #333;
}

.reward-mini-img:first-child { margin-left: 0; }
.reward-more { font-size: 0.75rem; color: #aaa; margin-left: 0.5rem; font-weight: bold; }

.story-footer {
  margin-top: auto;
}

.view-steps-btn {
  flex-grow: 1;
}

.story-actions-row {
  display: flex;
  gap: 0.8rem;
  width: 100%;
}

.resume-btn {
  flex-grow: 2;
  font-weight: 800;
}

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

.loading-spinner { display: inline-block; animation: rotate 1.5s linear infinite; }
@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
