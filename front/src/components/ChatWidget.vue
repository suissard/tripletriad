<template>
  <div class="chat-widget" :class="{ 'is-open': chatStore.widgetOpen }">
    <!-- Header -->
    <div class="chat-header" @click="chatStore.toggleWidget">
      <div class="header-title">
        <span class="icon">👥</span>
        <span>Social & Messages</span>
      </div>
      <div class="header-actions">
        <span class="toggle-icon">{{ chatStore.widgetOpen ? '▼' : '▲' }}</span>
      </div>
    </div>

    <!-- Body -->
    <div v-if="chatStore.widgetOpen" class="chat-body">

      <!-- List View (Selection & Social Management) -->
      <div v-if="!chatStore.activeTargetId" class="chat-list-view">
        <div class="tabs">
          <button
            :class="{ active: socialTab === 'friends' }"
            @click="socialTab = 'friends'"
          >Amis</button>
          <button
            :class="{ active: socialTab === 'requests' }"
            @click="socialTab = 'requests'"
          >
            Demandes <span v-if="friendStore.pendingIncomingRequests.length" class="badge">{{ friendStore.pendingIncomingRequests.length }}</span>
          </button>
          <button
            :class="{ active: socialTab === 'add' }"
            @click="socialTab = 'add'"
          >Ajouter</button>
        </div>

        <div class="list-content">
          <!-- Friends List -->
          <template v-if="socialTab === 'friends'">
            <div v-if="friendStore.acceptedFriends.length === 0" class="empty-state">
              Vous n'avez pas encore d'amis.
            </div>
            <div
              v-for="friend in friendStore.acceptedFriends"
              :key="friend.id"
              class="list-item"
            >
              <div class="item-content" @click="chatStore.selectTarget('friends', friend.documentId || friend.id)">
                <img :src="getAvatarUrl(friend)" class="avatar" alt="Avatar" />
                <span>{{ friend.username }}</span>
              </div>
              <div class="actions">
                <button @click.stop="removeFriend(friend.friendshipId)" title="Supprimer l'ami" class="icon-btn">❌</button>
                <button @click.stop="blockUser(friend.id)" title="Bloquer" class="icon-btn">🚫</button>
              </div>
            </div>
          </template>

          <!-- Requests -->
          <template v-if="socialTab === 'requests'">
            <h4>Reçues</h4>
            <div v-if="friendStore.pendingIncomingRequests.length === 0" class="empty-state mb-2">
              Aucune demande reçue.
            </div>
            <div v-for="req in friendStore.pendingIncomingRequests" :key="req.id" class="list-item request-item">
              <span>{{ req.requester.username }}</span>
              <div class="actions">
                <button @click="acceptRequest(req.documentId || req.id)" title="Accepter" class="icon-btn">✔️</button>
                <button @click="rejectRequest(req.documentId || req.id)" title="Refuser" class="icon-btn">❌</button>
              </div>
            </div>

            <h4>Envoyées</h4>
            <div v-if="friendStore.pendingOutgoingRequests.length === 0" class="empty-state">
              Aucune demande envoyée.
            </div>
            <div v-for="req in friendStore.pendingOutgoingRequests" :key="req.id" class="list-item request-item">
              <span>{{ req.receiver.username }}</span>
              <div class="actions">
                <span class="text-xs italic">En attente...</span>
              </div>
            </div>
          </template>

          <!-- Add Friend -->
          <template v-if="socialTab === 'add'">
            <p class="text-sm mb-2 text-white p-2">Ajoutez un ami par Username, Email ou ID.</p>
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
            <p v-if="friendStore.error" class="error-msg text-xs mt-2 p-2">{{ friendStore.error }}</p>
          </template>
        </div>
      </div>

      <!-- Conversation View -->
      <div v-else class="chat-conversation-view">
        <div class="convo-header">
          <button class="back-btn" @click="chatStore.activeTargetId = null">◀ Retour</button>
          <div class="convo-user-info">
            <template v-if="activeTargetAvatar">
              <img v-if="activeTargetAvatar.startsWith('http')" :src="activeTargetAvatar" class="convo-avatar" alt="Avatar" />
              <span v-else class="convo-avatar-emoji">{{ activeTargetAvatar }}</span>
            </template>
            <span class="convo-title">{{ activeTargetName }}</span>
          </div>
        </div>

        <div class="messages-container" ref="messagesContainer">
          <div v-if="chatStore.loading" class="loading-msg">Chargement...</div>
          <template v-else>
            <div v-if="chatStore.activeMessages.length === 0" class="empty-state">
              Aucun message. Commencez la discussion !
            </div>
            <div
              v-for="(msg, index) in chatStore.activeMessages"
              :key="msg.id"
              class="message-wrapper"
              :class="{ 
                'is-mine': msg.sender?.id === userStore.user?.id,
                'consecutive': index > 0 && chatStore.activeMessages[index-1].sender?.id === msg.sender?.id 
              }"
            >
              <img 
                v-if="index === 0 || chatStore.activeMessages[index-1].sender?.id !== msg.sender?.id"
                :src="getAvatarUrl(msg.sender)" 
                class="message-avatar" 
                alt="Avatar" 
              />
              <div v-else class="avatar-spacer"></div>

              <div class="message">
                <span 
                  v-if="index === 0 || chatStore.activeMessages[index-1].sender?.id !== msg.sender?.id"
                  class="sender" 
                  :style="{ color: getUserColor(msg.sender?.documentId || msg.sender?.id) }"
                >
                  {{ msg.sender?.username || 'Inconnu' }}
                </span>
                <div class="bubble">{{ msg.content }}</div>
              </div>
            </div>
          </template>
        </div>

        <div class="input-container">
          <input
            type="text"
            v-model="newMessage"
            placeholder="Écrire un message..."
            @keyup.enter="sendMessage"
            :disabled="chatStore.loading"
          />
          <button @click="sendMessage" :disabled="!newMessage.trim() || chatStore.loading">Envoyer</button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useChatStore } from '../stores/chatStore.js';
