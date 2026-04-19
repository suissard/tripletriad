<template>
  <PageLayout title="MA COLLECTION" back-route="/">
  <template #header-actions>
    <div class="header-stats">
      Possédées : {{ ownedUniqueCount }} / {{ totalLibraryCount }}
      <span style="margin-left: 20px; color: #ffc107;">✨ Poussière: {{ userStore.user?.dust || 0 }}</span>
    </div>
  </template>

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
                <span>Niveau {{ GameEngine.calculateCardLevel(selectedCard) }}</span>
                <span v-if="selectedCard.elements && selectedCard.elements.length">
                  {{ selectedCard.elements.map(e => getElementEmoji(e) + ' ' + e).join(', ') }}
                </span>
                <span v-if="selectedCard.factionCode && selectedCard.factionCode !== 'NEUTRAL'">
                  Faction: {{ selectedCard.faction }}
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

              <div class="zoom-skills" v-if="selectedCard.data && selectedCard.data.skills && selectedCard.data.skills.length">
                <h4 class="zoom-skills-title">Compétences:</h4>
                <div class="zoom-skill-list">
                  <div class="zoom-skill-item" v-for="(skill, idx) in selectedCard.data.skills" :key="idx">
                    <span class="skill-name">{{ skill.type }}</span>
                    <span class="skill-val" v-if="skill.value">{{ skill.value }}</span>
                  </div>
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
           <div class="search-filter-main">
             <input type="text" v-model="searchQuery" placeholder="Rechercher une carte (nom)..." class="filter-input-large" />
             <button class="toggle-filters-btn" @click="showFilters = !showFilters" :class="{ active: showFilters }">
               <span class="icon">{{ showFilters ? '▲' : '▼' }}</span>
               <span class="text">{{ showFilters ? 'Moins de filtres' : 'Plus de filtres' }}</span>
             </button>
           </div>

           <transition name="expand-filters">
             <div v-if="showFilters" class="collapsible-filters-region">
               <div class="filters-row">
                 <select v-model="filterFaction" class="filter-select">
                   <option value="">Toutes les factions</option>
                   <option v-for="f in availableFactions" :key="f" :value="f">{{ f }}</option>
                 </select>

                 <select v-model="filterCollection" class="filter-select">
                   <option value="">Toutes les collections</option>
                   <option v-for="c in availableCollections" :key="c" :value="c">{{ c }}</option>
                 </select>

                 <select v-model="filterRarity" class="filter-select">
                   <option value="">Toutes les raretés</option>
                   <option v-for="rarity in uniqueRarities" :key="rarity.value" :value="rarity.value">{{ rarity.label }}</option>
                 </select>

                 <select v-model="sortBy" class="filter-select sort-select">
                   <option value="name:asc">Nom (A-Z)</option>
                   <option value="name:desc">Nom (Z-A)</option>
                   <option value="rarity:asc">Rareté (Plus rare d'abord)</option>
                   <option value="rarity:desc">Rareté (Moins rare d'abord)</option>
                   <option value="id:asc">Numéro</option>
                 </select>
               </div>

               <div class="filters-row">
                 <div class="filter-group">
                   <div class="element-filter-row">
                     <span class="filter-label">Élément :</span>
                     <div v-for="element in uniqueElements" :key="element"
                          class="element-btn-icon-wrapper"
                          :class="{ active: selectedElements.includes(element) }"
                          @click="toggleElement(element)"
                          :title="element">
                       <ElementIcon :element="element" :active="selectedElements.includes(element)" />
                     </div>
                   </div>
                 </div>
               </div>

               <div class="filters-row">
                 <div class="toggle-group">
                   <span class="filter-label">Possession :</span>
                   <div class="btn-toggle-row">
                     <button @click="filterOwnership = ''" :class="{ active: filterOwnership === '' }">Toutes</button>
                     <button @click="filterOwnership = 'owned'" :class="{ active: filterOwnership === 'owned' }">Possédées</button>
                     <button @click="filterOwnership = 'unowned'" :class="{ active: filterOwnership === 'unowned' }">Non-possédées</button>
                   </div>
                 </div>

                 <div class="toggle-group">
                   <span class="filter-label">Qualité :</span>
                   <div class="btn-toggle-row">
                     <button @click="filterPremium = ''" :class="{ active: filterPremium === '' }">Toutes</button>
                     <button @click="filterPremium = 'premium'" :class="{ active: filterPremium === 'premium' }">Premium</button>
                     <button @click="filterPremium = 'regular'" :class="{ active: filterPremium === 'regular' }">Normales</button>
                   </div>
                 </div>
               </div>
             </div>
           </transition>
         </div>


          <div class="collection-stats-bar">
            <div class="results-info">
              Résultats : <strong>{{ totalCardCount }}</strong> cartes
            </div>
            
            <div class="bar-actions">
              <button class="mass-disenchant-btn" @click="handleMassDisenchant">✨ Désenchantement de Masse</button>
            </div>
          </div>

          <div v-if="isLoadingCards" class="loading-indicator">Chargement des cartes...</div>

          <TripleTriadCardGrid
       :cards="displayCards.map(c => ({...c, quantity: getOwnedQuantity(c.id), isPremium: isOwnedPremium(c.id)}))"
       cardSize="md"
       :showOwnNum="true"
       @long-left-click="c => openCardDetail(c)"
     />
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
  </PageLayout>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

import PageLayout from '../components/PageLayout.vue';
import { state, cardLibrary, getCardById, normalizeCard } from '../game/state.js';
import { ELEMENTS } from '../data/factions.js';
import TripleTriadCard from '../components/TripleTriadCard.vue';
import TripleTriadCardGrid from '../components/TripleTriadCardGrid.vue';
import ElementIcon from '../components/ElementIcon.vue';
import { useUserStore } from '../stores/userStore.js';
import { GameEngine } from '../../../shared/GameEngine.ts';
import strapiService from '../api/strapi.js';

const userStore = useUserStore();

// ===== Server-side data =====
const displayCards = ref([]);
const totalCardCount = ref(0);
const isLoadingCards = ref(false);

// ===== Dynamic filters from Strapi =====
const availableFactions = ref([]);
const availableCollections = ref([]);

// ===== Owned count =====
const totalLibraryCount = computed(() => {
  if (!userStore.strapiConnected) return cardLibrary.length;
  return allCards.value.length;
});

const ownedUniqueCount = computed(() => {
  if (!userStore.strapiConnected) return cardLibrary.length;
  const ownedIds = new Set(userStore.collection.map(c => c.cardId));
  // Only count IDs that actually exist in our library to avoid 122/121 scenario
  const libraryIds = new Set(allCards.value.map(c => c.id));
  const validOwnedIds = [...ownedIds].filter(id => libraryIds.has(id));
  return validOwnedIds.length;
});

// ===== Filter state =====
const searchQuery = ref('');
const selectedElements = ref([]);
const filterOwnership = ref('owned');
const filterPremium = ref('');
const filterRarity = ref('');
const filterFaction = ref('');
const filterCollection = ref('');
const sortBy = ref('name:asc');
const selectedCard = ref(null);
const showFilters = ref(false); // Collapsed by default

const allCards = ref([]);
const isLibraryLoaded = ref(false);

// ===== Auto-load all logic =====
// Pagination is removed, we always fetch all cards
const cardsPerPage = ref(9999);

// ===== Mass disenchant =====
const showMassDisenchantModal = ref(false);
const isDisenchanting = ref(false);

const craftingRatios = computed(() => {
  return userStore.gameConfig?.craftingRatios || {
    "common": { craft: 40, disenchant: 10 },
    "uncommon": { craft: 80, disenchant: 20 },
    "rare": { craft: 200, disenchant: 50 },
    "epic": { craft: 400, disenchant: 100 },
    "legendary": { craft: 1600, disenchant: 400 }
  };
});

function getRarity(card) {
  if (card.rarity) return card.rarity.toLowerCase();
  const level = GameEngine.calculateCardLevel({
    top: card.topValue,
    right: card.rightValue,
    bottom: card.bottomValue,
    left: card.leftValue
  });
  if (level <= 2) return 'common';
  if (level <= 4) return 'uncommon';
  if (level <= 6) return 'rare';
  if (level <= 8) return 'epic';
  return 'legendary';
}

function getElementEmoji(element) {
  const map = { 
    'eau': '💧', 'radiation': '☢️', 'reseau': '🌐', 'spore': '🍄', 
    'furtif': '🥷', 'longue_portee': '🎯', 'faille_dimensionnelle': '🌀', 
    'hacking': '💻', 'obsidienne': '💎' 
  };
  return map[element] || '';
}

function getCraftCost(card) { return craftingRatios.value[getRarity(card)].craft; }
function getDisenchantGain(card) { return craftingRatios.value[getRarity(card)].disenchant; }
function canCraft(card) { return (userStore.user?.dust || 0) >= getCraftCost(card); }

async function handleCraft(card) {
  if (canCraft(card)) await userStore.craftCard(card.id);
}
async function handleDisenchant(card) {
  if (getOwnedQuantity(card.id) > 0) await userStore.disenchantCard(card.id);
}

function handleMassDisenchant() { showMassDisenchantModal.value = true; }

async function confirmMassDisenchant() {
  if (disenchantPreview.value.totalCards === 0) return;
  isDisenchanting.value = true;
  const success = await userStore.massDisenchantCards(); 
  isDisenchanting.value = false;
  if (success) showMassDisenchantModal.value = false;
}

const disenchantPreview = computed(() => {
  const breakdown = {
    common: { cards: 0, dust: 0 }, uncommon: { cards: 0, dust: 0 },
    rare: { cards: 0, dust: 0 }, epic: { cards: 0, dust: 0 },
    legendary: { cards: 0, dust: 0 }
  };
  let totalCards = 0;
  let totalDust = 0;
  const ratios = craftingRatios.value;
  const playableLimit = 2;
  userStore.collection.forEach(item => {
    if (item.quantity > playableLimit) {
      const surplus = item.quantity - playableLimit;
      const card = getCardById(item.cardId);
      if (card) {
        const rarity = getRarity(card);
        const dustPerCard = ratios[rarity].disenchant;
        breakdown[rarity].cards += surplus;
        breakdown[rarity].dust += (surplus * dustPerCard);
        totalCards += surplus;
        totalDust += (surplus * dustPerCard);
      }
    }
  });
  return { breakdown, totalCards, totalDust };
});

// ===== Elements & Rarities =====
const uniqueElements = ELEMENTS;

const uniqueRarities = [
  { value: 'Legendary', label: 'Légendaire' },
  { value: 'Epic', label: 'Épique' },
  { value: 'Rare', label: 'Rare' },
  { value: 'Uncommon', label: 'Peu Commune' },
  { value: 'Common', label: 'Commune' }
];

const toggleElement = (el) => {
  const index = selectedElements.value.indexOf(el);
  if (index > -1) selectedElements.value.splice(index, 1);
  else selectedElements.value.push(el);
};

// ===== Ownership helpers =====
function isOwned(cardId) {
  if (!userStore.strapiConnected) return true;
  return userStore.collection.some(c => c.cardId === cardId);
}

function getOwnedQuantity(cardId) {
  if (!userStore.strapiConnected) return 99;
  const owned = userStore.collection.find(c => c.cardId === cardId);
  return owned ? owned.quantity : 0;
}

function isOwnedPremium(cardId) {
  return userStore.collection.some(c => c.cardId === cardId && c.isPremium);
}

function openCardDetail(card) { selectedCard.value = card; }
function closeCardDetail() { selectedCard.value = null; }

// ===== Server-side fetching =====
async function fetchCards() {
  if (!userStore.strapiConnected) {
    displayCards.value = [...cardLibrary];
    totalCardCount.value = cardLibrary.length;
    isLoadingCards.value = false;
    return;
  }

  isLoadingCards.value = true;
  try {
    // 1. Initial Load: Fetch everything once if not already loaded
    if (!isLibraryLoaded.value) {
      console.log('[Collection] Loading full library from Strapi...');
      let allRawCards = [];
      let page = 1;
      let strapiPageCount = 1;
      const STRAPI_MAX_PAGE_SIZE = 100;

      do {
        const queryParams = {
          populate: ['image', 'collection'],
          pagination: { page, pageSize: STRAPI_MAX_PAGE_SIZE },
        };
        const result = await strapiService.find('cards', queryParams);
        const rawCards = Array.isArray(result) ? result : (result?.data || []);
        allRawCards = [...allRawCards, ...rawCards];

        const meta = result?.meta?.pagination;
        strapiPageCount = meta?.pageCount || 1;
        page++;
      } while (page <= strapiPageCount);

      allCards.value = allRawCards.map(c => normalizeCard(c));
      isLibraryLoaded.value = true;
      console.log(`[Collection] Library loaded: ${allCards.value.length} cards.`);
    }

    // 2. Local Filtering
    let filtered = [...allCards.value];

    // Search Query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(q));
    }

    // Faction
    if (filterFaction.value) {
      filtered = filtered.filter(c => c.faction === filterFaction.value);
    }

    // Collection
    if (filterCollection.value) {
      filtered = filtered.filter(c => c.collectionName === filterCollection.value);
    }

    // Rarity
    if (filterRarity.value) {
      filtered = filtered.filter(c => c.rarity === filterRarity.value);
    }

    // Elements
    if (selectedElements.value.length > 0) {
      filtered = filtered.filter(c => selectedElements.value.includes(c.element));
    }

    // Ownership & Premium
    filtered = filtered.filter(c => {
      const quantity = getOwnedQuantity(c.id);
      const premium = isOwnedPremium(c.id);

      // Ownership Filter
      if (filterOwnership.value === 'owned' && quantity === 0) return false;
      if (filterOwnership.value === 'unowned' && quantity > 0) return false;

      // Premium Filter
      if (filterPremium.value === 'premium' && !premium) return false;
      if (filterPremium.value === 'regular' && premium) return false;

      return true;
    });

    // 3. Local Sorting
    filtered.sort((a, b) => {
      const [field, order] = sortBy.value.split(':');
      const isAsc = order === 'asc';

      if (field === 'name') {
        return isAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (field === 'rarity') {
        const rarityOrder = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
        const valA = rarityOrder.indexOf(a.rarity || 'Common');
        const valB = rarityOrder.indexOf(b.rarity || 'Common');
        return isAsc ? valA - valB : valB - valA;
      }
      if (field === 'id') {
        return isAsc ? a.id - b.id : b.id - a.id;
      }
      return 0;
    });

    displayCards.value = filtered;
    totalCardCount.value = filtered.length;

    // Fallback: Populate filters from loaded cards if they are empty
    if (availableFactions.value.length <= 10 && availableCollections.value.length === 0) {
      const factions = new Set(availableFactions.value);
      const collections = new Set(availableCollections.value);
      allCards.value.forEach(card => {
        if (card.faction) factions.add(card.faction);
        if (card.collectionName) collections.add(card.collectionName);
      });
      if (factions.size > availableFactions.value.length) availableFactions.value = [...factions].sort();
      if (collections.size > 0) availableCollections.value = [...collections].sort();
    }
  } catch (e) {
    console.error('[Collection] Local filter/sort failed:', e);
    displayCards.value = [...cardLibrary];
    totalCardCount.value = cardLibrary.length;
  } finally {
    isLoadingCards.value = false;
  }
}

async function fetchFilters() {
  try {
    const result = await strapiService.request('GET', '/cards/filters');
    if (result && !result.error) {
      availableFactions.value = result.factions || [];
      availableCollections.value = result.collections || [];
    } else {
      throw new Error('Endpoint returned error or 404');
    }
  } catch (e) {
    console.warn('[Collection] Custom filters endpoint failed, using fallback:', e);
    // Fallback: Populate from current cards if possible
    if (displayCards.value.length > 0) {
      const factions = new Set(availableFactions.value);
      const collections = new Set(availableCollections.value);
      displayCards.value.forEach(card => {
        if (card.faction) factions.add(card.faction);
        if (card.collectionName) collections.add(card.collectionName);
      });
      availableFactions.value = [...factions].sort();
      availableCollections.value = [...collections].sort();
    }
    
    // Additional hardcoded fallback for factions (from schema)
    if (availableFactions.value.length === 0) {
      availableFactions.value = [
        "neutre", "Hégémonie Martienne", "Exode Pélagique", "Héritiers des Cendres",
        "Omni-Réseau", "Chœur Synthétique", "Éveil Chthonien", "Incursion Dissonante",
        "Ferrailleurs de la Ceinture", "Fléau Spore"
      ].sort();
    }
  }
}

// ===== Watchers =====
watch([filterFaction, filterCollection, filterRarity, selectedElements, filterOwnership, filterPremium, sortBy], () => {
  fetchCards();
});

watch(searchQuery, () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    fetchCards();
  }, 350);
});

