<template>
  <PageLayout>
    <div class="steps-container">
      <AppButton variant="ghost" class="back-btn" @click="router.push('/story')">
        ⬅ Retour aux Archives
      </AppButton>

      <div v-if="isLoading" class="loading-state">
        <span class="loading-spinner">⚙️</span>
        <p>Analyse de la séquence mémorielle...</p>
      </div>

      <div v-else-if="!story" class="no-story">
        <div class="empty-icon">❌</div>
        <h3>Archive Introuvable</h3>
        <p>Cette séquence semble corrompue ou inaccessible.</p>
        <AppButton variant="primary" @click="router.push('/story')">Retour</AppButton>
      </div>

      <div v-else class="story-content-wrapper">
        <div class="story-header-detail">
          <div class="header-cover" v-if="getStoryCover(story)">
            <img :src="getStoryCover(story)" :alt="story.title" class="story-cover-image" />
            <div class="cover-overlay"></div>
          </div>
          
          <div class="header-text-content">
            <h1>{{ story.title }}</h1>
            <p class="story-description">{{ story.description }}</p>

            <div v-if="story.rewardCards && story.rewardCards.length > 0" class="story-rewards-banner">
              <span class="reward-title">Récompenses de l'archive :</span>
              <div class="reward-cards-list">
                <div v-for="card in story.rewardCards" :key="card.id" class="reward-card-item">
                  <img :src="getRewardCardThumb(card)" :alt="card.name" class="reward-img" />
                  <span class="reward-name">{{ card.name }}</span>
                </div>
              </div>
            </div>

            <div class="story-actions">
              <AppButton variant="ghost" class="reset-btn" @click="resetStory">
                🔄 Réinitialiser l'Archive
              </AppButton>
            </div>
          </div>
        </div>

        <div class="steps-list">
          <div v-for="(step, index) in story.steps" :key="step.id || index" 
            class="step-card" 
            :class="{
              'completed': isStepCompleted(step.id),
              'active': isStepActive(index),
              'locked': isStepLocked(index)
            }"
            @click="!isStepLocked(index) ? startStep(step) : null"
          >
            <div class="step-cover-container">
              <img :src="getStepCover(step, index)" class="step-cover-img" />
              <div class="step-overlay-gradient"></div>

              <div class="step-card-header">
                <div class="step-num">Séquence {{ index + 1 }}</div>
                <div class="step-status">
                  <span v-if="isStepCompleted(step.id)" class="status-icon success" title="Terminée">✅</span>
                  <span v-else-if="isStepLocked(index)" class="status-icon lock" title="Verrouillée">🔒</span>
                  <span v-else class="status-icon active" title="Disponible">⚔️</span>
                </div>
              </div>
            </div>

            <div class="step-content">
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>

              <div v-if="step.rewardCards?.length" class="step-item-rewards" :class="{ 'claimed': isStepCompleted(step.id) }">
                <div class="reward-mini-label">
                  {{ isStepCompleted(step.id) ? 'Données extraites' : 'Données à extraire' }}
                </div>
                <div class="reward-mini-images">
                  <img v-for="card in step.rewardCards" :key="card.id"
                    :src="getRewardCardThumb(card)" :alt="card.name"
                    class="mini-card-img" />
                </div>
              </div>

              <div v-if="isStepActive(index)" class="step-card-footer">
                <AppButton :variant="isStepCompleted(step.id) ? 'ghost' : 'primary'" glow>
                  {{ isStepCompleted(step.id) ? 'Revivre' : 'Initier' }}
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageLayout from '../components/PageLayout.vue';
import AppButton from '../components/ui/AppButton.vue';
import { useUserStore } from '../stores/userStore.js';
import strapiService from '../api/strapi.js';
import { getStrapiMediaUrl } from '../utils/url.js';

const props = defineProps({
  storyId: {
    type: [String, Number],
    required: true
  }
});

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

const isLoading = ref(true);
const story = ref(null);

onMounted(async () => {
  await fetchData();
});

async function fetchData() {
  isLoading.value = true;
  try {
    if (userStore.isOfflineStoryMode) {
      await fetchLocalStory();
    } else {
      await fetchStrapiStory();
    }
  } catch (err) {
    console.error('Failed to fetch story steps:', err);
  } finally {
    isLoading.value = false;
  }
}

