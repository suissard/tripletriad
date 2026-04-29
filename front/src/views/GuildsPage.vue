<template>
  <div class="guilds-page">
    <div class="page-header">
      <h1>🛡️ Guildes</h1>
      <p>Rejoignez une guilde ou créez la vôtre pour discuter avec d'autres joueurs.</p>
    </div>

    <div class="guilds-layout">
      <!-- Sidebar : Liste des guildes et création -->
      <div class="guilds-sidebar">
        <div class="sidebar-section">
          <h3>Mes Guildes</h3>
          <div v-if="chatStore.loading && chatStore.guilds.length === 0" class="loading">
            Chargement...
          </div>
          <div v-else-if="chatStore.guilds.length === 0" class="empty-state">
            Vous n'êtes membre d'aucune guilde.
          </div>
          <ul v-else class="guild-list">
            <li 
              v-for="guild in chatStore.guilds" 
              :key="guild.documentId || guild.id"
              class="guild-item"
              :class="{ active: chatStore.activeTargetId === (guild.documentId || guild.id) }"
              @click="selectGuild(guild.documentId || guild.id)"
            >
              <span class="icon">🛡️</span>
              <div class="guild-info">
                <span class="guild-name">{{ guild.name }}</span>
              </div>
            </li>
          </ul>
        </div>

        <div class="sidebar-section search-guilds">
          <h3>Chercher une Guilde</h3>
          <div class="search-form">
            <input v-model="searchQuery" type="text" placeholder="Rechercher..." @input="handleSearch" />
          </div>
          <div v-if="searching" class="loading-small">Recherche...</div>
          <ul v-else class="search-results">
            <li v-for="guild in allAvailableGuilds" :key="guild.documentId || guild.id" class="result-item">
              <div class="result-info">
                <span class="name">{{ guild.name }}</span>
              </div>
              <button v-if="!isMember(guild.documentId || guild.id)" class="btn-join" @click="handleJoinGuild(guild.documentId || guild.id)">
                Rejoindre
              </button>
              <span v-else class="member-tag">Membre</span>
            </li>
          </ul>
        </div>

        <div class="sidebar-section create-guild">
          <h3>Créer une Guilde</h3>
          <div class="form-group">
            <input v-model="newGuildName" type="text" placeholder="Nom de la guilde" />
            <input v-model="newGuildDesc" type="text" placeholder="Description (optionnelle)" />
            <button class="btn-primary" @click="handleCreateGuild" :disabled="!newGuildName || creating">
              {{ creating ? 'Création...' : 'Créer' }}
            </button>
            <p v-if="createError" class="error-msg">{{ createError }}</p>
          </div>
        </div>
      </div>

      <!-- Main Content : Chat de guilde -->
      <div class="guilds-main">
        <div v-if="!chatStore.activeTargetId || chatStore.activeTab !== 'guilds'" class="empty-state-main">
          <h2>Sélectionnez une guilde</h2>
          <p>Choisissez une guilde dans la liste pour voir les messages.</p>
        </div>
        
        <div v-else class="chat-container">
          <div class="chat-header">
            <h2>{{ activeGuildName }}</h2>
            <p class="guild-desc">{{ activeGuildDesc }}</p>
          </div>
          
          <div class="messages-container" ref="messagesContainer">
            <div v-if="chatStore.loading" class="loading-msg">Chargement...</div>
            <template v-else>
              <div v-if="chatStore.activeMessages.length === 0" class="empty-state">
                Aucun message dans cette guilde. Soyez le premier à parler !
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
              placeholder="Écrire un message à la guilde..."
              @keyup.enter="sendMessage"
              :disabled="chatStore.loading"
            />
            <button @click="sendMessage" :disabled="!newMessage.trim() || chatStore.loading">
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '../stores/chatStore.js';
import { useUserStore } from '../stores/userStore.js';
import { gameEvents } from '../game/events.js';

const props = defineProps({
  documentId: {
    type: String,
    default: null
  }
});

const router = useRouter();
const chatStore = useChatStore();
const userStore = useUserStore();

const newGuildName = ref('');
const newGuildDesc = ref('');
const creating = ref(false);
const createError = ref('');

const searchQuery = ref('');
const allAvailableGuilds = ref([]);
const searching = ref(false);

const newMessage = ref('');
const messagesContainer = ref(null);

onMounted(async () => {
  await chatStore.fetchGuilds();
  chatStore.activeTab = 'guilds';
  handleSearch();
  
  // If we have a documentId in the URL, select it
  if (props.documentId) {
    chatStore.selectTarget('guilds', props.documentId);
  }
});

// Watch for URL changes to update active guild
watch(() => props.documentId, (newId) => {
  if (newId && chatStore.activeTargetId !== newId) {
    chatStore.selectTarget('guilds', newId);
  }
});

