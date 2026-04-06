<template>
  <div class="architecture-map-page">
    <div class="header">
      <div class="title-group">
        <h2>🗺️ Cartographie de l'Architecture (Terra Nullius)</h2>
        <span class="subtitle">Vue d'ensemble statique & organisée</span>
      </div>
      <div class="actions">
        <AppButton variant="secondary" class="glass-panel" @click="closeMap">Fermer</AppButton>
      </div>
    </div>

    <div class="map-container">
      <VueFlow v-model="elements" :default-zoom="0.5" :min-zoom="0.1" :max-zoom="4" fit-view-on-init class="vue-flow-custom">
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
const styleVue = { backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', boxShadow: '0 8px 16px rgba(35, 134, 54, 0.2)' }; // Green
const styleUi = { backgroundColor: '#1b642b', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', opacity: '0.9' }; // Dark Green
const styleApi = { backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 'bold' }; // Blue
const styleDb = { backgroundColor: '#d29922', color: '#000', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 'bold' }; // Yellow
const styleMech = { backgroundColor: '#8957e5', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 'bold' }; // Purple
const styleStore = { backgroundColor: '#e34c26', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 'bold' }; // Red/Orange
const styleAdmin = { backgroundColor: '#f85149', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 'bold' }; // Light Red

// Default static map setup
const elements = ref([
  // --- CORE APP ---
  { id: 'f-app', type: 'default', label: '🚀 App.vue\n(Main Entrance)', position: { x: 500, y: -200 }, style: styleVue },
  { id: 'f-menu', type: 'default', label: '🏠 MainMenu.vue\n(Hub)', position: { x: 500, y: -50 }, style: styleVue },
  { id: 'f-router', type: 'default', label: '🛣️ router/index.js\n(Navigation)', position: { x: 700, y: -150 }, style: styleMech },

  // --- GAME DOMAIN ---
  { id: 'f-game', type: 'default', label: '⚔️ GameView.vue\n(Match Controller)', position: { x: 100, y: 150 }, style: styleVue },
  { id: 'c-board', type: 'default', label: '🧩 GameBoard.vue', position: { x: 0, y: 300 }, style: styleUi },
  { id: 'c-phand', type: 'default', label: '✋ PlayerHand.vue', position: { x: 200, y: 300 }, style: styleUi },
  { id: 'c-gcanvas', type: 'default', label: '🧊 GameCanvas.vue\n(3D Renderer)', position: { x: 100, y: 450 }, style: styleUi },
  { id: 'c-holo', type: 'default', label: '✨ HoloCanvas.vue', position: { x: 250, y: 450 }, style: styleUi },
  { id: 'c-glass', type: 'default', label: '💥 BrokenGlass.vue', position: { x: -50, y: 450 }, style: styleUi },
  
  { id: 'm-engine', type: 'default', label: '⚙️ GameEngine.js\n(Turn Logic)', position: { x: -200, y: 150 }, style: styleMech },
  { id: 'm-rules', type: 'default', label: '📜 rules.js\n(Combat Rules)', position: { x: -200, y: 300 }, style: styleMech },
  { id: 'm-webrtc', type: 'default', label: '📡 WebRTCManager.js', position: { x: -200, y: 450 }, style: styleMech },

  // --- COLLECTION & CARDS ---
  { id: 'f-collection', type: 'default', label: '📚 Collection.vue', position: { x: 500, y: 150 }, style: styleVue },
  { id: 'f-decks', type: 'default', label: '🗂️ DecksPage.vue', position: { x: 700, y: 150 }, style: styleVue },
  { id: 'f-deck-edit', type: 'default', label: '✍️ DeckEditor.vue', position: { x: 600, y: 300 }, style: styleVue },
  { id: 'c-ttcard', type: 'default', label: '🃏 TripleTriadCard.vue', position: { x: 500, y: 450 }, style: styleUi },
  { id: 'c-card-grid', type: 'default', label: '🔋 CardGrid.vue', position: { x: 700, y: 450 }, style: styleUi },

  // --- SHOP & WALLET ---
  { id: 'f-boutique', type: 'default', label: '🛍️ Boutique.vue', position: { x: 900, y: 150 }, style: styleVue },
  { id: 'f-pack', type: 'default', label: '🎁 PackOpening.vue', position: { x: 900, y: 300 }, style: styleVue },
  { id: 'f-wallet-b', type: 'default', label: '💰 WalletBoosters.vue', position: { x: 1100, y: 300 }, style: styleVue },

  // --- STORY & QUESTS ---
  { id: 'f-story', type: 'default', label: '📖 StoryPage.vue', position: { x: 1300, y: 150 }, style: styleVue },
  { id: 'f-quests', type: 'default', label: '🎯 QuestsPage.vue', position: { x: 1500, y: 150 }, style: styleVue },
  { id: 'c-qmodal', type: 'default', label: '🎁 QuestModal.vue', position: { x: 1400, y: 300 }, style: styleUi },

  // --- ADMIN TOOLS ---
  { id: 'f-admin', type: 'default', label: '🛠️ AdminLayout', position: { x: 1800, y: -50 }, style: styleAdmin },
  { id: 'f-sim', type: 'default', label: '🤖 AISimulator.vue', position: { x: 1700, y: 150 }, style: styleAdmin },
  { id: 'f-foil', type: 'default', label: '✨ FoilEditor.vue', position: { x: 1900, y: 150 }, style: styleAdmin },
  { id: 'f-config', type: 'default', label: '⚙️ GameConfig.vue', position: { x: 1800, y: 300 }, style: styleAdmin },

  // --- STORES (PINIA) ---
  { id: 's-user', type: 'default', label: '👤 userStore', position: { x: 800, y: 650 }, style: styleStore },
  { id: 's-layout', type: 'default', label: '📱 layoutStore', position: { x: 600, y: 650 }, style: styleStore },
  { id: 's-notif', type: 'default', label: '🔔 notificationStore', position: { x: 1000, y: 650 }, style: styleStore },
  { id: 's-effect', type: 'default', label: '🎬 effectStore', position: { x: 400, y: 650 }, style: styleStore },

  // --- API & SERVICES ---
  { id: 'a-strapi', type: 'default', label: '🔌 strapiService.js', position: { x: 800, y: 850 }, style: styleApi },
  { id: 'a-auth', type: 'default', label: '🔐 Auth API', position: { x: 600, y: 850 }, style: styleApi },
  { id: 'a-cards', type: 'default', label: '🃏 Cards API', position: { x: 1000, y: 850 }, style: styleApi },

  // --- DATABASE ---
  { id: 'd-strapi', type: 'default', label: '🗄️ Strapi Postgres DB', position: { x: 800, y: 1050 }, style: styleDb },

  // --- EDGES ---
  { id: 'e-app-menu', source: 'f-app', target: 'f-menu', animated: true },
  { id: 'e-app-router', source: 'f-router', target: 'f-app' },
  { id: 'e-menu-game', source: 'f-menu', target: 'f-game' },
  { id: 'e-menu-coll', source: 'f-menu', target: 'f-collection' },
  { id: 'e-menu-shop', source: 'f-menu', target: 'f-boutique' },
  { id: 'e-menu-story', source: 'f-menu', target: 'f-story' },
  { id: 'e-menu-admin', source: 'f-menu', target: 'f-admin' },

  { id: 'e-game-eng', source: 'f-game', target: 'm-engine', animated: true },
  { id: 'e-eng-rul', source: 'm-engine', target: 'm-rules' },
  { id: 'e-game-board', source: 'f-game', target: 'c-board' },
  { id: 'e-game-holo', source: 'f-game', target: 'c-holo' },

  { id: 'e-coll-deck', source: 'f-collection', target: 'f-deck-edit' },
  { id: 'e-deck-card', source: 'f-deck-edit', target: 'c-ttcard' },

  { id: 'e-bout-pack', source: 'f-boutique', target: 'f-pack' },
  { id: 'e-bout-wall', source: 'f-boutique', target: 'f-wallet-b' },

  { id: 'e-story-quest', source: 'f-story', target: 'f-quests' },
  
  { id: 'e-all-user', source: 's-user', target: 'a-auth', animated: true },
  { id: 'e-api-db', source: 'a-strapi', target: 'd-strapi', style: { stroke: '#d29922' } },
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
  background: radial-gradient(circle at center, #0d1117 0%, #010409 100%);
  color: #e6edf3;
  z-index: 20000;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: rgba(22, 27, 34, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(48, 54, 61, 0.5);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  z-index: 10;
}

.title-group h2 {
  margin: 0;
  font-size: 1.6rem;
  background: linear-gradient(135deg, #58a6ff 0%, #bc8cff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 0.9rem;
  color: #8b949e;
  font-weight: 500;
}

.map-container {
  flex: 1;
  width: 100%;
  height: 100%;
}

:deep(.vue-flow__node) {
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  white-space: pre-wrap;
  min-width: 180px;
  backdrop-filter: blur(4px);
}

:deep(.vue-flow__node:hover) {
  transform: translateY(-5px) scale(1.02);
  filter: brightness(1.2);
  box-shadow: 0 12px 24px rgba(0,0,0,0.6);
  z-index: 100 !important;
}

:deep(.vue-flow__edge-path) {
  stroke-width: 2.5;
  stroke: rgba(139, 148, 158, 0.4);
  transition: stroke 0.3s;
}

:deep(.vue-flow__edge:hover .vue-flow__edge-path) {
  stroke: #58a6ff;
  stroke-width: 3.5;
}

:deep(.vue-flow__edge.animated .vue-flow__edge-path) {
  stroke-dasharray: 6;
  animation: flowLine 1.5s linear infinite;
}

@keyframes flowLine {
  from { stroke-dashoffset: 24; }
  to { stroke-dashoffset: 0; }
}

:deep(.vue-flow__controls) {
  background: rgba(22, 27, 34, 0.8);
  border: 1px solid rgba(48, 54, 61, 0.5);
  border-radius: 8px;
  padding: 4px;
}

:deep(.vue-flow__controls-button) {
  fill: #e6edf3;
  border-bottom: 1px solid rgba(48, 54, 61, 0.5);
}

:deep(.vue-flow__background) {
  background-color: transparent !important;
}
</style>
