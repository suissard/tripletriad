<template>
  <div class="collection-page">
    <!-- LEFT SIDEBAR -->
    <aside class="sidebar sidebar-left">
      <div class="sidebar-section">
        <h4 class="sidebar-title">MODE</h4>
        <button class="sidebar-btn" :class="{ active: activeMode === 'collection' }" @click="activeMode = 'collection'">
          <span class="sb-icon">📜</span><span class="sb-label">Collection</span>
        </button>
        <button class="sidebar-btn" :class="{ active: activeMode === 'craft' }" @click="switchToCraftMode">
          <span class="sb-icon">✨</span><span class="sb-label">Craft</span>
        </button>
      </div>
      <div class="sidebar-section">
        <h4 class="sidebar-title">COSMÉTIQUES</h4>
        <button class="sidebar-btn disabled" disabled>
          <span class="sb-icon">🂠</span><span class="sb-label">Dos de carte</span><span class="wip-tag">WIP</span>
        </button>
        <button class="sidebar-btn" :class="{ active: activeMode === 'boards' }" @click="activeMode = 'boards'">
          <span class="sb-icon">🏞️</span><span class="sb-label">Plateaux</span>
        </button>
        <button class="sidebar-btn" :class="{ active: activeMode === 'frames' }" @click="activeMode = 'frames'">
          <span class="sb-icon">🖼️</span><span class="sb-label">Cadres</span>
        </button>
      </div>
      <!-- Craft mode: mass disenchant -->
      <div v-if="activeMode === 'craft'" class="sidebar-section craft-actions">
        <button class="mass-disenchant-sidebar-btn" @click="showMassDisenchantModal = true">🔥 Désenchantement de Masse</button>
      </div>
      <div class="sidebar-footer">
        <div class="dust-display">✨ {{ userStore.user?.dust || 0 }}</div>
      </div>
    </aside>

    <!-- CENTER (Taking all available space) -->
    <main class="center-column" ref="centerRef">
      <!-- HEADER BAR -->
      <div class="top-bar">
        <button class="back-btn" @click="router.push('/')">← Retour</button>
        <h2 class="page-title">
          {{ activeMode === 'craft' ? 'ATELIER' : (activeMode === 'boards' ? 'PLATEAUX' : (activeMode === 'frames' ? 'CADRES' : 'MA COLLECTION')) }}
        </h2>
        <div class="header-stats" v-if="activeMode === 'boards'">{{ userStore.boardBackgrounds.length }} Plateaux</div>
        <div class="header-stats" v-else-if="activeMode === 'frames'">{{ userStore.cardFrames.length }} Cadres</div>
        <div class="header-stats" v-else>{{ ownedUniqueCount }} / {{ totalLibraryCount }}</div>
      </div>

      <!-- FILTERS BAR -->
      <div class="filters-bar" v-if="activeMode !== 'boards' && activeMode !== 'frames'">
        <input type="text" v-model="searchQuery" placeholder="Rechercher..." class="search-input" />
        <select v-model="filterFaction" class="filter-sel">
          <option value="">Factions</option>
          <option v-for="f in availableFactions" :key="f" :value="f">{{ f }}</option>
        </select>
        <select v-model="sortBy" class="filter-sel">
          <option value="name:asc">Nom A-Z</option>
          <option value="name:desc">Nom Z-A</option>
          <option value="rarity:asc">+ Rare</option>
          <option value="rarity:desc">- Rare</option>
          <option value="id:asc">Numéro</option>
        </select>
        <div class="toggle-pills">
          <button :class="{ active: filterOwnership === '' }" @click="filterOwnership = ''">Toutes</button>
          <button :class="{ active: filterOwnership === 'owned' }" @click="filterOwnership = 'owned'">Possédées</button>
          <button :class="{ active: filterOwnership === 'unowned' }" @click="filterOwnership = 'unowned'">Manquantes</button>
        </div>
        <div class="toggle-pills">
          <button :class="{ active: filterPremium === '' }" @click="filterPremium = ''">Toutes</button>
          <button :class="{ active: filterPremium === 'premium' }" @click="filterPremium = 'premium'">Premium</button>
          <button :class="{ active: filterPremium === 'regular' }" @click="filterPremium = 'regular'">Normal</button>
        </div>
      </div>

      <!-- CARD GRID -->
      <div class="card-grid-area" v-if="!isLoadingCards && activeMode !== 'boards'">
        <TripleTriadCardGrid
          :cards="pageCards"
          :cardsPerRow="4"
          cardSize="lg"
          :showOwnNum="true"
          :disableZoom="false"
          :showCraftingActions="activeMode === 'craft'"
        />
      </div>
      <div v-else-if="activeMode === 'boards'" class="boards-grid-area">
        <div class="boards-grid">
          <div v-for="board in userStore.boardBackgrounds" :key="board.id" class="board-card">
            <div class="board-preview">
              <img :src="board.image" :alt="board.name" />
            </div>
            <div class="board-info">
              <h3 class="board-name">{{ board.name }}</h3>
              <p class="board-desc">{{ board.description }}</p>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="activeMode === 'frames'" class="frames-grid-area">
        <div class="boards-grid">
          <div v-for="frame in userStore.cardFrames" :key="frame.id" class="board-card" :class="{ locked: !isFrameUnlocked(frame) }">
            <div class="board-preview frame-preview-bg">
              <img v-if="frame.image" :src="frame.image" :alt="frame.name" class="frame-img" />
              <div v-else class="no-image">Aucune image</div>
            </div>
            <div class="board-info frame-info">
              <h3 class="board-name">
                {{ frame.name }}
                <span v-if="isDefaultFrame(frame)" class="default-badge" title="Cadre par défaut">★</span>
              </h3>
              <p class="board-desc">{{ frame.description }}</p>
              
              <div class="frame-actions" v-if="isFrameUnlocked(frame)">
                <button 
                  class="action-btn" 
                  :class="{ active: isDefaultFrame(frame) }" 
                  @click="setDefaultFrame(frame)"
                  :disabled="isDefaultFrame(frame) || isSettingDefault"
                >
                  {{ isDefaultFrame(frame) ? 'Par défaut' : 'Définir par défaut' }}
                </button>
                <div class="assign-deck">
                  <select v-model="selectedDeckForFrame[frame.id]" @change="assignFrameToDeck(frame, $event)" class="deck-select">
                    <option value="">+ Assigner à un deck</option>
                    <option v-for="deck in userStore.userDecks" :key="deck.id" :value="deck.documentId">
                      {{ deck.name }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="frame-locked" v-else>
                <span>🔒 Verrouillé</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="isLoadingCards" class="loading-indicator">Chargement...</div>

      <!-- PAGINATION -->
      <div class="pagination-bar" v-if="totalPages > 1 && activeMode !== 'boards' && activeMode !== 'frames'">
        <button class="pg-btn" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
        <template v-for="p in paginationRange" :key="p">
          <button v-if="p !== '...'" class="pg-btn" :class="{ active: p === currentPage }" @click="currentPage = p">{{ p }}</button>
          <span v-else class="pg-dots">…</span>
        </template>
        <button class="pg-btn" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
      </div>

      <div class="results-footer" v-if="activeMode !== 'boards' && activeMode !== 'frames'">
        {{ totalCardCount }} résultats — Page {{ currentPage }} / {{ totalPages || 1 }}
      </div>
    </main>

    <!-- RIGHT SIDEBAR (Decks) -->
    <aside class="sidebar sidebar-right" :class="{ 'collapsed': !isDeckListVisible }">
      <div class="sidebar-content-wrapper" v-if="isDeckListVisible">
        <h4 class="sidebar-title">MES DECKS</h4>
        
        <div class="deck-list custom-scrollbar">
          <div v-if="userStore.userDecks.length === 0" class="empty-decks">
            Aucun deck créé
          </div>
          <MiniDeck 
            v-for="deck in userStore.userDecks" 
            :key="deck.id" 
            :deck="deck" 
            :compact="true"
            class="deck-mini-item"
            @click="openEditDeck(deck)"
          />
        </div>

        <button class="create-deck-btn" @click="openNewDeck">
          + Nouveau Deck
        </button>
      </div>

      <!-- Toggle Button (Vertical bar at the bottom) -->
      <button class="sidebar-toggle-btn" @click="isDeckListVisible = !isDeckListVisible" :title="isDeckListVisible ? 'Réduire' : 'Développer'">
        <span class="toggle-icon">{{ isDeckListVisible ? '❯' : '❮' }}</span>
      </button>
    </aside>

    <!-- MASS DISENCHANT MODAL -->
    <div v-if="showMassDisenchantModal" class="modal-overlay" @click.self="showMassDisenchantModal = false">
      <div class="modal-box">
        <h3>🔥 Désenchantement de Masse</h3>
        <p class="modal-desc">Détruire les cartes en surplus (>2 exemplaires) pour de la poussière.</p>
        <div v-if="disenchantPreview.totalCards > 0" class="disenchant-preview">
          <div class="dp-row header"><span>Rareté</span><span>Cartes</span><span>Poussière</span></div>
          <div v-for="(data, key) in disenchantPreview.breakdown" :key="key" v-show="data.cards > 0" class="dp-row">
            <span :class="'rarity-' + key">{{ rarityLabels[key] }}</span>
            <span>{{ data.cards }}</span><span>+{{ data.dust }} ✨</span>
          </div>
          <div class="dp-row total"><span>TOTAL</span><span>{{ disenchantPreview.totalCards }}</span><span class="gold">+{{ disenchantPreview.totalDust }} ✨</span></div>
        </div>
        <div v-else class="no-surplus">Aucune carte en surplus.</div>
        <div class="modal-btns">
          <button class="btn-cancel" @click="showMassDisenchantModal = false">Annuler</button>
          <button class="btn-confirm" :disabled="disenchantPreview.totalCards === 0 || isDisenchanting" @click="confirmMassDisenchant">
            {{ isDisenchanting ? 'Destruction...' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { state, cardLibrary, getCardById } from '../game/state.js';
import { ELEMENTS } from '../data/factions.js';
import TripleTriadCardGrid from '../components/TripleTriadCardGrid.vue';
import MiniDeck from '../components/MiniDeck.vue';
import { useUserStore } from '../stores/userStore.js';
import strapiService from '../api/strapi.js';
import { normalizeCard } from '../utils/cardUtils.js';
import { getRarity as getCardRarity } from '../game/constants.js';

const router = useRouter();
const userStore = useUserStore();

// === UI State ===
const isDeckListVisible = ref(true);

// === Mode ===
const activeMode = ref('collection');
function switchToCraftMode() {
  activeMode.value = 'craft';
  filterOwnership.value = '';
}

// === Data ===
const allCards = ref([]);
const isLibraryLoaded = ref(false);
const displayCards = ref([]);
const totalCardCount = ref(0);
const isLoadingCards = ref(false);
const availableFactions = ref([]);
let searchDebounceTimer = null;

// === Filters ===
const searchQuery = ref('');
const filterFaction = ref('');
const filterOwnership = ref('owned');
const filterPremium = ref('');
const sortBy = ref('name:asc');

// === Dynamic grid sizing ===
const centerRef = ref(null);
const gridCols = ref(4);
const gridRows = ref(2);
let resizeObserver = null;

const CARD_W = 165; // card width + gap
const CARD_H = 210; // card height + gap
const FIXED_UI_HEIGHT = 220; // top-bar(~50) + filters(~90) + pagination(~50) + footer(~30)

function recalcGrid() {
  if (!centerRef.value) return;
  const w = centerRef.value.clientWidth - 48;
  const h = centerRef.value.clientHeight - FIXED_UI_HEIGHT;
  gridCols.value = Math.max(2, Math.floor(w / CARD_W));
  gridRows.value = Math.max(1, Math.floor(Math.max(200, h) / CARD_H));
}

// === Pagination ===
const currentPage = ref(1);
const cardsPerPage = ref(8); // Fixed to 8 cards per window as requested
const totalPages = computed(() => Math.max(1, Math.ceil(displayCards.value.length / cardsPerPage.value)));
const pageCards = computed(() => {
  const start = (currentPage.value - 1) * cardsPerPage.value;
  return displayCards.value.slice(start, start + cardsPerPage.value).map(c => ({
    ...c, quantity: getOwnedQuantity(c.id), isPremium: isOwnedPremium(c.id)
  }));
});

const paginationRange = computed(() => {
  const tp = totalPages.value;
  const cp = currentPage.value;
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (cp > 3) pages.push('...');
  for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i);
  if (cp < tp - 2) pages.push('...');
  pages.push(tp);
  return pages;
});

// === Stats ===
const totalLibraryCount = computed(() => !userStore.strapiConnected ? cardLibrary.length : allCards.value.length);
const ownedUniqueCount = computed(() => {
  if (!userStore.strapiConnected) return cardLibrary.length;
  const ownedIds = new Set(userStore.collection.map(c => c.cardId));
  const libraryIds = new Set(allCards.value.map(c => c.id));
  return [...ownedIds].filter(id => libraryIds.has(id)).length;
});

// === Helpers ===
function getOwnedQuantity(cardId) {
  if (!userStore.strapiConnected) return 99;
  return userStore.collection.find(c => c.cardId === cardId)?.quantity || 0;
}
function isOwnedPremium(cardId) {
  return userStore.collection.some(c => c.cardId === cardId && c.isPremium);
}

// === Mass Disenchant ===
const showMassDisenchantModal = ref(false);
const isDisenchanting = ref(false);
const rarityLabels = { common: 'Commune', uncommon: 'Peu Commune', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire' };

const craftingRatios = computed(() => userStore.gameConfig?.craftingRatios || {
  common: { craft: 40, disenchant: 10 }, uncommon: { craft: 80, disenchant: 20 },
  rare: { craft: 200, disenchant: 50 }, epic: { craft: 400, disenchant: 100 },
  legendary: { craft: 1600, disenchant: 400 }
});

function getRarity(card) {
  const norm = normalizeCard(card);
  const r = getCardRarity(norm);
  const map = { 'Commun': 'common', 'Peu Commun': 'uncommon', 'Rare': 'rare', 'Épique': 'epic', 'Légendaire': 'legendary' };
  return map[r.name] || 'common';
}

const disenchantPreview = computed(() => {
  const breakdown = { common: { cards: 0, dust: 0 }, uncommon: { cards: 0, dust: 0 }, rare: { cards: 0, dust: 0 }, epic: { cards: 0, dust: 0 }, legendary: { cards: 0, dust: 0 } };
  let totalCards = 0, totalDust = 0;
  userStore.collection.forEach(item => {
    if (item.quantity > 2) {
      const surplus = item.quantity - 2;
      const card = getCardById(item.cardId);
      if (card) {
        const r = getRarity(card);
        const d = craftingRatios.value[r].disenchant;
        breakdown[r].cards += surplus; breakdown[r].dust += surplus * d;
        totalCards += surplus; totalDust += surplus * d;
      }
    }
  });
  return { breakdown, totalCards, totalDust };
});

async function confirmMassDisenchant() {
  if (disenchantPreview.value.totalCards === 0) return;
  isDisenchanting.value = true;
  const ok = await userStore.massDisenchantCards();
  isDisenchanting.value = false;
  if (ok) showMassDisenchantModal.value = false;
}

// === Deck nav ===
function openNewDeck() {
  state.editingDeck.id = null; state.editingDeck.documentId = null;
  state.editingDeck.name = 'Nouveau Deck'; state.editingDeck.cover = null;
  state.editingDeck.cards = []; state.editingDeck.cardBack = 'default';
  state.editingDeck.cardFrame = null;
  router.push({ name: 'deck-editor-new' });
}
function openEditDeck(deck) {
  state.editingDeck.id = deck.id; state.editingDeck.documentId = deck.documentId;
  state.editingDeck.name = deck.name; state.editingDeck.cover = deck.cover;
  state.editingDeck.cards = [...deck.cards]; state.editingDeck.cardBack = deck.cardBack || 'default';
  state.editingDeck.cardFrame = deck.cardFrame || null;
  router.push({ name: 'deck-editor-edit', params: { documentId: deck.documentId } });
}

// === Frames ===
const isSettingDefault = ref(false);
const selectedDeckForFrame = ref({});

function isFrameUnlocked(frame) {
  if (!userStore.user?.unlockedCardFrames) return false;
  return userStore.user.unlockedCardFrames.some(f => f.documentId === frame.documentId || f.id === frame.id);
}

function isDefaultFrame(frame) {
  const defId = userStore.defaultFrameId;
  return defId && (defId === frame.documentId || defId === frame.id);
}

async function setDefaultFrame(frame) {
  isSettingDefault.value = true;
  await userStore.updateProfile({ defaultCardFrame: frame.documentId || frame.id });
  isSettingDefault.value = false;
}

async function assignFrameToDeck(frame, event) {
  const deckDocId = event.target.value;
  if (!deckDocId) return;
  const deck = userStore.userDecks.find(d => d.documentId === deckDocId);
  if (deck) {
    deck.cardFrame = frame.documentId || frame.id;
    await userStore.saveDeck(deck);
  }
  selectedDeckForFrame.value[frame.id] = ""; // reset dropdown
}

// === Fetching ===
async function fetchCards() {
  if (activeMode.value === 'boards' || activeMode.value === 'frames') return;
  if (!userStore.strapiConnected) {
    displayCards.value = [...cardLibrary]; totalCardCount.value = cardLibrary.length;
    isLoadingCards.value = false; return;
  }
  isLoadingCards.value = true;
  try {
    if (!isLibraryLoaded.value) {
      let raw = [], page = 1, pageCount = 1;
      do {
        const res = await strapiService.find('cards', { populate: ['image', 'collection', 'faction', 'variants'], pagination: { page, pageSize: 100 } });
        raw = [...raw, ...(Array.isArray(res) ? res : (res?.data || []))];
        pageCount = res?.meta?.pagination?.pageCount || 1; page++;
      } while (page <= pageCount);
      allCards.value = raw.map(c => normalizeCard(c));
      isLibraryLoaded.value = true;
    }
    let filtered = [...allCards.value];
    if (searchQuery.value.trim()) { const q = searchQuery.value.trim().toLowerCase(); filtered = filtered.filter(c => c.name.toLowerCase().includes(q)); }
    if (filterFaction.value) filtered = filtered.filter(c => c.faction === filterFaction.value);
    filtered = filtered.filter(c => {
      const qty = getOwnedQuantity(c.id), prem = isOwnedPremium(c.id);
      if (filterOwnership.value === 'owned' && qty === 0) return false;
      if (filterOwnership.value === 'unowned' && qty > 0) return false;
      if (filterPremium.value === 'premium' && !prem) return false;
      if (filterPremium.value === 'regular' && prem) return false;
      return true;
    });
    filtered.sort((a, b) => {
      const [field, order] = sortBy.value.split(':');
      const asc = order === 'asc';
      if (field === 'name') return asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (field === 'rarity') {
        const ro = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
        return asc ? ro.indexOf(a.rarity || 'Common') - ro.indexOf(b.rarity || 'Common') : ro.indexOf(b.rarity || 'Common') - ro.indexOf(a.rarity || 'Common');
      }
      if (field === 'id') return asc ? a.id - b.id : b.id - a.id;
      return 0;
    });
    displayCards.value = filtered; totalCardCount.value = filtered.length;
    if (availableFactions.value.length === 0) {
      const f = new Set(); allCards.value.forEach(c => { if (c.faction) f.add(c.faction); });
      if (f.size > 0) availableFactions.value = [...f].sort();
    }
  } catch (e) {
    console.error('[Collection] Error:', e);
    displayCards.value = [...cardLibrary]; totalCardCount.value = cardLibrary.length;
  } finally { isLoadingCards.value = false; }
}

async function fetchFilters() {
  try {
    const r = await strapiService.request('GET', '/cards/filters');
    if (r && !r.error) availableFactions.value = r.factions || [];
    else throw new Error('fallback');
  } catch { /* fallback handled in fetchCards */ }
}

// === Watchers ===
watch([filterFaction, filterOwnership, filterPremium, sortBy], () => { currentPage.value = 1; fetchCards(); });
watch(searchQuery, () => { clearTimeout(searchDebounceTimer); searchDebounceTimer = setTimeout(() => { currentPage.value = 1; fetchCards(); }, 350); });
watch(activeMode, () => { currentPage.value = 1; fetchCards(); });

onMounted(async () => {
  await fetchFilters();
  await fetchCards();
  userStore.fetchUserDecks();
  userStore.fetchBoardBackgrounds();
  // Setup ResizeObserver on center column (always mounted)
  if (centerRef.value) {
    recalcGrid();
    resizeObserver = new ResizeObserver(() => {
      recalcGrid();
      if (currentPage.value > totalPages.value) currentPage.value = Math.max(1, totalPages.value);
    });
    resizeObserver.observe(centerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
});
</script>

<style scoped>
/* === LAYOUT === */
.collection-page {
  position: fixed; inset: 0;
  display: grid;
  grid-template-columns: 72px 1fr auto;
  background: radial-gradient(ellipse at 30% 20%, #1a1a2e 0%, #0d0d14 100%);
  color: white; z-index: 500; overflow: hidden;
}

/* === SIDEBARS === */
.sidebar {
  display: flex; flex-direction: column; gap: 4px;
  background: rgba(0,0,0,0.5); border-right: 1px solid rgba(255,255,255,0.06);
  overflow-y: auto; padding: 10px 0;
}
.sidebar-right {
  width: 240px;
  border-right: none; border-left: 1px solid rgba(255,255,255,0.06);
  padding: 0; gap: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  background: rgba(0,0,0,0.3);
}
.sidebar-right.collapsed {
  width: 32px;
}
.sidebar-content-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 12px 60px; /* space for toggle button */
  gap: 12px;
  overflow: hidden;
  width: 240px;
}
.sidebar-title {
  font-size: 0.55rem; font-weight: 900; letter-spacing: 0.15em;
  color: #555; text-align: center; margin: 12px 0 4px; padding: 0;
}
.sidebar-right .sidebar-title { font-size: 0.7rem; text-align: left; margin: 0 0 4px; }
.sidebar-btn {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 4px; background: transparent; border: none; color: #667;
  cursor: pointer; transition: all 0.2s; border-left: 2px solid transparent;
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
}
.sidebar-btn:hover { background: rgba(255,255,255,0.04); color: #aab; }
.sidebar-btn.active {
  color: var(--color-primary); border-left-color: var(--color-primary);
  background: linear-gradient(90deg, rgba(255,191,0,0.08), transparent);
}
.sidebar-btn.disabled { opacity: 0.35; cursor: not-allowed; }
.sb-icon { font-size: 1.3rem; }
.sb-label { line-height: 1.1; }
.wip-tag {
  font-size: 0.45rem; background: rgba(255,150,0,0.2); color: #f90;
  padding: 1px 4px; border-radius: 3px; margin-top: 1px;
}
.sidebar-footer { margin-top: auto; padding: 12px 8px; text-align: center; }
.dust-display {
  font-size: 0.8rem; font-weight: 900; color: #ffc107;
  text-shadow: 0 0 8px rgba(255,193,7,0.4);
}
.craft-actions { margin-top: auto; padding: 8px; }
.mass-disenchant-sidebar-btn {
  width: 100%; padding: 8px 4px; font-size: 0.55rem; font-weight: 800;
  background: rgba(255,40,40,0.15); border: 1px solid rgba(255,40,40,0.3);
  color: #f88; border-radius: 6px; cursor: pointer; transition: all 0.2s;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.mass-disenchant-sidebar-btn:hover {
  background: rgba(255,40,40,0.3); border-color: #f55;
  box-shadow: 0 0 12px rgba(255,40,40,0.3);
}

/* === DECK LIST (RIGHT) === */
.deck-list { 
  display: flex; 
  flex-direction: column; 
  gap: 12px; 
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}
.deck-mini-item { 
  min-height: 100px !important; 
  flex-shrink: 0;
}
.empty-decks { color: #555; font-size: 0.85rem; text-align: center; font-style: italic; padding: 20px 0; }
.create-deck-btn {
  width: 100%; padding: 12px; border-radius: 8px; font-weight: 800;
  font-size: 0.85rem; cursor: pointer; transition: all 0.2s; 
  border: 1px solid rgba(0,210,255,0.3);
  background: rgba(0,210,255,0.1); color: #0df;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.create-deck-btn:hover { background: rgba(0,210,255,0.2); box-shadow: 0 0 15px rgba(0,210,255,0.2); border-color: #0df; }

/* === TOGGLE BUTTON === */
.sidebar-toggle-btn {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: rgba(255,255,255,0.03);
  border: none;
  border-top: 1px solid rgba(255,255,255,0.06);
  color: #556;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}
.sidebar-toggle-btn:hover {
  background: rgba(255,255,255,0.08);
  color: #889;
}
.toggle-icon {
  font-size: 1.2rem;
  transition: transform 0.3s;
}
.collapsed .toggle-icon {
  transform: scaleX(-1);
}

/* === CENTER COLUMN === */
.center-column {
  display: flex; flex-direction: column; min-height: 0; overflow: hidden;
}
.top-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; background: rgba(0,0,0,0.4);
  border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
}
.back-btn {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: #aab; padding: 6px 14px; border-radius: 6px; cursor: pointer;
  font-weight: 700; font-size: 0.8rem; transition: all 0.2s;
}
.back-btn:hover { background: rgba(255,255,255,0.12); color: white; }
.page-title {
  margin: 0; font-size: 1.2rem; font-weight: 900; letter-spacing: 3px;
  text-shadow: 0 0 15px rgba(0,210,255,0.3);
}
.header-stats { font-size: 0.85rem; font-weight: 700; color: #7788aa; }

/* === FILTERS === */
.filters-bar {
  display: flex; align-items: center; gap: 10px; padding: 10px 24px;
  background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.04);
  flex-shrink: 0; flex-wrap: wrap;
}
.search-input {
  flex: 1; min-width: 120px; padding: 7px 12px;
  background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
  color: white; border-radius: 6px; font-size: 0.85rem;
}
.filter-sel {
  padding: 7px 10px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
  color: white; border-radius: 6px; font-size: 0.8rem; min-width: 90px;
}
.toggle-pills {
  display: flex; background: rgba(0,0,0,0.3); border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.06); overflow: hidden;
}
.toggle-pills button {
  padding: 6px 10px; background: transparent; border: none; color: #667;
  font-size: 0.72rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
  white-space: nowrap;
}
.toggle-pills button.active { background: rgba(33,150,243,0.25); color: #5bf; }
.toggle-pills button:hover:not(.active) { background: rgba(255,255,255,0.04); }

/* === CARD GRID === */
.card-grid-area {
  flex: 1; min-height: 0; overflow-y: auto; padding: 20px 24px;
  display: flex; align-items: center; justify-content: center;
}
.loading-indicator {
  flex: 1; display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; color: #667; animation: pulse 1.5s infinite;
}
@keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

/* === PAGINATION === */
.pagination-bar {
  display: flex; align-items: center; justify-content: center; gap: 4px;
  padding: 10px 24px; background: rgba(0,0,0,0.2); flex-shrink: 0;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.pg-btn {
  width: 32px; height: 32px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04); color: #889; font-weight: 700;
  cursor: pointer; transition: all 0.2s; font-size: 0.85rem;
  display: flex; align-items: center; justify-content: center;
}
.pg-btn:hover:not(:disabled):not(.active) { background: rgba(255,255,255,0.08); color: white; }
.pg-btn.active { background: rgba(33,150,243,0.3); color: #5bf; border-color: rgba(33,150,243,0.4); }
.pg-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.pg-dots { color: #445; font-size: 0.8rem; padding: 0 4px; }
.results-footer {
  text-align: center; padding: 6px; font-size: 0.7rem; color: #445;
  background: rgba(0,0,0,0.3); flex-shrink: 0;
}

/* === BOARDS GRID === */
.boards-grid-area {
  flex: 1; min-height: 0; overflow-y: auto; padding: 30px;
}
.boards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}
.board-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: default;
}
.board-card:hover {
  transform: translateY(-4px);
  border-color: var(--color-primary);
  background: rgba(255,255,255,0.05);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.board-preview {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #000;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.board-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.board-card:hover .board-preview img {
  transform: scale(1.05);
}
.board-info {
  padding: 16px;
}
.board-name {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 800;
  color: white;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.board-desc {
  margin: 0;
  font-size: 0.85rem;
  color: #889;
  line-height: 1.4;
}

/* === MODAL === */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.8);
  display: flex; align-items: center; justify-content: center;
  z-index: 1050; backdrop-filter: blur(5px);
}
.modal-box {
  background: #1a1a24; border: 2px solid #333; border-radius: 12px;
  padding: 30px; max-width: 460px; width: 90%; text-align: center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8);
}
.modal-box h3 { color: #f55; font-size: 1.5rem; margin: 0 0 10px; }
.modal-desc { color: #aaa; font-size: 0.95rem; margin-bottom: 20px; }
.disenchant-preview { background: rgba(0,0,0,0.4); border-radius: 8px; padding: 12px; margin-bottom: 20px; }
.dp-row { display: grid; grid-template-columns: 1fr 1fr 1fr; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.9rem; }
.dp-row.header { font-weight: 700; color: #667; font-size: 0.75rem; text-transform: uppercase; border-bottom: 2px solid rgba(255,255,255,0.08); }
.dp-row.total { font-weight: 900; font-size: 1.05rem; border-top: 2px solid rgba(255,255,255,0.08); border-bottom: none; padding-top: 10px; }
.gold { color: #ffd700; text-shadow: 0 0 5px rgba(255,215,0,0.4); }
.rarity-common { color: #a0a0a0; } .rarity-uncommon { color: #4caf50; }
.rarity-rare { color: #2196f3; } .rarity-epic { color: #9c27b0; } .rarity-legendary { color: #ff9800; }
.no-surplus { padding: 20px; color: #667; font-style: italic; }
.modal-btns { display: flex; justify-content: center; gap: 16px; }
.btn-cancel, .btn-confirm {
  padding: 10px 22px; font-size: 1rem; font-weight: 700;
  border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s;
}
.btn-cancel { background: #333; color: white; }
.btn-cancel:hover { background: #444; }
.btn-confirm { background: #e53935; color: white; }
.btn-confirm:hover:not(:disabled) { background: #f44; transform: scale(1.03); box-shadow: 0 0 15px rgba(244,67,54,0.4); }
.btn-confirm:disabled { background: #444; color: #777; cursor: not-allowed; }

/* === RESPONSIVE === */
@media (max-width: 900px) {
  .collection-page { grid-template-columns: 56px 1fr; }
  .sidebar-right { display: none; }
  .filters-bar { gap: 6px; padding: 8px 12px; }
  .top-bar { padding: 10px 12px; }
  .card-grid-area { padding: 12px; }
}
</style>
