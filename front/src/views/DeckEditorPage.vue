<template>
  <div class="deck-editor-page ui-layer">
    <!-- Header -->
    <div class="page-header glass-panel">
      <button class="btn btn-secondary glass-panel" @click="closeDeckEditor">← RETOUR</button>
      <h2 class="page-title">{{ isNew ? 'NOUVEAU DECK' : 'ÉDITER LE DECK' }}</h2>
      <div class="header-actions">
        <span class="deck-counter" :class="{ full: state.editingDeck.cards.length === (userStore.gameConfig?.cardsPerDeck || 15) || (isAdminMode && state.editingDeck.cards.length > 0) }">
          {{ state.editingDeck.cards.length }} {{ isAdminMode ? '' : '/ ' + (userStore.gameConfig?.cardsPerDeck || 15) }}
        </span>
        <button class="btn btn-primary glass-panel" :disabled="!isAdminMode && state.editingDeck.cards.length !== (userStore.gameConfig?.cardsPerDeck || 15)" @click="saveDeck">
          💾 Enregistrer
        </button>
      </div>
    </div>

    <!-- Body -->
    <div class="editor-body">
      <!-- LEFT: Deck sidebar (info, customization, mana curve, stats, deck cards) -->
      <div class="deck-panel custom-scrollbar">
        <!-- Deck general info -->
        <div class="deck-info-section glass-panel">
          <input v-model="state.editingDeck.name" placeholder="Nom du Deck" class="deck-name-input" />
        </div>

        <!-- Customization Collapsible -->
        <div class="deck-settings-section glass-panel">
          <div class="section-title" @click="showCosmetics = !showCosmetics">
            <span>🎨 Personnalisation (Dos & Cadre)</span>
            <span class="arrow">{{ showCosmetics ? '▲' : '▼' }}</span>
          </div>
          
          <div class="section-content" v-show="showCosmetics">
            <!-- Back selector -->
            <div class="deck-back-selector-v2 mb-3">
              <label class="block text-[10px] font-bold text-[#ff0055] uppercase tracking-widest mb-1.5">Dos de carte</label>
              <div class="back-options-grid">
                <div class="back-mini-option" 
                     :class="{ active: state.editingDeck.cardBack === 'default' || !state.editingDeck.cardBack }" 
                     @click="state.editingDeck.cardBack = 'default'"
                     title="Classique">
                  <img src="/card-back.svg" class="back-mini-img" />
                </div>
                <div class="back-mini-option" 
                     :class="{ active: state.editingDeck.cardBack === 'animated' }" 
                     @click="state.editingDeck.cardBack = 'animated'"
                     title="Terra Nullius (Animé)">
                  <div class="back-mini-animated"><AnimatedCardBack /></div>
                </div>
                <div v-for="back in availableBacks" :key="back.documentId || back.id"
                     class="back-mini-option"
                     :class="{ active: state.editingDeck.cardBack === (back.documentId || back.id) }"
                     @click="state.editingDeck.cardBack = (back.documentId || back.id)"
                     :title="back.name">
                   <img :src="back.image" class="back-mini-img" />
                </div>
              </div>
            </div>

            <!-- Frame selector -->
            <div class="deck-frame-selector-v2 mb-2">
              <label class="block text-[10px] font-bold text-[#ff0055] uppercase tracking-widest mb-1.5">Cadre de carte</label>
              <div class="back-options-grid">
                <div class="back-mini-option" 
                     :class="{ active: state.editingDeck.cardFrame === null }" 
                     @click="state.editingDeck.cardFrame = null"
                     title="Aucun (Défaut)">
                  <div class="back-mini-img flex items-center justify-center bg-black/40 text-[10px] opacity-40">—</div>
                </div>
                <div v-for="frame in availableFrames" :key="frame.documentId || frame.id"
                     class="back-mini-option"
                     :class="{ active: state.editingDeck.cardFrame === (frame.documentId || frame.id) }"
                     @click="state.editingDeck.cardFrame = (frame.documentId || frame.id)"
                     :title="frame.name">
                   <img :src="frame.image" class="back-mini-img" />
                </div>
              </div>
            </div>

            <button class="btn btn-secondary glass-panel w-full text-[9px] py-1.5 mt-2" 
                    @click="setAsGlobalDefault" 
                    :disabled="!state.editingDeck.cardBack || state.editingDeck.cardBack === 'animated' || state.editingDeck.cardBack === 'default'">
              ⭐ Définir comme défaut global
            </button>
          </div>
        </div>

        <!-- Share & Code Tools Collapsible -->
        <div class="deck-settings-section glass-panel">
          <div class="section-title" @click="showShare = !showShare">
            <span>⚙️ Partage & Codes</span>
            <span class="arrow">{{ showShare ? '▲' : '▼' }}</span>
          </div>
          
          <div class="section-content" v-show="showShare">
            <div class="import-export-row">
              <input v-model="importCode" placeholder="Coller un code..." class="import-input" />
              <button class="btn btn-secondary glass-panel px-2 text-xs" @click="importDeckCode" :disabled="!importCode">📥 Importer</button>
              <button class="btn btn-secondary glass-panel px-2 text-xs" @click="exportDeckCode" :disabled="state.editingDeck.cards.length === 0">📤 Copier</button>
            </div>
            
            <div v-if="isAdminMode" class="admin-owner-section mt-3">
              <label class="block text-[10px] font-bold text-[#ff0055] uppercase tracking-widest mb-1">Propriétaire (Admin)</label>
              <select v-model="selectedOwnerId" class="filter-select w-full bg-black/40 border-primary/10">
                <option v-for="u in allUsers" :key="u.id" :value="u.documentId || u.id">
                  {{ u.username }} ({{ u.email }})
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Feedback Messages -->
        <div v-if="feedback" class="feedback-bar" :class="feedbackType">{{ feedback }}</div>

        <!-- Deck Stats -->
        <div class="deck-stats-summary glass-panel" v-if="state.editingDeck.cards.length > 0">
          <div class="stat-box">
            <span class="stat-val">{{ deckStats.avgLevel }}</span>
            <span class="stat-lbl">Niv. Moyen</span>
          </div>
          <div class="stat-box">
            <span class="stat-val">{{ Object.keys(deckStats.elements).length }}</span>
            <span class="stat-lbl">Éléments</span>
          </div>
          <div class="stat-box">
            <span class="stat-val">{{ Object.keys(deckStats.factions).length }}</span>
            <span class="stat-lbl">Factions</span>
          </div>
        </div>

        <!-- Card level distribution curve -->
        <div class="mana-curve glass-panel">
          <div class="curve-label">Courbe de Niveau (Puissance)</div>
          <div class="curve-bars">
            <div v-for="lvl in 10" :key="lvl" class="bar-container">
              <div class="bar" :style="{ height: getBarHeight(lvl) + '%' }"></div>
              <span class="bar-label">{{ lvl }}</span>
            </div>
          </div>
        </div>

        <!-- Selected cards grid -->
        <div class="deck-section-header">
          <span class="deck-cards-title">Cartes sélectionnées</span>
        </div>
        <div class="deck-cards-grid">
          <div v-for="cardId in sortedDeckCards" :key="cardId" class="deck-card-slot" @click="removeCard(cardId)">
            <TripleTriadCard v-if="getCardById(cardId)" :card="getCardById(cardId)" size="sm" flat 
                             :cardBack="state.editingDeck.cardBack" 
                             :cardFrame="getFrameUrl(state.editingDeck.cardFrame)" />
            <div class="remove-overlay">×</div>
          </div>
          <div v-for="i in Math.max(0, (userStore.gameConfig?.cardsPerDeck || 15) - state.editingDeck.cards.length)" :key="'empty-' + i"
            class="deck-card-slot empty">
            <span>—</span>
          </div>
        </div>
      </div>

      <!-- RIGHT: Card Library Panel -->
      <div class="library-panel">
        <!-- Factions Tabs Row -->
        <div class="faction-tabs-container custom-scrollbar">
          <div 
            v-for="f in factionFilters" 
            :key="f.code" 
            class="faction-tab"
            :class="{ active: selectedFaction === f.code }"
            :style="{ '--faction-color': f.color }"
            @click="selectedFaction = f.code"
          >
            <span class="faction-glow-dot" :style="{ backgroundColor: f.color }"></span>
            <span class="faction-tab-name">{{ f.name }}</span>
          </div>
        </div>

        <!-- Primary Filter Controls -->
        <div class="library-controls glass-panel">
          <div class="filter-row-primary">
            <div class="search-wrapper">
              <span class="search-icon">🔍</span>
              <input type="text" v-model="searchQuery" placeholder="Rechercher (nom, description)..." class="search-input" />
            </div>
            
            <select v-model="filterSkill" class="filter-select select-skills">
              <option value="">Toutes compétences</option>
              <option v-for="skill in uniqueSkills" :key="skill.value" :value="skill.value">
                ✨ {{ skill.label }}
              </option>
            </select>

            <select v-model="sortBy" class="filter-select">
              <optgroup label="Général">
                <option value="rarity-desc">Rareté ↓</option>
                <option value="rarity-asc">Rareté ↑</option>
                <option value="skills-desc">Compétences ↓</option>
                <option value="skills-asc">Compétences ↑</option>
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

          <!-- Rarity filter buttons -->
          <div class="filter-row-rarity">
            <span class="filter-label">Rareté :</span>
            <div class="rarity-chips-group">
              <button 
                class="rarity-chip-btn"
                :class="{ active: filterRarity === '' }"
                @click="filterRarity = ''"
              >
                Toutes
              </button>
              <button 
                v-for="rarity in uniqueRarities" 
                :key="rarity.value"
                class="rarity-chip-btn"
                :class="[rarity.value, { active: filterRarity === rarity.value }]"
                @click="filterRarity = rarity.value"
              >
                {{ rarity.label }}
              </button>
            </div>
          </div>

          <!-- Element filters + toggles row -->
          <div class="filter-row-tertiary">
            <div class="element-filter-wrapper">
              <span class="filter-label">Élément :</span>
              <div class="element-filter-bar">
                <div v-for="element in uniqueElements" :key="element"
                     class="element-btn"
                     :class="{ active: selectedElements.includes(element) }"
                     @click="toggleElement(element)"
                     :title="element">
                  <ElementIcon :element="element" :active="selectedElements.includes(element)" />
                </div>
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
        </div>

        <div class="library-stats-bar">
          <span class="stats-count">{{ filteredCards.length }} cartes disponibles</span>
        </div>

        <!-- Library card grid -->
        <div class="library-grid custom-scrollbar">
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
import { ELEMENTS } from '../data/factions.js';
import { useUserStore } from '../stores/userStore.js';
import TripleTriadCard from '../components/TripleTriadCard.vue';
import ElementIcon from '../components/ElementIcon.vue';
import AnimatedCardBack from '../components/AnimatedCardBack.vue';
import { GameEngine } from '../../../shared/GameEngine.ts';
import { getSkillMetadata } from '../../../shared/skills/index';
import strapiService from '../api/strapi.js';

