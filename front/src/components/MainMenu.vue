<template>
  <div id="main-menu" v-if="state.gameState === 'menu' && !state.showPackOpening">

    <div v-if="state.menuView === 'main'" class="menu-buttons">
      <HoloButton width="100%" @click="openStory">MODE HISTOIRE 📖</HoloButton>
      <HoloButton width="100%" @click="state.menuView = 'ai'">JOUER CONTRE UNE IA 🤖</HoloButton>
      <HoloButton width="100%" @click="state.menuView = 'multi'">PARTIE MULTIJOUEUR 🌍</HoloButton>
      <HoloButton width="100%" @click="openCollection">MA COLLECTION 📚</HoloButton>
      <HoloButton width="100%" @click="openDecks">MES DECKS 🎴</HoloButton>
      <HoloButton width="100%" @click="openBoutique">BOUTIQUE 💎</HoloButton>
    </div>

    <div v-else-if="state.menuView === 'ai'" class="deck-selection-menu">
      <h2 style="color: white; margin-bottom: 1.5rem;">CHOISIS TON DECK</h2>
      
      <div v-if="state.userDecks.length > 0" class="decks-grid">
        <div v-for="deck in state.userDecks" :key="deck.id" class="deck-select-card" @click="startAiGame(deck)">
          <div class="deck-thumb">
            <img v-if="deck.cover && getCardById(deck.cover)" :src="getCardById(deck.cover).img" />
            <div v-else class="placeholder">🎴</div>
          </div>
          <div class="deck-info">
            <div class="name">{{ deck.name }}</div>
            <div class="count">{{ deck.cards.length }} cartes</div>
          </div>
        </div>
      </div>
      <div v-else class="no-decks">
        <p>Vous n'avez pas de deck. Créez-en un d'abord !</p>
        <HoloButton @click="openDecks">CRÉER UN DECK</HoloButton>
      </div>

      <HoloButton @click="state.menuView = 'main'" style="margin-top: 25px;">RETOUR</HoloButton>
    </div>

    <div v-else-if="state.menuView === 'multi'" class="difficulty-options multi-menu">
      <h2 style="color: white; margin-bottom: 1.5rem;">MULTIJOUEUR</h2>
      <div v-if="!multiState.hosting && !multiState.joining" class="menu-buttons multi-buttons">
        <HoloButton width="100%" @click="hostGame">Héberger une partie</HoloButton>
        <HoloButton width="100%" @click="multiState.joining = true">Rejoindre une partie</HoloButton>
        <p v-if="multiState.error" style="color: #ff0055; margin-top: 10px; font-weight: bold; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 5px;">
          Erreur : {{ multiState.error }}
        </p>
      </div>

      <div v-else-if="multiState.hosting" class="host-panel">
        <h3 style="color: white">Code de la session :</h3>
        <p class="uuid-display" v-if="multiState.uuid">{{ multiState.uuid }}</p>
        <p v-else style="color: yellow">Création de la session...</p>
        <p style="color: #00d2ff; margin-top: 10px;">En attente de l'adversaire...</p>
      </div>

      <div v-else-if="multiState.joining" class="join-panel">
        <h3 style="color: white">Entrez le code de session :</h3>
        <input v-model="multiState.joinUuid" class="uuid-input" placeholder="xxxxxxxx-xxxx-..." />
        <HoloButton @click="joinGame" class="join-btn" :disabled="multiState.loading">
          {{ multiState.loading ? 'Connexion...' : 'Rejoindre' }}
        </HoloButton>
        <p v-if="multiState.error" style="color: #ff0055; margin-top: 10px;">{{ multiState.error }}</p>
      </div>

      <HoloButton @click="cancelMulti" style="margin-top: 2rem;">RETOUR</HoloButton>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { state, webrtc, resetGame, initOnlineTurnManager, getCardById, normalizeCard, refillHand, cardLibrary } from '../game/state.js';
import HoloButton from './HoloButton.vue';

function openStory() {
  state.showStoryPage = true;
  window.history.pushState({}, '', '/story');
}

function openCollection() {
  state.showCollectionPage = true;
  window.history.pushState({}, '', '/collection');
}

function openDecks() {
  state.showDecksPage = true;
  window.history.pushState({}, '', '/decks');
}

function openBoutique() {
  state.showPackOpening = true;
  state.leftDrawerOpen = false;
  state.rightDrawerOpen = false;
  window.history.pushState({}, '', '/boutique');
}

function startAiGame(deck) {
  if (deck.cards.length < 5) {
    state.alerts = "Ce deck est incomplet (min 5 cartes)";
    return;
  }
  
  // 1. Reset everything to a clean state
  resetGame(30, false); 
  
  state.online = false;
  state.aiDifficulty = 1;
  
  // 2. Give AI a random 5-card deck and draw its starting hand
  const aiCards = [];
  for (let i = 0; i < 5; i++) {
    const randomCard = cardLibrary[Math.floor(Math.random() * cardLibrary.length)];
    aiCards.push(normalizeCard(randomCard));
  }
  state.deck = aiCards;
  refillHand('ai'); // AI hand is now initialized (3 cards)
  
  // 3. Set the remaining deck to the player's chosen cards
  const playerDeck = deck.cards.map(id => normalizeCard(getCardById(id)));
  state.deck = playerDeck;
  
  // 4. Enter the game
  state.gameState = 'playing';
}

