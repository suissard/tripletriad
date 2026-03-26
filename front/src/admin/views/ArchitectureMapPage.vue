<template>
  <div class="architecture-map-page">
    <div class="header">
      <h2>🗺️ Cartographie de l'Architecture Statique (Terra Nullius)</h2>
      <AppButton variant="secondary" class="glass-panel" @click="closeMap">Fermer</AppButton>
    </div>

    <div class="map-container">
      <VueFlow v-model="elements" :default-zoom="0.6" :min-zoom="0.2" :max-zoom="4" fit-view-on-init class="vue-flow-custom">
        <Background pattern-color="#30363d" />
        <Controls />
      </VueFlow>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import AppButton from '@/components/ui/AppButton.vue';

// Vue Flow CSS
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';

const router = useRouter();

// Styles constants
const styleVue = { backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' }; // Green
const styleUi = { backgroundColor: '#1b642b', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' }; // Dark Green
const styleApi = { backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' }; // Blue
const styleDb = { backgroundColor: '#d29922', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' }; // Yellow
const styleMech = { backgroundColor: '#8957e5', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' }; // Purple
const styleStore = { backgroundColor: '#e34c26', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' }; // Orange

// Default static map setup
const elements = ref([
  // --- UI COMPONENTS ---
  { id: 'c-appbtn', type: 'default', label: 'AppButton', position: { x: 50, y: 50 }, style: styleUi },
  { id: 'c-appcard', type: 'default', label: 'AppCard', position: { x: 150, y: 50 }, style: styleUi },
  { id: 'c-appmodal', type: 'default', label: 'AppModal', position: { x: 250, y: 50 }, style: styleUi },
  { id: 'c-apppanel', type: 'default', label: 'AppPanel', position: { x: 350, y: 50 }, style: styleUi },

  { id: 'c-ttcard', type: 'default', label: 'TripleTriadCard', position: { x: 50, y: 120 }, style: styleUi },
  { id: 'c-ttgrid', type: 'default', label: 'TripleTriadCardGrid', position: { x: 200, y: 120 }, style: styleUi },
  { id: 'c-board', type: 'default', label: 'GameBoard', position: { x: 350, y: 120 }, style: styleUi },

  { id: 'c-phand', type: 'default', label: 'PlayerHand', position: { x: 500, y: 120 }, style: styleUi },
  { id: 'c-ohand', type: 'default', label: 'OpponentHand', position: { x: 650, y: 120 }, style: styleUi },
  { id: 'c-gcanvas', type: 'default', label: 'GameCanvas (3D)', position: { x: 800, y: 120 }, style: styleUi },


  // --- FRONTEND VIEWS ---
  { id: 'f-menu', type: 'default', label: '🏠 MainMenu.vue', position: { x: 450, y: -50 }, style: styleVue },
  { id: 'f-app', type: 'default', label: 'App.vue', position: { x: 450, y: -150 }, style: styleVue },

  { id: 'f-auth', type: 'default', label: '🔒 Auth Logic', position: { x: 50, y: 250 }, style: styleVue },
  { id: 'f-boutique', type: 'default', label: '🛍️ BoutiquePage.vue\n(Shop)', position: { x: 200, y: 250 }, style: styleVue },
  { id: 'f-story', type: 'default', label: '📖 StoryPage.vue', position: { x: 350, y: 250 }, style: styleVue },
  { id: 'f-collection', type: 'default', label: '📚 CollectionView.vue\n(User Cards)', position: { x: 500, y: 250 }, style: styleVue },
  { id: 'f-decks', type: 'default', label: '🗂️ DecksPage.vue\n(Deck Builder)', position: { x: 650, y: 250 }, style: styleVue },
  { id: 'f-game', type: 'default', label: '⚔️ GameView.vue\n(Match/Board)', position: { x: 800, y: 250 }, style: styleVue },
  { id: 'f-admin', type: 'default', label: '🛠️ AdminLayout', position: { x: 950, y: 250 }, style: styleVue },

  // --- STORES ---
  { id: 's-user', type: 'default', label: '👤 userStore\n(Pinia)', position: { x: 150, y: 350 }, style: styleStore },
  { id: 's-layout', type: 'default', label: '📱 layoutStore\n(Pinia)', position: { x: 350, y: -150 }, style: styleStore },

  // --- CORE MECHANICS ---
  { id: 'm-engine', type: 'default', label: '⚙️ GameEngine.js\n(Rules, Turns)', position: { x: 800, y: 350 }, style: styleMech },
  { id: 'm-webrtc', type: 'default', label: '📡 WebRTCManager.js\n(Multiplayer P2P)', position: { x: 950, y: 350 }, style: styleMech },
  { id: 'm-three', type: 'default', label: '🧊 three-scene.js\n(3D Renderer)', position: { x: 800, y: 50 }, style: styleMech },
  { id: 'm-rules', type: 'default', label: '📜 rules.js\n(Combat logic)', position: { x: 650, y: 350 }, style: styleMech },

  // --- STRAPI API (Frontend calls) ---
  { id: 'a-auth', type: 'default', label: 'POST /api/auth/local\n(Login/Register)', position: { x: 50, y: 450 }, style: styleApi },
  { id: 'a-user-me', type: 'default', label: 'GET /api/users/me', position: { x: 50, y: 520 }, style: styleApi },

  { id: 'a-shop', type: 'default', label: 'POST /api/shop/open-pack', position: { x: 200, y: 450 }, style: styleApi },

  { id: 'a-story', type: 'default', label: 'GET /api/story-steps', position: { x: 350, y: 450 }, style: styleApi },
  { id: 'a-story-prog', type: 'default', label: 'PUT /api/player-story-progresses', position: { x: 350, y: 520 }, style: styleApi },

  { id: 'a-cards', type: 'default', label: 'GET /api/cards', position: { x: 500, y: 450 }, style: styleApi },
  { id: 'a-usercards', type: 'default', label: 'GET/POST /api/user-cards', position: { x: 500, y: 520 }, style: styleApi },

  { id: 'a-decks', type: 'default', label: 'GET/POST/PUT /api/decks', position: { x: 650, y: 450 }, style: styleApi },

  { id: 'a-matches', type: 'default', label: 'POST /api/webrtc/matches', position: { x: 950, y: 450 }, style: styleApi },

  { id: 'a-wallet', type: 'default', label: 'GET /api/wallet', position: { x: 200, y: 520 }, style: styleApi },

  // --- DATABASE MODELS ---
  { id: 'd-user', type: 'default', label: '🗄️ User', position: { x: 50, y: 700 }, style: styleDb },
  { id: 'd-wallet', type: 'default', label: '🗄️ Wallet', position: { x: 200, y: 700 }, style: styleDb },
  { id: 'd-story', type: 'default', label: '🗄️ StoryStep / Progress', position: { x: 350, y: 700 }, style: styleDb },
  { id: 'd-card', type: 'default', label: '🗄️ Card', position: { x: 500, y: 700 }, style: styleDb },
  { id: 'd-usercard', type: 'default', label: '🗄️ UserCard', position: { x: 500, y: 770 }, style: styleDb },
  { id: 'd-deck', type: 'default', label: '🗄️ Deck', position: { x: 650, y: 700 }, style: styleDb },
  { id: 'd-match', type: 'default', label: '🗄️ Match', position: { x: 950, y: 700 }, style: styleDb },

  // --- EDGES ---
  // Top level connections
  { id: 'e-app-layout', source: 's-layout', target: 'f-app', animated: true },
  { id: 'e-app-menu', source: 'f-app', target: 'f-menu' },

  // Menu to Views
  { id: 'e-m-auth', source: 'f-menu', target: 'f-auth', animated: true },
  { id: 'e-m-bou', source: 'f-menu', target: 'f-boutique', animated: true },
  { id: 'e-m-sto', source: 'f-menu', target: 'f-story', animated: true },
  { id: 'e-m-col', source: 'f-menu', target: 'f-collection', animated: true },
  { id: 'e-m-dec', source: 'f-menu', target: 'f-decks', animated: true },
  { id: 'e-m-gam', source: 'f-menu', target: 'f-game', animated: true },
  { id: 'e-m-adm', source: 'f-menu', target: 'f-admin', animated: true },

  // Views to Components
  { id: 'e-v-col-ttc', source: 'f-collection', target: 'c-ttcard' },
  { id: 'e-v-gam-brd', source: 'f-game', target: 'c-board' },
  { id: 'e-v-gam-ph', source: 'f-game', target: 'c-phand' },
  { id: 'e-v-gam-oh', source: 'f-game', target: 'c-ohand' },
  { id: 'e-v-gam-can', source: 'f-game', target: 'c-gcanvas' },

  // Components to Mechanics
  { id: 'e-c-can-three', source: 'c-gcanvas', target: 'm-three', animated: true },

  // Views to Stores
  { id: 'e-v-auth-su', source: 'f-auth', target: 's-user', animated: true },
  { id: 'e-v-bou-su', source: 'f-boutique', target: 's-user', animated: true },

  // Views/Mechanics to Mechanics
  { id: 'e-v-gam-eng', source: 'f-game', target: 'm-engine', animated: true },
  { id: 'e-m-eng-rul', source: 'm-engine', target: 'm-rules' },
  { id: 'e-m-eng-rtc', source: 'm-engine', target: 'm-webrtc' },

  // Stores/Views to API
  { id: 'e-su-auth', source: 's-user', target: 'a-auth', label: 'POST', animated: true, style: { stroke: '#1f6feb' } },
  { id: 'e-su-ume', source: 's-user', target: 'a-user-me', label: 'GET', animated: true, style: { stroke: '#1f6feb' } },

  { id: 'e-v-bou-shop', source: 'f-boutique', target: 'a-shop', label: 'POST', animated: true, style: { stroke: '#1f6feb' } },
  { id: 'e-v-bou-wall', source: 'f-boutique', target: 'a-wallet', label: 'GET', animated: true, style: { stroke: '#1f6feb' } },

  { id: 'e-v-sto-s', source: 'f-story', target: 'a-story', label: 'GET', animated: true, style: { stroke: '#1f6feb' } },
  { id: 'e-v-sto-sp', source: 'f-story', target: 'a-story-prog', label: 'PUT', animated: true, style: { stroke: '#1f6feb' } },

  { id: 'e-v-col-c', source: 'f-collection', target: 'a-cards', label: 'GET', animated: true, style: { stroke: '#1f6feb' } },
  { id: 'e-v-col-uc', source: 'f-collection', target: 'a-usercards', label: 'GET', animated: true, style: { stroke: '#1f6feb' } },

  { id: 'e-v-dec-d', source: 'f-decks', target: 'a-decks', label: 'GET/POST', animated: true, style: { stroke: '#1f6feb' } },

  { id: 'e-m-rtc-m', source: 'm-webrtc', target: 'a-matches', label: 'POST', animated: true, style: { stroke: '#1f6feb' } },

  // API to Database
  { id: 'e-a-auth-u', source: 'a-auth', target: 'd-user', style: { stroke: '#d29922' } },
  { id: 'e-a-ume-u', source: 'a-user-me', target: 'd-user', style: { stroke: '#d29922' } },

  { id: 'e-a-shop-w', source: 'a-shop', target: 'd-wallet', style: { stroke: '#d29922', strokeDasharray: '5 5' } },
  { id: 'e-a-shop-uc', source: 'a-shop', target: 'd-usercard', style: { stroke: '#d29922', strokeDasharray: '5 5' } },

  { id: 'e-a-wall-w', source: 'a-wallet', target: 'd-wallet', style: { stroke: '#d29922' } },

  { id: 'e-a-sto-s', source: 'a-story', target: 'd-story', style: { stroke: '#d29922' } },
  { id: 'e-a-sp-s', source: 'a-story-prog', target: 'd-story', style: { stroke: '#d29922' } },

  { id: 'e-a-c-c', source: 'a-cards', target: 'd-card', style: { stroke: '#d29922' } },
  { id: 'e-a-uc-uc', source: 'a-usercards', target: 'd-usercard', style: { stroke: '#d29922' } },

  { id: 'e-a-d-d', source: 'a-decks', target: 'd-deck', style: { stroke: '#d29922' } },

  { id: 'e-a-m-m', source: 'a-matches', target: 'd-match', style: { stroke: '#d29922' } },
]);

function closeMap() {
  router.push('/admin');
}
</script>

<style scoped>
.architecture-map-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #0d1117;
  color: #e6edf3;
  z-index: 20000;
  display: flex;
  flex-direction: column;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 25px;
  background-color: #161b22;
  border-bottom: 1px solid #30363d;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  z-index: 10;
}

.header h2 {
  margin: 0;
  font-size: 1.4rem;
  color: #58a6ff;
  text-shadow: 0 0 10px rgba(88, 166, 255, 0.3);
}

.close-btn {
  background: #da3633;
  color: white;
  border: none;
  padding: 8px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  transition: background 0.2s, transform 0.1s;
}
.close-btn:hover { background: #f85149; transform: scale(1.05); }

.map-container {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
}

/* Custom Vue Flow Styles overloads */
:deep(.vue-flow__node) {
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  transition: transform 0.1s;
  cursor: grab;
  text-align: center;
  font-family: monospace;
  font-size: 0.85rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

:deep(.vue-flow__node:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.5);
}

:deep(.vue-flow__node:active) {
  cursor: grabbing;
}

:deep(.vue-flow__edge-path) {
  stroke-width: 2;
}

:deep(.vue-flow__edge.animated .vue-flow__edge-path) {
  stroke-dasharray: 5;
  animation: dashdraw 1s linear infinite;
}

@keyframes dashdraw {
  from { stroke-dashoffset: 10; }
  to { stroke-dashoffset: 0; }
}

:deep(.vue-flow__edge-textbg) {
  fill: #161b22;
}

:deep(.vue-flow__edge-text) {
  fill: #8b949e;
  font-weight: bold;
  font-size: 0.7rem;
}
</style>
