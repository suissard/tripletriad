<template>
  <div class="friends-panel" :class="{ 'is-open': isOpen }">
    <div class="friends-panel-header" @click="togglePanel">
      <h3>👥 Amis ({{ friendStore.acceptedFriends.length }})</h3>
      <span class="toggle-icon">{{ isOpen ? '▼' : '▲' }}</span>
    </div>

    <div class="friends-panel-content" v-if="isOpen">
      <!-- Tabs -->
      <div class="friends-tabs">
        <button :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">Liste</button>
        <button :class="{ active: activeTab === 'requests' }" @click="activeTab = 'requests'">
          Demandes <span v-if="friendStore.pendingIncomingRequests.length" class="badge">{{ friendStore.pendingIncomingRequests.length }}</span>
        </button>
        <button :class="{ active: activeTab === 'add' }" @click="activeTab = 'add'">Ajouter</button>
      </div>

      <!-- Add Friend -->
      <div v-if="activeTab === 'add'" class="tab-content">
        <p class="text-sm mb-2">Ajoutez un ami par Username, Email ou ID.</p>
        <div class="add-friend-form">
          <input
            v-model="addIdentifier"
            type="text"
            placeholder="Username..."
            class="friend-input"
            @keyup.enter="sendRequest"
          />
          <button @click="sendRequest" :disabled="friendStore.loading || !addIdentifier" class="btn-primary">
            Envoyer
          </button>
        </div>
        <p v-if="friendStore.error" class="error-msg text-xs mt-2">{{ friendStore.error }}</p>
      </div>

      <!-- Friend List -->
      <div v-if="activeTab === 'list'" class="tab-content">
        <div v-if="friendStore.acceptedFriends.length === 0" class="empty-state">
          Vous n'avez pas encore d'amis.
        </div>
        <ul class="friend-list">
          <li v-for="friend in friendStore.acceptedFriends" :key="friend.id" class="friend-item">
            <span>{{ friend.username }}</span>
            <div class="actions">
              <button @click="removeFriend(friend.friendshipId)" title="Supprimer l'ami" class="icon-btn">❌</button>
              <button @click="blockUser(friend.id)" title="Bloquer" class="icon-btn">🚫</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Requests -->
      <div v-if="activeTab === 'requests'" class="tab-content">
        <h4>Reçues</h4>
        <div v-if="friendStore.pendingIncomingRequests.length === 0" class="empty-state mb-2">
          Aucune demande reçue.
        </div>
        <ul class="friend-list mb-2">
          <li v-for="req in friendStore.pendingIncomingRequests" :key="req.id" class="friend-item">
            <span>{{ req.requester.username }}</span>
            <div class="actions">
              <button @click="acceptRequest(req.documentId || req.id)" title="Accepter" class="icon-btn">✔️</button>
              <button @click="rejectRequest(req.documentId || req.id)" title="Refuser" class="icon-btn">❌</button>
            </div>
          </li>
        </ul>

        <h4>Envoyées</h4>
        <div v-if="friendStore.pendingOutgoingRequests.length === 0" class="empty-state">
          Aucune demande envoyée.
        </div>
        <ul class="friend-list">
          <li v-for="req in friendStore.pendingOutgoingRequests" :key="req.id" class="friend-item">
            <span>{{ req.receiver.username }}</span>
            <div class="actions">
              <span class="text-xs italic">En attente...</span>
            </div>
          </li>
        </ul>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFriendStore } from '../../stores/friendStore.js';
import { gameEvents } from '../../game/events.js';

const friendStore = useFriendStore();
const isOpen = ref(false);
const activeTab = ref('list');
const addIdentifier = ref('');

onMounted(() => {
  friendStore.fetchFriendships();
});

const togglePanel = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    friendStore.fetchFriendships(); // refresh data on open
  }
};

