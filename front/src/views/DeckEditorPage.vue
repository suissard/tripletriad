<template>
  <div class="deck-editor-page ui-layer" >
    <div class="page-header">
      <button class="btn btn-secondary glass-panel" @click="closeDeckEditor">← RETOUR</button>
      <h2 class="page-title">{{ isNew ? 'NOUVEAU DECK' : 'ÉDITER LE DECK' }}</h2>
      <div class="header-actions">
        <span class="deck-counter" :class="{ full: state.editingDeck.cards.length === 15 || (isAdminMode && state.editingDeck.cards.length > 0) }">
          {{ state.editingDeck.cards.length }} {{ isAdminMode ? '' : '/ 15' }}
        </span>
        <button class="btn btn-primary glass-panel" :disabled="!isAdminMode && state.editingDeck.cards.length !== 15" @click="saveDeck">
          💾 Enregistrer
        </button>
      </div>
    </div>

    <div class="editor-body">
      <!-- LEFT: Deck info + selected cards -->
      <div class="deck-panel">
        <div class="deck-info-section">
        <div class="deck-back-selector">
          <div class="back-option" :class="{ active: state.editingDeck.cardBack === 'default' || !state.editingDeck.cardBack }" @click="state.editingDeck.cardBack = 'default'">
             <img src="/card-back.svg" class="back-preview-img" />
             <span>Classique</span>
          </div>
          <div class="back-option" :class="{ active: state.editingDeck.cardBack === 'animated' }" @click="state.editingDeck.cardBack = 'animated'">
             <div class="back-preview-animated"><AnimatedCardBack /></div>
             <span>Terra Nullius</span>
          </div>
        </div>

          <input v-model="state.editingDeck.name" placeholder="Nom du Deck" class="deck-name-input" />
        </div>

        <div v-if="isAdminMode" class="admin-owner-section glass-panel p-4 mb-4 border border-primary/20">
          <label class="block text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Propriétaire du Deck</label>
          <select v-model="selectedOwnerId" class="filter-select w-full bg-black/40 border-primary/10">
            <option v-for="u in allUsers" :key="u.id" :value="u.documentId || u.id">
              {{ u.username }} ({{ u.email }})
            </option>
          </select>
        </div>

        <div v-if="feedback" class="feedback-bar" :class="feedbackType">{{ feedback }}</div>

        <div class="import-export-row">
          <input v-model="importCode" placeholder="Coller un code..." class="import-input" />
          <button class="btn btn-secondary glass-panel px-2 text-xs" @click="importDeckCode" :disabled="!importCode">📥 Importer</button>
          <button class="btn btn-secondary glass-panel px-2 text-xs" @click="exportDeckCode" :disabled="state.editingDeck.cards.length === 0">📤
            Copier</button>
        </div>

        <!-- Mana curve -->
        <div class="mana-curve">
          <div class="curve-label">Courbe de Mana</div>
          <div class="curve-bars">
            <div v-for="lvl in 10" :key="lvl" class="bar-container">
              <div class="bar" :style="{ height: getBarHeight(lvl) + '%' }"></div>
              <span class="bar-label">{{ lvl }}</span>
            </div>
          </div>
        </div>

        <!-- Selected cards in deck -->
        <div class="deck-cards-title">Cartes dans le deck</div>
        <div class="deck-cards-grid">
          <div v-for="cardId in sortedDeckCards" :key="cardId" class="deck-card-slot"
            @click="removeCard(cardId)">
            <TripleTriadCard v-if="getCardById(cardId)" :card="getCardById(cardId)" size="100%" :height="80" compact flat :cardBack="state.editingDeck.cardBack" />
          </div>
          <div v-for="i in Math.max(0, 15 - state.editingDeck.cards.length)" :key="'empty-' + i"
            class="deck-card-slot empty">
            <span>—</span>
          </div>
        </div>
      </div>

      <!-- RIGHT: Card library -->
      <div class="library-panel">
        <div class="library-controls">
          <input type="text" v-model="searchQuery" placeholder="Rechercher (nom, desc)..." class="search-input" />
          
          <div class="filter-row-secondary">
            <select v-model="filterRarity" class="filter-select">
              <option value="">Toutes raretés</option>
              <option v-for="rarity in uniqueRarities" :key="rarity.value" :value="rarity.value">{{ rarity.label }}</option>
            </select>

            <select v-model="sortBy" class="filter-select">
              <optgroup label="Général">
                <option value="rarity-desc">Rareté ↓</option>
                <option value="rarity-asc">Rareté ↑</option>
                <option value="id-asc">Numéro</option>
                <option value="level-desc">Niv. ↓</option>
                <option value="level-asc">Niv. ↑</option>
                <option value="name-asc">Nom (A-Z)</option>
              </optgroup>
              <optgroup label="Puissance">
                <option value="power-top-desc">Haut ↓</option>
                <option value="power-right-desc">Droite ↓</option>
                <option value="power-bottom-desc">Bas ↓</option>
                <option value="power-left-desc">Gauche ↓</option>
              </optgroup>
            </select>
          </div>

          <div class="element-filter-bar">
            <div v-for="element in uniqueElements" :key="element"
                 class="element-btn"
                 :class="{ active: selectedElements.includes(element) }"
                 @click="toggleElement(element)"
                 :title="element">
              <ElementIcon :element="element" :active="selectedElements.includes(element)" />
            </div>
          </div>

          <div class="toggle-filters-row">
            <div class="btn-toggle-mini glass-panel">
              <button @click="filterOwnership = ''" :class="{ active: filterOwnership === '' }">Toutes</button>
              <button @click="filterOwnership = 'owned'" :class="{ active: filterOwnership === 'owned' }">Possédées</button>
            </div>
            <div class="btn-toggle-mini glass-panel">
              <button @click="filterPremium = ''" :class="{ active: filterPremium === '' }">✨</button>
              <button @click="filterPremium = 'premium'" :class="{ active: filterPremium === 'premium' }">⭐</button>
              <button @click="filterPremium = 'regular'" :class="{ active: filterPremium === 'regular' }">🃏</button>
            </div>
          </div>
        </div>

        <div class="library-stats">
          {{ filteredCards.length }} cartes disponibles
        </div>

        <div class="library-grid">
          <div v-for="card in filteredCards" :key="card.id" class="lib-card-wrapper"
            @click="toggleCard(card.id)" @contextmenu.prevent="setCover(card.id)">
            <TripleTriadCard :card="card" size="sm" flat
              :unowned="!isOwned(card.id)" :selected="isInDeck(card.id)"
              :isCover="state.editingDeck.cover === card.id" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
