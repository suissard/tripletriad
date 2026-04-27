<template>
  <div class="chat-widget" :class="{ 'is-open': chatStore.widgetOpen }">
    <!-- Header -->
    <div class="chat-header" @click="chatStore.toggleWidget">
      <div class="header-title">
        <span class="icon">💬</span>
        <span>Messagerie</span>
      </div>
      <div class="header-actions">
        <span class="toggle-icon">{{ chatStore.widgetOpen ? '▼' : '▲' }}</span>
      </div>
    </div>

    <!-- Body -->
    <div v-if="chatStore.widgetOpen" class="chat-body">

      <!-- List View (Selection) -->
      <div v-if="!chatStore.activeTargetId" class="chat-list-view">
        <div class="tabs">
          <button
            :class="{ active: chatStore.activeTab === 'friends' }"
            @click="chatStore.activeTab = 'friends'"
          >Amis</button>
          <button
            :class="{ active: chatStore.activeTab === 'guilds' }"
            @click="chatStore.activeTab = 'guilds'"
          >Guildes</button>
        </div>

        <div class="list-content">
          <!-- Friends List -->
          <template v-if="chatStore.activeTab === 'friends'">
            <div v-if="friendStore.acceptedFriends.length === 0" class="empty-state">
              Aucun ami en ligne.
            </div>
            <div
              v-for="friend in friendStore.acceptedFriends"
              :key="friend.id"
              class="list-item"
              @click="chatStore.selectTarget('friends', friend.id)"
            >
              <div class="avatar"></div>
              <span>{{ friend.username }}</span>
            </div>
          </template>

          <!-- Guilds List -->
          <template v-if="chatStore.activeTab === 'guilds'">
            <div v-if="chatStore.guilds.length === 0" class="empty-state">
              Aucune guilde disponible.
            </div>
            <div
              v-for="guild in chatStore.guilds"
              :key="guild.documentId || guild.id"
              class="list-item guild-item"
              @click="chatStore.selectTarget('guilds', guild.documentId || guild.id)"
            >
              <span class="icon">🛡️</span>
              <div class="guild-info">
                <span class="guild-name">{{ guild.name }}</span>
                <span class="guild-desc">{{ guild.description }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Conversation View -->
      <div v-else class="chat-conversation-view">
        <div class="convo-header">
          <button class="back-btn" @click="chatStore.activeTargetId = null">◀ Retour</button>
          <span class="convo-title">{{ activeTargetName }}</span>
        </div>

        <div class="messages-container" ref="messagesContainer">
          <div v-if="chatStore.loading" class="loading-msg">Chargement...</div>
          <template v-else>
            <div v-if="chatStore.activeMessages.length === 0" class="empty-state">
              Aucun message. Commencez la discussion !
            </div>
            <div
              v-for="msg in chatStore.activeMessages"
              :key="msg.id"
              class="message"
              :class="{ 'is-mine': msg.sender?.id === userStore.user?.id }"
            >
              <span class="sender">{{ msg.sender?.username || 'Inconnu' }}</span>
              <div class="bubble">{{ msg.content }}</div>
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

const chatStore = useChatStore();
const friendStore = useFriendStore();
const userStore = useUserStore();

const newMessage = ref('');
const messagesContainer = ref(null);

onMounted(() => {
  if (userStore.isLoggedIn) {
     friendStore.fetchFriendships();
  }
});

const activeTargetName = computed(() => {
  if (!chatStore.activeTargetId) return '';
  if (chatStore.activeTab === 'friends') {
    const friend = friendStore.acceptedFriends.find(f => f.id === chatStore.activeTargetId);
    return friend ? friend.username : 'Ami';
  } else {
    const guild = chatStore.guilds.find(g => (g.documentId === chatStore.activeTargetId || g.id === chatStore.activeTargetId));
    return guild ? guild.name : 'Guilde';
  }
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
  font-family: 'Rajdhani', sans-serif;
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
}

.tabs button.active {
  opacity: 1;
  border-bottom: 2px solid var(--color-primary);
  color: var(--color-primary);
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  color: white;
}

.list-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-secondary);
  border: 1px solid var(--color-primary);
}

.guild-info {
  display: flex;
  flex-direction: column;
}

.guild-name {
  font-weight: bold;
  color: var(--color-primary);
}

.guild-desc {
  font-size: 0.8rem;
  opacity: 0.7;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

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

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 80%;
  align-self: flex-start;
}

.message.is-mine {
  align-self: flex-end;
  align-items: flex-end;
}

.sender {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2px;
  margin-left: 4px;
}

.message.is-mine .sender {
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
