<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="quest-reward-overlay" @click.self="$emit('close')">
        <div class="quest-reward-modal" :class="{ 'has-completed': completedQuests.length > 0 }">
          <!-- Background Decoration -->
          <div class="modal-bg-glow"></div>
          
          <!-- Header -->
          <div class="modal-header">
            <h2 class="premium-title">
              <span v-if="completedQuests.length > 0">Quêtes Terminées !</span>
              <span v-else>Quêtes Journalières</span>
            </h2>
            <button class="close-btn" @click="$emit('close')">×</button>
          </div>

          <div class="modal-body custom-scrollbar">
            <!-- Completed Quests Section -->
            <div v-if="completedQuests.length > 0" class="completed-section">
              <div v-for="quest in completedQuests" :key="quest.id" class="completed-quest-card">
                <div class="quest-info">
                  <h3>{{ quest.title }}</h3>
                  <p>{{ quest.description }}</p>
                </div>
                <div class="reward-display">
                  <div v-if="quest.rewardCoins" class="reward-item coin">
                    <span class="icon">🪙</span>
                    <span class="amount">{{ quest.rewardCoins }}</span>
                  </div>
                  <div v-if="quest.rewardGems" class="reward-item gem">
                    <span class="icon">💎</span>
                    <span class="amount">{{ quest.rewardGems }}</span>
                  </div>
                </div>
                <button 
                  class="claim-button" 
                  :disabled="claiming === (quest.documentId || quest.id)"
                  @click="handleClaim(quest)"
                >
                  <span v-if="claiming === (quest.documentId || quest.id)" class="loader"></span>
                  <span v-else>RÉCUPÉRER</span>
                </button>
              </div>
            </div>

            <!-- Active Quests Section -->
            <div class="active-section">
              <h4 class="section-subtitle">Autres quêtes en cours</h4>
              <div v-if="activeQuests.length > 0" class="active-quests-list">
                <div v-for="quest in activeQuests" :key="quest.id" class="active-quest-item">
                  <div class="item-header">
                    <span class="item-title">{{ quest.title }}</span>
                    <span class="item-progress">{{ quest.progress }} / {{ quest.target }}</span>
                  </div>
                  <div class="progress-container">
                    <div class="progress-bar" :style="{ width: (quest.progress / quest.target * 100) + '%' }"></div>
                  </div>
                </div>
              </div>
              <div v-else class="no-quests">
                Toutes les quêtes ont été complétées !
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <p class="footer-hint">Les nouvelles quêtes arrivent chaque jour à minuit.</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUserStore } from '../stores/userStore';

const props = defineProps({
  show: Boolean,
  quests: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'rewardClaimed']);
const userStore = useUserStore();
const claiming = ref(null);

const completedQuests = computed(() => 
  props.quests.filter(q => q.status === 'completed' && !q.rewardClaimed)
);

const activeQuests = computed(() => 
  props.quests.filter(q => q.status === 'active')
);

async function handleClaim(quest) {
  if (claiming.value) return;
  claiming.value = quest.documentId || quest.id;
  
  const result = await userStore.claimQuestReward(quest.documentId || quest.id);
  
  if (result.success) {
    emit('rewardClaimed', { quest, reward: result.reward });
  } else {
    // Optionally show error notification
    console.error('Failed to claim:', result.error);
  }
  
  claiming.value = null;
}
</script>

<style scoped>
.quest-reward-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.quest-reward-modal {
  width: 90%;
  max-width: 500px;
  background: #1a1a2e;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 20px;
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.5), 
              inset 0 0 20px rgba(255, 215, 0, 0.05);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.modal-bg-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.05) 0%, transparent 70%);
  pointer-events: none;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 215, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.premium-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover {
  color: white;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 215, 0, 0.3);
  border-radius: 10px;
}

/* Completed Section */
.completed-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.completed-quest-card {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.05));
  border: 1px solid rgba(255, 215, 0, 0.4);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  animation: slide-up 0.4s ease-out;
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.quest-info h3 {
  margin: 0;
  color: #FFD700;
  font-size: 1.2rem;
}

.quest-info p {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.reward-display {
  display: flex;
  gap: 1rem;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
}

.reward-item .amount {
  font-weight: bold;
}

.reward-item.coin .amount { color: #FFD700; }
.reward-item.gem .amount { color: #00d2ff; }

.claim-button {
  position: relative;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  border: none;
  padding: 1rem 2.5rem;
  border-radius: 50px;
  color: #1a1a2e;
  font-weight: 900;
  font-size: 1.1rem;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3), inset 0 -3px 0 rgba(0,0,0,0.2);
  overflow: hidden;
  animation: pulse-button 2s infinite;
}

@keyframes pulse-button {
  0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3), inset 0 -3px 0 rgba(0,0,0,0.2); }
  50% { transform: scale(1.03); box-shadow: 0 10px 25px rgba(255, 215, 0, 0.6), inset 0 -3px 0 rgba(0,0,0,0.2); }
}

.claim-button::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 50%; height: 100%;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent);
  transform: skewX(-20deg);
  transition: all 0.5s;
}

.claim-button:hover:not(:disabled) {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 12px 25px rgba(255, 215, 0, 0.6), inset 0 -3px 0 rgba(0,0,0,0.2);
  animation: none;
}

.claim-button:hover:not(:disabled)::before {
  left: 150%;
  transition: all 0.7s ease-in-out;
}

.claim-button:active:not(:disabled) {
  transform: translateY(2px) scale(0.95);
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4), inset 0 2px 0 rgba(0,0,0,0.2);
}

.claim-button:disabled {
  background: #444;
  color: #888;
  cursor: not-allowed;
  box-shadow: none;
  animation: none;
  transform: none;
}

/* Active Section */
.active-section {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1.5rem;
}

.section-subtitle {
  margin: 0 0 1rem;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.5);
}

.active-quests-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.active-quest-item {
  background: rgba(255, 255, 255, 0.03);
  padding: 0.75rem;
  border-radius: 8px;
  transition: transform 0.2s, background 0.2s;
}

.active-quest-item:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateX(5px);
}

.item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.item-title {
  color: white;
  font-weight: 500;
}

.item-progress {
  color: rgba(255, 255, 255, 0.5);
}

.progress-container {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #FFD700, #FFA500);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0; left: 0; bottom: 0; right: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.no-quests {
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
  font-size: 0.9rem;
}

.modal-footer {
  padding: 1rem;
  text-align: center;
  background: rgba(0, 0, 0, 0.2);
}

.footer-hint {
  margin: 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.loader {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid rgba(26, 26, 46, 0.3);
  border-radius: 50%;
  border-top-color: #1a1a2e;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
