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
          <p>Choisissez une guilde dans la liste pour voir les messages et les membres.</p>
        </div>
        
        <div v-else class="guild-content-container">
          <div class="chat-header">
            <div class="header-info">
              <h2>{{ activeGuildName }}</h2>
              <p class="guild-desc">{{ activeGuildDesc }}</p>
            </div>
            <div class="guild-tabs">
              <button 
                class="tab-btn" 
                :class="{ active: currentTab === 'chat' }" 
                @click="currentTab = 'chat'"
              >
                <span class="tab-icon">💬</span> Chat
              </button>
              <button 
                class="tab-btn" 
                :class="{ active: currentTab === 'members' }" 
                @click="currentTab = 'members'"
              >
                <span class="tab-icon">👥</span> Membres
              </button>
            </div>
          </div>
          
          <!-- Tab: Chat -->
          <template v-if="currentTab === 'chat'">
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
          </template>

          <!-- Tab: Members -->
          <template v-else>
            <div class="members-view custom-scrollbar">
              <div v-if="!chatStore.activeGuildDetails" class="loading-members">
                Chargement de la liste des membres...
              </div>
              <template v-else>
                <div v-for="(group, roleName) in groupedMembers" :key="roleName" class="member-role-section">
                  <h3 class="role-title" v-if="group.length > 0">
                    {{ roleName }} <span class="count">{{ group.length }}</span>
                  </h3>
                  <div class="members-grid">
                    <div v-for="member in group" :key="member.id" class="member-card">
                      <div class="member-avatar">
                        {{ member.username.charAt(0).toUpperCase() }}
                      </div>
                      <div class="member-info">
                        <span class="member-name">{{ member.username }}</span>
                        <span class="member-role-tag">{{ roleName }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </template>
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

const currentTab = ref('chat');
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

const groupedMembers = computed(() => {
  const details = chatStore.activeGuildDetails;
  if (!details) return {};

  const groups = {
    'Chef de Guilde': [],
    'Modérateurs': [],
    'Membres': []
  };

  if (details.owner) {
    groups['Chef de Guilde'].push(details.owner);
  }

  if (details.moderators && details.moderators.length > 0) {
    groups['Modérateurs'] = details.moderators;
  }

  if (details.members) {
    const specialIds = new Set([
      details.owner?.id,
      ...(details.moderators?.map(m => m.id) || [])
    ]);
    groups['Membres'] = details.members.filter(m => !specialIds.has(m.id));
  }

  return groups;
});

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
  if (currentTab.value === 'chat') {
    scrollToBottom();
  }
});

watch(() => chatStore.activeTargetId, () => {
  if (currentTab.value === 'chat') {
    scrollToBottom();
  }
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
  background: radial-gradient(circle at center, #1a1a2e 0%, #0f0f1a 100%);
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
  font-size: 2.5rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.5);
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
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  padding-right: 5px;
}

/* Scrollbar styles */
.guilds-sidebar::-webkit-scrollbar,
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.guilds-sidebar::-webkit-scrollbar-thumb,
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.guilds-sidebar::-webkit-scrollbar-thumb:hover,
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.sidebar-section {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.sidebar-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--color-primary);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
}

.guild-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.guild-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
}

.guild-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(5px);
}

.guild-item.active {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
  box-shadow: 0 0 15px rgba(var(--color-primary-rgb), 0.1);
}

.guild-item .icon {
  font-size: 1.2rem;
}

.guild-name {
  font-weight: 600;
  font-size: 1rem;
}

.create-guild .form-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-section input {
  padding: 10px 15px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 6px;
  outline: none;
  width: 100%;
  transition: all 0.2s;
}

.sidebar-section input:focus {
  border-color: var(--color-primary);
  background: rgba(0, 0, 0, 0.4);
}

.btn-primary {
  background: var(--color-primary);
  color: black;
  border: none;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.2);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(var(--color-primary-rgb), 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-results {
  list-style: none;
  padding: 0;
  margin: 10px 0 0 0;
  max-height: 250px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.btn-join {
  background: var(--color-secondary);
  color: white;
  border: none;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-join:hover {
  filter: brightness(1.2);
}

.member-tag {
  font-size: 0.75rem;
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
}

/* Main Content Area */
.guilds-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(10, 15, 25, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.empty-state-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  padding: 40px;
}

.empty-state-main h2 {
  font-size: 2rem;
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.6);
}

.guild-content-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 20px;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info h2 {
  margin: 0;
  font-size: 1.8rem;
  color: white;
}

.header-info .guild-desc {
  margin: 4px 0 0 0;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.5);
}

.guild-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
  border-radius: 8px;
  gap: 4px;
}

.tab-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

/* Messages */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 75%;
  align-self: flex-start;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.is-mine {
  align-self: flex-end;
  align-items: flex-end;
}

.sender {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 4px;
  font-weight: 600;
}

.bubble {
  background: rgba(255, 255, 255, 0.07);
  padding: 12px 18px;
  border-radius: 16px;
  border-bottom-left-radius: 2px;
  color: white;
  line-height: 1.4;
  font-family: 'Inter', sans-serif;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.message.is-mine .bubble {
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.2) 0%, rgba(var(--color-primary-rgb), 0.1) 100%);
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 2px;
}

.input-container {
  display: flex;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  gap: 10px;
}

.input-container input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 14px 20px;
  border-radius: 30px;
  color: white;
  outline: none;
  transition: all 0.2s;
}

.input-container input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--color-primary);
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.2);
}

.input-container button {
  background: var(--color-primary);
  color: black;
  border: none;
  padding: 0 25px;
  border-radius: 30px;
  cursor: pointer;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s;
}

.input-container button:hover:not(:disabled) {
  filter: brightness(1.2);
  transform: scale(1.05);
}

/* Members View */
.members-view {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
}

.member-role-section {
  margin-bottom: 40px;
}

.role-title {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.1), transparent);
}

.role-title .count {
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 10px;
  color: var(--color-primary);
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.member-card {
  background: rgba(255, 255, 255, 0.03);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.3s;
}

.member-card:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.2);
}

.member-avatar {
  width: 40px;
  height: 40px;
  background: var(--color-primary);
  color: black;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.3);
}

.member-info {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-weight: 600;
  font-size: 1rem;
}

.member-role-tag {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}

/* Responsiveness */
@media (max-width: 768px) {
  .guilds-layout {
    flex-direction: column;
  }
  .guilds-sidebar {
    width: 100%;
    max-height: 300px;
  }
  .page-header h1 {
    font-size: 1.8rem;
  }
  .chat-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  .guild-tabs {
    width: 100%;
  }
  .tab-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>

