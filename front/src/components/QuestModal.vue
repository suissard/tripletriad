<template>
  <AppModal
    :modelValue="isOpen"
    @update:modelValue="$emit('update:modelValue', $event)"
    title="Quêtes Journalières"
    :show-close-button="true"
    @close="close"
    max-width="xl"
  >
    <div class="quest-modal-body">
      <div v-if="loading" class="loading-state">
        Chargement des quêtes...
      </div>
      <div v-else-if="quests.length === 0" class="empty-state">
        Aucune quête en cours. Jouez pour en débloquer !
      </div>
      <div v-else class="quest-list">
        <QuestItem
          v-for="quest in sortedQuests"
          :key="quest.id"
          :quest="quest"
          @claim="handleClaim"
        />
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { ref, watch, onUnmounted, computed } from 'vue';
import strapiService from '../api/strapi';
import QuestItem from './QuestItem.vue';
import { useUserStore } from '../stores/userStore';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'update:modelValue']);
const userStore = useUserStore();

const quests = ref([]);
const loading = ref(false);
let timerInterval = null;
const now = ref(new Date());

const close = () => {
  emit('close');
};

const fetchQuests = async () => {
  loading.value = true;
  try {
    const response = await strapiService.find('player-quests', {
      populate: ['quest_template'],
      sort: ['startsAt:asc'],
      pagination: { limit: 10 }
    });

    let rawData = [];
    if (Array.isArray(response)) {
      rawData = response;
    } else if (response && response.data && Array.isArray(response.data)) {
      rawData = response.data;
    }

    // Map to Quest interface
    quests.value = rawData.map(item => ({
      id: item.id,
      title: item.quest_template?.title || 'Quête sans titre',
      description: item.quest_template?.description || '',
      progress: item.progress || 0,
      target: item.quest_template?.target || 1,
      rewardCoins: item.quest_template?.rewardCoins || 0,
      rewardGems: item.quest_template?.rewardGems || 0,
      status: item.status || 'active',
      startsAt: item.startsAt ? new Date(item.startsAt) : null,
      expiresAt: item.expiresAt ? new Date(item.expiresAt) : null
    }));
  } catch (error) {
    console.error('Error fetching quests:', error);
    quests.value = [];
  } finally {
    loading.value = false;
  }
};

const handleClaim = async (questId) => {
  await userStore.claimQuestReward(questId);
  fetchQuests(); // Refresh list after claim
};

const isActuallyCompleted = (quest) => {
  return quest.progress >= quest.target;
};

const isPending = (quest) => {
  if (!quest.startsAt) return false;
  return quest.startsAt > now.value;
};

const sortedQuests = computed(() => {
  if (!quests.value) return [];
  
  return [...quests.value].sort((a, b) => {
    const pendingA = isPending(a);
    const pendingB = isPending(b);
    const completedA = isActuallyCompleted(a);
    const completedB = isActuallyCompleted(b);

    let groupA = 0;
    if (completedA) groupA = 1;
    if (pendingA) groupA = 2;

    let groupB = 0;
    if (completedB) groupB = 1;
    if (pendingB) groupB = 2;

    if (groupA !== groupB) return groupA - groupB;

    const dateA = a.startsAt ? a.startsAt.getTime() : 0;
    const dateB = b.startsAt ? b.startsAt.getTime() : 0;
    return dateA - dateB;
  });
});

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    fetchQuests();
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
</style>
