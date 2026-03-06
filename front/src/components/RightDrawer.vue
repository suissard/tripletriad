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
            <button class="menu-item" @click="openDecksPage">
              <span class="icon">🎴</span>
              Mes Decks ({{ state.userDecks.length }}/5)
            </button>
            <button class="menu-item" @click="openCollectionPage">
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
          <div v-if="selectedCard" class="card-detail-view">
            <button class="back-btn-detail" @click="closeCardDetail">← Retour</button>
            <TripleTriadCard :card="selectedCard" variant="detail" :isLocked="!isOwned(selectedCard.id)"
              :quantity="getOwnedQuantity(selectedCard.id)" />
          </div>

          <div v-else class="collection-view">
            <div class="collection-controls">
              <input type="text" v-model="searchQuery" placeholder="Rechercher une carte..." class="filter-input" />
              <div class="filters-row">
                <select v-model="filterElement" class="filter-select">
                  <option value="">Tous les éléments</option>
                  <option value="Fire">Feu</option>
                  <option value="Ice">Glace</option>
                  <option value="Thunder">Foudre</option>
                  <option value="Earth">Terre</option>
                  <option value="Poison">Poison</option>
                  <option value="Wind">Vent</option>
                  <option value="Water">Eau</option>
                  <option value="Holy">Sacré</option>
                  <option value="None">Sans</option>
                </select>
                <select v-model="filterRarity" class="filter-select">
                  <option value="">Toutes les raretés</option>
                  <option value="common">Commune</option>
                  <option value="uncommon">Peu Commune</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Épique</option>
                  <option value="legendary">Légendaire</option>
                </select>
                <select v-model="sortBy" class="filter-select">
                  <option value="id-asc">Numéro</option>
                  <option value="level-desc">Niv. Décroissant</option>
                  <option value="level-asc">Niv. Croissant</option>
                  <option value="name-asc">Nom (A-Z)</option>
                  <option value="owned-first">Possédées</option>
                </select>
              </div>
            </div>

            <div class="collection-stats-bar">
              Cartes : {{ filteredCardLibrary.length }} | Page {{ currentPage }} / {{ totalPages }}
            </div>

            <div class="card-grid">
              <div v-for="card in paginatedCardLibrary" :key="card.id" class="card-slot clickable"
                :class="[getRarityClass(card.level), { locked: !isOwned(card.id) }]" @click="viewCardDetail(card)">
                <div class="quantity-badge" v-if="isOwned(card.id)">{{ getBadgeText(card.id) }}</div>
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

            <div class="pagination-controls" v-if="totalPages > 1">
              <button @click="prevPage" :disabled="currentPage === 1" class="page-btn">←</button>
              <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
              <button @click="nextPage" :disabled="currentPage === totalPages" class="page-btn">→</button>
            </div>

            <div v-if="filteredCardLibrary.length === 0" class="no-results">
              Aucune carte trouvée.
            </div>
          </div>
        </template>

        <!-- DECKS VIEW -->
        <template v-else-if="currentView === 'decks'">
          <div v-if="!isBuilding" class="decks-view">
            <button class="add-deck-btn" @click="startNewDeck">+ Nouveau Deck</button>
            <div class="decks-list">
              <div v-for="deck in state.userDecks" :key="deck.id" class="deck-row">
                <img v-if="deck.cover" :src="getCardById(deck.cover)?.img" class="deck-cover-img" />
                <div class="deck-info">
                  <span class="deck-name">{{ deck.name }}</span>
                  <span class="deck-count">{{ deck.cards.length }} cartes</span>
                </div>
                <div class="deck-actions">
                  <button class="small-btn edit" @click="editDeck(deck)">✏️</button>
                  <button class="small-btn delete" @click="deleteDeck(deck)">🗑️</button>
                </div>
              </div>
              <p v-if="state.userDecks.length === 0">Aucun deck créé.</p>
            </div>
          </div>

          <div v-else class="deck-builder">
            <div class="mana-curve-container">

              <button class="toggle-curve-btn" @click="showManaCurve = !showManaCurve">

                <span v-if="showManaCurve">Masquer Courbe de Mana</span>

                <span v-else>Afficher Courbe de Mana</span>

              </button>

              <div v-if="showManaCurve" class="mana-histogram">

                <div v-for="(count, level) in manaCurve" :key="level" class="mana-bar-container">

                  <div class="mana-bar" :style="{ height: (count / maxManaCount) * 100 + '%' }"></div>

                  <div class="mana-label">{{ level }}</div>

                  <div class="mana-count" v-if="count > 0">{{ count }}</div>

                </div>

              </div>

            </div>


            <div class="builder-header">
              <input v-model="editingDeck.name" placeholder="Nom du Deck" class="deck-name-input" />
              <div class="deck-counter" :class="{ count_full: editingDeck.cards.length === 15 }">
                {{ editingDeck.cards.length }} / 15
              </div>
            </div>

            <div v-if="authError" class="auth-error">

              {{ authError }}

            </div>


            <div class="import-section">

              <input v-model="importedDeckCode" placeholder="Coller le code ici" class="import-input" />

              <button class="import-btn" @click="importDeckCode" :disabled="!importedDeckCode">

                Importer

              </button>

            </div>


            <div class="builder-actions">
              <button class="export-btn" @click="exportDeckCode" :disabled="editingDeck.cards.length === 0">

                Copier le code

              </button>


              <button class="save-btn" :disabled="editingDeck.cards.length !== 15" @click="saveDeck">
                Enregistrer
              </button>
              <button class="cancel-btn" @click="isBuilding = false">Annuler</button>
            </div>

            <div class="builder-grid">
              <TripleTriadCard v-for="card in cardLibrary" :key="card.id" :card="card" variant="mini"
                :isLocked="!isOwned(card.id)" :quantity="getOwnedQuantity(card.id)" :isSelected="isInDeck(card.id)"
                :isCover="editingDeck.cover === card.id" @click="toggleCardInDeck(card.id)" @set-cover="setDeckCover" />
            </div>
          </div>
        </template>

        <!-- AUTH VIEW -->
        <template v-else-if="!state.isLoggedIn">
          <!-- Authentication Form -->
          <div class="auth-container">
            <h3>{{ isRegistering ? 'CRÉER UN COMPTE' : 'SE CONNECTER' }}</h3>

            <form @submit.prevent="submitAuth" class="auth-form">
              <input v-if="isRegistering" v-model="authForm.username" type="text" placeholder="Nom d'utilisateur"
                required />

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
import { ref, reactive, computed, watch } from 'vue';
import { state, setAuth, logout, cardLibrary, saveDeckToStrapi, confirmAction, getCardById, deleteDeckFromStrapi } from '../game/state.js';
import TripleTriadCard from './TripleTriadCard.vue';
import strapiService from '../api/strapi.js';

