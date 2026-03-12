<template>
  <div v-if="isOpen" class="quest-modal-overlay" @click.self="close">
    <div class="quest-modal-content">
      <div class="quest-modal-header">
        <h2>Quêtes Journalières</h2>
        <button class="close-btn" @click="close">×</button>
      </div>

      <div class="quest-modal-body">
        <div v-if="loading" class="loading-state">
          Chargement des quêtes...
        </div>
        <div v-else-if="quests.length === 0" class="empty-state">
          Aucune quête en cours. Jouez pour en débloquer !
        </div>
        <div v-else class="quest-list">
          <div v-for="quest in quests" :key="quest.id" class="quest-card" :class="[quest.status, { 'pending': isPending(quest) }]">
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';
import strapiService from '../api/strapi';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close']);

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
    const response = await strapiService.client.get('/player-quests', {
      params: {
        populate: ['quest_template'],
        sort: ['startsAt:asc'],
        'pagination[limit]': 10
      }
    });

    // Check if response and response.data exist
    if (response && response.data) {
       quests.value = response.data;
    } else {
       quests.value = [];
    }
  } catch (error) {
    console.error('Error fetching quests:', error);
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
    }, 60000); // Update every minute
  } else {
    if (timerInterval) clearInterval(timerInterval);
  }
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<style scoped>
.quest-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(3px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.quest-modal-content {
  background: linear-gradient(to bottom, #2c3e50, #1a252f);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  border-radius: 12px;
  border: 2px solid #4a90e2;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: white;
}

.quest-modal-header {
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quest-modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #f1c40f;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.quest-modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s;
  position: relative;
  overflow: hidden;
}

.quest-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.08);
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
