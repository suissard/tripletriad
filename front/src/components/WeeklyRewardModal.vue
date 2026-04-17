<template>
  <Transition name="modal-bounce">
    <div v-if="isOpen" class="modal-overlay" @click.self="close">
      <div class="modal-content glass-panel">
        <div class="light-rays"></div>
        <div class="particles-bg"></div>

        <h2 class="reward-title">RÉCOMPENSE HEBDOMADAIRE</h2>

        <div v-if="reward" class="reward-container relative z-10">
          
          <div v-if="reward.card" class="card-reward-wrapper">
            <h3 class="card-reveal-text">Nouvelle carte débloquée !</h3>
            <div class="card-presentation">
              <div class="card-glow" :style="{'--glow-color': getRarityColor(reward.card)}"></div>
              <TripleTriadCard 
                :card="reward.card" 
                size="xl"
                :is-premium="true"
                :interactive="true"
                class="reward-card"
              />
            </div>
          </div>

          <div class="reward-grid">
            <div v-if="reward.coins > 0" class="reward-item coin-item">
              <span class="icon drop-shadow-lg">🪙</span>
              <span class="amount text-yellow-400">+{{ reward.coins }}</span>
            </div>
            <div v-if="reward.gems > 0" class="reward-item gem-item">
              <span class="icon drop-shadow-lg">💎</span>
              <span class="amount text-purple-400">+{{ reward.gems }}</span>
            </div>
          </div>
        </div>

        <div v-else class="error-msg">
          <p>Erreur lors de la récupération de la récompense.</p>
        </div>

        <button class="epic-close-btn" @click="close">
          <span>GÉNIAL !</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue';
import TripleTriadCard from './TripleTriadCard.vue';

const props = defineProps({
  isOpen: Boolean,
  reward: Object
});

const emit = defineEmits(['close']);

function close() {
  emit('close');
}

function getRarityColor(card) {
  const rarity = (card.rarityName || card.rarity || 'common').toLowerCase();
  const map = {
    'commun': '#a0a0a0', 'common': '#a0a0a0',
    'peu commun': '#4caf50', 'uncommon': '#4caf50',
    'rare': '#2196f3',
    'épique': '#9c27b0', 'epic': '#9c27b0',
    'légendaire': '#ffc107', 'legendary': '#ffc107'
  };
  return map[rarity] || '#a0a0a0';
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.modal-content {
  position: relative;
  background: linear-gradient(135deg, rgba(20,20,35,0.95), rgba(30,30,50,0.95));
  border: 2px solid rgba(0, 210, 255, 0.6);
  border-radius: 24px;
  padding: 3rem 2rem;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 0 50px rgba(0, 210, 255, 0.3), inset 0 0 20px rgba(0, 210, 255, 0.1);
  overflow: hidden;
}

/* Light rays effect */
.light-rays {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(from 0deg at 50% 50%, rgba(255, 255, 255, 0) 0%, rgba(0, 210, 255, 0.1) 10%, rgba(255, 255, 255, 0) 20%, rgba(0, 210, 255, 0.1) 30%, rgba(255, 255, 255, 0) 40%, rgba(0, 210, 255, 0.1) 50%, rgba(255, 255, 255, 0) 60%, rgba(0, 210, 255, 0.1) 70%, rgba(255, 255, 255, 0) 80%, rgba(0, 210, 255, 0.1) 90%, rgba(255, 255, 255, 0) 100%);
  animation: spin 30s linear infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.reward-title {
  position: relative;
  z-index: 10;
  color: #fff;
  margin-top: 0;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
  background: linear-gradient(to bottom, #fff, #00d2ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 10px rgba(0, 210, 255, 0.5));
  margin-bottom: 2rem;
}

.card-reward-wrapper {
  margin: 1rem 0 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card-reveal-text {
  color: #FFD700;
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
  text-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
  animation: pulse-text 2s infinite;
}

@keyframes pulse-text {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.card-presentation {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: drop-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
  animation-delay: 0.3s;
}

.card-glow {
  position: absolute;
  width: 120%;
  height: 120%;
  background: radial-gradient(circle, var(--glow-color) 0%, transparent 70%);
  opacity: 0.5;
  filter: blur(20px);
  z-index: -1;
  animation: breathe 3s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

@keyframes drop-in {
  0% { transform: translateY(-50px) scale(0.5); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

.reward-card {
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
}

.reward-grid {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin: 2rem 0;
}

.reward-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0,0,0,0.5);
  padding: 1rem 1.5rem;
  border-radius: 16px;
  min-width: 100px;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
  animation: pop-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.coin-item { animation-delay: 0.6s; border-color: rgba(255, 215, 0, 0.3); }
.gem-item { animation-delay: 0.8s; border-color: rgba(156, 39, 176, 0.3); }

@keyframes pop-up {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.amount {
  font-size: 1.5rem;
  font-weight: 900;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
}

.epic-close-btn {
  position: relative;
  z-index: 10;
  margin-top: 2rem;
  padding: 1rem 3rem;
  font-size: 1.2rem;
  font-weight: 900;
  color: #fff;
  background: linear-gradient(135deg, #00d2ff, #3a7bd5);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 2px;
  box-shadow: 0 10px 20px rgba(0, 210, 255, 0.3), inset 0 -3px 0 rgba(0,0,0,0.2);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
  animation: fade-in-up 0.5s ease both;
  animation-delay: 1s;
}

.epic-close-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 50%; height: 100%;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent);
  transform: skewX(-20deg);
  transition: all 0.5s;
}

.epic-close-btn:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 15px 25px rgba(0, 210, 255, 0.5), inset 0 -3px 0 rgba(0,0,0,0.2);
}

.epic-close-btn:hover::before {
  left: 150%;
  transition: all 0.7s ease-in-out;
}

.epic-close-btn:active {
  transform: translateY(2px) scale(0.95);
  box-shadow: 0 5px 10px rgba(0, 210, 255, 0.3), inset 0 2px 0 rgba(0,0,0,0.2);
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Modal Transition */
.modal-bounce-enter-active,
.modal-bounce-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.modal-bounce-enter-from,
.modal-bounce-leave-to {
  opacity: 0;
}

.modal-bounce-enter-from .modal-content,
.modal-bounce-leave-to .modal-content {
  transform: scale(0.8) translateY(30px);
}
</style>
