<template>
  <div class="drawer-container" :class="{ open: state.rightDrawerOpen }">
    <div class="drawer-overlay" @click="state.rightDrawerOpen = false"></div>
    <div class="drawer right-drawer">
      <div class="drawer-header">
        <button v-if="currentView !== 'profile'" class="back-btn" @click="currentView = 'profile'">←</button>
        <button v-else class="close-btn" @click="state.rightDrawerOpen = false">×</button>
        <h2>{{ viewTitle }}</h2>
      </div>
      <div class="drawer-content">
        
        <!-- PROFILE VIEW -->
        <template v-if="currentView === 'profile' && state.isLoggedIn">
          <div class="profile-card">
            <img :src="state.user.avatar" class="large-avatar" alt="Avatar" />
            <h3 class="profile-name">{{ state.user.username }}</h3>
            <p class="profile-stats">Victoires : 0 | Défaites : 0</p>
            <button class="logout-btn" @click="doLogout">Se Déconnecter</button>
          </div>

          <div class="menu-list">
            <button class="menu-item">
              <span class="icon">⚙️</span>
              Paramètres du Jeu
            </button>
            <button class="menu-item" @click="currentView = 'decks'">
              <span class="icon">🎴</span>
              Mes Decks ({{ state.userDecks.length }}/5)
            </button>
            <button class="menu-item" @click="currentView = 'collection'">
              <span class="icon">📚</span>
              Ma Collection ({{ state.collection.length }} / 45)
            </button>
            <button class="menu-item">
              <span class="icon">📜</span>
              Historique des Matchs
            </button>
          </div>
        </template>

        <!-- COLLECTION VIEW -->
        <template v-else-if="currentView === 'collection'">
          <div class="collection-view">
             <div class="card-grid">
               <div v-for="card in cardLibrary" :key="card.id" 
                    class="card-slot" 
                    :class="[getRarityClass(card.level), { locked: !isOwned(card.id) }]">
                 <div class="card-mini-info">
                   <div class="card-name">{{ card.name }}</div>
                   <div class="card-level">Lvl {{ card.level }}</div>
                 </div>
                 <img :src="card.img" class="card-img" />
                 <div class="card-stats">
                   <span>{{ card.topValue }}</span>
                   <span>{{ card.rightValue }}</span>
                   <span>{{ card.bottomValue }}</span>
                   <span>{{ card.leftValue }}</span>
                 </div>
               </div>
             </div>
          </div>
        </template>

        <!-- DECKS VIEW -->
        <template v-else-if="currentView === 'decks'">
          <div v-if="!isBuilding" class="decks-view">
            <button class="add-deck-btn" @click="startNewDeck">+ Nouveau Deck</button>
            <div class="decks-list">
              <div v-for="deck in state.userDecks" :key="deck.id" class="deck-row">
                <span class="deck-name">{{ deck.name }}</span>
                <span class="deck-count">{{ deck.cards.length }} cartes</span>
                <button class="small-btn edit" @click="editDeck(deck)">✏️</button>
              </div>
              <p v-if="state.userDecks.length === 0">Aucun deck créé.</p>
            </div>
          </div>

          <div v-else class="deck-builder">
            <div class="builder-header">
              <input v-model="editingDeck.name" placeholder="Nom du Deck" class="deck-name-input" />
              <div class="deck-counter" :class="{ count_full: editingDeck.cards.length === 15 }">
                {{ editingDeck.cards.length }} / 15
              </div>
            </div>

            <div class="builder-actions">
              <button class="save-btn" :disabled="editingDeck.cards.length !== 15" @click="saveDeck">
                Enregistrer
              </button>
              <button class="cancel-btn" @click="isBuilding = false">Annuler</button>
            </div>

            <div class="builder-grid">
               <div v-for="card in cardLibrary" :key="card.id" 
                    class="card-slot mini" 
                    :class="[getRarityClass(card.level), { locked: !isOwned(card.id), selected: isInDeck(card.id) }]"
                    @click="toggleCardInDeck(card.id)">
                 <div class="card-name">{{ card.name }}</div>
                 <img :src="card.img" class="card-img" />
                 <div class="selection-overlay" v-if="isInDeck(card.id)">✓</div>
               </div>
            </div>
          </div>
        </template>

        <!-- AUTH VIEW -->
        <template v-else-if="!state.isLoggedIn">
          <!-- Authentication Form -->
          <div class="auth-container">
            <h3>{{ isRegistering ? 'CRÉER UN COMPTE' : 'SE CONNECTER' }}</h3>
            
            <form @submit.prevent="submitAuth" class="auth-form">
              <input v-if="isRegistering" v-model="authForm.username" type="text" placeholder="Nom d'utilisateur" required />
              
              <input v-model="authForm.email" type="email" placeholder="Adresse Email" required />
              <input v-model="authForm.password" type="password" placeholder="Mot de Passe" required />
              
              <p v-if="authError" class="auth-error">{{ authError }}</p>

              <button type="submit" class="submit-btn" :disabled="isLoading">
                {{ isLoading ? 'Chargement...' : (isRegistering ? 'S\'inscrire' : 'Connexion') }}
              </button>
            </form>

            <button class="switch-mode-btn" @click="toggleAuthMode">
              {{ isRegistering ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire' }}
            </button>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { state, setAuth, logout, cardLibrary, saveDeckToStrapi } from '../game/state.js';

const currentView = ref('profile'); // profile, collection, decks, history
const isBuilding = ref(false);
const editingDeck = reactive({ id: null, name: '', cards: [] });
const isRegistering = ref(false);
const isLoading = ref(false);
const authError = ref('');

const viewTitle = computed(() => {
  if (currentView.value === 'profile') return 'MON PROFIL';
  if (currentView.value === 'collection') return 'MA COLLECTION';
  if (currentView.value === 'decks') return isBuilding.value ? 'ÉDITEUR DE DECK' : 'MES DECKS';
  return 'TRIPLE TRIAD';
});

const authForm = reactive({
  username: '',
  email: '',
  password: ''
});

function isOwned(cardId) {
  return state.collection.some(c => c.cardId === cardId);
}

function getRarityClass(level) {
  if (level >= 9) return 'rarity-legendary';
  if (level >= 7) return 'rarity-epic';
  if (level >= 5) return 'rarity-rare';
  if (level >= 3) return 'rarity-uncommon';
  return 'rarity-common';
}

function startNewDeck() {
  editingDeck.id = Date.now();
  editingDeck.name = 'Nouveau Deck';
  editingDeck.cards = [];
  isBuilding.value = true;
}

function editDeck(deck) {
  editingDeck.id = deck.id;
  editingDeck.name = deck.name;
  editingDeck.cards = [...deck.cards];
  isBuilding.value = true;
}

function isInDeck(cardId) {
  return editingDeck.cards.includes(cardId);
}

function toggleCardInDeck(cardId) {
  if (!isOwned(cardId)) return;
  const idx = editingDeck.cards.indexOf(cardId);
  if (idx > -1) {
    editingDeck.cards.splice(idx, 1);
  } else if (editingDeck.cards.length < 15) {
    editingDeck.cards.push(cardId);
  }
}

async function saveDeck() {
  if (editingDeck.cards.length !== 15) return;
  
  isLoading.value = true;
  const success = await saveDeckToStrapi({ ...editingDeck });
  isLoading.value = false;
  
  if (success) {
    isBuilding.value = false;
  } else {
    authError.value = "Erreur lors de l'enregistrement du deck.";
  }
}

function toggleAuthMode() {
  isRegistering.value = !isRegistering.value;
  authError.value = '';
}

function doLogout() {
  logout();
}

async function submitAuth() {
  isLoading.value = true;
  authError.value = '';

  const endpoint = isRegistering.value ? '/api/auth/local/register' : '/api/auth/local';

  const payload = isRegistering.value 
    ? { 
        username: authForm.username, 
        email: authForm.email, 
        password: authForm.password 
      }
    : { 
        identifier: authForm.email, 
        password: authForm.password 
      };

  try {
    const response = await fetch(`http://localhost:1337${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Erreur d\'authentification');
    }

    setAuth(data.jwt, data.user);
    
    // Clear form
    authForm.password = '';
  } catch (error) {
    authError.value = error.message;
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.drawer-container {
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
}

.drawer-container.open {
  pointer-events: auto;
}

.drawer-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.drawer-container.open .drawer-overlay {
  opacity: 1;
}

.drawer {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 400px;
  max-width: 90vw;
  background: rgba(15, 15, 25, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid rgba(0, 210, 255, 0.2);
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.right-drawer {
  right: 0;
  transform: translateX(100%);
}

.drawer-container.open .right-drawer {
  transform: translateX(0);
}

.drawer-header {
  height: 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.drawer-header h2 {
  color: #ff0055;
  font-size: 1.2rem;
  letter-spacing: 2px;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 2rem;
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}

.close-btn:hover {
  color: #00d2ff;
  transform: scale(1.1) rotate(-90deg);
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
}

.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 30px 20px;
  margin-bottom: 30px;
  text-align: center;
}

.large-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #111;
  border: 3px solid #ff0055;
  margin-bottom: 15px;
  box-shadow: 0 0 20px rgba(255, 0, 85, 0.4);
}

.profile-name {
  color: white;
  font-size: 1.5rem;
  margin: 0 0 5px 0;
}

.profile-stats {
  color: #aaa;
  font-size: 0.9rem;
  margin: 0;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 15px;
  width: 100%;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 1.1rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
}

.menu-item .icon {
  font-size: 1.4rem;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: #ff0055;
  transform: translateX(-5px);
  box-shadow: -5px 5px 15px rgba(255, 0, 85, 0.2);
}

.logout-btn {
  margin-top: 15px;
  background: rgba(255, 0, 85, 0.2);
  border: 1px solid #ff0055;
  color: #ff0055;
  padding: 5px 15px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #ff0055;
  color: white;
}

/* Auth Styles */
.auth-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
}

.auth-container h3 {
  color: #00d2ff;
  font-size: 1.5rem;
  margin-bottom: 30px;
  letter-spacing: 1px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
}

.auth-form input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 8px;
  color: white;
  font-size: 1rem;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.auth-form input:focus {
  outline: none;
  border-color: #00d2ff;
  box-shadow: 0 0 10px rgba(0, 210, 255, 0.2);
  background: rgba(0, 210, 255, 0.05);
}

.submit-btn {
  background: linear-gradient(45deg, #00d2ff, #3a7bd5);
  border: none;
  color: white;
  padding: 15px;
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 10px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 210, 255, 0.4);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.switch-mode-btn {
  background: transparent;
  border: none;
  color: #aaa;
  margin-top: 20px;
  cursor: pointer;
  transition: color 0.2s;
}

.switch-mode-btn:hover {
  color: white;
  text-decoration: underline;
}

.auth-error {
  color: #ff0055;
  background: rgba(255, 0, 85, 0.1);
  padding: 10px;
  border-radius: 5px;
  text-align: center;
  font-size: 0.9rem;
  margin: 0;
}

.back-btn {
  background: transparent;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
}

/* Collection Styles */
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.card-slot {
  position: relative;
  aspect-ratio: 2.5/3.5;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.card-slot:not(.locked):hover {
  transform: translateY(-5px) scale(1.05);
  z-index: 10;
}

.card-slot.locked {
  filter: grayscale(1) brightness(0.5);
  opacity: 0.5;
}

.card-mini-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  font-weight: bold;
  margin-bottom: 5px;
}

.card-name {
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-level {
  color: #ffcc00;
}

.card-img {
  width: 100%;
  flex: 1;
  object-fit: contain;
}

.card-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  font-size: 0.8rem;
  text-align: center;
  font-weight: bold;
  color: #00d2ff;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 5px;
}

/* Rarity colors */
.rarity-common { border-color: rgba(255, 255, 255, 0.2); }
.rarity-uncommon { border-color: #00ff88; box-shadow: inset 0 0 10px rgba(0, 255, 136, 0.1); }
.rarity-rare { border-color: #00d2ff; box-shadow: inset 0 0 15px rgba(0, 210, 255, 0.2); }
.rarity-epic { border-color: #ff00ff; box-shadow: inset 0 0 20px rgba(255, 0, 255, 0.3); }
.rarity-legendary { 
  border-color: #ffcc00; 
  box-shadow: 0 0 15px rgba(255, 204, 0, 0.4), inset 0 0 20px rgba(255, 204, 0, 0.3); 
}

/* Decks Styles */
.decks-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.add-deck-btn {
  background: rgba(0, 210, 255, 0.1);
  border: 2px dashed #00d2ff;
  color: #00d2ff;
  padding: 20px;
  border-radius: 15px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.1rem;
  transition: all 0.3s;
}

.add-deck-btn:hover {
  background: rgba(0, 210, 255, 0.2);
  transform: scale(1.02);
}

.deck-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.05);
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 10px;
  border: 1px solid rgba(255,255,255,0.1);
}

.deck-name { font-weight: bold; color: white; }
.deck-count { font-size: 0.8rem; color: #888; }
.small-btn { 
  background: transparent; border: none; cursor: pointer; font-size: 1.2rem;
}

/* Builder */
.builder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 15px;
}

.deck-name-input {
  background: rgba(255,255,255,0.05);
  border: 1px solid #333;
  color: white;
  padding: 10px;
  border-radius: 5px;
  flex: 1;
}

.deck-counter {
  font-weight: bold;
  font-size: 1.1rem;
  color: white;
  min-width: 60px;
  text-align: right;
}

.count_full { color: #00ff88; text-shadow: 0 0 10px #00ff88; }

.builder-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.save-btn {
  flex: 1;
  background: #00d2ff;
  border: none;
  color: black;
  font-weight: bold;
  padding: 10px;
  border-radius: 5px;
  cursor: pointer;
}

.save-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.cancel-btn {
  background: #ff0055;
  border: none;
  color: white;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
}

.builder-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.card-slot.mini {
  padding: 5px;
  aspect-ratio: 2.5/3;
}

.card-slot.mini .card-name { font-size: 0.6rem; }

.selection-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 210, 255, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  color: white;
  pointer-events: none;
  border-radius: 12px;
}

.card-slot.selected {
  border-color: #00d2ff;
}
</style>
