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
        <AppCard
          v-for="story in stories"
          :key="story.id"
          class="story-card"
        >
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
            <div
              v-for="(step, index) in story.steps"
              :key="step.id"
              class="step-item"
              :class="{
                'completed': isStepCompleted(story.id, step.id),
                'active': isStepActive(story.id, index),
                'locked': isStepLocked(story.id, index)
              }"
            >
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
                <AppButton @click="startStep(story, step)" variant="primary">
                  Jouer l'étape
                </AppButton>
              </div>
            </div>
          </div>
        </AppCard>
      </div>
    </div>

    <!-- Dialogue Modal -->
    <AppModal v-model="showDialogueModal" title="Histoire">
      <div v-if="currentStep" class="dialogue-container">
        <div v-if="dialogueState === 'start'" class="dialogue-box">
          <div
            v-for="(line, idx) in currentStep.startDialogue"
            :key="idx"
            class="dialogue-line"
            :class="{ 'hero': line.name === 'Héros', 'npc': line.name !== 'Héros' }"
          >
            <strong>{{ line.name }} :</strong> {{ line.sentence }}
          </div>
          <AppButton @click="playCombat" variant="danger" class="mt-4" fullWidth>
            Faire le combat (Passer)
          </AppButton>
        </div>

        <div v-if="dialogueState === 'end'" class="dialogue-box">
          <div
            v-for="(line, idx) in currentStep.endDialogue"
            :key="idx"
            class="dialogue-line"
            :class="{ 'hero': line.name === 'Héros', 'npc': line.name !== 'Héros' }"
          >
            <strong>{{ line.name }} :</strong> {{ line.sentence }}
          </div>

          <div v-if="reward" class="reward-box mt-4">
            <h4>Récompense obtenue !</h4>
            <div class="reward-card">
              <TripleTriadCard
                v-if="reward"
                :name="reward.name"
                :topValue="reward.topValue"
                :rightValue="reward.rightValue"
                :bottomValue="reward.bottomValue"
                :leftValue="reward.leftValue"
                :element="reward.element"
                :image="reward.image?.url"
              />
            </div>
          </div>

          <AppButton @click="finishStep" variant="primary" class="mt-4" fullWidth>
            Terminer
          </AppButton>
        </div>
      </div>
    </AppModal>

  </PageLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import PageLayout from '../components/PageLayout.vue';
import AppCard from '../components/ui/AppCard.vue';
import AppButton from '../components/ui/AppButton.vue';
import AppModal from '../components/ui/AppModal.vue';
import TripleTriadCard from '../components/TripleTriadCard.vue';
import { useUserStore } from '../stores/userStore.js';
import strapiService from '../api/strapi.js';

const userStore = useUserStore();
const isLoading = ref(true);
const stories = ref([]);
const progresses = ref([]);
const expandedStory = ref(null);

// Modal state
const showDialogueModal = ref(false);
const currentStory = ref(null);
const currentStep = ref(null);
const dialogueState = ref('start'); // 'start' or 'end'
const reward = ref(null);

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await fetchStories();
  } else {
    isLoading.value = false;
  }
});

async function fetchStories() {
  isLoading.value = true;
  try {
    const [storiesRes, progressRes] = await Promise.all([
      strapiService.find('stories', {
        populate: ['steps', 'steps.startDialogue', 'steps.endDialogue']
      }),
      strapiService.find('player-story-progresses', {
        filters: { user: userStore.user.id }
      })
    ]);

    stories.value = storiesRes.data;
    progresses.value = progressRes.data;

    // Unlock first story if none exist
    if (progresses.value.length === 0 && stories.value.length > 0) {
      await initFirstStoryProgress(stories.value[0].id);
    }
  } catch (error) {
    console.error('Failed to fetch stories:', error);
  } finally {
    isLoading.value = false;
  }
}