// ===== Init =====
onMounted(async () => {
  await fetchFilters();
  await fetchCards();
});

// No cleanup needed for resize
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
  flex: 1;
  padding: 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #555;
  color: white;
  border-radius: 5px;
  font-size: 1.1rem;
}

.search-filter-main {
  display: flex;
  gap: 15px;
  align-items: center;
}

.toggle-filters-btn {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.4);
  color: #2196f3;
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  white-space: nowrap;
}

.toggle-filters-btn:hover {
  background: rgba(33, 150, 243, 0.2);
  border-color: #2196f3;
  box-shadow: 0 0 10px rgba(33, 150, 243, 0.3);
}

.toggle-filters-btn.active {
  background: #2196f3;
  color: white;
}

.collapsible-filters-region {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Transition Expand-Filters */
.expand-filters-enter-active,
.expand-filters-leave-active {
  transition: all 0.3s ease;
  max-height: 400px;
  opacity: 1;
  overflow: hidden;
}

.expand-filters-enter-from,
.expand-filters-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  margin-top: 0;
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

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.element-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.element-btn-icon-wrapper {
  width: 44px;
  height: 44px;
  padding: 6px;
  background: rgba(42, 42, 53, 0.4);
  border: 1px solid #444;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.element-btn-icon-wrapper:hover {
  background: rgba(58, 58, 69, 0.6);
  border-color: #666;
  transform: translateY(-2px);
}

.element-btn-icon-wrapper.active {
  background: rgba(0, 188, 212, 0.2);
  border-color: #00bcd4;
  box-shadow: 0 0 15px rgba(0, 188, 212, 0.4);
}

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.btn-toggle-row {
  display: flex;
  background: rgba(0,0,0,0.3);
  padding: 4px;
  border-radius: 6px;
  border: 1px solid #444;
}

.btn-toggle-row button {
  flex: 1;
  background: transparent;
  border: none;
  color: #999;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-toggle-row button.active {
  background: #2196f3;
  color: white;
  box-shadow: 0 2px 6px rgba(33, 150, 243, 0.3);
}

.sort-select optgroup {
  background: #1a1a2e;
  color: #888;
  font-style: normal;
  font-weight: bold;
}



.loading-indicator {
  text-align: center;
  padding: 40px;
  font-size: 1.2rem;
  color: #aaa;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
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



/* Zoom skills styles */
.zoom-skills {
  margin-top: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  border-left: 3px solid #00bcd4;
}

.zoom-skills-title {
  margin: 0 0 10px 0;
  color: #00bcd4;
  font-size: 1.1rem;
}

.zoom-skill-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.zoom-skill-item {
  display: flex;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: bold;
}

.skill-name {
  color: #e0e0e0;
  text-transform: capitalize;
}

.skill-val {
  color: #ff9800;
}
</style>