const props = defineProps({
  documentId: {
    type: String,
    default: null
  }
});

const userStore = useUserStore();

// Accordion open/close states
const showCosmetics = ref(false);
const showShare = ref(false);

// Filter states
const searchQuery = ref('');
const sortBy = ref('rarity-desc');
const selectedFaction = ref('ALL');
const filterSkill = ref('');
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

onMounted(async () => {
  // Ensure basic data is loaded
  const promises = [];
  if (!userStore.decksLoaded) promises.push(userStore.fetchUserDecks());
  if (!userStore.cardFramesLoaded) promises.push(userStore.fetchCardFrames());
  if (!userStore.cardBacksLoaded) promises.push(userStore.fetchCardBacks());
  if (promises.length > 0) await Promise.all(promises);

  if (props.documentId) {
    const deck = userStore.userDecks.find(d => d.documentId === props.documentId);
    if (deck) {
      state.editingDeck.id = deck.id;
      state.editingDeck.documentId = deck.documentId;
      state.editingDeck.name = deck.name;
      state.editingDeck.cover = deck.cover;
      state.editingDeck.cards = [...deck.cards];
      state.editingDeck.cardBack = deck.cardBack || 'default';
      state.editingDeck.cardFrame = deck.cardFrame || null;
    } else {
      console.error(`Deck with Document ID ${props.documentId} not found.`);
      router.push('/decks');
    }
  } else {
    // New deck: Set default frame to oldest available if user has any
    if (availableFrames.value.length > 0) {
      state.editingDeck.cardFrame = availableFrames.value[0].documentId || availableFrames.value[0].id;
    }
  }

  if (isAdminMode.value) {
    allUsers.value = await userStore.fetchUsers();
    // If we are editing an existing deck, preset the owner
    if (props.documentId) {
        try {
            const res = await strapiService.findOne('decks', props.documentId, { populate: ['user', 'cardFrame'] });
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

const availableFrames = computed(() => {
  if (!userStore.cardFrames || userStore.cardFrames.length === 0) return [];
  if (isAdminMode.value) return userStore.cardFrames;
  const unlocked = userStore.unlockedFrames;
  const frames = userStore.cardFrames.filter(f => unlocked.some(u => u.documentId === f.documentId || u.id === f.id));
  return frames.sort((a, b) => a.id - b.id);
});

const availableBacks = computed(() => {
  if (!userStore.cardBacks || userStore.cardBacks.length === 0) return [];
  if (isAdminMode.value) return userStore.cardBacks;
  const unlocked = userStore.unlockedBacks;
  const backs = userStore.cardBacks.filter(b => unlocked.some(u => u.documentId === b.documentId || u.id === b.id));
  return backs.sort((a, b) => a.id - b.id);
});

function getFrameUrl(frameId) {
  if (!frameId) return null;
  const frame = userStore.cardFrames.find(f => f.documentId === frameId || f.id === frameId);
  return frame ? frame.image : null;
}

const uniqueElements = ELEMENTS;

const factionFilters = [
  { code: 'ALL', name: 'Toutes', color: '#00d2ff' },
  { code: 'NEUTRAL', name: 'Neutre', color: '#a0a0a0' },
  { code: 'SCRAPPERS', name: 'Ferrailleurs', color: '#A0A0A0' },
  { code: 'PELAGIC', name: 'Exode', color: '#40E0D0' },
  { code: 'SYNTH', name: 'Chœur', color: '#FFBF00' },
  { code: 'OMNI', name: 'Omni', color: '#005FFF' },
  { code: 'MARS', name: 'Martiens', color: '#D90429' },
  { code: 'SPORE', name: 'Spore', color: '#39FF14' },
  { code: 'ASHES', name: 'Héritiers', color: '#FFD700' },
  { code: 'DISSONANCE', name: 'Dissonance', color: '#8A2BE2' },
  { code: 'CHTHON', name: 'Éveil', color: '#FF4500' }
];

const uniqueRarities = [
  { value: 'common', label: 'Commune' },
  { value: 'uncommon', label: 'Peu Commune' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Épique' },
  { value: 'legendary', label: 'Légendaire' }
];

// Extract unique skills present in the loaded library
const uniqueSkills = computed(() => {
  const types = new Set();
  cardLibrary.forEach(c => {
    if (c.skills && Array.isArray(c.skills)) {
      c.skills.forEach(s => {
        const type = typeof s === 'string' ? s : s.type;
        if (type) types.add(type);
      });
    }
  });

  return Array.from(types).map(type => {
    const meta = getSkillMetadata(type);
    return {
      value: type,
      label: meta.name || type
    };
  }).sort((a, b) => a.label.localeCompare(b.label));
});

// Compute structural stats of the current deck
const deckStats = computed(() => {
  const cards = state.editingDeck.cards.map(getCardById).filter(Boolean);
  const total = cards.length;
  if (total === 0) return { avgLevel: '0.0', elements: {}, factions: {} };

  let levelSum = 0;
  const elements = {};
  const factions = {};

  cards.forEach(c => {
    levelSum += c.level || GameEngine.calculateCardLevel(c) || 1;
    if (c.element && c.element !== 'None') {
      elements[c.element] = (elements[c.element] || 0) + 1;
    }
    if (c.factionCode && c.factionCode !== 'NEUTRAL') {
      factions[c.factionCode] = (factions[c.factionCode] || 0) + 1;
    }
  });

  return {
    avgLevel: (levelSum / total).toFixed(1),
    elements,
    factions
  };
});

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
  if (!userStore.strapiConnected) return true;
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
    state.editingDeck.cards.push(cardId);
    return;
  }

  if (idx > -1) {
    state.editingDeck.cards.splice(idx, 1);
  } else if (state.editingDeck.cards.length < (userStore.gameConfig?.cardsPerDeck || 15)) {
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
  if (!state.editingDeck.name || !state.editingDeck.name.trim()) {
    showFeedback('Veuillez donner un nom à votre deck.', 'error');
    return;
  }
  if (!isAdminMode.value && state.editingDeck.cards.length !== (userStore.gameConfig?.cardsPerDeck || 15)) return;
  
  try {
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
  } catch (e) {
    showFeedback(e.message || 'Erreur lors de l\'enregistrement.', 'error');
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
    const valid = ids.filter(id => isOwned(id) && cardLibrary.find(c => c.id === id)).slice(0, (userStore.gameConfig?.cardsPerDeck || 15));
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

async function setAsGlobalDefault() {
  const backId = state.editingDeck.cardBack;
  if (!backId || backId === 'animated' || backId === 'default') return;
  
  try {
    const success = await userStore.updateProfile({ defaultCardBack: backId });
    if (success) {
      showFeedback('Dos défini par défaut globalement !', 'success');
    } else {
      showFeedback('Erreur lors de la mise à jour.', 'error');
    }
  } catch (e) {
    showFeedback('Erreur réseau.', 'error');
  }
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

  if (selectedFaction.value !== 'ALL') {
    result = result.filter(c => c.factionCode === selectedFaction.value);
  }

  if (filterSkill.value) {
    result = result.filter(c => 
      c.skills && c.skills.some(s => (typeof s === 'string' ? s : s.type) === filterSkill.value)
    );
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
      case 'skills-desc': return ((Array.isArray(b.skills) ? b.skills.length : 0) - (Array.isArray(a.skills) ? a.skills.length : 0)) || a.id - b.id;
      case 'skills-asc': return ((Array.isArray(a.skills) ? a.skills.length : 0) - (Array.isArray(b.skills) ? b.skills.length : 0)) || a.id - b.id;
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
    
    if (rA !== rB) return rB - rA;
    
    const lA = GameEngine.calculateCardLevel(a);
    const lB = GameEngine.calculateCardLevel(b);
    if (lA !== lB) return lB - lA;
    
    return a.name.localeCompare(b.name);
  });
});
</script>

<style scoped>
/* Glassmorphism utility panel */
.glass-panel {
  background: color-mix(in srgb, var(--color-primary, #ff0055) 4%, rgba(255, 255, 255, 0.03));
  border: 1px solid color-mix(in srgb, var(--color-primary, #ff0055) 15%, rgba(255, 255, 255, 0.08));
  backdrop-filter: blur(12px);
  border-radius: 12px;
  transition: all 0.3s ease;
}
.glass-panel:hover {
  border-color: color-mix(in srgb, var(--color-primary, #ff0055) 25%, rgba(255, 255, 255, 0.15));
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.deck-editor-page {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, #151525 0%, #09090e 100%);
  z-index: 500;
  display: flex;
  flex-direction: column;
  color: white;
  pointer-events: auto;
  overflow: hidden;
}

.page-header {
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  margin: 10px 10px 0 10px;
  flex-shrink: 0;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: 4px;
  font-weight: 800;
  text-shadow: 0 0 15px rgba(255, 0, 85, 0.4);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.deck-counter {
  font-size: 1.4rem;
  font-weight: 800;
  color: #888;
  letter-spacing: 1px;
}
.deck-counter.full {
  color: #00ff88;
  text-shadow: 0 0 12px rgba(0, 255, 136, 0.6);
}

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 10px;
  gap: 10px;
}

/* LEFT: Deck Sidebar */
.deck-panel {
  width: 380px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  flex-shrink: 0;
  padding-right: 4px;
}

.deck-info-section {
  padding: 8px;
}

.deck-name-input {
  width: 100%;
  padding: 10px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
  border-radius: 8px;
  text-align: center;
  letter-spacing: 0.5px;
  transition: all 0.3s;
}
.deck-name-input:focus {
  border-color: #ff0055;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.3);
  outline: none;
}

/* Accordion sections */
.deck-settings-section {
  overflow: hidden;
  padding: 0;
}
.section-title {
  padding: 12px 16px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #ccc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.section-title:hover {
  background: rgba(255, 255, 255, 0.03);
  color: white;
}
.section-content {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.2);
}

.back-options-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  background: rgba(0, 0, 0, 0.4);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.back-mini-option {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.back-mini-option:hover {
  border-color: #ff0055;
  transform: translateY(-2px);
}
.back-mini-option.active {
  border-color: #ff0055;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.5);
  border-width: 2px;
}
.back-mini-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.back-mini-animated {
  width: 100%;
  height: 100%;
  transform: scale(0.4);
}

.import-export-row {
  display: flex;
  gap: 8px;
}
.import-input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 6px;
  font-size: 0.8rem;
  transition: border-color 0.2s;
}
.import-input:focus {
  border-color: #ff0055;
  outline: none;
}

.feedback-bar {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  text-align: center;
  font-weight: 500;
}
.feedback-bar.success {
  background: rgba(0, 255, 136, 0.1);
  color: #00ff88;
  border: 1px solid rgba(0, 255, 136, 0.2);
}
.feedback-bar.error {
  background: rgba(255, 0, 85, 0.1);
  color: #ff0055;
  border: 1px solid rgba(255, 0, 85, 0.2);
}
.feedback-bar.info {
  background: rgba(0, 210, 255, 0.1);
  color: #00d2ff;
  border: 1px solid rgba(0, 210, 255, 0.2);
}

/* Stats dashboard */
.deck-stats-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 5px;
  background: rgba(0, 0, 0, 0.2);
}
.stat-val {
  font-size: 1.1rem;
  font-weight: 800;
  color: #ff0055;
  text-shadow: 0 0 10px rgba(255, 0, 85, 0.3);
}
.stat-lbl {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  margin-top: 2px;
}

/* Mana / Level curve */
.mana-curve {
  padding: 12px;
}
.curve-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #888;
  margin-bottom: 12px;
  text-align: center;
}
.curve-bars {
  display: flex;
  gap: 6px;
  height: 60px;
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
  background: linear-gradient(to top, rgba(255, 0, 85, 0.8), rgba(255, 100, 150, 1));
  box-shadow: 0 0 8px rgba(255, 0, 85, 0.4);
  border-radius: 4px 4px 0 0;
  min-height: 2px;
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.bar-label {
  font-size: 0.65rem;
  color: #666;
  font-weight: 700;
  margin-top: 4px;
}

/* Deck Cards Grid (3 Columns) */
.deck-section-header {
  margin-top: 8px;
}
.deck-cards-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #888;
}
.deck-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 4px 2px;
}
.deck-card-slot {
  position: relative;
  width: 90px;
  height: 90px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  background: rgba(0, 0, 0, 0.2);
}
.deck-card-slot.empty {
  border: 2px dashed rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.01);
  color: rgba(255, 255, 255, 0.15);
  font-size: 1.5rem;
  font-weight: bold;
  cursor: default;
}
.deck-card-slot.empty:hover {
  border-color: rgba(255, 255, 255, 0.2);
}
.deck-card-slot:not(.empty):hover {
  transform: translateY(-2px) scale(1.03);
}

.deck-card-slot .remove-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 0, 85, 0.6);
  backdrop-filter: blur(2px);
  color: white;
  font-size: 2.2rem;
  font-weight: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 10;
}
.deck-card-slot:not(.empty):hover .remove-overlay {
  opacity: 1;
}

/* RIGHT: Library Panel */
.library-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* Faction Tabs */
.faction-tabs-container {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 4px 8px 4px;
  white-space: nowrap;
  flex-shrink: 0;
}
.faction-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  font-size: 0.8rem;
  font-weight: 700;
  color: #aaa;
}
.faction-tab:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}
.faction-tab.active {
  background: color-mix(in srgb, var(--faction-color) 12%, rgba(255, 255, 255, 0.04));
  color: white;
  border-color: var(--faction-color);
  box-shadow: 0 0 10px color-mix(in srgb, var(--faction-color) 35%, transparent);
}
.faction-glow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 8px currentColor;
}

/* Controls Grid */
.library-controls {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-row-primary {
  display: flex;
  gap: 10px;
}
.search-wrapper {
  position: relative;
  flex: 2;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9rem;
  opacity: 0.5;
}
.search-input {
  width: 100%;
  padding: 10px 10px 10px 38px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.3s;
}
.search-input:focus {
  border-color: #ff0055;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.2);
  outline: none;
}

.filter-select {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.3s;
  cursor: pointer;
}
.filter-select:focus {
  border-color: #ff0055;
  outline: none;
}
.select-skills {
  flex: 1.2;
}

/* Rarity row */
.filter-row-rarity {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 0;
}
.filter-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.5px;
  min-width: 60px;
}
.rarity-chips-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.rarity-chip-btn {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #888;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.rarity-chip-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #bbb;
  transform: translateY(-1px);
}
.rarity-chip-btn.active {
  color: white;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.rarity-chip-btn.common.active {
  border-color: #9e9e9e;
  box-shadow: 0 0 10px rgba(158, 158, 158, 0.4);
  background: rgba(158, 158, 158, 0.15);
}
.rarity-chip-btn.uncommon.active {
  border-color: #4caf50;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.4);
  background: rgba(76, 175, 80, 0.15);
}
.rarity-chip-btn.rare.active {
  border-color: #2196f3;
  box-shadow: 0 0 10px rgba(33, 150, 243, 0.4);
  background: rgba(33, 150, 243, 0.15);
}
.rarity-chip-btn.epic.active {
  border-color: #9c27b0;
  box-shadow: 0 0 10px rgba(156, 39, 176, 0.4);
  background: rgba(156, 39, 176, 0.15);
}
.rarity-chip-btn.legendary.active {
  border-color: #ffc107;
  box-shadow: 0 0 12px rgba(255, 193, 7, 0.5);
  background: rgba(255, 193, 7, 0.15);
}

/* Elements + toggles row */
.filter-row-tertiary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.element-filter-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}
.element-filter-bar {
  display: flex;
  gap: 5px;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.element-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 5px;
}
.element-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
.element-btn.active {
  border-color: #00d2ff;
  background: rgba(0, 210, 255, 0.1);
  box-shadow: 0 0 8px rgba(0, 210, 255, 0.3);
}

.toggle-filters-row {
  display: flex;
  gap: 8px;
}
.btn-toggle-mini {
  display: flex;
  padding: 2px;
}
.btn-toggle-mini button {
  background: transparent;
  border: none;
  color: #777;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  transition: all 0.2s;
}
.btn-toggle-mini button:hover {
  color: #bbb;
}
.btn-toggle-mini button.active {
  background: rgba(255, 255, 255, 0.08);
  color: #00d2ff;
}

/* Stats counter */
.library-stats-bar {
  padding: 0 4px;
  flex-shrink: 0;
}
.stats-count {
  font-size: 0.8rem;
  color: #666;
  font-weight: 600;
}

/* Cards Library Grid */
.library-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
  padding: 4px;
  align-content: start;
}
.lib-card-wrapper {
  cursor: pointer;
  display: flex;
  justify-content: center;
  transition: transform 0.2s;
}
.lib-card-wrapper:hover {
  transform: translateY(-2px);
}

/* Responsive styles */
@media (max-width: 1024px) {
  .editor-body {
    flex-direction: column;
    overflow-y: auto;
  }
  .deck-panel {
    width: 100%;
    max-height: 480px;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .deck-cards-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>
