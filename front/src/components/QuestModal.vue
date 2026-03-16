<template>
  <AppModal
    :modelValue="isOpen"
    @update:modelValue="$emit('update:modelValue', $event)"
    title="Quêtes Journalières"
    :show-close-button="true"
    @close="close"
    max-width="md"
  >
    <div class="quest-modal-body">
      <div v-if="loading" class="loading-state">
        Chargement des quêtes...
      </div>
      <div v-else-if="quests.length === 0" class="empty-state">
        Aucune quête en cours. Jouez pour en débloquer !
      </div>
      <div v-else class="quest-list">
        <AppCard v-for="quest in quests" :key="quest.id" :variant="quest.status === 'completed' ? 'accent' : 'secondary'" :class="['quest-card', quest.status, { 'pending': isPending(quest) }]">
          <div class="quest-info">
            <h3 class="quest-title">{{ quest.quest_template?.title || 'Quête inconnue' }}</h3>
            <p class="quest-desc">{{ quest.quest_template?.description }}</p>

            <div v-if="isPending(quest)" class="quest-pending-timer">
              Disponible dans : {{ formatPendingTime(quest.startsAt) }}
            </div>
            <div v-else class="quest-progress-bar">
              <div class="progress-fill" :style="{ width: progressPercentage(quest) + '%' }"></div>
              <span class="progress-text">{{ quest.progress }} / {{ quest.quest_template?.target }}</span>
            </div>
          </div>

          <div class="quest-reward" v-if="quest.quest_template?.rewardCoins || quest.quest_template?.rewardGems">
            <span v-if="quest.quest_template?.rewardCoins" class="reward coin">
              🪙 {{ quest.quest_template.rewardCoins }}
            </span>
            <span v-if="quest.quest_template?.rewardGems" class="reward gem">
              💎 {{ quest.quest_template.rewardGems }}
            </span>
          </div>

          <div v-if="quest.status === 'completed'" class="quest-status-badge completed">
            Terminée
          </div>
        </AppCard>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';
import strapiService from '../api/strapi';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'update:modelValue']);

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

    if (Array.isArray(response)) {
      quests.value = response;
    } else if (response && response.data && Array.isArray(response.data)) {
      quests.value = response.data;
    } else {
      quests.value = [];
    }
  } catch (error) {
    console.error('Error fetching quests:', error);
    quests.value = [];
  } finally {
    loading.value = false;
  }
};

const isPending = (quest) => {
  if (!quest.startsAt) return false;
  const startsAt = new Date(quest.startsAt);
  return startsAt > now.value;
};

const formatPendingTime = (startsAtStr) => {
  const startsAt = new Date(startsAtStr);
  const diff = startsAt - now.value;
  if (diff <= 0) return 'Maintenant';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const progressPercentage = (quest) => {
  if (!quest.quest_template || !quest.quest_template.target) return 0;
  return Math.min(100, (quest.progress / quest.quest_template.target) * 100);
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    fetchQuests();
    timerInterval = setInterval(() => {
      now.value = new Date();
    }, 60000);
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
  max-height: 60vh;
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

.quest-card {
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.quest-card.pending {
  opacity: 0.7;
  background: repeating-linear-gradient(
    45deg,
    rgba(0, 0, 0, 0.1),
    rgba(0, 0, 0, 0.1) 10px,
    rgba(255, 255, 255, 0.05) 10px,
    rgba(255, 255, 255, 0.05) 20px
  );
}

.quest-card.completed {
  border-color: #2ecc71;
  background: rgba(46, 204, 113, 0.1);
}

.quest-info {
  flex: 1;
  padding-right: 15px;
}

.quest-title {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
}

.quest-desc {
  margin: 0 0 10px 0;
  font-size: 0.85rem;
  color: #bdc3c7;
}

.quest-progress-bar {
  background: rgba(0, 0, 0, 0.5);
  height: 20px;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.progress-fill {
  background: linear-gradient(90deg, #3498db, #2ecc71);
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.8rem;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}

.quest-pending-timer {
  font-size: 0.9rem;
  color: #f39c12;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 5px;
}

.quest-pending-timer::before {
  content: '⏳';
}

.quest-reward {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-end;
}

.reward {
  font-size: 0.9rem;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.4);
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.reward.coin { color: #f1c40f; }
.reward.gem { color: #9b59b6; }

.quest-status-badge {
  position: absolute;
  top: 10px;
  right: -25px;
  background: #2ecc71;
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 25px;
  transform: rotate(45deg);
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
</style>