const currentView = ref('profile'); // profile, collection, decks, history
const isBuilding = ref(false);
const showManaCurve = ref(false);
const importedDeckCode = ref("");
const editingDeck = reactive({ id: null, documentId: null, name: '', cover: null, cards: [] });
const isRegistering = ref(false);
const isLoading = ref(false);
const authError = ref('');

// Collection Filters & Detail
const searchQuery = ref('');
const filterElement = ref('');
const filterRarity = ref('');
const sortBy = ref('id-asc');
const selectedCard = ref(null);

// Pagination state
const currentPage = ref(1);
const cardsPerPage = ref(8);

const manaCurve = computed(() => {

  const curve = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };

  editingDeck.cards.forEach(cardId => {

    const card = cardLibrary.find(c => c.id === cardId);

    if (card && curve[card.level] !== undefined) {

      curve[card.level]++;

    }

  });

  return curve;

});



const maxManaCount = computed(() => {

  const max = Math.max(...Object.values(manaCurve.value));

  return max > 0 ? max : 1;

});


const filteredCardLibrary = computed(() => {
  let result = [...cardLibrary];

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }

  if (filterRarity.value) {
    const rarityToMinMax = {
      'common': [1, 2],
      'uncommon': [3, 4],
      'rare': [5, 6],
      'epic': [7, 8],
      'legendary': [9, 10]
    };
    const [min, max] = rarityToMinMax[filterRarity.value];
    result = result.filter(c => c.level >= min && c.level <= max);
  }

  if (filterElement.value) {
    result = result.filter(c => c.element === filterElement.value);
  }

  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'level-desc': return b.level - a.level || a.id - b.id;
      case 'level-asc': return a.level - b.level || a.id - b.id;
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'owned-first': {
        const aOwned = isOwned(a.id);
        const bOwned = isOwned(b.id);
        if (aOwned === bOwned) return a.id - b.id;
        return aOwned ? -1 : 1;
      }
      case 'id-asc':
      default: return a.id - b.id;
    }
  });

  return result;
});

const paginatedCardLibrary = computed(() => {
  const start = (currentPage.value - 1) * cardsPerPage.value;
  const end = start + cardsPerPage.value;
  return filteredCardLibrary.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredCardLibrary.value.length / cardsPerPage.value) || 1;
});

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++;
}

function prevPage() {
  if (currentPage.value > 1) currentPage.value--;
}

watch([searchQuery, filterElement, filterRarity, sortBy], () => {
  currentPage.value = 1;
});

function viewCardDetail(card) {
  selectedCard.value = card;
}

function closeCardDetail() {
  selectedCard.value = null;
}

function getOwnedQuantity(cardId) {
  const c = state.collection.find(item => item.cardId === cardId);
  return c ? c.quantity : 0;
}

