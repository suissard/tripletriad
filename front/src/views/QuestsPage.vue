<template>
  <PageLayout title="QUÊTES JOURNALIÈRES" backRoute="/">
    <div class="story-container">
      <div v-if="!userStore.isLoggedIn" class="auth-notice">
        <p>Connectez-vous pour voir vos quêtes et progresser dans l'histoire.</p>
      </div>

      <div v-else-if="userStore.quests.length === 0" class="no-quests">
        <div class="empty-icon">📜</div>
        <h3>Aucune quête active</h3>
        <p>Revenez plus tard pour de nouveaux défis !</p>
      </div>

    <div v-else class="quests-list">
        <WeeklyQuestProgress
          v-if="userStore.weeklyConfig"
          :weekly-config="userStore.weeklyConfig"
          :weekly-progress="userStore.weeklyProgress"
          @claim="handleWeeklyClaim"
        />

        <div v-if="inProgressQuests.length > 0">
          <div class="section-title">Quêtes en cours</div>
          <div class="cards-grid">
            <QuestItem
              v-for="quest in inProgressQuests"
              :key="quest.id"
              :quest="quest"
              @claim="handleClaim"
            />
          </div>
        </div>

        <div v-if="completedQuests.length > 0" class="completed-section">
          <div class="section-title">Quêtes terminées</div>
          <div class="cards-grid">
            <QuestItem
              v-for="quest in completedQuests"
              :key="quest.id"
              :quest="quest"
              @claim="handleClaim"
            />
          </div>
        </div>

        <div v-if="upcomingQuests.length > 0" class="upcoming-section">
          <div class="section-title">Prochaines quêtes</div>
          <div class="cards-grid">
            <QuestItem
              v-for="quest in upcomingQuests"
              :key="quest.id"
              :quest="quest"
            />
          </div>
        </div>
      </div>
    </div>
    <WeeklyRewardModal
      :is-open="showWeeklyModal"
      :reward="weeklyReward"
      @close="showWeeklyModal = false"
    />
  </PageLayout>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import PageLayout from '../components/PageLayout.vue';
import QuestItem from '../components/QuestItem.vue';
import WeeklyQuestProgress from '../components/WeeklyQuestProgress.vue';
import WeeklyRewardModal from '../components/WeeklyRewardModal.vue';
import { useUserStore } from '../stores/userStore.js';

const userStore = useUserStore();
const now = ref(new Date());
const showWeeklyModal = ref(false);
const weeklyReward = ref(null);
let timerInterval = null;

const isPending = (quest) => {
  if (!quest.startsAt) return false;
  const startsAt = new Date(quest.startsAt);
  return startsAt > now.value;
};

const isActuallyCompleted = (quest) => {
  return quest.status === 'completed' || quest.progress >= quest.target;
};

const inProgressQuests = computed(() => {
  return userStore.quests.filter(q => q.status === 'active' && !isActuallyCompleted(q) && !isPending(q));
});

const completedQuests = computed(() => {
  return userStore.quests.filter(q => isActuallyCompleted(q));
});

const upcomingQuests = computed(() => {
  return userStore.quests.filter(q => isPending(q));
});

async function handleWeeklyClaim(requiredCount) {
  const result = await userStore.claimWeeklyTier(requiredCount);
  if (result) {
    // Show some notification or let the store handle alerts
    weeklyReward.value = result;
    showWeeklyModal.value = true;
  }
}

async function handleClaim(questId) {
  console.log('Claiming reward for quest:', questId);
  await userStore.claimQuestReward(questId);
}

onMounted(() => {
  userStore.fetchUserQuests();
  timerInterval = setInterval(() => {
    now.value = new Date();
  }, 60000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<style scoped>
.story-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.auth-notice, .no-quests {
  text-align: center;
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.section-title {
  color: #00d2ff;
  font-size: 1.2rem;
  font-weight: bold;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
  letter-spacing: 2px;
  border-left: 4px solid #00d2ff;
  padding-left: 15px;
}

.quests-list {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.completed-section, .upcoming-section {
  opacity: 0.9;
}
</style>
