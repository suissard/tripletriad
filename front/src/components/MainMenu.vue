<template>
  <div id="main-menu" v-if="state.gameState === 'menu'">
    <h1 style="color: #00d2ff; font-size: 4rem; text-shadow: 0 0 20px currentColor; margin-bottom: 2rem;">MENU PRINCIPAL</h1>

    <div v-if="menuState === 'main'" class="menu-buttons">
      <button @click="menuState = 'ai'">JOUER CONTRE UNE IA 🤖</button>
      <button @click="showUnavailableMessage('Partie privée')">PARTIE PRIVÉE 🔒</button>
      <button @click="menuState = 'multi'">PARTIE MULTIJOUEUR 🌍</button>
    </div>

    <div v-else-if="menuState === 'ai'" class="difficulty-options">
      <h2 style="color: white; margin-bottom: 1.5rem;">CHOISIS LA DIFFICULTÉ</h2>
      <div class="difficulty-grid">
        <button v-for="level in 10" :key="level" @click="startGame(level)" class="diff-btn">
          Niveau {{ level }}
        </button>
      </div>
      <button class="back-btn" @click="menuState = 'main'">RETOUR</button>
    </div>

    <div v-else-if="menuState === 'multi'" class="difficulty-options multi-menu">
      <h2 style="color: white; margin-bottom: 1.5rem;">MULTIJOUEUR</h2>
      <div v-if="!multiState.hosting && !multiState.joining" class="menu-buttons multi-buttons">
        <button @click="hostGame">Héberger une partie</button>
        <button @click="multiState.joining = true">Rejoindre une partie</button>
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
        <button @click="joinGame" class="join-btn" :disabled="multiState.loading">
          {{ multiState.loading ? 'Connexion...' : 'Rejoindre' }}
        </button>
        <p v-if="multiState.error" style="color: #ff0055; margin-top: 10px;">{{ multiState.error }}</p>
      </div>

      <button class="back-btn" @click="cancelMulti" style="margin-top: 2rem;">RETOUR</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { state, webrtc, resetGame } from '../game/state.js';

const menuState = ref('main'); // main, ai, multi

const multiState = reactive({
  hosting: false,
  joining: false,
  uuid: null,
  joinUuid: '',
  loading: false,
  error: null
});

function showUnavailableMessage(type) {
  state.alerts = ''; 
  setTimeout(() => {
    state.alerts = `${type} : Bientôt disponible !`;
  }, 10);
}

function startGame(level) {
  state.online = false;
  state.aiDifficulty = level;
  state.gameState = 'playing';
}

function cancelMulti() {
  webrtc.close();
  multiState.hosting = false;
  multiState.joining = false;
  multiState.uuid = null;
  multiState.error = null;
  multiState.loading = false;
  menuState.value = 'main';
}

// Set up webrtc callbacks
const handleNetworkMessage = (msg) => {
  if (msg.type === 'init') {
    resetGame();
    state.deck = msg.deck;
    state.online = true;
    state.turn = 'ai'; // 'ai' role is for network opponent
    state.gameState = 'playing';
  }
};

onMounted(() => {
  webrtc.onConnected = () => {
    state.online = true;
    state.isHost = webrtc.isHost;
    state.aiDifficulty = 1;

    if (webrtc.isHost) {
      resetGame(); 
      state.online = true;
      state.turn = 'player';
      state.gameState = 'playing';
      webrtc.sendMessage({ type: 'init', deck: state.deck });
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
    position: absolute; inset: 0; background: rgba(0,0,0,0.9);
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    z-index: 100; pointer-events: auto;
}
.menu-buttons {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 400px;
}
button {
    padding: 15px 40px; font-size: 1.5rem; cursor: pointer; border: none;
    border-radius: 50px; background: linear-gradient(45deg, #00d2ff, #3a7bd5);
    color: #fff; font-weight: bold; transition: transform 0.2s;
}
button:hover { transform: scale(1.05); }

.difficulty-options {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.difficulty-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 15px;
    margin-bottom: 30px;
}
.diff-btn {
    padding: 15px 20px;
    font-size: 1.2rem;
}
.back-btn {
    background: linear-gradient(45deg, #ff0055, #d53a3a);
    padding: 10px 30px;
    font-size: 1.2rem;
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
  width: 500px;
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