import { ref, computed, onMounted } from 'vue';
import PageLayout from '../components/PageLayout.vue';

import { state, cardLibrary, getCardById } from '../game/state.js';
import { useUserStore } from '../stores/userStore.js';
const userStore = useUserStore();
import TripleTriadCard from '../components/TripleTriadCard.vue';
import ElementIcon from '../components/ElementIcon.vue';
import AnimatedCardBack from '../components/AnimatedCardBack.vue';
import { GameEngine } from '../../../shared/GameEngine.ts';

const props = defineProps({
  documentId: {
    type: String,
    default: null
  }
});

onMounted(async () => {
  if (props.documentId) {
    // Ensure decks are loaded
    if (!userStore.decksLoaded) {
      await userStore.fetchUserDecks();
    }
    
    const deck = userStore.userDecks.find(d => d.documentId === props.documentId);
    if (deck) {
      state.editingDeck.id = deck.id;
      state.editingDeck.documentId = deck.documentId;
      state.editingDeck.name = deck.name;
      state.editingDeck.cover = deck.cover;
      state.editingDeck.cards = [...deck.cards];
      state.editingDeck.cardBack = deck.cardBack || 'default';
    } else {
      console.error(`Deck with Document ID ${props.documentId} not found.`);
      router.push('/decks');
    }
  }

  if (isAdminMode.value) {
    allUsers.value = await userStore.fetchUsers();
    // If we are editing an existing deck, preset the owner
    if (props.documentId) {
        const deck = userStore.userDecks.find(d => d.documentId === props.documentId);
        // We'll need to fetch the deck detail to get its actual owner if it's not the current user
        // But for now, let's assume userDecks has all info we need or we'll fetch it
        try {
            const res = await strapiService.findOne('decks', props.documentId, { populate: ['user'] });
            if (res.data && res.data.user) {
              selectedOwnerId.value = res.data.user.documentId || res.data.user.id;
            }
        } catch (e) {
            console.error("Failed to fetch deck owner", e);
        }
    } else {
        selectedOwnerId.value = userStore.user.documentId || userStore.user.id;
    }
  }
});

