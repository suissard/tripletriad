<template>
  <div class="collection-page ui-layer" v-if="state.showCollectionPage">
    <div class="page-header">
      <button class="back-btn" @click="closeCollection">← RETOUR</button>
      <h2 class="page-title">MA COLLECTION</h2>
      <div class="header-stats">
        Possédées : {{ state.collection.length }} / {{ cardLibrary.length }}
      </div>
    </div>

    <div class="page-content">
      <!-- Detail View Overlay -->
      <div v-if="selectedCard" class="card-detail-overlay" @click.self="closeCardDetail">
        <div class="detail-card" :class="[getRarityClass(selectedCard.level), { locked: !isOwned(selectedCard.id) }]">
           <button class="close-detail-btn" @click="closeCardDetail">×</button>
           <h3 class="detail-name">{{ selectedCard.name }}</h3>
           <div class="detail-level">Niveau {{ selectedCard.level }}</div>
           <div class="detail-element" v-if="selectedCard.element !== 'None'">Élément : {{ selectedCard.element }}</div>
           <div class="detail-img-container">
             <img :src="selectedCard.img" class="detail-img" />
             <div class="detail-stats-cross">
               <div class="stat top">{{ selectedCard.topValue }}</div>
               <div class="stat right">{{ selectedCard.rightValue }}</div>
               <div class="stat bottom">{{ selectedCard.bottomValue }}</div>
               <div class="stat left">{{ selectedCard.leftValue }}</div>
             </div>
           </div>
           <p class="detail-desc">{{ selectedCard.description }}</p>
           <div class="detail-status" v-if="!isOwned(selectedCard.id)">
              🔒 Non possédée
           </div>
           <div class="detail-status owned" v-else>
              ✅ Possédée ({{ getOwnedQuantity(selectedCard.id) }})
           </div>
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
               <option v-for="rarity in uniqueRarities" :key="rarity" :value="rarity">{{ rarity }}</option>
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
           Résultats : {{ filteredCardLibrary.length }} cartes | Page {{ currentPage }} / {{ totalPages || 1 }}
           <div class="pagination-controls">
             <button :disabled="currentPage === 1" @click="currentPage--">Précédent</button>
             <button :disabled="currentPage === totalPages || totalPages === 0" @click="currentPage++">Suivant</button>
           </div>
         </div>

         <div class="large-card-grid">
           <div v-for="card in paginatedCardLibrary" :key="card.id"
                class="card-slot clickable large"
                :class="[getRarityClass(card.level), { locked: !isOwned(card.id) }]"
                @click="openCardDetail(card)">
             <div class="card-name">{{ card.name }}</div>
             <img :src="card.img" class="card-img" />
             <div class="card-mana" v-if="card.manaCost !== undefined">💧 {{ card.manaCost }}</div>
             <div class="owned-badge" v-if="isOwned(card.id)">x{{ getOwnedQuantity(card.id) }}</div>
             <div class="locked-overlay" v-if="!isOwned(card.id)">🔒</div>
           </div>
         </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { state, cardLibrary } from '../game/state.js';

function closeCollection() {
  state.showCollectionPage = false;
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
  const rarities = new Set(cardLibrary.map(c => c.rarity).filter(Boolean));
  return ["Commune", "Peu Commune", "Rare", "Épique", "Légendaire"].filter(r => rarities.has(r));
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
    const rarityToMinMax = {
      'common': [1, 2],
      'uncommon': [3, 4],
      'rare': [5, 6],
      'epic': [7, 8],
      'legendary': [9, 10]
    };
    if (rarityToMinMax[filterRarity.value]) {
      const [min, max] = rarityToMinMax[filterRarity.value];
      result = result.filter(c => c.level >= min && c.level <= max);
    } else {
       result = result.filter(c => c.rarity === filterRarity.value);
    }
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

function getRarityClass(level) {
  if (level <= 2) return 'common';
  if (level <= 4) return 'uncommon';
  if (level <= 6) return 'rare';
  if (level <= 8) return 'epic';
  return 'legendary';
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

.card-slot.large {
  position: relative;
  aspect-ratio: 2.5 / 3.5;
  background: #111;
  border: 2px solid #333;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.card-slot.clickable:hover {
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 10px 20px rgba(0,0,0,0.5);
  z-index: 2;
}

.card-name {
  position: absolute;
  top: 5px;
  width: 100%;
  text-align: center;
  font-size: 0.9rem;
  font-weight: bold;
  background: rgba(0,0,0,0.6);
  padding: 2px 0;
  z-index: 1;
}

.card-img {
  width: 80%;
  height: auto;
}

.card-mana {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(0, 0, 100, 0.8);
  border-radius: 50%;
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  border: 1px solid #00d2ff;
  z-index: 2;
}

.owned-badge {
  position: absolute;
  bottom: 5px;
  right: 5px;
  background: #4caf50;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: bold;
}

.locked-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  z-index: 3;
}

/* Rarity Colors */
.common { border-color: #a0a0a0; }
.uncommon { border-color: #4caf50; }
.rare { border-color: #2196f3; }
.epic { border-color: #9c27b0; }
.legendary { border-color: #ffc107; box-shadow: 0 0 15px rgba(255, 193, 7, 0.5); }

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

.detail-card {
  position: relative;
  background: linear-gradient(135deg, #2a2a35, #111);
  border: 3px solid #555;
  border-radius: 12px;
  padding: 30px;
  width: 400px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0,0,0,0.8);
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
}

.detail-name { font-size: 2rem; margin: 0 0 10px 0; }
.detail-level { font-size: 1.2rem; color: #aaa; margin-bottom: 5px; }
.detail-element { font-size: 1.1rem; color: #4caf50; margin-bottom: 15px; }
.detail-img-container {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto 20px auto;
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 10px;
}
.detail-img { width: 100%; height: 100%; object-fit: contain; }
.detail-stats-cross {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
}
.detail-stats-cross .stat {
  position: absolute;
  background: rgba(0,0,0,0.8);
  color: #ffc107;
  font-weight: bold;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 1.2rem;
  border: 1px solid #ffc107;
}
.stat.top { top: 10px; left: 50%; transform: translateX(-50%); }
.stat.right { right: 10px; top: 50%; transform: translateY(-50%); }
.stat.bottom { bottom: 10px; left: 50%; transform: translateX(-50%); }
.stat.left { left: 10px; top: 50%; transform: translateY(-50%); }
.detail-desc { font-style: italic; color: #ccc; margin-bottom: 20px; font-size: 1.1rem; line-height: 1.5; }
.detail-status { font-weight: bold; padding: 10px; border-radius: 5px; background: rgba(255,0,0,0.2); border: 1px solid red; }
.detail-status.owned { background: rgba(76, 175, 80, 0.2); border: 1px solid #4caf50; color: #4caf50; }
</style>
