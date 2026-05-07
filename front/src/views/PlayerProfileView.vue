<template>
  <div class="player-profile-view custom-scrollbar">
    <div v-if="loading" class="loading-state">
      <div class="loader"></div>
      <p>Chargement du profil...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>Oups !</h2>
      <p>{{ error }}</p>
      <button class="btn-primary" @click="router.back()">Retour</button>
    </div>

    <div v-else-if="profile" class="profile-container">
      <header class="profile-header">
        <button class="back-btn" @click="router.back()">
          <span class="icon">⬅️</span> Retour
        </button>
        <div class="header-main">
          <div class="avatar-wrapper">
            <img :src="avatarUrl" :alt="profile.username" class="profile-avatar" />
            <div class="status-indicator online"></div>
          </div>
          <div class="player-info">
            <h1 class="username">{{ profile.username }}</h1>
            <div class="player-tags">
              <span v-if="profile.guild" class="tag guild-tag">
                🛡️ {{ profile.guild.name }}
              </span>
              <span class="tag role-tag">Joueur</span>
            </div>
          </div>
        </div>
      </header>

      <main class="profile-content">
        <!-- Stats Grid -->
        <section class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🎴</div>
            <div class="stat-info">
              <span class="stat-value">{{ profile.stats.totalCards }}</span>
              <span class="stat-label">Cartes Totales</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✨</div>
            <div class="stat-info">
              <span class="stat-value">{{ profile.stats.uniqueCards }}</span>
              <span class="stat-label">Cartes Uniques</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⏳</div>
            <div class="stat-info">
              <span class="stat-value">{{ profile.daysActive }}</span>
              <span class="stat-label">Jours d'activité</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-info">
              <span class="stat-value">LVL 1</span>
              <span class="stat-label">Niveau (Alpha)</span>
            </div>
          </div>
        </section>

        <!-- Actions -->
        <section class="profile-actions" v-if="!isMe">
          <h3>Interactions</h3>
          <div class="action-buttons">
            <!-- Add Friend -->
            <button 
              v-if="!friendshipStatus || friendshipStatus === 'rejected'" 
              class="btn-action btn-add-friend" 
              @click="handleAddFriend"
              :disabled="actionLoading"
            >
              {{ actionLoading ? '...' : '➕ Ajouter en ami' }}
            </button>

            <!-- Pending Request -->
            <div v-else-if="friendshipStatus === 'pending'" class="friendship-group">
              <span class="friendship-status pending">
                {{ friendshipData.isRequester ? '⏳ Demande envoyée' : '📩 Demande reçue' }}
              </span>
              <button 
                class="btn-action btn-outline btn-small" 
                @click="handleRemoveFriend"
                :disabled="actionLoading"
              >
                {{ friendshipData.isRequester ? 'Annuler' : 'Refuser' }}
              </button>
            </div>

            <!-- Already Friends -->
            <div v-else-if="friendshipStatus === 'accepted'" class="friendship-group">
              <span class="friendship-status accepted">🤝 Amis</span>
              <button 
                class="btn-action btn-outline btn-danger btn-small" 
                @click="handleRemoveFriend"
                :disabled="actionLoading"
              >
                Retirer des amis
              </button>
            </div>

            <button class="btn-action btn-duel" @click="handleDuel">
              ⚔️ Défier en duel
            </button>
          </div>
        </section>

        <!-- More info / Showcase -->
        <section class="profile-details">
          <div class="detail-section">
            <h3>📜 À propos</h3>
            <p class="bio-text">
              Ce joueur a rejoint l'aventure le {{ formatDate(profile.createdAt) }}.
              Un collectionneur passionné de Terra Nullius !
            </p>
          </div>

          <div class="detail-section">
            <h3>🌟 Hauts Faits</h3>
            <div class="achievements-placeholder">
              <div v-for="i in 3" :key="i" class="achievement-locked">
                🔒 Succès verrouillé
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlayerStore } from '../stores/playerStore.js';
import { useUserStore } from '../stores/userStore.js';
import { useFriendStore } from '../stores/friendStore.js';
import { getStrapiMediaUrl } from '../utils/url.js';
import { gameEvents } from '../game/events.js';

const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();
const userStore = useUserStore();

const profile = ref(null);
const loading = ref(true);
const error = ref(null);
const actionLoading = ref(false);

const identifier = computed(() => route.params.identifier);
const isMe = computed(() => profile.value?.id === userStore.user?.id);
const friendStore = useFriendStore();

