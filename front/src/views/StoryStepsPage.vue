<template>
  <PageLayout :title="story?.title || 'ÉTAPES DE L\'HISTOIRE'" backRoute="/story">
    <div class="steps-container">
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner large">✨</div>
        <p>Chargement des étapes...</p>
      </div>

      <div v-else-if="!story" class="no-story">
        <div class="empty-icon">❓</div>
        <h3>Histoire non trouvée</h3>
        <p>Cette histoire n'existe pas ou n'est plus disponible.</p>
        <AppButton @click="router.push('/story')" variant="primary">Retour aux histoires</AppButton>
      </div>

      <div v-else class="story-content">
        <div class="story-header-detail">
          <p class="story-description">{{ story.description }}</p>
          
          <div v-if="story.rewardCards?.length" class="story-rewards-banner">
            <span class="reward-title">Récompenses finales :</span>
            <div class="reward-cards-list">
              <div v-for="card in story.rewardCards" :key="card.id" class="reward-card-item">
                <img :src="getRewardCardThumb(card)" :alt="card.name" class="reward-img" />
                <span class="reward-name">{{ card.name }}</span>
              </div>
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
            @click="isStepActive(index) ? startStep(step) : null"
          >
            <div class="step-card-header">
              <div class="step-num">Étape {{ index + 1 }}</div>
              <div class="step-status">
                <span v-if="isStepCompleted(step.id)" class="status-icon success">✅</span>
                <span v-else-if="isStepLocked(index)" class="status-icon lock">🔒</span>
                <span v-else class="status-icon active">⚔️</span>
              </div>
            </div>

            <div class="step-card-body">
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>

            <div v-if="step.rewardCards?.length" class="step-item-rewards" :class="{ 'claimed': isStepCompleted(step.id) }">
              <div class="reward-mini-label">
                {{ isStepCompleted(step.id) ? 'Récompense obtenue' : 'Récompense d\'étape' }}
              </div>
              <div class="reward-mini-images">
                <img v-for="card in step.rewardCards" :key="card.id" 
                  :src="getRewardCardThumb(card)" :alt="card.name" 
                  class="mini-card-img" />
              </div>
            </div>

            <div v-if="isStepActive(index)" class="step-card-footer">
              <AppButton variant="primary" glow>
                {{ isStepCompleted(step.id) ? 'Rejouer' : 'Commencer' }}
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PageLayout from '../components/PageLayout.vue';
import AppButton from '../components/ui/AppButton.vue';
import { useUserStore } from '../stores/userStore.js';
import strapiService from '../api/strapi.js';

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
  const modules = import.meta.glob('../../../../shared/data/stories/*.json', { eager: true });
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

function isStepCompleted(stepId) {
  if (userStore.isOfflineStoryMode) return false;
  const p = getProgress();
  return p && p.completedSteps && p.completedSteps.includes(stepId);
}

function isStepActive(stepIndex) {
  if (userStore.isOfflineStoryMode) return true;
  const p = getProgress();
  if (!p) return false;
  const completedCount = p.completedSteps ? p.completedSteps.length : 0;
  return stepIndex <= completedCount;
}

function isStepLocked(stepIndex) {
  if (userStore.isOfflineStoryMode) return false;
  const p = getProgress();
  if (!p) return true;
  const completedCount = p.completedSteps ? p.completedSteps.length : 0;
  return stepIndex > completedCount;
}

function startStep(step) {
  const stepIdx = story.value.steps.findIndex(s => s.id === step.id);
  router.push(`/story/${props.storyId}/step/${stepIdx + 1}`);
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
.steps-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  padding-bottom: 5rem;
}

.loading-state, .no-story {
  text-align: center;
  padding: 5rem 2rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 20px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.story-header-detail {
  margin-bottom: 3rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 2rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.story-description {
  font-size: 1.1rem;
  line-height: 1.6;
  opacity: 0.9;
  margin-bottom: 2rem;
}

.story-rewards-banner {
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  padding: 1rem;
  border-radius: 12px;
}

.reward-title {
  display: block;
  font-weight: bold;
  color: #FFD700;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
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
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem 1rem 0.5rem 0.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.reward-img {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.reward-name {
  font-size: 0.9rem;
  font-weight: 500;
}

.steps-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.step-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.step-card.active {
  background: rgba(0, 210, 255, 0.05);
  border-color: rgba(0, 210, 255, 0.3);
  cursor: pointer;
}

.step-card.active:hover {
  transform: translateY(-5px);
  background: rgba(0, 210, 255, 0.1);
  border-color: rgba(0, 210, 255, 0.5);
  box-shadow: 0 10px 30px rgba(0, 210, 255, 0.15);
}

.step-card.completed {
  border-color: rgba(0, 255, 100, 0.3);
}

.step-card.locked {
  opacity: 0.6;
  filter: grayscale(0.5);
}

.step-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2rem;
}

.step-num {
  font-weight: 800;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--color-primary);
  letter-spacing: 2px;
}

.step-status {
  font-size: 1.2rem;
}

.step-card-body h3 {
  margin: 0 0 0.8rem 0;
  font-size: 1.3rem;
}

.step-card-body p {
  font-size: 0.9rem;
  line-height: 1.5;
  opacity: 0.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.step-item-rewards {
  margin-top: auto;
  padding-top: 1.2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.reward-mini-label {
  font-size: 0.75rem;
  opacity: 0.5;
  margin-bottom: 0.8rem;
}

.reward-mini-images {
  display: flex;
  gap: 0.5rem;
}

.mini-card-img {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  object-fit: cover;
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
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .steps-list {
    grid-template-columns: 1fr;
  }
}
</style>
