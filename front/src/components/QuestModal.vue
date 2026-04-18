<template>
  <AppModal
    :modelValue="isOpen"
    @update:modelValue="$emit('update:modelValue', $event)"
    title="Quêtes"
    :show-close-button="true"
    @close="close"
    max-width="xl"
  >
    <div class="quest-modal-body">
      <!-- Section Hebdomadaire Small -->
      <WeeklyQuestProgress
        v-if="userStore.weeklyConfig"
        :weekly-config="userStore.weeklyConfig"
        :weekly-progress="userStore.weeklyProgress"
        :small="true"
        @claim="handleWeeklyClaim"
      />

      <div v-if="loading" class="loading-state">
        Chargement des quêtes...
      </div>
      <div v-else-if="filteredQuests.length === 0" class="empty-state">
        Aucune quête active pour le moment.
      </div>
      <div v-else class="quest-list">
        <QuestItem
          v-for="quest in filteredQuests"
          :key="quest.id"
          :quest="quest"
          @claim="handleClaim"
        />
      </div>

      <!-- Bouton d'accès rapide -->
      <div class="modal-actions">
        <AppButton 
          variant="primary" 
          fullWidth
          @click="goToQuests"
        >
          📜 TOUTES LES QUÊTES & HISTOIRE
        </AppButton>
      </div>
    </div>

    <WeeklyRewardModal
      :is-open="showWeeklyModal"
      :reward="weeklyReward"
      @close="showWeeklyModal = false"
    />
  </AppModal>
</template>

<script setup>
import { ref, watch, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import strapiService from '../api/strapi';
import QuestItem from './QuestItem.vue';
import WeeklyQuestProgress from './WeeklyQuestProgress.vue';
import WeeklyRewardModal from './WeeklyRewardModal.vue';
import { useUserStore } from '../stores/userStore';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'update:modelValue']);
const userStore = useUserStore();
const router = useRouter();

const quests = computed(() => userStore.quests);
const loading = ref(false);
let timerInterval = null;
const now = ref(new Date());

const showWeeklyModal = ref(false);
const weeklyReward = ref(null);

const close = () => {
  emit('close');
};

const goToQuests = () => {
  router.push('/quests');
  close();
};

const handleClaim = async (questId) => {
  await userStore.claimQuestReward(questId);
};

async function handleWeeklyClaim(requiredCount) {
  const result = await userStore.claimWeeklyTier(requiredCount);
  if (result) {
    weeklyReward.value = result;
    showWeeklyModal.value = true;
  }
}

const isActuallyCompleted = (quest) => {
  return quest.status === 'completed' || quest.progress >= quest.target;
};

const isPending = (quest) => {
  if (!quest.startsAt) return false;
  return quest.startsAt > now.value;
};

const filteredQuests = computed(() => {
  if (!quests.value) return [];
  
  return quests.value.filter(q => {
    // Only show active quests that are not yet completed
    return q.status === 'active' && !isActuallyCompleted(q) && !isPending(q);
  });
});

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    userStore.fetchUserQuests();
    userStore.fetchWeeklyQuests();
    timerInterval = setInterval(() => {
      now.value = new Date();
    }, 30000);
  } else {
    if (timerInterval) clearInterval(timerInterval);
  }
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<style scoped>
.quest-modal-body {
  padding: 10px;
  max-height: 70vh;
  overflow-y: auto;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 40px 0;
  color: #bdc3c7;
  font-style: italic;
}

.quest-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.modal-actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
