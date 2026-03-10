<template>
  <div class="collection-page ui-layer" v-if="state.showCollectionPage">

    <div class="page-header">
      <button class="back-btn" @click="closeCollection">← RETOUR</button>
      <h2 class="page-title">MA COLLECTION</h2>
      <div class="header-stats">
        Possédées : {{ state.collection.length }} / {{ cardLibrary.length }}
        <span style="margin-left: 20px; color: #ffc107;">✨ Poussière: {{ state.user?.dust || 0 }}</span>
      </div>
    </div>


    <div class="page-content">
      <!-- Detail View Overlay -->
      <div v-if="selectedCard" class="card-detail-overlay" @click.self="closeCardDetail">
        <div class="zoom-card-container" @click.stop>
            <TripleTriadCard 
              :card="selectedCard" 
              size="xl" 
              class="card-size-zoom"
              :unowned="!isOwned(selectedCard.id)" 
              :quantity="getOwnedQuantity(selectedCard.id)"
              :isPremium="isOwnedPremium(selectedCard.id)"
            />
            
            <div class="zoom-card-info">
              <h2>{{ selectedCard.name }}</h2>
              <div class="zoom-meta">
                <span>Niveau {{ selectedCard.level }}</span>
                <span v-if="selectedCard.element && selectedCard.element !== 'None'">
                  {{ getElementEmoji(selectedCard.element) }} {{ selectedCard.element }}
                </span>
                <span v-if="isOwnedPremium(selectedCard.id)" class="zoom-premium-badge">🌟 PREMIUM</span>
              </div>

              <p v-if="selectedCard.description" class="zoom-desc">{{ selectedCard.description }}</p>

              <div class="zoom-stats">
                <div class="zoom-stat-grid">
                  <span>⬆ {{ selectedCard.topValue }}</span>
                  <span>⬅ {{ selectedCard.leftValue }}</span>
                  <span>➡ {{ selectedCard.rightValue }}</span>
                  <span>⬇ {{ selectedCard.bottomValue }}</span>
                </div>
              </div>

              <div class="zoom-ownership">
                <div v-if="!isOwned(selectedCard.id)" class="ownership-status unowned">🔒 Non possédée</div>
                <div v-else class="ownership-status owned">✅ Possédée ({{ getOwnedQuantity(selectedCard.id) }})</div>
              </div>

              <div class="zoom-actions">
                <button class="zoom-action-btn craft" @click.stop="handleCraft(selectedCard)" :disabled="!canCraft(selectedCard)">
                  <span>Créer</span>
                  <span class="cost">-{{ getCraftCost(selectedCard) }} ✨</span>
                </button>
                <button class="zoom-action-btn disenchant" v-if="isOwned(selectedCard.id) && getOwnedQuantity(selectedCard.id) > 0" @click.stop="handleDisenchant(selectedCard)">
                  <span>Désenchanter</span>
                  <span class="gain">+{{ getDisenchantGain(selectedCard) }} ✨</span>
                </button>
              </div>
            </div>

            <button class="zoom-close" @click="closeCardDetail">✕</button>
        </div>
      </div>

      <!-- Main Collection View -->
      <div v-else class="collection-view">
         <div class="collection-controls-panel">
           <input type="text" v-model="searchQuery" placeholder="Rechercher une carte (nom, desc)..." class="filter-input-large" />

           <div class="mana-filter-row">
             <span class="filter-label">Mana :</span>
             <button v-for="cost in [0, 1, 2, 3, 4, 5, 6, 7]" :key="cost"
                     class="mana-btn"
                     :class="{ active: selectedManaCosts.includes(cost) }"
                     @click="toggleManaCost(cost)">
               {{ cost === 7 ? '7+' : cost }}
             </button>
           </div>

           <div class="filters-row">
             <select v-model="filterRarity" class="filter-select">
               <option value="">Toutes les raretés</option>
               <option v-for="rarity in uniqueRarities" :key="rarity.value" :value="rarity.value">{{ rarity.label }}</option>
             </select>

             <select v-model="filterFaction" class="filter-select">
               <option value="">Toutes les Factions</option>
               <option v-for="faction in uniqueFactions" :key="faction" :value="faction">{{ faction }}</option>
             </select>

             <select v-model="filterType" class="filter-select">
               <option value="">Tous les Types</option>
               <option v-for="type in uniqueTypes" :key="type" :value="type">{{ type }}</option>
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
           <div>
             Résultats : {{ filteredCardLibrary.length }} cartes | Page {{ currentPage }} / {{ totalPages || 1 }}
           </div>
           <div class="pagination-controls">
             <button class="mass-disenchant-btn" @click="handleMassDisenchant">Désenchantement de masse</button>
             <button :disabled="currentPage === 1" @click="currentPage--">Précédent</button>
             <button :disabled="currentPage === totalPages || totalPages === 0" @click="currentPage++">Suivant</button>
           </div>
         </div>


         <div class="large-card-grid">
           <TripleTriadCard
                v-for="card in paginatedCardLibrary" :key="card.id"
                :card="card"
                size="lg"
                :unowned="!isOwned(card.id)"
                :quantity="getOwnedQuantity(card.id)"
                :isPremium="isOwnedPremium(card.id)"
                @click="openCardDetail(card)"
            />
         </div>
      </div>

      <!-- Mass Disenchant Modal -->
      <div v-if="showMassDisenchantModal" class="card-detail-overlay mass-disenchant-modal-overlay" @click.self="showMassDisenchantModal = false">
        <div class="mass-disenchant-modal">
          <h3>Désenchantement de Masse</h3>
          <p class="modal-desc">
            Voulez-vous détruire vos cartes en surplus (plus de 2 exemplaires) pour récupérer de la poussière ?
          </p>

          <div v-if="disenchantPreview.totalCards > 0" class="disenchant-preview">
             <div class="preview-row header">
               <span>Rareté</span>
               <span>Cartes Détruites</span>
               <span>Poussière Gagnée</span>
             </div>
             
             <div class="preview-row" v-if="disenchantPreview.breakdown.common.cards > 0">
                <span class="rarity common">Commune</span>
                <span>{{ disenchantPreview.breakdown.common.cards }}</span>
                <span>+{{ disenchantPreview.breakdown.common.dust }} ✨</span>
             </div>
             <div class="preview-row" v-if="disenchantPreview.breakdown.uncommon.cards > 0">
                <span class="rarity uncommon">Peu Commune</span>
                <span>{{ disenchantPreview.breakdown.uncommon.cards }}</span>
                <span>+{{ disenchantPreview.breakdown.uncommon.dust }} ✨</span>
             </div>
             <div class="preview-row" v-if="disenchantPreview.breakdown.rare.cards > 0">
                <span class="rarity rare">Rare</span>
                <span>{{ disenchantPreview.breakdown.rare.cards }}</span>
                <span>+{{ disenchantPreview.breakdown.rare.dust }} ✨</span>
             </div>
             <div class="preview-row" v-if="disenchantPreview.breakdown.epic.cards > 0">
                <span class="rarity epic">Épique</span>
                <span>{{ disenchantPreview.breakdown.epic.cards }}</span>
                <span>+{{ disenchantPreview.breakdown.epic.dust }} ✨</span>
             </div>
             <div class="preview-row" v-if="disenchantPreview.breakdown.legendary.cards > 0">
                <span class="rarity legendary">Légendaire</span>
                <span>{{ disenchantPreview.breakdown.legendary.cards }}</span>
                <span>+{{ disenchantPreview.breakdown.legendary.dust }} ✨</span>
             </div>

             <div class="preview-row total">
               <span>TOTAL</span>
               <span>{{ disenchantPreview.totalCards }} cartes</span>
               <span class="total-dust">+{{ disenchantPreview.totalDust }} ✨</span>
             </div>
          </div>
          
          <div v-else class="no-surplus-msg">
            Vous n'avez actuellement aucune carte en surplus (plus de 2 exemplaires).
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="showMassDisenchantModal = false">Annuler</button>
            <button 
              class="btn-confirm" 
              :disabled="disenchantPreview.totalCards === 0 || isDisenchanting"
              @click="confirmMassDisenchant"
            >
              {{ isDisenchanting ? 'Destruction...' : 'Confirmer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue';
import { state, cardLibrary, getCardById, massDisenchantCards, craftCard, disenchantCard } from '../game/state.js';
import TripleTriadCard from './TripleTriadCard.vue';

const showMassDisenchantModal = ref(false);
const isDisenchanting = ref(false);

// Configuration for crafting/disenchanting
const craftingRatios = {
  "common": { craft: 50, disenchant: 10 },
  "uncommon": { craft: 100, disenchant: 20 },
  "rare": { craft: 400, disenchant: 50 },
  "epic": { craft: 1600, disenchant: 100 },
  "legendary": { craft: 3200, disenchant: 400 }
};

function getRarity(card) {
  if (card.rarity) return card.rarity.toLowerCase();
  const level = card.level || 1;
  if (level <= 2) return 'common';
  if (level <= 4) return 'uncommon';
  if (level <= 6) return 'rare';
  if (level <= 8) return 'epic';
  return 'legendary';
}

function getElementEmoji(element) {
  const map = { Fire: '🔥', Ice: '❄️', Thunder: '⚡', Earth: '🌍', Poison: '☠️', Wind: '🌪️', Water: '💧', Holy: '✨' };
  return map[element] || '';
}

function getCraftCost(card) {
  const rarity = getRarity(card);
  return craftingRatios[rarity].craft;
}

function getDisenchantGain(card) {
  const rarity = getRarity(card);
  return craftingRatios[rarity].disenchant;
}

function canCraft(card) {
  return (state.user?.dust || 0) >= getCraftCost(card);
}

async function handleCraft(card) {
  if (canCraft(card)) {
    await craftCard(card.id);
  }
}
async function handleDisenchant(card) {
  if (getOwnedQuantity(card.id) > 0) {
    await disenchantCard(card.id);
  }
}

function handleMassDisenchant() {
  showMassDisenchantModal.value = true;
}

async function confirmMassDisenchant() {
  if (disenchantPreview.value.totalCards === 0) return;
  
  isDisenchanting.value = true;
  const success = await massDisenchantCards(true); // skip backend confirm UI
  isDisenchanting.value = false;
  
  if (success) {
     showMassDisenchantModal.value = false;
  }
}

const disenchantPreview = computed(() => {
  const breakdown = {
    common: { cards: 0, dust: 0 },
    uncommon: { cards: 0, dust: 0 },
    rare: { cards: 0, dust: 0 },
    epic: { cards: 0, dust: 0 },
    legendary: { cards: 0, dust: 0 }
  };
  
  let totalCards = 0;
  let totalDust = 0;
  
  // Game config defaults per rarity
  const craftingRatios = {
    "common": { disenchant: 10 },
    "uncommon": { disenchant: 20 },
    "rare": { disenchant: 50 },
    "epic": { disenchant: 100 },
    "legendary": { disenchant: 400 }
  };
  
  const playableLimit = 2;

  state.collection.forEach(item => {
    if (item.quantity > playableLimit) {
      const surplus = item.quantity - playableLimit;
      const card = getCardById(item.cardId);
      
      if (card) {
        const rarity = getRarity(card);
        const dustPerCard = craftingRatios[rarity].disenchant;
        
        breakdown[rarity].cards += surplus;
        breakdown[rarity].dust += (surplus * dustPerCard);
        
        totalCards += surplus;
        totalDust += (surplus * dustPerCard);
      }
    }
  });

  return { breakdown, totalCards, totalDust };
});

function closeCollection() {
  state.showCollectionPage = false;
  window.history.pushState({}, '', '/');
}

// Filters logic
const searchQuery = ref('');
const filterFaction = ref('');
const filterType = ref('');
const selectedManaCosts = ref([]);
const filterElement = ref('');
const filterRarity = ref('');
const sortBy = ref('id-asc');
const selectedCard = ref(null);

const currentPage = ref(1);
const cardsPerPage = ref(18);

const uniqueFactions = computed(() => {
  const factions = new Set(cardLibrary.map(c => c.faction).filter(Boolean));
  return Array.from(factions).sort();
});

const uniqueTypes = computed(() => {
  const types = new Set(cardLibrary.map(c => c.type).filter(Boolean));
  return Array.from(types).sort();
});

const uniqueRarities = computed(() => {
  return [
    { value: 'common', label: 'Commune' },
    { value: 'uncommon', label: 'Peu Commune' },
    { value: 'rare', label: 'Rare' },
    { value: 'epic', label: 'Épique' },
    { value: 'legendary', label: 'Légendaire' }
  ];
});

const toggleManaCost = (cost) => {
  const index = selectedManaCosts.value.indexOf(cost);
  if (index > -1) {
    selectedManaCosts.value.splice(index, 1);
  } else {
    selectedManaCosts.value.push(cost);
  }
};

const filteredCardLibrary = computed(() => {
  let result = [...cardLibrary];

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }

  if (selectedManaCosts.value.length > 0) {
    result = result.filter(c => {
      const isSevenPlusSelected = selectedManaCosts.value.includes(7);
      if (isSevenPlusSelected && c.manaCost >= 7) return true;
      return selectedManaCosts.value.includes(c.manaCost);
    });
  }

  if (filterRarity.value) {
    result = result.filter(c => getRarity(c) === filterRarity.value);
  }

  if (filterFaction.value) {
    result = result.filter(c => c.faction === filterFaction.value);
  }

  if (filterType.value) {
    result = result.filter(c => c.type === filterType.value);
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

const totalPages = computed(() => Math.ceil(filteredCardLibrary.value.length / cardsPerPage.value));

const paginatedCardLibrary = computed(() => {
  const start = (currentPage.value - 1) * cardsPerPage.value;
  const end = start + cardsPerPage.value;
  return filteredCardLibrary.value.slice(start, end);
});

watch([searchQuery, filterRarity, filterFaction, filterType, selectedManaCosts, filterElement, sortBy], () => {
  currentPage.value = 1;
});

function isOwned(cardId) {
  // If we are overriding auth or want to test, we might bypass. But usually check state.collection
  // Wait, if not logged in, technically they own 0. But let's allow viewing.
  return state.collection.some(c => c.cardId === cardId);
}

function getOwnedQuantity(cardId) {
  const owned = state.collection.find(c => c.cardId === cardId);
  return owned ? owned.quantity : 0;
}

function isOwnedPremium(cardId) {
  return state.collection.some(c => c.cardId === cardId && c.isPremium);
}

function getRarityClass(card) {
  return getRarity(card);
}

function openCardDetail(card) {
  selectedCard.value = card;
}

function closeCardDetail() {
  selectedCard.value = null;
}
</script>

<style scoped>
.collection-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at center, #1a1a2e 0%, #0d0d14 100%);
  z-index: 500;
  display: flex;
  flex-direction: column;
  color: white;
  pointer-events: auto;
  overflow: hidden;
}

.page-header {
  height: 80px;
  background: rgba(0, 0, 0, 0.6);
  border-bottom: 2px solid #00d2ff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  box-shadow: 0 4px 20px rgba(0, 210, 255, 0.2);
}

.back-btn {
  background: transparent;
  border: 1px solid #00d2ff;
  color: #00d2ff;
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: rgba(0, 210, 255, 0.2);
  box-shadow: 0 0 10px #00d2ff;
}

.page-title {
  margin: 0;
  font-size: 2rem;
  letter-spacing: 4px;
  text-shadow: 0 0 15px #00d2ff;
}

.header-stats {
  font-size: 1.2rem;
  font-weight: bold;
  color: #a0a0ff;
}

.page-content {
  flex: 1;
  padding: 20px 40px;
  overflow-y: auto;
}

.collection-controls-panel {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.filter-input-large {
  width: 100%;
  padding: 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #555;
  color: white;
  border-radius: 5px;
  font-size: 1.1rem;
}

.mana-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.filter-label {
  font-weight: bold;
  font-size: 1.1rem;
  margin-right: 10px;
}

.mana-btn {
  background: #2a2a35;
  border: 1px solid #444;
  color: #e0e0e0;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.mana-btn:hover {
  background: #3a3a45;
}

.mana-btn.active {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.7);
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.filter-select {
  flex: 1;
  min-width: 150px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: 1px solid #555;
  padding: 10px;
  border-radius: 5px;
  font-size: 1rem;
}

.collection-stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0,0,0,0.4);
  padding: 10px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 1.1rem;
}


.pagination-controls button {
  background: #333;
  color: white;
  border: none;
  padding: 5px 15px;
  margin-left: 10px;
  border-radius: 4px;
  cursor: pointer;
}

.pagination-controls .mass-disenchant-btn {
  background: #f44336;
  font-weight: bold;
}
.pagination-controls .mass-disenchant-btn:hover {
  background: #d32f2f;
}

.pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}


.large-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
  padding-bottom: 40px;
}

