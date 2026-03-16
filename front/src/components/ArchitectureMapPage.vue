<template>
  <div class="architecture-map-page" >
    <div class="header">
      <h2>🗺️ Cartographie de l'Architecture (Terra Nullius)</h2>
      <AppButton variant="secondary"  class="glass-panel" @click="closeMap">Fermer</AppButton>
    </div>

    <div class="map-container">
      <VueFlow v-model="elements" :default-zoom="0.8" :min-zoom="0.2" :max-zoom="4" fit-view-on-init class="vue-flow-custom">
        <Background pattern-color="#30363d" />
        <Controls />
      </VueFlow>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();


import { ref } from 'vue';

import { state } from '../game/state.js';
import PageLayout from './PageLayout.vue';
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';

// Vue Flow CSS
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';

// Default map setup
const elements = ref([
  // --- FRONTEND VIEWS (Greenish) ---
  { id: 'f-menu', type: 'default', label: '🏠 MainMenu.vue\n(Entry Point)', position: { x: 250, y: 50 }, style: { backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: 'f-auth', type: 'default', label: '🔒 Auth Logic\n(App.vue)', position: { x: 50, y: 150 }, style: { backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: 'f-boutique', type: 'default', label: '🛍️ BoutiquePage.vue\n(Shop)', position: { x: 250, y: 250 }, style: { backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: 'f-collection', type: 'default', label: '📚 CollectionView.vue\n(User Cards)', position: { x: 450, y: 250 }, style: { backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: 'f-decks', type: 'default', label: '🗂️ DecksPage.vue\n(Deck Builder)', position: { x: 650, y: 250 }, style: { backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: 'f-game', type: 'default', label: '⚔️ GameView.vue\n(Match/Board)', position: { x: 850, y: 250 }, style: { backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },

  // --- STRAPI API (Bluish) ---
  { id: 'b-auth', type: 'default', label: '🛡️ /api/auth\n(Login/Register)', position: { x: 50, y: 450 }, style: { backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: 'b-shop', type: 'default', label: '📦 /api/shop/open-pack\n(Booster Logic)', position: { x: 250, y: 450 }, style: { backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: 'b-cards', type: 'default', label: '📜 /api/cards\n(Master Data)', position: { x: 450, y: 450 }, style: { backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: 'b-usercards', type: 'default', label: '🔖 /api/user-cards\n(Craft/Disenchant)', position: { x: 550, y: 550 }, style: { backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: 'b-decks', type: 'default', label: '🃏 /api/decks\n(CRUD)', position: { x: 650, y: 450 }, style: { backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: 'b-webrtc', type: 'default', label: '📡 /api/webrtc/matches\n(Matchmaking)', position: { x: 850, y: 450 }, style: { backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },
  { id: 'b-wallet', type: 'default', label: '💰 /api/wallet\n(Coins/Dust)', position: { x: 350, y: 650 }, style: { backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px' } },

  // --- DATABASE MODELS (Orange/Yellowish) ---
  { id: 'd-user', type: 'default', label: '🗄️ User (Plugin Users-Permissions)', position: { x: 50, y: 750 }, style: { backgroundColor: '#d29922', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
  { id: 'd-card', type: 'default', label: '🗄️ Card\n(Id, Name, Stats)', position: { x: 450, y: 750 }, style: { backgroundColor: '#d29922', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
  { id: 'd-usercard', type: 'default', label: '🗄️ UserCard\n(Relation User <-> Card)', position: { x: 550, y: 850 }, style: { backgroundColor: '#d29922', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
  { id: 'd-deck', type: 'default', label: '🗄️ Deck\n(JSON data)', position: { x: 650, y: 750 }, style: { backgroundColor: '#d29922', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
  { id: 'd-match', type: 'default', label: '🗄️ Match\n(State, UUID, Players)', position: { x: 850, y: 750 }, style: { backgroundColor: '#d29922', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
  { id: 'd-wallet', type: 'default', label: '🗄️ Wallet\n(Relation User 1:1)', position: { x: 350, y: 850 }, style: { backgroundColor: '#d29922', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },
  { id: 'd-booster', type: 'default', label: '🗄️ Booster\n(Type, Rates)', position: { x: 250, y: 750 }, style: { backgroundColor: '#d29922', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' } },


  // --- EDGES ---
  // Main Menu links
  { id: 'e-m-b', source: 'f-menu', target: 'f-boutique', animated: true },
  { id: 'e-m-c', source: 'f-menu', target: 'f-collection', animated: true },
  { id: 'e-m-d', source: 'f-menu', target: 'f-decks', animated: true },
  { id: 'e-m-g', source: 'f-menu', target: 'f-game', animated: true },

  // Front to API
  { id: 'e-auth-api', source: 'f-auth', target: 'b-auth', animated: true },
  { id: 'e-bou-api', source: 'f-boutique', target: 'b-shop', animated: true },
  { id: 'e-col-api1', source: 'f-collection', target: 'b-cards', animated: true },
  { id: 'e-col-api2', source: 'f-collection', target: 'b-usercards', animated: true },
  { id: 'e-dec-api', source: 'f-decks', target: 'b-decks', animated: true },
  { id: 'e-gam-api', source: 'f-game', target: 'b-webrtc', animated: true },

  // API to Database
  { id: 'e-api-u', source: 'b-auth', target: 'd-user', style: { stroke: '#d29922' } },

  { id: 'e-api-shop-w', source: 'b-shop', target: 'b-wallet', style: { stroke: '#1f6feb', strokeDasharray: '5 5' } },
  { id: 'e-api-shop-uc', source: 'b-shop', target: 'b-usercards', style: { stroke: '#1f6feb', strokeDasharray: '5 5' } },
  { id: 'e-api-shop-boo', source: 'b-shop', target: 'd-booster', style: { stroke: '#d29922' } },

  { id: 'e-api-c-c', source: 'b-cards', target: 'd-card', style: { stroke: '#d29922' } },

  { id: 'e-api-uc-uc', source: 'b-usercards', target: 'd-usercard', style: { stroke: '#d29922' } },
  { id: 'e-api-uc-w', source: 'b-usercards', target: 'b-wallet', style: { stroke: '#1f6feb', strokeDasharray: '5 5' } },

  { id: 'e-api-d-d', source: 'b-decks', target: 'd-deck', style: { stroke: '#d29922' } },

  { id: 'e-api-wrtc-m', source: 'b-webrtc', target: 'd-match', style: { stroke: '#d29922' } },

  { id: 'e-api-w-w', source: 'b-wallet', target: 'd-wallet', style: { stroke: '#d29922' } },

  // Internal Database Relations
  { id: 'e-rel-u-w', source: 'd-user', target: 'd-wallet', label: '1:1', style: { stroke: '#6e7681' } },
  { id: 'e-rel-u-uc', source: 'd-user', target: 'd-usercard', label: '1:N', style: { stroke: '#6e7681' } },
  { id: 'e-rel-c-uc', source: 'd-card', target: 'd-usercard', label: '1:N', style: { stroke: '#6e7681' } },
  { id: 'e-rel-u-d', source: 'd-user', target: 'd-deck', label: '1:N', style: { stroke: '#6e7681' } }

]);

function closeMap() {
  router.push('/');
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
}
</style>
