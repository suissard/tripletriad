<template>
  <div class="user-parameters">
    <!-- Main Settings View -->
    <div v-if="!showAvatarSelection" class="settings-form">
      <div class="form-group">
        <label>Pseudonyme</label>
        <input 
          type="text" 
          v-model="username" 
          placeholder="Entrez votre pseudonyme"
          class="glass-input"
        />
      </div>

      <div class="form-group">
        <label>Avatar</label>
        <div class="avatar-preview-container">
          <img :src="userStore.user.avatar" class="avatar-preview" alt="Avatar Current" />
          <AppButton variant="secondary" @click="openAvatarSelection" class="change-avatar-btn">
            Changer d'avatar
          </AppButton>
        </div>
      </div>

      <div class="actions">
        <AppButton 
          variant="primary" 
          @click="saveProfile" 
          :disabled="isSaving || !isValid" 
          class="save-btn"
        >
          {{ isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications' }}
        </AppButton>
        <p v-if="message" :class="['status-message', messageType]">{{ message }}</p>
      </div>
    </div>

    <!-- Avatar Selection View -->
    <div v-else class="avatar-selection">
      <div class="selection-header">
        <AppButton variant="secondary" @click="showAvatarSelection = false" class="back-btn">
          ← Retour
        </AppButton>
        <h3>Choisir une carte</h3>
      </div>
      
      <p class="selection-hint">Sélectionnez une carte de votre collection pour l'utiliser comme avatar.</p>
      
      <div class="cards-grid-container">
        <div v-if="isSaving" class="loading-overlay">
          <div class="spinner"></div>
          <p>Mise à jour de l'avatar...</p>
        </div>
        <TripleTriadCardGrid 
          :cards="ownedCards" 
          cardSize="sm"
          :showOwnNum="false"
          @left-click="selectAvatar"
        />
      </div>
      
      <div v-if="ownedCards.length === 0" class="empty-collection">
        Vous n'avez aucune carte dans votre collection.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUserStore } from '../stores/userStore.js';
import { cardLibrary } from '../game/state.js';
import TripleTriadCardGrid from './TripleTriadCardGrid.vue';

const userStore = useUserStore();

const username = ref(userStore.user.username);
const showAvatarSelection = ref(false);
const isSaving = ref(false);
const message = ref('');
const messageType = ref('info'); // info, success, error

const isValid = computed(() => {
  return username.value && username.value.length >= 3;
});

const ownedCards = computed(() => {
  // Get cards that are in user's collection
  const ownedIds = userStore.collection.map(c => c.cardId);
  return cardLibrary.filter(c => ownedIds.includes(c.id));
});

function openAvatarSelection() {
  showAvatarSelection.value = true;
  message.value = '';
}

async function selectAvatar(card) {
  isSaving.value = true;
  message.value = 'Mise à jour de l\'avatar...';
  
  const result = await userStore.updateProfile({
    avatar_card: card.id // Sending the card ID. Store handles the update.
  });
  
  isSaving.value = false;
  if (result.success) {
    message.value = 'Avatar mis à jour !';
    messageType.value = 'success';
    showAvatarSelection.value = false;
  } else {
    message.value = 'Erreur lors de la mise à jour de l\'avatar.';
    messageType.value = 'error';
  }
}

async function saveProfile() {
  if (!isValid.value) return;
  
  isSaving.value = true;
  message.value = 'Sauvegarde du profil...';
  
  const result = await userStore.updateProfile({
    username: username.value
  });
  
  isSaving.value = false;
  if (result.success) {
    message.value = 'Profil mis à jour avec succès !';
    messageType.value = 'success';
  } else {
    message.value = result.error || 'Erreur lors de la sauvegarde.';
    messageType.value = 'error';
  }
  
  setTimeout(() => {
    message.value = '';
  }, 3000);
}
</script>

<style scoped>
.user-parameters {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 10px;
  color: white;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.form-group label {
  font-weight: bold;
  color: #a855f7;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 0.9rem;
}

.glass-input {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(168, 85, 247, 0.4);
  border-radius: 8px;
  padding: 12px;
  color: white;
  font-family: inherit;
  font-size: 1rem;
  transition: all 0.3s;
}

.glass-input:focus {
  outline: none;
  border-color: #a855f7;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
}

.avatar-preview-container {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid #00d2ff;
  background: #111;
  object-fit: cover;
}

.actions {
  margin-top: 10px;
}

.save-btn {
  width: 100%;
  padding: 15px;
  font-weight: bold;
}

.status-message {
  margin-top: 10px;
  text-align: center;
  font-size: 0.9rem;
}

.status-message.success { color: #4caf50; }
.status-message.error { color: #f44336; }
.status-message.info { color: #00d2ff; }

/* Selection View */
.avatar-selection {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.selection-header {
  display: flex;
  align-items: center;
  gap: 15px;
}

.selection-header h3 {
  margin: 0;
  color: #00d2ff;
}

.selection-hint {
  font-size: 0.85rem;
  color: #ccc;
  margin-bottom: 10px;
}

.cards-grid-container {
  position: relative;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 8px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(168, 85, 247, 0.3);
  border-top: 4px solid #a855f7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Custom scrollbar for cards grid */
.cards-grid-container::-webkit-scrollbar {
  width: 6px;
}
.cards-grid-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}
.cards-grid-container::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.5);
  border-radius: 3px;
}

.empty-collection {
  text-align: center;
  padding: 40px;
  color: #888;
  font-style: italic;
}
</style>
