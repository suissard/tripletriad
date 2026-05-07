<template>
  <div class="friends-view custom-scrollbar">
    <div class="friends-container">
      <header class="view-header">
        <h1>Social & Contacts</h1>
        <p class="subtitle">Gérez vos relations et trouvez de nouveaux adversaires</p>
      </header>

      <nav class="view-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: currentTab === tab.id }"
          @click="currentTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
          <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
        </button>
      </nav>

      <main class="tab-content">
        <!-- Friends List -->
        <transition name="fade-slide" mode="out-in">
          <div v-if="currentTab === 'friends'" class="friends-list" key="friends">
            <div v-if="friendStore.loading" class="loading-state">
              <div class="loader"></div>
            </div>
            <div v-else-if="friendStore.acceptedFriends.length === 0" class="empty-state">
              <div class="empty-icon">📭</div>
              <h3>Aucun ami pour le moment</h3>
              <p>Commencez à explorer le monde de Terra Nullius pour rencontrer d'autres joueurs !</p>
              <AppButton variant="primary" class="mt-4" @click="currentTab = 'add'">Ajouter un ami</AppButton>
            </div>
            <div v-else class="grid-list">
              <AppCard v-for="friend in friendStore.acceptedFriends" :key="friend.id" class="friend-card" :padding="false">
                <div class="card-inner">
                  <div class="friend-info" @click="goToProfile(friend.username)">
                    <img :src="getAvatarUrl(friend)" class="friend-avatar" alt="Avatar" />
                    <div class="friend-details">
                      <span class="friend-name">{{ friend.username }}</span>
                      <span class="friend-status online">En ligne</span>
                    </div>
                  </div>
                  <div class="friend-actions">
                    <AppButton variant="secondary" class="action-btn" @click="openChat(friend)" title="Envoyer un message">💬</AppButton>
                    <AppButton variant="accent" class="action-btn" @click="challengeDuel(friend)" title="Défier en duel">⚔️</AppButton>
                    <AppButton variant="ghost" class="action-btn remove" @click="removeFriend(friend.friendshipId)" title="Retirer des amis">❌</AppButton>
                  </div>
                </div>
              </AppCard>
            </div>
          </div>

          <!-- Requests -->
          <div v-else-if="currentTab === 'requests'" class="requests-view" key="requests">
            <!-- Incoming -->
            <section class="request-section">
              <h2 class="section-title">Demandes reçues</h2>
              <div v-if="friendStore.pendingIncomingRequests.length === 0" class="empty-mini">
                <p>Aucune demande en attente.</p>
              </div>
              <div v-else class="request-grid">
                <AppCard v-for="req in friendStore.pendingIncomingRequests" :key="req.id" class="request-card" :padding="true">
                  <div class="req-content">
                    <div class="req-user" @click="goToProfile(req.requester.username)">
                      <img :src="getAvatarUrl(req.requester)" class="req-avatar" alt="Avatar" />
                      <span class="req-name">{{ req.requester.username }}</span>
                    </div>
                    <div class="req-actions">
                      <AppButton variant="primary" @click="acceptRequest(req.documentId || req.id)" fullWidth>Accepter</AppButton>
                      <AppButton variant="secondary" @click="rejectRequest(req.documentId || req.id)" fullWidth>Refuser</AppButton>
                    </div>
                  </div>
                </AppCard>
              </div>
            </section>

            <!-- Outgoing -->
            <section class="request-section mt-8">
              <h2 class="section-title">Demandes envoyées</h2>
              <div v-if="friendStore.pendingOutgoingRequests.length === 0" class="empty-mini">
                <p>Aucune demande envoyée.</p>
              </div>
              <div v-else class="request-grid">
                <AppCard v-for="req in friendStore.pendingOutgoingRequests" :key="req.id" class="request-card outgoing" :padding="true">
                  <div class="req-content">
                    <div class="req-user" @click="goToProfile(req.receiver.username)">
                      <img :src="getAvatarUrl(req.receiver)" class="req-avatar" alt="Avatar" />
                      <span class="req-name">{{ req.receiver.username }}</span>
                    </div>
                    <div class="req-actions">
                      <span class="pending-label">En attente...</span>
                      <AppButton variant="ghost" class="btn-cancel" @click="cancelRequest(req.documentId || req.id)">Annuler</AppButton>
                    </div>
                  </div>
                </AppCard>
              </div>
            </section>
          </div>

          <!-- Add Friend -->
          <div v-else-if="currentTab === 'add'" class="add-view" key="add">
            <AppCard class="search-box" variant="secondary">
              <template #header>
                <h3 class="m-0">Chercher un joueur</h3>
              </template>
              <p>Entrez le nom d'utilisateur ou l'email du joueur que vous souhaitez ajouter.</p>
              <div class="search-input-group">
                <input 
                  v-model="searchIdentifier" 
                  type="text" 
                  placeholder="Nom d'utilisateur, Email..." 
                  class="search-input"
                  @keyup.enter="sendRequest"
                />
                <AppButton variant="primary" @click="sendRequest" :loading="friendStore.loading" :disabled="!searchIdentifier">
                  Envoyer
                </AppButton>
              </div>
              <p v-if="friendStore.error" class="error-msg mt-2">{{ friendStore.error }}</p>
            </AppCard>

            <div class="suggestions-box mt-8">
              <h3 class="section-title">Exploration</h3>
              <AppCard class="empty-state">
                <p>Explorez les guildes pour trouver de nouveaux amis !</p>
                <AppButton variant="secondary" class="mt-4" @click="router.push('/guilds')">Voir les guildes</AppButton>
              </AppCard>
            </div>
          </div>
        </transition>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFriendStore } from '../stores/friendStore.js';