import { useFriendStore } from '../stores/friendStore.js';
import { useUserStore } from '../stores/userStore.js';
import { gameEvents } from '../game/events.js';
import { getStrapiMediaUrl } from '../utils/url.js';

const getUserColor = (userId) => {
  if (!userId) return 'white';
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#F1C40F',
    '#1ABC9C', '#E74C3C', '#2ECC71', '#8E44AD', '#34495E',
    '#16A085', '#27AE60', '#2980B9', '#D35400', '#C0392B'
  ];
  let hash = 0;
  const strId = String(userId);
  for (let i = 0; i < strId.length; i++) {
    hash = strId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getAvatarUrl = (user) => {
  if (user?.avatar_card?.image?.url) {
    return getStrapiMediaUrl(user.avatar_card.image.url);
  }
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${user?.username || 'player'}&backgroundColor=transparent`;
};

const chatStore = useChatStore();
const friendStore = useFriendStore();
const userStore = useUserStore();

const newMessage = ref('');
const messagesContainer = ref(null);
const socialTab = ref('friends');
const addIdentifier = ref('');

onMounted(() => {
  if (userStore.isLoggedIn) {
     friendStore.fetchFriendships();
  }
});

watch(() => chatStore.widgetOpen, (isOpen) => {
  if (isOpen && userStore.isLoggedIn) {
    friendStore.fetchFriendships();
    chatStore.activeTab = 'friends'; // Force chat mode to friends
  }
});

const activeTargetName = computed(() => {
  if (!chatStore.activeTargetId) return '';
  if (chatStore.activeTab === 'guilds') {
    const guild = chatStore.guilds.find(g => (g.documentId === chatStore.activeTargetId || g.id === chatStore.activeTargetId));
    return guild ? guild.name : 'Guilde';
  }
  const friend = friendStore.acceptedFriends.find(f => (f.documentId === chatStore.activeTargetId || f.id === chatStore.activeTargetId));
  return friend ? friend.username : 'Ami';
});

const activeTargetAvatar = computed(() => {
  if (!chatStore.activeTargetId) return null;
  if (chatStore.activeTab === 'guilds') {
    return '📜'; // Default emoji for guilds
  }
  const friend = friendStore.acceptedFriends.find(f => (f.documentId === chatStore.activeTargetId || f.id === chatStore.activeTargetId));
  return friend ? getAvatarUrl(friend) : null;
});

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch(() => chatStore.activeMessages.length, () => {
  scrollToBottom();
});

watch(() => chatStore.activeTargetId, () => {
  scrollToBottom();
});

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  await chatStore.sendMessage(newMessage.value);
  newMessage.value = '';
  scrollToBottom();
};

// --- Social Management Methods ---
const sendRequest = async () => {
  if (!addIdentifier.value) return;
  try {
    await friendStore.sendFriendRequest(addIdentifier.value);
    gameEvents.emit('SHOW_ALERT', { text: `Demande envoyée à ${addIdentifier.value} !` });
    addIdentifier.value = '';
    socialTab.value = 'requests'; 
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
.chat-widget {
  position: fixed;
  bottom: 0;
  right: 20px;
  width: 320px;
  background: rgba(15, 20, 35, 0.95);
  border: 1px solid var(--color-primary);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  font-family: 'Rajdhani', sans-serif;
}

.chat-header {
  padding: 10px 15px;
  background: rgba(0, 0, 0, 0.6);
  border-bottom: 1px solid rgba(255, 191, 0, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-accent);
  font-weight: bold;
}

.chat-body {
  height: 400px;
  display: flex;
  flex-direction: column;
  background: rgba(10, 15, 25, 0.9);
}

/* List View */
.tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tabs button {
  flex: 1;
  background: none;
  border: none;
  color: white;
  padding: 10px;
  cursor: pointer;
  font-family: 'Rajdhani', sans-serif;
  opacity: 0.6;
  transition: all 0.2s;
  position: relative;
}

.tabs button.active {
  opacity: 1;
  border-bottom: 2px solid var(--color-primary);
  color: var(--color-primary);
}

.badge {
  background: red;
  color: white;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 0.7rem;
  margin-left: 5px;
  position: absolute;
  top: 5px;
  right: 5px;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 4px;
  transition: background 0.2s;
  color: white;
  margin-bottom: 4px;
}

.list-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.item-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  cursor: pointer;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-secondary);
  border: 1px solid var(--color-primary);
  object-fit: cover;
}

.actions {
  display: flex;
  gap: 5px;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 2px 5px;
  color: white;
  opacity: 0.7;
}

.icon-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

h4 {
  color: var(--color-primary);
  margin: 10px 5px 5px;
  font-size: 0.9rem;
}

/* Add Friend Form */
.add-friend-form {
  display: flex;
  gap: 10px;
  padding: 0 10px;
}

.friend-input {
  flex: 1;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 4px;
}

.btn-primary {
  background: var(--color-primary);
  border: none;
  color: black;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  color: #ff4d4d;
}

.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.85rem; }
.italic { font-style: italic; }
.mb-2 { margin-bottom: 0.5rem; }
.mt-2 { margin-top: 0.5rem; }

/* Conversation View */
.chat-conversation-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.convo-header {
  display: flex;
  align-items: center;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  gap: 10px;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.9rem;
}

.convo-title {
  color: white;
  font-weight: bold;
}

.convo-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.convo-avatar, .convo-avatar-emoji {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--color-primary);
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.convo-avatar-emoji {
  font-size: 1.2rem;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-wrapper {
  display: flex;
  gap: 8px;
  max-width: 85%;
  align-self: flex-start;
}

.message-wrapper.is-mine {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-wrapper.consecutive {
  gap: 8px;
  margin-top: -8px;
}

.avatar-spacer {
  width: 32px;
  flex-shrink: 0;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.5);
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 5px;
}

.message {
  display: flex;
  flex-direction: column;
}

.message-wrapper.is-mine .message {
  align-items: flex-end;
}

.sender {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2px;
  margin-left: 4px;
}

.message-wrapper.is-mine .sender {
  margin-right: 4px;
  margin-left: 0;
}

.bubble {
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 12px;
  border-bottom-left-radius: 2px;
  color: white;
  font-size: 0.9rem;
  word-break: break-word;
  font-family: 'Space Mono', monospace;
}

.message.is-mine .bubble {
  background: rgba(0, 51, 255, 0.4);
  border: 1px solid var(--color-secondary);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 2px;
}

.input-container {
  display: flex;
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.4);
}

.input-container input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 12px;
  border-radius: 4px 0 0 4px;
  color: white;
  outline: none;
  font-family: 'Space Mono', monospace;
}

.input-container input:focus {
  border-color: var(--color-primary);
}

.input-container button {
  background: var(--color-primary);
  color: black;
  border: none;
  padding: 0 15px;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-weight: bold;
}

.input-container button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-msg {
  text-align: center;
  color: var(--color-primary);
  padding: 20px;
}
</style>
