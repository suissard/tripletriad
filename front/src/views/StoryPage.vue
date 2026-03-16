<template>
  <PageLayout title="MODE HISTOIRE" backRoute="/">
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
        <div class="section-title">Quêtes en cours</div>
        <QuestItem 
          v-for="quest in activeQuests" 
          :key="quest.id" 
          :quest="quest"
          @claim="handleClaim"
        />

        <div v-if="completedQuests.length > 0" class="completed-section">
          <div class="section-title">Quêtes terminées</div>
          <div class="completed-list">
            <div v-for="quest in completedQuests" :key="quest.id" class="completed-quest">
              <span class="check">✅</span>
              <span class="title">{{ quest.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<script setup>
import { computed } from 'vue';
import PageLayout from '../components/PageLayout.vue';
import QuestItem from '../components/QuestItem.vue';
import { useUserStore } from '../stores/userStore.js';

const userStore = useUserStore();

const activeQuests = computed(() => {
  return userStore.quests.filter(q => q.status === 'active');
});

const completedQuests = computed(() => {
  return userStore.quests.filter(q => q.status === 'completed');
});

async function handleClaim(questId) {
  console.log('Claiming reward for quest:', questId);
  // Placeholder for reward claiming logic
  // This will likely be an API call to Strapi
}

// Ensure quests are fresh when opening the page
userStore.fetchUserQuests();
</script>

<style scoped>
.story-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
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
  gap: 1.5rem;
}

.completed-section {
  margin-top: 3rem;
  opacity: 0.7;
}

.completed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.completed-quest {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 255, 100, 0.05);
  padding: 12px 20px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 100, 0.1);
}

.completed-quest .check {
  font-size: 1.2rem;
}

.completed-quest .title {
  color: #88f9b7;
  text-decoration: line-through;
}
</style>