async function fetchStrapiStory() {
  await userStore.fetchUserStoryProgresses();
  const res = await strapiService.findOne('stories', props.storyId, {
    populate: {
      image: true,
      rewardCards: { populate: ['image'] },
      steps: { 
        populate: { 
          image: true,
          conditions: true,
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

  if (res.data) {
    const s = res.data;
    const steps = (s.steps || []).map(step => {
      const rewardSituation = step.situations?.find(sit => sit.__component === 'story.situation-reward');
      return {
        ...step,
        rewardCards: rewardSituation?.rewardCards || []
      };
    });
    story.value = { ...s, steps };
  }
}

async function fetchLocalStory() {
  const modules = import.meta.glob('../../../shared/data/stories/*.json', { eager: true });
  const storyList = Object.entries(modules).map(([path, module], index) => {
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
      steps,
      rewardCards: storyData.rewardCards || []
    };
  });

  story.value = storyList.find(s => String(s.id) === String(props.storyId));
}

function getProgress() {
  const storyId = String(props.storyId);
  if (!userStore.storyProgresses) return null;
  return userStore.storyProgresses.find(p => {
    const storyData = p.story?.data || p.story;
    if (!storyData) return false;
    
    return String(storyData.documentId) === storyId || 
           String(storyData.id) === storyId ||
           String(p.story) === storyId;
  });
}

async function resetStory() {
  if (!confirm('Voulez-vous vraiment réinitialiser votre progression dans cette histoire ? Tous vos choix et étapes franchies seront effacés.')) {
    return;
  }
  
  isLoading.value = true;
  try {
    const res = await userStore.resetStoryProgress(props.storyId);
    if (res) {
      // Reload everything
      await fetchData();
    }
  } catch (err) {
    console.error('Failed to reset story:', err);
  } finally {
    isLoading.value = false;
  }
}

function isStepCompleted(stepId) {
  if (userStore.isOfflineStoryMode) return false;
  const p = getProgress();
  return p && p.completedSteps && p.completedSteps.includes(stepId);
}

function checkCondition(condition, progress) {
  if (!condition || !progress) return true;
  
  const variables = progress.variables || {};
  const completedSteps = progress.completedSteps || [];
  
  switch (condition.type) {
    case 'hasVisitedSituation':
      // Look in stepHistory if we visited a specific situation
      return (progress.stepHistory || []).some(h => h.situationId === condition.value);
    
    case 'hasWonBattle':
      // Simplified: check if a step identified by condition.value is completed
      // or if there is a battle win in stepHistory
      return completedSteps.includes(condition.value) || 
             (progress.stepHistory || []).some(h => h.action === 'battle_win' && h.situationId === condition.value);
             
    case 'hasFlag':
      return !!variables[condition.value];
    
    case 'variableEquals':
      const [key, val] = condition.value.split(':');
      return String(variables[key]) === String(val);

    default:
      return true;
  }
}

function isStepActive(stepIndex) {
  if (userStore.isOfflineStoryMode) return true;
  return !isStepLocked(stepIndex);
}

function isStepLocked(stepIndex) {
  if (userStore.isOfflineStoryMode) return false;
  const p = getProgress();
  if (!p) return true;
  
  const step = story.value?.steps[stepIndex];
  if (!step) return true;

  // First check linear progression (default)
  const completedCount = p.completedSteps ? p.completedSteps.length : 0;
  if (stepIndex > completedCount) {
    // Check if there are explicit conditions
    if (!step.conditions || step.conditions.length === 0) {
      return true; // Still locked because linear
    }
  }

  // If there are conditions, they MUST be met
  if (step.conditions && step.conditions.length > 0) {
    return !step.conditions.every(c => checkCondition(c, p));
  }

  return stepIndex > completedCount;
}

function startStep(step) {
  const stepIdx = story.value.steps.findIndex(s => s.id === step.id);
  router.push(`/story/${props.storyId}/step/${stepIdx + 1}`);
}

function getStoryCover(storyData) {
  if (!storyData) return '';
  const data = storyData.attributes || storyData;
  if (data.image?.url) {
    return data.image.url.startsWith('http') ? data.image.url : getStrapiMediaUrl(data.image.url);
  }
  const seed = data.id || data.documentId || data.title || '0';
  return `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1a1a1a`;
}

function getStepCover(step, index) {
  if (!step) return '';
  const data = step.attributes || step;
  if (data.image?.url) {
    return data.image.url.startsWith('http') ? data.image.url : getStrapiMediaUrl(data.image.url);
  }
  const seed = data.id || data.title || `step-${index}`;
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1a1a1a`;
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
.steps-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  padding-bottom: calc(5rem + env(safe-area-inset-bottom));
}

.back-btn {
  margin-bottom: 2rem;
  font-weight: 600;
  color: #aaa;
}
.back-btn:hover { color: #fff; }

.loading-state, .no-story {
  text-align: center;
  padding: 5rem 2rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 20px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.empty-icon { font-size: 4rem; margin-bottom: 1rem; }

.story-header-detail {
  margin-bottom: 3rem;
  background: rgba(20, 20, 20, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  position: relative;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
}

.header-cover {
  width: 100%;
  height: 250px;
  position: relative;
}

.story-cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(to bottom, transparent, rgba(20, 20, 20, 1));
}

.header-text-content {
  padding: 0 2.5rem 2.5rem 2.5rem;
  position: relative;
  z-index: 2;
  margin-top: -3rem; /* overlap with gradient */
}

.header-text-content h1 {
  font-size: 2.8rem;
  color: var(--color-primary);
  margin-bottom: 1rem;
  text-shadow: 0 0 15px rgba(0, 210, 255, 0.4);
}

.story-description {
  font-size: 1.15rem;
  line-height: 1.6;
  opacity: 0.9;
  margin-bottom: 2rem;
  color: #e0e0e0;
}

.story-rewards-banner {
  background: color-mix(in srgb, var(--color-primary) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
  padding: 1.5rem;
  border-radius: 12px;
}

.reward-title {
  display: block;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 1rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.reward-cards-list {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.reward-card-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.5rem 1rem 0.5rem 0.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.reward-img {
  width: 45px;
  height: 45px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--color-primary);
}

.reward-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
}

.story-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-start;
}

.reset-btn {
  font-size: 0.85rem;
  color: #ff4444;
  border-color: rgba(255, 68, 68, 0.2);
}

.reset-btn:hover {
  background: rgba(255, 68, 68, 0.1);
  color: #ff6666;
  border-color: rgba(255, 68, 68, 0.5);
}

.steps-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
}

.step-card {
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.step-card.active {
  border-color: rgba(0, 210, 255, 0.4);
  cursor: pointer;
  box-shadow: 0 0 15px color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.step-card.active:hover {
  transform: translateY(-5px);
  border-color: var(--color-primary);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--color-primary) 25%, transparent);
}

.step-card.completed {
  border-color: rgba(0, 255, 100, 0.3);
}

.step-card.completed:hover {
  cursor: pointer;
  transform: translateY(-5px);
  border-color: rgba(0, 255, 100, 0.6);
  box-shadow: 0 10px 30px rgba(0, 255, 100, 0.15);
}

.step-card.locked {
  opacity: 0.6;
  filter: grayscale(0.8);
}

.step-cover-container {
  position: relative;
  height: 140px;
  width: 100%;
  overflow: hidden;
}

.step-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.step-card:hover .step-cover-img {
  transform: scale(1.05);
}

.step-overlay-gradient {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(20,20,20,1));
}

.step-card-header {
  position: absolute;
  top: 1rem;
  left: 1rem;
  right: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 2;
}

.step-num {
  font-weight: 800;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #fff;
  letter-spacing: 2px;
  background: rgba(0,0,0,0.5);
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.1);
}

.step-card.active .step-num { color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 30%, transparent); }
.step-card.completed .step-num { color: #00ff64; border-color: rgba(0, 255, 100, 0.3); }

.step-status {
  font-size: 1.2rem;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.1);
}

.step-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  position: relative;
  z-index: 2;
  margin-top: -2rem; /* Bring content up slightly over the gradient */
}

.step-content h3 {
  margin: 0 0 0.8rem 0;
  font-size: 1.4rem;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
}

.step-content p {
  font-size: 0.95rem;
  line-height: 1.5;
  opacity: 0.8;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 1.5rem;
  color: #e0e0e0;
}

.step-item-rewards {
  margin-top: auto;
  padding-top: 1.2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.reward-mini-label {
  font-size: 0.75rem;
  color: #aaa;
  margin-bottom: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.reward-mini-images {
  display: flex;
  gap: 0.5rem;
}

.mini-card-img {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  object-fit: cover;
}

.step-item-rewards.claimed .mini-card-img {
  border-color: #00ff64;
  box-shadow: 0 0 10px rgba(0, 255, 100, 0.2);
}

.step-card-footer {
  margin-top: 1.5rem;
}

.step-card-footer :deep(button) {
  width: 100%;
}

.loading-spinner {
  display: inline-block;
  animation: rotate 1.5s linear infinite;
  font-size: 3rem;
  margin-bottom: 1rem;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .steps-list { grid-template-columns: 1fr; }
  .header-text-content { padding: 0 1.5rem 1.5rem 1.5rem; }
  .header-text-content h1 { font-size: 2rem; }
}
</style>