const handleSearch = async () => {
  searching.value = true;
  try {
    allAvailableGuilds.value = await chatStore.searchGuilds(searchQuery.value);
  } finally {
    searching.value = false;
  }
};

const activeGuild = computed(() => {
  if (!chatStore.activeTargetId || chatStore.activeTab !== 'guilds') return null;
  return chatStore.guilds.find(g => (g.documentId === chatStore.activeTargetId || g.id === chatStore.activeTargetId));
});

const activeGuildName = computed(() => activeGuild.value?.name || 'Guilde Inconnue');
const activeGuildDesc = computed(() => activeGuild.value?.description || '');

const selectGuild = (id) => {
  if (props.documentId !== id) {
    router.push({ name: 'guild-detail', params: { documentId: id } });
  }
  chatStore.selectTarget('guilds', id);
};

const handleJoinGuild = async (guildId) => {
  try {
    await chatStore.joinGuild(guildId);
    gameEvents.emit('SHOW_ALERT', { text: 'Vous avez rejoint la guilde !' });
    handleSearch(); // Refresh list
  } catch (err) {
    gameEvents.emit('SHOW_ALERT', { text: 'Erreur lors de la tentative de rejoindre la guilde.' });
  }
};

const isMember = (guildId) => {
  return chatStore.guilds.some(g => (g.documentId === guildId || g.id === guildId));
};

const handleCreateGuild = async () => {
  if (!newGuildName.value) return;
  creating.value = true;
  createError.value = '';
  try {
    const newGuild = await chatStore.createGuild(newGuildName.value, newGuildDesc.value);
    newGuildName.value = '';
    newGuildDesc.value = '';
    gameEvents.emit('SHOW_ALERT', { text: `Guilde ${newGuild.name} créée avec succès !` });
    selectGuild(newGuild.documentId || newGuild.id);
    handleSearch(); // Refresh global list
  } catch (err) {
    createError.value = 'Erreur lors de la création de la guilde.';
    console.error(err);
  } finally {
    creating.value = false;
  }
};

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
.guilds-page {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-bg, #1a1a2e);
  color: white;
  overflow: hidden;
  font-family: 'Rajdhani', sans-serif;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  color: var(--color-primary);
  margin: 0;
}

.page-header p {
  color: rgba(255, 255, 255, 0.7);
  margin: 5px 0 0 0;
}

.guilds-layout {
  display: flex;
  flex: 1;
  gap: 20px;
  overflow: hidden;
}

.guilds-sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.sidebar-section {
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--color-accent);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 5px;
}

.guild-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.guild-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.05);
}

.guild-item:hover, .guild-item.active {
  background: rgba(255, 255, 255, 0.15);
  border-left: 3px solid var(--color-primary);
}

.create-guild .form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-section input {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 4px;
  outline: none;
  width: 100%;
}

.sidebar-section input:focus {
  border-color: var(--color-primary);
}

.btn-primary {
  background: var(--color-primary);
  color: black;
  border: none;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-results {
  list-style: none;
  padding: 0;
  margin: 10px 0 0 0;
  max-height: 200px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 5px;
  border-radius: 4px;
}

.result-item .name {
  font-size: 0.9rem;
  font-weight: bold;
}

.btn-join {
  background: var(--color-secondary);
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
}

.member-tag {
  font-size: 0.7rem;
  color: var(--color-primary);
  opacity: 0.8;
}

.loading-small {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 5px;
}

.error-msg {
  color: #ff4d4d;
  font-size: 0.8rem;
  margin: 0;
}

/* Chat container */
.guilds-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(10, 15, 25, 0.9);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.empty-state-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.5);
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 15px;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-header h2 {
  margin: 0;
  color: white;
}

.chat-header .guild-desc {
  margin: 5px 0 0 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  align-self: flex-start;
}

.message.is-mine {
  align-self: flex-end;
  align-items: flex-end;
}

.sender {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
  margin-left: 5px;
}

.message.is-mine .sender {
  margin-right: 5px;
  margin-left: 0;
}

.bubble {
  background: rgba(255, 255, 255, 0.1);
  padding: 10px 15px;
  border-radius: 12px;
  border-bottom-left-radius: 2px;
  color: white;
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
  padding: 15px;
  background: rgba(0, 0, 0, 0.4);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.input-container input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 12px;
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
  padding: 0 20px;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-weight: bold;
}

.input-container button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsivité Mobile */
@media (max-width: 768px) {
  .guilds-layout {
    flex-direction: column;
  }
  .guilds-sidebar {
    width: 100%;
    max-height: 250px;
  }
  .guilds-page {
    padding-bottom: 80px; /* Espace pour BottomMobileNav */
  }
}
</style>