const multiState = reactive({
  hosting: false,
  joining: false,
  uuid: null,
  joinUuid: '',
  loading: false,
  error: null
});

function cancelMulti() {
  webrtc.close();
  multiState.hosting = false;
  multiState.joining = false;
  multiState.uuid = null;
  multiState.error = null;
  multiState.loading = false;
  state.menuView = 'main';
}

onMounted(() => {
  webrtc.onConnected = () => {
    state.aiDifficulty = 1;

    if (webrtc.isHost) {
      resetGame(30, false); 
      initOnlineTurnManager(true); // Host
      state.gameState = 'playing';
      state.leftDrawerOpen = false; // Auto close drawer
      webrtc.sendMessage({ type: 'init', deck: state.deck });
    }
  };
  
  const handleNetworkMessage = (msg) => {
    if (msg.type === 'init') {
      resetGame(30, false);
      state.deck = msg.deck;
      initOnlineTurnManager(false); // Guest
      state.gameState = 'playing';
      state.leftDrawerOpen = false; // Auto close drawer
    }
  };

  webrtc.onError = (err) => {
    multiState.error = err;
    multiState.loading = false;
  };
  webrtc.addMessageListener(handleNetworkMessage);
});

onUnmounted(() => {
  webrtc.removeMessageListener(handleNetworkMessage);
});

async function hostGame() {
  multiState.hosting = true;
  multiState.error = null;
  try {
    const uuid = await webrtc.createSession();
    multiState.uuid = uuid;
  } catch(e) {
    console.error("Host Game Error:", e);
    multiState.error = e.message || 'Erreur serveur. Assurez-vous que Strapi tourne.';
    multiState.hosting = false;
  }
}

async function joinGame() {
  if (!multiState.joinUuid) return;
  multiState.loading = true;
  multiState.error = null;
  try {
    await webrtc.joinSession(multiState.joinUuid);
  } catch(e) {
    multiState.error = 'Session introuvable ou erreur réseau';
    multiState.loading = false;
  }
}
</script>

<style scoped>
#main-menu {
    display: flex; flex-direction: column; justify-content: flex-start; align-items: center;
    width: 100%; height: 100%; pointer-events: auto;
    padding-top: 120px;
    box-sizing: border-box;
}
.menu-buttons {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
    max-width: 400px;
}
button {
    padding: 15px 40px; font-size: 1.5rem; cursor: pointer; border: none;
    border-radius: 50px; background: linear-gradient(45deg, #00d2ff, #3a7bd5);
    color: #fff; font-weight: bold; transition: transform 0.2s;
}
button:hover { transform: scale(1.05); }

.deck-selection-menu {
    width: 100%;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.decks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
    width: 100%;
    margin-bottom: 30px;
}
.deck-select-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(0, 210, 255, 0.2);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.deck-select-card:hover {
    transform: translateY(-5px) scale(1.02);
    border-color: #00d2ff;
    box-shadow: 0 5px 15px rgba(0, 210, 255, 0.3);
}
.deck-thumb {
    height: 100px;
    background: rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
}
.deck-thumb img {
    height: 100%;
    width: 100%;
    object-fit: cover;
}
.deck-thumb .placeholder {
    font-size: 2.5rem;
    opacity: 0.3;
}
.deck-info {
    padding: 10px;
    text-align: center;
}
.deck-info .name {
    color: white;
    font-weight: bold;
    font-size: 1rem;
    margin-bottom: 4px;
}
.deck-info .count {
    color: #00d2ff;
    font-size: 0.8rem;
}
.no-decks {
    text-align: center;
    color: #aaa;
    margin: 40px 0;
}

.multi-menu {
  width: 100%;
}
.multi-buttons button {
  width: 100%;
  text-align: center;
}
.host-panel, .join-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 30px;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  box-sizing: border-box;
}
.uuid-display {
  font-family: monospace;
  font-size: 1.5rem;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  padding: 15px;
  border-radius: 10px;
  margin: 15px 0;
  user-select: all;
  word-break: break-all;
  width: 100%;
  text-align: center;
  border: 1px solid #00d2ff;
}
.uuid-input {
  width: 100%;
  padding: 15px;
  font-size: 1.2rem;
  font-family: monospace;
  border-radius: 10px;
  border: none;
  margin: 15px 0;
  text-align: center;
}
.join-btn {
  background: linear-gradient(45deg, #00d2ff, #3a7bd5);
  padding: 10px 30px;
  font-size: 1.2rem;
}
</style>