const sendRequest = async () => {
  if (!addIdentifier.value) return;
  try {
    await friendStore.sendFriendRequest(addIdentifier.value);
    gameEvents.emit('SHOW_ALERT', { text: `Demande envoyée à ${addIdentifier.value} !` });
    addIdentifier.value = '';
    activeTab.value = 'requests'; // Switch tab to see outgoing
  } catch (e) {
    gameEvents.emit('SHOW_ALERT', { text: 'Erreur: ' + friendStore.error });
  }
};

const acceptRequest = async (id) => {
  try {
    await friendStore.acceptRequest(id);
    gameEvents.emit('SHOW_ALERT', { text: 'Demande acceptée !' });
  } catch (e) {
     gameEvents.emit('SHOW_ALERT', { text: 'Erreur lors de l\'acceptation.' });
  }
};

const rejectRequest = async (id) => {
  try {
    await friendStore.rejectRequest(id);
    gameEvents.emit('SHOW_ALERT', { text: 'Demande refusée.' });
  } catch (e) {
     gameEvents.emit('SHOW_ALERT', { text: 'Erreur lors du refus.' });
  }
};

const removeFriend = async (id) => {
  if (!confirm("Voulez-vous vraiment retirer cet ami ?")) return;
  try {
    await friendStore.removeFriend(id);
    gameEvents.emit('SHOW_ALERT', { text: 'Ami supprimé.' });
  } catch (e) {
     gameEvents.emit('SHOW_ALERT', { text: 'Erreur lors de la suppression.' });
  }
};

const blockUser = async (userId) => {
  if (!confirm("Voulez-vous vraiment bloquer cet utilisateur ?")) return;
  try {
    await friendStore.blockUser(userId);
    gameEvents.emit('SHOW_ALERT', { text: 'Utilisateur bloqué.' });
  } catch (e) {
     gameEvents.emit('SHOW_ALERT', { text: 'Erreur lors du blocage.' });
  }
};

</script>

<style scoped>
.friends-panel {
  position: fixed;
  bottom: 0;
  right: 20px;
  width: 300px;
  background: var(--surface-bg, #1a1a2e);
  border: 1px solid var(--border-color, #4a4e69);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  font-family: 'Space Mono', monospace;
  color: #fff;
}

.friends-panel-header {
  padding: 10px 15px;
  background: var(--header-bg, #16213e);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px 8px 0 0;
}

.friends-panel-header h3 {
  margin: 0;
  font-size: 1rem;
}

.friends-panel-content {
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
  border-top: 1px solid var(--border-color, #4a4e69);
}

.friends-tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 15px;
}

.friends-tabs button {
  flex: 1;
  background: transparent;
  border: 1px solid var(--border-color, #4a4e69);
  color: #fff;
  padding: 5px;
  cursor: pointer;
  border-radius: 4px;
}

.friends-tabs button.active {
  background: var(--primary-color, #e94560);
  border-color: var(--primary-color, #e94560);
}

.badge {
  background: red;
  color: white;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 0.7rem;
  margin-left: 5px;
}

.add-friend-form {
  display: flex;
  gap: 10px;
}

.friend-input {
  flex: 1;
  padding: 8px;
  background: #0f3460;
  border: 1px solid #4a4e69;
  color: white;
  border-radius: 4px;
}

.btn-primary {
  background: var(--primary-color, #e94560);
  border: none;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.friend-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.friend-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: rgba(255,255,255,0.05);
  margin-bottom: 5px;
  border-radius: 4px;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 2px 5px;
}
.icon-btn:hover {
  transform: scale(1.1);
}

.empty-state {
  text-align: center;
  color: #aaa;
  font-size: 0.9rem;
  padding: 10px;
}

.error-msg {
  color: #ff4d4d;
}

.mb-2 { margin-bottom: 0.5rem; }
.mt-2 { margin-top: 0.5rem; }
.text-sm { font-size: 0.85rem; }
.text-xs { font-size: 0.75rem; }
.italic { font-style: italic; }

</style>