const searchQuery = ref('');
const sortBy = ref('rarity-desc');
const selectedElements = ref([]);
const filterRarity = ref('');
const filterOwnership = ref('owned');
const filterPremium = ref('');
const importCode = ref('');
const feedback = ref('');
const feedbackType = ref('info');
const allUsers = ref([]);
const selectedOwnerId = ref(null);

const isAdminMode = computed(() => route.path.startsWith('/admin'));

const uniqueElements = [
  'eau', 'radiation', 'reseau', 'spore', 'furtif', 
  'longue_portee', 'faille_dimensionnelle', 'hacking', 'obsidienne'
];

const uniqueRarities = [
  { value: 'common', label: 'Commune' },
  { value: 'uncommon', label: 'Peu Commune' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Épique' },
  { value: 'legendary', label: 'Légendaire' }
];

function getRarity(card) {
  if (card.rarity) return card.rarity.toLowerCase();
  const level = GameEngine.calculateCardLevel(card);
  if (level <= 2) return 'common';
  if (level <= 4) return 'uncommon';
  if (level <= 6) return 'rare';
  if (level <= 8) return 'epic';
  return 'legendary';
}

const rarityOrder = { 'common': 1, 'uncommon': 2, 'rare': 3, 'epic': 4, 'legendary': 5 };

const parsePowerValue = (val) => {
  if (val === 'A' || val === 'a') return 10;
  return parseInt(val) || 0;
};

const toggleElement = (el) => {
  const index = selectedElements.value.indexOf(el);
  if (index > -1) {
    selectedElements.value.splice(index, 1);
  } else {
    selectedElements.value.push(el);
  }
};

const isNew = computed(() => !state.editingDeck.documentId);

function closeDeckEditor() {
  if (isAdminMode.value) {
    router.push('/admin/decks');
  } else {
    router.push('/decks');
  }
}

function isOwned(cardId) {
  if (!userStore.strapiConnected) return true; // Offline: all cards owned
  // If editing an admin deck, we allow all cards
  if (isAdminMode.value) return true;
  return userStore.collection.some(c => c.cardId === cardId);
}

function isInDeck(cardId) {
  return state.editingDeck.cards.includes(cardId);
}

function toggleCard(cardId) {
  if (!isOwned(cardId)) return;
  const idx = state.editingDeck.cards.indexOf(cardId);
  
  if (isAdminMode.value) {
    // Admin: unconditional add (allow duplicates and ignore limit)
    state.editingDeck.cards.push(cardId);
    return;
  }

  if (idx > -1) {
    state.editingDeck.cards.splice(idx, 1);
  } else if (state.editingDeck.cards.length < 15) {
    state.editingDeck.cards.push(cardId);
  }
}

function removeCard(cardId) {
  const idx = state.editingDeck.cards.indexOf(cardId);
  if (idx > -1) state.editingDeck.cards.splice(idx, 1);
}

function setCover(cardId) {
  if (isInDeck(cardId)) {
    state.editingDeck.cover = cardId;
    showFeedback(`Couverture changée : ${getCardById(cardId)?.name}`, 'info');
  }
}

async function saveDeck() {
  if (!isAdminMode.value && state.editingDeck.cards.length !== 15) return;
  
  // If admin, we should make sure the deck is saved correctly
  const success = await userStore.saveDeck({ ...state.editingDeck }, selectedOwnerId.value);
  
  if (success) {
    showFeedback('Deck enregistré !', 'success');
    setTimeout(() => {
      if (route.query.from === 'admin') {
        router.push('/admin/decks');
      } else {
        router.push('/decks');
      }
    }, 800);
  } else {
    showFeedback('Erreur lors de l\'enregistrement.', 'error');
  }
}

function showFeedback(msg, type = 'info') {
  feedback.value = msg;
  feedbackType.value = type;
  setTimeout(() => { feedback.value = ''; }, 3000);
}

function importDeckCode() {
  if (!importCode.value) return;
  try {
    const decoded = atob(importCode.value);
    const ids = decoded.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    const valid = ids.filter(id => isOwned(id) && cardLibrary.find(c => c.id === id)).slice(0, 15);
    state.editingDeck.cards = valid;
    importCode.value = '';
    showFeedback(`${valid.length} cartes importées.`, valid.length === ids.length ? 'success' : 'info');
  } catch {
    showFeedback('Code invalide.', 'error');
  }
}

function exportDeckCode() {
  if (state.editingDeck.cards.length === 0) return;
  const code = btoa(state.editingDeck.cards.join(','));
  navigator.clipboard.writeText(code).then(() => {
    showFeedback('Code copié !', 'success');
  });
}

function getBarHeight(level) {
  const count = state.editingDeck.cards.filter(id => {
    const card = getCardById(id);
    return card && GameEngine.calculateCardLevel(card) === level;
  }).length;
  const max = Math.max(1, ...Array.from({ length: 10 }, (_, i) =>
    state.editingDeck.cards.filter(id => {
      const card = getCardById(id);
      return card && GameEngine.calculateCardLevel(card) === i + 1;
    }).length
  ));
  return (count / max) * 100;
}

const filteredCards = computed(() => {
  let result = [...cardLibrary];

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
  }

  if (selectedElements.value.length > 0) {
    result = result.filter(c => {
      const cardElements = c.elements || (c.element && c.element !== 'None' ? [c.element] : []);
      return selectedElements.value.some(el => cardElements.includes(el));
    });
  }

  if (filterRarity.value) {
    result = result.filter(c => getRarity(c) === filterRarity.value);
  }

  if (filterOwnership.value) {
    result = result.filter(c => {
      const owned = isOwned(c.id);
      return filterOwnership.value === 'owned' ? owned : !owned;
    });
  }

  if (filterPremium.value) {
    result = result.filter(c => {
      const premium = userStore.collection.some(item => item.cardId === c.id && item.isPremium);
      return filterPremium.value === 'premium' ? premium : !premium;
    });
  }

  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'level-desc': return GameEngine.calculateCardLevel(b) - GameEngine.calculateCardLevel(a) || a.id - b.id;
      case 'level-asc': return GameEngine.calculateCardLevel(a) - GameEngine.calculateCardLevel(b) || a.id - b.id;
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'rarity-desc': return (rarityOrder[getRarity(b)] - rarityOrder[getRarity(a)]) || a.id - b.id;
      case 'rarity-asc': return (rarityOrder[getRarity(a)] - rarityOrder[getRarity(b)]) || a.id - b.id;
      case 'power-top-desc': return parsePowerValue(b.topValue) - parsePowerValue(a.topValue) || a.id - b.id;
      case 'power-right-desc': return parsePowerValue(b.rightValue) - parsePowerValue(a.rightValue) || a.id - b.id;
      case 'power-bottom-desc': return parsePowerValue(b.bottomValue) - parsePowerValue(a.bottomValue) || a.id - b.id;
      case 'power-left-desc': return parsePowerValue(b.leftValue) - parsePowerValue(a.leftValue) || a.id - b.id;
      case 'id-asc':
      default: return a.id - b.id;
    }
  });

  return result;
});