/* Detail Overlay */
.card-detail-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.detail-card-wrapper {
  position: relative;
}

.close-detail-btn {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  z-index: 50;
}

/* Shared zoom style classes (duplicated for CollectionView scoped context) */
.zoom-card-container {
  display: flex;
  align-items: center;
  gap: 40px;
  cursor: default;
  position: relative;
  max-width: 90vw;
}

.zoom-card-info {
  color: white;
  max-width: 320px;
  text-align: left;
}

.zoom-card-info h2 {
  font-size: 2.2rem;
  margin: 0 0 0.4em;
  text-shadow: 0 0 15px rgba(255, 206, 0, 0.4);
  letter-spacing: 1px;
}

.zoom-desc {
  font-style: italic;
  color: #bbb;
  font-size: 1rem;
  line-height: 1.6;
  margin: 1.5rem 0;
  padding: 1rem 0;
  border-top: 1px solid rgba(255,255,255,0.1);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.zoom-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 20px;
  background: rgba(0, 0, 0, 0.3);
  padding: 12px 18px;
  border-radius: 8px;
  border: 1px solid rgba(255, 215, 0, 0.2);
  font-size: 1.2rem;
  font-weight: bold;
  color: #ffd700;
}

.zoom-meta {
  display: flex;
  gap: 15px;
  font-size: 1rem;
  color: #aaa;
  flex-wrap: wrap;
  align-items: center;
}