const avatarUrl = computed(() => {
  if (profile.value?.avatar) {
    return getStrapiMediaUrl(profile.value.avatar);
  }
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${profile.value?.username || 'player'}&backgroundColor=transparent`;
});

// We combine backend data with friendStore for maximum reliability and reactivity
const friendshipData = computed(() => {
  if (!profile.value) return null;
  
  // Try to find in friendStore first (it's always up to date)
  const friendInStore = friendStore.friendships.find(f => 
    (f.requester?.id === profile.value.id || f.receiver?.id === profile.value.id)
  );

  if (friendInStore) {
    return {
      status: friendInStore.status,
      documentId: friendInStore.documentId,
      isRequester: friendInStore.requester?.id === userStore.user?.id
    };
  }

  return profile.value.friendship;
});

const friendshipStatus = computed(() => friendshipData.value?.status);

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await friendStore.fetchFriendships();
  }
  await fetchProfile();
});

const fetchProfile = async () => {
  loading.value = true;
  const data = await playerStore.fetchProfile(identifier.value);
  if (data) {
    profile.value = data;
    error.value = null;
  } else {
    error.value = "Impossible de charger le profil de ce joueur.";
  }
  loading.value = false;
};

const handleAddFriend = async () => {
  actionLoading.value = true;
  const res = await playerStore.sendFriendRequest(profile.value.username);
  if (res.error) {
    gameEvents.emit('SHOW_ALERT', { text: res.error });
  } else {
    gameEvents.emit('SHOW_ALERT', { text: "Demande d'ami envoyée !" });
    await fetchProfile(); // Refresh status
  }
  actionLoading.value = false;
};

const handleRemoveFriend = async () => {
  const fData = friendshipData.value;
  if (!fData?.documentId) return;
  
  const confirmMsg = friendshipStatus.value === 'accepted' 
    ? "Voulez-vous vraiment retirer ce joueur de vos amis ?" 
    : "Voulez-vous annuler/refuser cette demande ?";
    
  if (friendshipStatus.value === 'accepted' && !confirm(confirmMsg)) return;

  actionLoading.value = true;
  // Use friendStore to keep everything in sync
  try {
    await friendStore.removeFriend(fData.documentId);
    gameEvents.emit('SHOW_ALERT', { text: "Action effectuée avec succès." });
    await fetchProfile(); // Refresh
  } catch (err) {
    gameEvents.emit('SHOW_ALERT', { text: "Erreur lors de la suppression." });
  }
  actionLoading.value = false;
};

const handleDuel = () => {
  gameEvents.emit('SHOW_ALERT', { text: "La fonctionnalité de duel direct arrive bientôt !" });
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};
</script>

<style scoped>
.player-profile-view {
  padding: 40px 20px;
  height: 100vh;
  overflow-y: auto;
  background: radial-gradient(circle at top right, #1a1a2e 0%, #0f0f1a 100%);
  color: white;
  font-family: 'Rajdhani', sans-serif;
}

.profile-container {
  max-width: 900px;
  margin: 0 auto;
  animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.profile-header {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  padding: 40px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 30px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
}

.back-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--color-primary);
}

.header-main {
  display: flex;
  align-items: center;
  gap: 40px;
}

.avatar-wrapper {
  position: relative;
  width: 150px;
  height: 150px;
}

.profile-avatar {
  width: 100%;
  height: 100%;
  border-radius: 30%;
  object-fit: cover;
  border: 4px solid var(--color-primary);
  box-shadow: 0 0 30px rgba(var(--color-primary-rgb), 0.3);
}

.status-indicator {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  border: 4px solid #0f0f1a;
}

.status-indicator.online {
  background: #2ecc71;
  box-shadow: 0 0 10px #2ecc71;
}

.username {
  font-size: 3.5rem;
  margin: 0;
  color: white;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
}

.player-tags {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.tag {
  padding: 6px 16px;
  border-radius: 20px;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.85rem;
}

.guild-tag {
  background: rgba(var(--color-primary-rgb), 0.15);
  color: var(--color-primary);
  border: 1px solid rgba(var(--color-primary-rgb), 0.3);
}

.role-tag {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 25px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(var(--color-primary-rgb), 0.2);
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  font-weight: 600;
}

/* Actions */
.profile-actions {
  background: rgba(0, 0, 0, 0.2);
  padding: 30px;
  border-radius: 24px;
  margin-bottom: 40px;
}

.profile-actions h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.2rem;
  text-transform: uppercase;
}

.action-buttons {
  display: flex;
  gap: 20px;
  align-items: center;
}

.btn-action {
  padding: 14px 28px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn-add-friend {
  background: var(--color-primary);
  color: black;
  border: none;
}

.btn-add-friend:hover:not(:disabled) {
  filter: brightness(1.2);
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.4);
}

.btn-duel {
  background: transparent;
  color: #e74c3c;
  border: 2px solid #e74c3c;
}

.btn-duel:hover {
  background: #e74c3c;
  color: white;
  box-shadow: 0 0 20px rgba(231, 76, 60, 0.4);
}

.friendship-group {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.05);
  padding: 5px 5px 5px 15px;
  border-radius: 15px;
}

.btn-outline {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: white;
}

.btn-danger {
  color: #e74c3c;
  border-color: rgba(231, 76, 60, 0.3);
}

.btn-danger:hover {
  background: rgba(231, 76, 60, 0.1);
  border-color: #e74c3c;
}

.btn-small {
  padding: 8px 16px;
  font-size: 0.8rem;
}

.friendship-status {
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 700;
}

.friendship-status.pending {
  background: rgba(241, 196, 15, 0.1);
  color: #f1c40f;
  border: 1px solid rgba(241, 196, 15, 0.3);
}

.friendship-status.accepted {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
}

/* Details */
.profile-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.detail-section {
  background: rgba(255, 255, 255, 0.03);
  padding: 25px;
  border-radius: 20px;
}

.detail-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
}

.bio-text {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  font-size: 1.05rem;
}

.achievements-placeholder {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.achievement-locked {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
  font-size: 0.9rem;
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

/* Loading/Error */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.loader {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .header-main {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
  
  .username {
    font-size: 2.5rem;
  }
  
  .player-tags {
    justify-content: center;
  }
  
  .action-buttons {
    flex-direction: column;
    width: 100%;
  }
  
  .btn-action {
    width: 100%;
  }
  
  .profile-details {
    grid-template-columns: 1fr;
  }
}
</style>