const sortedDeckCards = computed(() => {
  return [...state.editingDeck.cards].sort((aId, bId) => {
    const a = getCardById(aId);
    const b = getCardById(bId);
    if (!a || !b) return 0;

    const rA = rarityOrder[getRarity(a)];
    const rB = rarityOrder[getRarity(b)];
    
    if (rA !== rB) return rB - rA; // Rarest first
    
    const lA = GameEngine.calculateCardLevel(a);
    const lB = GameEngine.calculateCardLevel(b);
    if (lA !== lB) return lB - lA; // Highest level first
    
    return a.name.localeCompare(b.name); // Alphabetical
  });
});
</script>

<style scoped>
.deck-back-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.back-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #444;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.back-option.active {
  border-color: #00ff88;
  background: rgba(0, 255, 136, 0.1);
}
.back-preview-img {
  width: 40px;
  height: 60px;
  margin-bottom: 5px;
}
.back-preview-animated {
  width: 40px;
  height: 60px;
  margin-bottom: 5px;
  border-radius: 4px;
  overflow: hidden;
}

.deck-editor-page {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at 30% 40%, #1a1a2e 0%, #0d0d14 100%);
  z-index: 500;
  display: flex;
  flex-direction: column;
  color: white;
  pointer-events: auto;
  overflow: hidden;
}

