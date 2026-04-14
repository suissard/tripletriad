<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content glass-panel">
      <h2>RECOMPENSE HEBDOMADAIRE</h2>

      <div v-if="reward" class="reward-container">
        <div class="reward-grid">
          <div v-if="reward.coins > 0" class="reward-item">
            <span class="icon">🪙</span>
            <span class="amount">+{{ reward.coins }}</span>
          </div>
          <div v-if="reward.gems > 0" class="reward-item">
            <span class="icon">💎</span>
            <span class="amount">+{{ reward.gems }}</span>
          </div>
        </div>

        <div v-if="reward.card" class="card-reward">
          <h3>Nouvelle carte !</h3>
          <p>{{ reward.card.name }} ({{ reward.card.rarityName || reward.card.rarity || 'Commun' }})</p>
        </div>
      </div>
      <div v-else>
        <p>Erreur lors de la récupération de la récompense.</p>
      </div>

      <AppButton @click="close">Fermer</AppButton>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AppButton from './ui/AppButton.vue';

const props = defineProps({
  isOpen: Boolean,
  reward: Object
});

const emit = defineEmits(['close']);

function close() {
  emit('close');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: linear-gradient(135deg, rgba(20,20,35,0.95), rgba(30,30,50,0.95));
  border: 1px solid rgba(0, 210, 255, 0.4);
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 0 30px rgba(0, 210, 255, 0.2);
}

h2 {
  color: #00d2ff;
  margin-top: 0;
  letter-spacing: 1px;
}

.reward-grid {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin: 2rem 0;
}

.reward-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0,0,0,0.3);
  padding: 1rem;
  border-radius: 12px;
  min-width: 80px;
}

.icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.amount {
  font-size: 1.2rem;
  font-weight: bold;
  color: #fff;
}

.card-reward {
  margin: 1.5rem 0;
  padding: 1rem;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 8px;
}
</style>
