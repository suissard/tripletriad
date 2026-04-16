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

const quests = computed(() => userStore.quests);
const loading = ref(false);
let timerInterval = null;
const now = ref(new Date());

const close = () => {
  emit('close');
};

const handleClaim = async (questId) => {
  await userStore.claimQuestReward(questId);
};

const isActuallyCompleted = (quest) => {
  return quest.status === 'completed' || quest.progress >= quest.target;
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
    userStore.fetchUserQuests();
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