.page-header {
  height: 70px;
  background: rgba(0, 0, 0, 0.6);
  border-bottom: 2px solid #ff0055;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  box-shadow: 0 4px 20px rgba(255, 0, 85, 0.2);
  flex-shrink: 0;
}

.back-btn {
  background: transparent;
  border: 1px solid #ff0055;
  color: #ff0055;
  padding: 8px 18px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: rgba(255, 0, 85, 0.2);
  box-shadow: 0 0 10px #ff0055;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: 4px;
  text-shadow: 0 0 15px #ff0055;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.deck-counter {
  font-size: 1.4rem;
  font-weight: bold;
  color: #aaa;
  transition: color 0.3s;
}

.deck-counter.full {
  color: #00ff88;
  text-shadow: 0 0 10px #00ff88;
}

.save-btn {
  background: linear-gradient(135deg, #00ff88, #00d2ff);
  color: #0d0d14;
  border: none;
  padding: 10px 25px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.save-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.save-btn:not(:disabled):hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
}

/* Editor Body: Two columns */
.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* LEFT panel: Deck info */
.deck-panel {
  width: 360px;
  background: rgba(0, 0, 0, 0.3);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow-y: auto;
  flex-shrink: 0;
}

.deck-name-input {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #444;
  color: white;
  font-size: 1.2rem;
  border-radius: 8px;
  text-align: center;
  letter-spacing: 1px;
}

.deck-name-input:focus {
  border-color: #ff0055;
  outline: none;
}

.feedback-bar {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  text-align: center;
}

.feedback-bar.success {
  background: rgba(0, 255, 136, 0.15);
  color: #00ff88;
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.feedback-bar.error {
  background: rgba(255, 0, 85, 0.15);
  color: #ff0055;
  border: 1px solid rgba(255, 0, 85, 0.3);
}

.feedback-bar.info {
  background: rgba(0, 210, 255, 0.15);
  color: #00d2ff;
  border: 1px solid rgba(0, 210, 255, 0.3);
}

.import-export-row {
  display: flex;
  gap: 8px;
}

.import-input {
  flex: 1;
  padding: 8px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid #444;
  color: white;
  border-radius: 5px;
  font-size: 0.8rem;
}

.action-btn {
  background: #2a2a35;
  border: 1px solid #444;
  color: #ccc;
  padding: 8px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.75rem;
  white-space: nowrap;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #3a3a45;
  border-color: #666;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Mana curve */
.mana-curve {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 10px;
}

.curve-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 8px;
  text-align: center;
}

.curve-bars {
  display: flex;
  gap: 4px;
  height: 50px;
  align-items: flex-end;
}

.bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.bar {
  width: 100%;
  background: linear-gradient(to top, #ff0055, #ff6b9d);
  border-radius: 2px 2px 0 0;
  min-height: 2px;
  transition: height 0.3s;
}

.bar-label {
  font-size: 0.6rem;
  color: #666;
  margin-top: 3px;
}

/* Deck cards grid */
.deck-cards-title {
  font-size: 0.8rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.deck-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.deck-card-slot {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0;
  text-align: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  min-height: 32px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.deck-card-slot:hover {
  border-color: #ff0055;
}

.deck-card-slot.empty {
  opacity: 0.3;
  cursor: default;
}

.deck-card-img {
  width: 40px;
  height: 40px;
  border-radius: 4px;
}

.deck-card-name {
  font-size: 0.6rem;
  color: #aaa;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

/* RIGHT: Library panel */
.library-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
}

.library-stats {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 8px;
}

.filter-row-secondary {
  display: flex;
  gap: 8px;
}

.filter-select {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  color: white;
  border: 1px solid #444;
  padding: 8px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.element-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  background: rgba(0,0,0,0.2);
  padding: 6px;
  border-radius: 8px;
}

.element-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 4px;
}

.element-btn:hover {
  background: rgba(255,255,255,0.1);
}

.element-btn.active {
  border-color: #00d2ff;
  background: rgba(0, 210, 255, 0.1);
  box-shadow: 0 0 8px rgba(0, 210, 255, 0.3);
}

.toggle-filters-row {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.btn-toggle-mini {
  display: flex;
  background: rgba(0,0,0,0.3);
  padding: 2px;
  border-radius: 6px;
  border: 1px solid #444;
}

.btn-toggle-mini button {
  background: transparent;
  border: none;
  color: #888;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-toggle-mini button.active {
  background: #333;
  color: #00d2ff;
  font-weight: bold;
}

.library-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
  padding-right: 8px;
  align-content: start;
}

.lib-card-wrapper {
  cursor: pointer;
  display: flex;
  justify-content: center;
}

.lib-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.lib-card:hover {
  border-color: #00d2ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 210, 255, 0.2);
}

.lib-card.locked {
  opacity: 0.3;
  cursor: not-allowed;
}

.lib-card.selected {
  border-color: #ff0055;
  background: rgba(255, 0, 85, 0.1);
  box-shadow: 0 0 12px rgba(255, 0, 85, 0.3);
}

.lib-card.is-cover {
  border-color: gold;
}

.lib-card-img {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  margin-bottom: 6px;
}

.lib-card-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lib-card-name {
  font-size: 0.7rem;
  color: #ccc;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.lib-card-level {
  font-size: 0.65rem;
  color: #666;
}

.lib-card-stats {
  display: flex;
  justify-content: space-around;
  font-size: 0.65rem;
  color: #888;
  margin-top: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 2px 0;
}

.selected-check {
  position: absolute;
  top: 5px;
  right: 5px;
  background: #ff0055;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
}

.cover-badge {
  position: absolute;
  top: 5px;
  left: 5px;
  color: gold;
  font-size: 1rem;
  text-shadow: 0 0 8px gold;
}

/* Scrollbar styling */
.library-grid::-webkit-scrollbar {
  width: 6px;
}

.library-grid::-webkit-scrollbar-track {
  background: transparent;
}

.library-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.deck-panel::-webkit-scrollbar {
  width: 4px;
}

.deck-panel::-webkit-scrollbar-track {
  background: transparent;
}

.deck-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

@media (max-width: 768px) {
  .editor-body {
    flex-direction: column;
  }

  .deck-panel {
    width: 100%;
    max-height: 300px;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>