function getBadgeText(cardId) {
  const qty = getOwnedQuantity(cardId);
  if (qty >= 3) return 'x3+';
  return 'x' + qty;
}

const viewTitle = computed(() => {
  if (currentView.value === 'profile') return 'MON PROFIL';
  if (currentView.value === 'collection') return selectedCard.value ? 'DÉTAIL CARTE' : 'MA COLLECTION';
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

function startNewDeck() {
  state.editingDeck.id = null;
  state.editingDeck.documentId = null;
  state.editingDeck.name = 'Nouveau Deck';
  state.editingDeck.cover = null;
  state.editingDeck.cards = [];
  state.rightDrawerOpen = false;
  state.showDeckEditor = true;
  window.history.pushState({}, '', '/deck-editor');
}


async function deleteDeck(deck) {
  const confirmed = await confirmAction('Supprimer le deck ?', `Voulez-vous vraiment supprimer le deck "${deck.name}" ? Cette action est irréversible.`);
  if (confirmed) {
    isLoading.value = true;
    const success = await deleteDeckFromStrapi(deck.documentId);
    isLoading.value = false;
    if (!success) {
      authError.value = "Erreur lors de la suppression du deck.";
    }
  }
}

function editDeck(deck) {
  state.editingDeck.id = deck.id;
  state.editingDeck.documentId = deck.documentId;
  state.editingDeck.name = deck.name;
  state.editingDeck.cover = deck.cover;
  state.editingDeck.cards = [...deck.cards];
  state.rightDrawerOpen = false;
  state.showDeckEditor = true;
  window.history.pushState({}, '', '/deck-editor');
}


function setDeckCover(cardId) {
  editingDeck.cover = cardId;
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

function importDeckCode() {

  if (!importedDeckCode.value) return;

  try {

    const decodedStr = atob(importedDeckCode.value);

    const cardIds = decodedStr.split(",").map(id => parseInt(id, 10));

    const newCards = [];

    const unownedIds = [];

    const invalidIds = [];



    for (const id of cardIds) {

      if (isNaN(id)) continue;

      const card = cardLibrary.find(c => c.id === id);

      if (!card) {

        invalidIds.push(id);

      } else if (!isOwned(id)) {

        unownedIds.push(id);

      } else if (newCards.length < 15) {

        newCards.push(id);

      }

    }



    editingDeck.cards = newCards;

    importedDeckCode.value = "";



    if (unownedIds.length > 0 || invalidIds.length > 0) {

      authError.value = `Import partiel : ${unownedIds.length} cartes non possédées, ${invalidIds.length} invalides.`;

    } else {

      authError.value = "Deck importé avec succès !";

    }

    setTimeout(() => { authError.value = ""; }, 4000);

  } catch (err) {

    authError.value = "Code invalide.";

    setTimeout(() => { authError.value = ""; }, 3000);

  }

}


function exportDeckCode() {

  if (editingDeck.cards.length === 0) return;

  const idString = editingDeck.cards.join(",");

  const encodedCode = btoa(idString);

  navigator.clipboard.writeText(encodedCode).then(() => {

    authError.value = "Code du deck copié dans le presse-papier !";

    setTimeout(() => { authError.value = ""; }, 3000);

  }).catch(err => {

    authError.value = "Erreur lors de la copie du code.";

  });

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

function openCollectionPage() {
  state.showCollectionPage = true;
  state.rightDrawerOpen = false;
  window.history.pushState({}, '', '/collection');
}

function openDecksPage() {
  state.showDecksPage = true;
  state.rightDrawerOpen = false;
  window.history.pushState({}, '', '/decks');
}

function doLogout() {
  logout();
}

async function submitAuth() {
  isLoading.value = true;
  authError.value = '';

  try {
    let data;
    if (isRegistering.value) {
      data = await strapiService.register({
        username: authForm.username,
        email: authForm.email,
        password: authForm.password
      });
    } else {
      data = await strapiService.login({
        identifier: authForm.email,
        password: authForm.password
      });
    }

    if (data.error) {
      throw new Error(data.error.message || 'Erreur d\'authentification');
    }

    setAuth(data.jwt, data.user);
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

/* Collection Controls */
.collection-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.filter-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 10px;
  border-radius: 6px;
  width: 100%;
}

.filters-row {
  display: flex;
  gap: 5px;
}

.filter-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px;
  border-radius: 6px;
  flex: 1;
  font-size: 0.8rem;
}

.filter-select option {
  background: #111;
  color: white;
}

.collection-stats-bar {
  font-size: 0.8rem;
  color: #aaa;
  margin-bottom: 15px;
  text-align: right;
}

.no-results {
  text-align: center;
  color: #888;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  grid-column: 1 / -1;
}

.card-slot.clickable {
  cursor: pointer;
}

/* Card Detail View */
.card-detail-view {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.back-btn-detail {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  margin-bottom: 20px;
  align-self: flex-start;
  transition: background 0.2s;
}

.back-btn-detail:hover {
  background: rgba(255, 255, 255, 0.1);
}

.detail-card {
  width: 100%;
  max-width: 300px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.detail-card.locked {
  filter: grayscale(1) brightness(0.6);
}

.detail-name {
  margin: 0 0 5px 0;
  font-size: 1.5rem;
  color: white;
  text-align: center;
}

.detail-level {
  color: #ffcc00;
  font-weight: bold;
  margin-bottom: 5px;
}

.detail-element {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
  margin-bottom: 15px;
}

.detail-img-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}

.detail-img {
  width: 80%;
  height: 80%;
  object-fit: contain;
}

.detail-stats-cross {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
}

.stat {
  background: rgba(0, 0, 0, 0.7);
  color: #00d2ff;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  font-weight: bold;
  border: 1px solid #00d2ff;
}

.stat.top {
  margin-top: 10px;
}

.stat.bottom {
  margin-bottom: 10px;
}

.stat.left,
.stat.right {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.stat.left {
  left: 10px;
}

.stat.right {
  right: 10px;
}

.detail-desc {
  font-size: 0.9rem;
  color: #ccc;
  text-align: center;
  margin-bottom: 20px;
  line-height: 1.4;
}

.detail-status {
  padding: 10px;
  border-radius: 8px;
  width: 100%;
  text-align: center;
  font-weight: bold;
  background: rgba(255, 0, 0, 0.2);
  color: #ff5555;
  margin-top: auto;
}

.detail-status.owned {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

/* Collection Grid Styles */

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 15px;
  margin-bottom: 10px;
}

.page-btn {
  background: rgba(0, 210, 255, 0.1);
  border: 1px solid #00d2ff;
  color: #00d2ff;
  padding: 5px 15px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #00d2ff;
  color: black;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  border-color: #888;
  color: #888;
}

.page-info {
  color: white;
  font-weight: bold;
}

.quantity-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #222;
  color: #00ff88;
  border: 2px solid #00ff88;
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 0.75rem;
  font-weight: bold;
  z-index: 5;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
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
.rarity-common {
  border-color: rgba(255, 255, 255, 0.2);
}

.rarity-uncommon {
  border-color: #00ff88;
  box-shadow: inset 0 0 10px rgba(0, 255, 136, 0.1);
}

.rarity-rare {
  border-color: #00d2ff;
  box-shadow: inset 0 0 15px rgba(0, 210, 255, 0.2);
}

.rarity-epic {
  border-color: #ff00ff;
  box-shadow: inset 0 0 20px rgba(255, 0, 255, 0.3);
}

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
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.deck-name {
  font-weight: bold;
  color: white;
}

.deck-count {
  font-size: 0.8rem;
  color: #888;
}

.small-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
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
  background: rgba(255, 255, 255, 0.05);
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

.count_full {
  color: #00ff88;
  text-shadow: 0 0 10px #00ff88;
}

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

.save-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

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

.card-slot.mini .card-name {
  font-size: 0.6rem;
}

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

<style scoped>
/* Mana Curve Styles */
.mana-curve-container {
  margin-bottom: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 10px;
}

.toggle-curve-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  width: 100%;
  margin-bottom: 10px;
}

.toggle-curve-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.mana-histogram {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 100px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.mana-bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  width: 8%;
  position: relative;
}

.mana-bar {
  width: 100%;
  background: linear-gradient(to top, #4a90e2, #50e3c2);
  border-radius: 3px 3px 0 0;
  transition: height 0.3s ease;
  min-height: 2px;
  /* Always show a tiny bar */
}

.mana-label {
  font-size: 0.7rem;
  color: #aaa;
  margin-top: 5px;
}

.mana-count {
  position: absolute;
  top: -15px;
  font-size: 0.7rem;
  color: white;
  font-weight: bold;
}
</style>
<style scoped>
.export-btn {
  background: #34495e;
  border: 1px solid #2c3e50;
  color: white;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.export-btn:hover:not(:disabled) {
  background: #2c3e50;
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
<style scoped>
.import-section {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.import-input {
  flex: 1;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #444;
  background: #222;
  color: white;
}

.import-btn {
  background: #27ae60;
  border: 1px solid #2ecc71;
  color: white;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.import-btn:hover:not(:disabled) {
  background: #2ecc71;
}

.import-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
.deck-cover-img {
width: 40px;
height: 40px;
object-fit: contain;
margin-right: 15px;
}
.deck-info {
display: flex;
flex-direction: column;
flex: 1;
}
.deck-actions {
display: flex;
gap: 10px;
}