.zoom-premium-badge {
  color: #ffce00;
  font-weight: bold;
  text-shadow: 0 0 8px rgba(255, 206, 0, 0.6);
}

.zoom-close {
  position: absolute;
  top: -30px;
  right: -30px;
  background: rgba(255, 0, 85, 0.8);
  border: none;
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  font-size: 1.4rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 100;
}

.zoom-close:hover {
  background: #ff0055;
  transform: scale(1.1) rotate(90deg);
}

.zoom-ownership {
  margin: 1.5rem 0;
  padding: 0.6rem 1.2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  display: inline-block;
}
.ownership-status.owned { color: #4caf50; font-weight: bold; }
.ownership-status.unowned { color: #ff5252; opacity: 0.9; }

.zoom-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 1rem;
}
.zoom-action-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.9rem 1.4rem;
  border-radius: 8px;
  border: none;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
  min-width: 260px;
}
.zoom-action-btn.craft { background: #1976d2; }
.zoom-action-btn.craft:hover:not(:disabled) { background: #2196f3; transform: translateY(-2px); box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4); }
.zoom-action-btn.craft:disabled { background: #444; color: #888; cursor: not-allowed; }

.zoom-action-btn.disenchant { background: #c62828; }
.zoom-action-btn.disenchant:hover { background: #f44336; transform: translateY(-2px); box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4); }

.cost, .gain { font-size: 0.85em; opacity: 0.9; margin-left: 10px; }

/* Responsive Overlay */
@media (max-width: 900px) {
  .zoom-card-container {
    flex-direction: column;
    gap: 30px;
    padding-top: 40px;
    max-height: 95vh;
    overflow-y: auto;
  }
  .zoom-card-info { max-width: 85vw; text-align: center; }
  .zoom-stat-grid { justify-content: center; }
  .zoom-meta { justify-content: center; }
  .zoom-close { top: 10px; right: 10px; }
}

/* Mass Disenchant Modal */
.mass-disenchant-modal-overlay {
  z-index: 1050; /* Above regular detail modal */
}

.mass-disenchant-modal {
  background: #1a1a24;
  border: 2px solid #333;
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8);
  text-align: center;
}

.mass-disenchant-modal h3 {
  color: #ff5252;
  font-size: 1.8rem;
  margin-top: 0;
  margin-bottom: 15px;
  letter-spacing: 1px;
}

.modal-desc {
  font-size: 1.1rem;
  color: #ccc;
  margin-bottom: 25px;
  line-height: 1.4;
}

.disenchant-preview {
  background: rgba(0,0,0,0.4);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 25px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.preview-row:last-child {
  border-bottom: none;
}

.preview-row.header {
  font-weight: bold;
  color: #888;
  font-size: 0.9rem;
  text-transform: uppercase;
  border-bottom: 2px solid rgba(255,255,255,0.1);
  padding-bottom: 12px;
}

.preview-row.total {
  font-weight: bold;
  font-size: 1.2rem;
  border-top: 2px solid rgba(255,255,255,0.1);
  padding-top: 15px;
  margin-top: 5px;
}

.total-dust {
  color: #ffd700;
  text-shadow: 0 0 5px rgba(255, 215, 0, 0.4);
}

.rarity {
  font-weight: bold;
}
.rarity.common { color: #a0a0a0; }
.rarity.uncommon { color: #4caf50; }
.rarity.rare { color: #2196f3; }
.rarity.epic { color: #9c27b0; }
.rarity.legendary { color: #ff9800; }

.no-surplus-msg {
  padding: 30px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 25px;
  color: #aaa;
  font-style: italic;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.modal-actions button {
  padding: 12px 25px;
  font-size: 1.1rem;
  font-weight: bold;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #444;
  color: white;
}
.btn-cancel:hover {
  background: #555;
}

.btn-confirm {
  background: #f44336;
  color: white;
}
.btn-confirm:hover:not(:disabled) {
  background: #d32f2f;
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.4);
}
.btn-confirm:disabled {
  background: #555;
  color: #888;
  cursor: not-allowed;
}

</style>