async function initFirstStoryProgress(storyId) {
  try {
    const res = await strapiService.create('player-story-progresses', {
      user: userStore.user.id,
      story: storyId,
      status: 'in_progress',
      completedSteps: []
    });
    progresses.value.push(res.data);
  } catch (err) {
    console.error('Failed to init story progress', err);
  }
}

function getProgress(storyId) {
  return progresses.value.find(p => {
    // Check if relation is populated object or just id
    const sId = typeof p.story === 'object' && p.story ? p.story.id : p.story;
    return sId === storyId;
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
  return stepIndex === completedCount && p.status !== 'completed';
}

function isStepLocked(storyId, stepIndex) {
  const p = getProgress(storyId);
  if (!p) return true;
  const completedCount = p.completedSteps ? p.completedSteps.length : 0;
  return stepIndex > completedCount;
}

function toggleStory(storyId) {
  if (getStoryStatus(storyId) === 'locked') return;
  expandedStory.value = expandedStory.value === storyId ? null : storyId;
}

function startStep(story, step) {
  currentStory.value = story;
  currentStep.value = step;
  dialogueState.value = 'start';
  reward.value = null;
  showDialogueModal.value = true;
}

async function playCombat() {
  // Simulate combat win and claim reward
  try {
    // using raw fetch to custom route
    const token = localStorage.getItem('tt_jwt');
    const response = await fetch('http://localhost:1337/api/player-story-progress/claim-step-reward', {
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
      throw new Error('Failed to claim reward');
    }

    const data = await response.json();
    reward.value = data.reward;

    // Update local progress
    const idx = progresses.value.findIndex(p => p.id === data.progress.id);
    if (idx !== -1) {
      progresses.value[idx] = data.progress;
    } else {
      progresses.value.push(data.progress);
    }

    // Unlock next story if this one is completed
    if (data.progress.status === 'completed') {
      const currentStoryIndex = stories.value.findIndex(s => s.id === currentStory.value.id);
      if (currentStoryIndex !== -1 && currentStoryIndex + 1 < stories.value.length) {
        const nextStory = stories.value[currentStoryIndex + 1];
        if (!getProgress(nextStory.id)) {
          await initFirstStoryProgress(nextStory.id);
        }
      }
    }

    // Show end dialogue
    dialogueState.value = 'end';

  } catch (error) {
    console.error('Error claiming step reward:', error);
    alert('Une erreur est survenue.');
  }
}

function finishStep() {
  showDialogueModal.value = false;
  currentStory.value = null;
  currentStep.value = null;
  reward.value = null;
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

.empty-icon {
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
  background: rgba(255,255,255,0.05);
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

.status-badge.completed { background: rgba(0,255,100,0.2); color: #00ff64; }
.status-badge.progress { background: rgba(0,210,255,0.2); color: #00d2ff; }
.status-badge.locked { background: rgba(255,255,255,0.1); color: #aaa; }

.chevron {
  transition: transform 0.3s;
}
.chevron.open {
  transform: rotate(180deg);
}

.story-steps {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(0,0,0,0.2);
}

.step-item {
  padding: 1rem;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
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

/* Dialogue styles */
.dialogue-container {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 10px;
}

.dialogue-box {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dialogue-line {
  padding: 10px 15px;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  font-size: 0.95rem;
}

.dialogue-line.hero {
  background: rgba(0, 210, 255, 0.15);
  border-left: 3px solid #00d2ff;
  align-self: flex-start;
  margin-right: 20%;
}

.dialogue-line.npc {
  background: rgba(255, 100, 100, 0.15);
  border-right: 3px solid #ff6464;
  align-self: flex-end;
  text-align: right;
  margin-left: 20%;
}

.reward-box {
  text-align: center;
  background: rgba(0,255,100,0.1);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(0,255,100,0.3);
}

.reward-card {
  width: 150px;
  margin: 1rem auto 0;
}

.mt-4 { margin-top: 1rem; }
</style>