import { useChatStore } from '../stores/chatStore.js';
import { useUserStore } from '../stores/userStore.js';
import { getStrapiMediaUrl } from '../utils/url.js';
import { gameEvents } from '../game/events.js';

const router = useRouter();
const friendStore = useFriendStore();
const chatStore = useChatStore();
const userStore = useUserStore();

const currentTab = ref('friends');
const searchIdentifier = ref('');

const tabs = computed(() => [
  { id: 'friends', label: 'Mes Amis', icon: '🤝', badge: friendStore.acceptedFriends.length },
  { id: 'requests', label: 'Demandes', icon: '📩', badge: friendStore.pendingIncomingRequests.length },
  { id: 'add', label: 'Ajouter', icon: '➕' }
]);

onMounted(() => {
  if (userStore.isLoggedIn) {
    friendStore.fetchFriendships();
  }
});

const getAvatarUrl = (user) => {
  if (user?.avatar_card?.image?.url) {
    return getStrapiMediaUrl(user.avatar_card.image.url);
  }
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${user?.username || 'player'}&backgroundColor=transparent`;
};

const goToProfile = (username) => {
  router.push(`/profile/${username}`);
};

const openChat = (friend) => {
  chatStore.selectTarget('friends', friend.documentId || friend.id);
  chatStore.widgetOpen = true;
};

const challengeDuel = (friend) => {
  gameEvents.emit('SHOW_ALERT', { text: `Défi envoyé à ${friend.username} ! (Bientôt disponible)` });
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

const cancelRequest = async (id) => {
  try {
    await friendStore.removeFriend(id); // Same as removeFriend on backend for pending
    gameEvents.emit('SHOW_ALERT', { text: 'Demande annulée.' });
  } catch (e) {
    gameEvents.emit('SHOW_ALERT', { text: 'Erreur lors de l\'annulation.' });
  }
};

const sendRequest = async () => {
  if (!searchIdentifier.value) return;
  try {
    await friendStore.sendFriendRequest(searchIdentifier.value);
    gameEvents.emit('SHOW_ALERT', { text: `Demande envoyée à ${searchIdentifier.value} !` });
    searchIdentifier.value = '';
    currentTab.value = 'requests';
  } catch (e) {
    gameEvents.emit('SHOW_ALERT', { text: 'Erreur: ' + friendStore.error });
  }
};
</script>

<style scoped>
.friends-view {
  padding: 40px 20px;
  height: 100vh;
  overflow-y: auto;
  background: radial-gradient(circle at top right, #1a1a2e 0%, #0f0f1a 100%);
  color: white;
  font-family: 'Rajdhani', sans-serif;
  padding-top: 100px; /* Space for TopNavbar */
}

.friends-container {
  max-width: 1000px;
  margin: 0 auto;
}

.view-header {
  margin-bottom: 30px;
  text-align: center;
}

.view-header h1 {
  font-size: 3rem;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: var(--color-primary);
  text-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.3);
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.1rem;
}

/* Tabs */
.view-tabs {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 40px;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.tab-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  padding: 12px 24px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  text-transform: uppercase;
  transition: all 0.3s;
  position: relative;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.tab-btn.active {
  background: var(--color-primary);
  color: black;
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.3);
}

.tab-badge {
  background: #e74c3c;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.active .tab-badge {
  background: black;
  color: var(--color-primary);
}

/* Grid List */
.grid-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.card-inner {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.friend-info {
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
}

.friend-avatar {
  width: 50px;
  height: 50px;
  border-radius: 15px;
  border: 2px solid var(--color-primary);
  background: rgba(0, 0, 0, 0.3);
}

.friend-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
  display: block;
}

.friend-status {
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 5px;
}

.friend-status::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.friend-status.online { color: #2ecc71; }
.friend-status.online::before { background: #2ecc71; box-shadow: 0 0 8px #2ecc71; }

.friend-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 40px !important;
  height: 40px !important;
  padding: 0 !important;
  font-size: 1.1rem;
}

.action-btn.remove:hover { color: #e74c3c; }

/* Requests View */
.request-section {
  background: rgba(255, 255, 255, 0.02);
  padding: 30px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.section-title {
  font-size: 1.5rem;
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--color-primary);
  text-transform: uppercase;
}

.request-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.req-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.req-user {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.req-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--color-primary);
}

.req-name {
  font-weight: 700;
  font-size: 1.1rem;
}

.req-actions {
  display: flex;
  gap: 10px;
}

.pending-label {
  flex: 1;
  font-style: italic;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
}

/* Add View */
.search-input-group {
  display: flex;
  gap: 15px;
  margin-top: 20px;
}

.search-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 14px 20px;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  font-family: inherit;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 15px rgba(var(--color-primary-rgb), 0.2);
}

/* Loading/Empty States */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 50px;
}

.loader {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon { font-size: 4rem; margin-bottom: 20px; }

.empty-mini {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}

.error-msg {
  color: #ff4d4d;
}

/* Transitions */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.mt-4 { margin-top: 1rem; }
.mt-8 { margin-top: 2rem; }
.mt-2 { margin-top: 0.5rem; }
.m-0 { margin: 0; }

@media (max-width: 768px) {
  .view-tabs {
    flex-wrap: wrap;
  }
  .tab-btn {
    flex: 1;
    min-width: 120px;
    padding: 10px;
    font-size: 0.8rem;
  }
  .view-header h1 { font-size: 2rem; }
}
</style>
