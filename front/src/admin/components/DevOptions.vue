<template>
  <div class="dev-options">
    <button class="dev-button" @click="toggleMenu">
      ⚙️ Options Dev
    </button>
    <div v-if="isOpen" class="dev-menu">
      <h4>Settings</h4>
      <!-- removed old list start -->
        <label class="frame-item">
          <input type="checkbox" v-model="devSettings.autoLogin" @change="saveSettings" />
          Auto Login (Admin)
        </label>
        <div class="dev-session-info" v-if="userStore.isLoggedIn">
          <div :style="{ color: userStore.user.id ? '#00ff88' : '#ffea00' }">
            👤 {{ userStore.user.username }} (ID: {{ userStore.user.id || '?' }})
          </div>
          <div style="font-size: 0.6rem; opacity: 0.7; margin-top: 2px;">
            Token: {{ userStore.jwt ? userStore.jwt.substring(0, 10) + '...' : 'AUCUN' }}
          </div>
        </div>
        <div v-else class="dev-session-info" style="color: #ff0055;">
          ❌ NON CONNECTÉ
        </div>

        <button class="small-dev-btn" @click="doAutoLogin">⚡ Force Login Admin</button>
        <button class="small-dev-btn" @click="checkAuthStatus" style="color: #00d2ff;">🔍 Debug Auth</button>
        <button class="small-dev-btn danger" @click="fullLogout">🗑️ Clear Session</button>



      <h4>Holo Premium</h4>
      <div class="frame-list" style="display: flex; flex-direction: column; gap: 5px;">
      <div class="frame-list">
        <label class="frame-item">
          <input type="radio" v-model="devSettings.premiumMode" value="random" @change="saveSettings" />
          Mode Aléatoire
        </label>
        <label class="frame-item">
          <input type="radio" v-model="devSettings.premiumMode" value="image" @change="saveSettings" />
          Mode Image de fond
        </label>
        
        <label class="frame-item" style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;">
          <span>Finesse de la texture : {{ devSettings.holoFineness }}</span>
          <input 
            type="range" 
            v-model.number="devSettings.holoFineness" 
            min="0.005" max="0.1" step="0.005" 
            @input="updateHoloLive"
            @change="saveSettings" 
            style="width: 100%; accent-color: #00d2ff;" 
          />
        </label>
      </div>

      <h4>Collection</h4>
      <div class="dev-buttons">
        <button @click="addAllCards">🔓 Débloquer toutes les cartes</button>
        <button class="danger" @click="clearCollection">🗑️ Vider la collection</button>
      </div>

      <h4>Dev Currencies</h4>
      <div class="dev-buttons">
        <button @click="doAddCoins">💰 +1000 Coins</button>
        <button @click="doAddGems">💎 +1000 Gems</button>
        <button @click="doAddDust">✨ +1000 Dust</button>
      </div>

      <h4>Tester API</h4>
      <div class="dev-buttons">
        <button @click="openDevTestPage" style="color: #00d2ff; border-color: #00d2ff;">🧪 Testeur API Strapi</button>
        <button @click="openSeedTestPage" style="color: #ff9900; border-color: #ff9900;">🎲 Testeur Aléatoire Seed</button>
        <button @click="openMapPage" style="color: #58a6ff; border-color: #58a6ff;">🗺️ Cartographie Archi.</button>
      </div>

      <h4>Layout</h4>
      <div class="frame-list">
        <label class="frame-item" style="display: flex; flex-direction: column; gap: 5px;">
          <span>Layout Actuel</span>
          <select 
            v-model="layoutStore.currentLayout" 
            @change="setLayout"
            style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;"
          >
            <option value="PlayerLayout">Utilisateur (Player)</option>
            <option value="AdminLayout">Administration (Admin)</option>
            <option value="BlankLayout">Vierge (Game/Login)</option>
          </select>
        </label>
      </div>

      <div class="dev-info">
        Vers: 1.2 | Possédées: {{ userStore.collection.length }} / 45
      </div>
      </div>    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();


import { ref, reactive, onMounted, watch } from 'vue';

import { state, cardLibrary } from '../../game/state.js';
import strapiService from '../../api/strapi.js';
import { useUserStore } from '../../stores/userStore.js';
import { useLayoutStore } from '../../stores/layoutStore.js';

const userStore = useUserStore();
const layoutStore = useLayoutStore();

const devSettings = reactive({
  autoLogin: true,
  premiumMode: 'random',
  holoFineness: 0.05
});

onMounted(() => {
  const saved = localStorage.getItem('dev_options');
  if (saved) {
    Object.assign(devSettings, JSON.parse(saved));
    state.premiumMode = devSettings.premiumMode;
    if (devSettings.holoFineness) state.holoFineness = devSettings.holoFineness;
  }
  // devSettings.autoLogin = true; // Forcé par défaut pour le moment

  if (devSettings.autoLogin && !userStore.isLoggedIn) {
    doAutoLogin();
  }
});

// Watch to auto-relogin if session is cleared but autoLogin is ON
watch(() => userStore.isLoggedIn, (newVal) => {
  if (!newVal && devSettings.autoLogin) {
    console.log('Session cleared, attempting auto-relogin...');
    doAutoLogin();
  }
});

function updateHoloLive() {
  state.holoFineness = devSettings.holoFineness;
}

async function saveSettings() {
  localStorage.setItem('dev_options', JSON.stringify(devSettings));
  state.premiumMode = devSettings.premiumMode;
  state.holoFineness = devSettings.holoFineness;
  
  if (userStore.isLoggedIn && userStore.user?.id) {
    try {
      await strapiService.update('users', userStore.user.id, {
        premiumMode: devSettings.premiumMode,
        holoFineness: devSettings.holoFineness
      });
      console.log('User settings saved to Strapi');
    } catch (err) {
      console.error('Failed to save settings to Strapi:', err);
    }
  }
}

async function doAutoLogin() {
  console.log('Attempting Auto-Login...');
  try {
    const data = await strapiService.login({ identifier: 'admin@gmail.com', password: 'Password123456789!' });
    if (data.jwt) {
      userStore.setAuth(data.jwt, data.user);
      console.log('Auto-login successful. User ID:', data.user.id);
    } else {
      console.warn('Auto-login failed:', data.error?.message);
    }
  } catch (error) {
    console.error('Auto-login error:', error);
  }
}

const isOpen = ref(false);

const frames = [
  { label: 'Aucun', value: null },
  { label: 'Cadre 1', value: 'Gemini_Generated_Image_8118l78118l78118.png' },
  { label: 'Cadre 2', value: 'Gemini_Generated_Image_a29lqha29lqha29l.png' },
  { label: 'Cadre 3', value: 'Gemini_Generated_Image_b0asc2b0asc2b0as.png' },
  { label: 'Cadre 4', value: 'Gemini_Generated_Image_s9qsfcs9qsfcs9qs.png' },
  { label: 'Cadre 5', value: 'Gemini_Generated_Image_w0y18uw0y18uw0y1.png' }
];

const selected = ref(state.selectedFrame);

function toggleMenu() {
  isOpen.value = !isOpen.value;
}

function onFrameChange() {
  state.selectedFrame = selected.value;
}

function setLayout() {
  layoutStore.setLayout(layoutStore.currentLayout);
}

function addAllCards() {
  userStore.collection = cardLibrary.map(c => ({
    cardId: c.id,
    quantity: 1
  }));
}

function clearCollection() {
  userStore.collection = [];
}

function openMapPage() {
  router.push('/admin/cartographie');
  isOpen.value = false;
}

function openSeedTestPage() {
  router.push('/admin/test-seed');
  isOpen.value = false;
}

function openDevTestPage() {
  router.push('/admin/test-api');
  isOpen.value = false; // Close the menu when opening the page
}

function doAddCoins() {
  userStore.addDevCurrencies({ coins: 1000 });
}

function doAddGems() {
  userStore.addDevCurrencies({ gems: 1000 });
}

function doAddDust() {
  userStore.addDevCurrencies({ dust: 1000 });
}

function fullLogout() {
  userStore.logout();
  localStorage.removeItem('tt_jwt');
  localStorage.removeItem('tt_user');
}

async function checkAuthStatus() {
  console.log('--- DEBUG AUTH STATUS ---');
  console.log('JWT:', userStore.jwt ? 'Présent' : 'Absent');

  if (!userStore.jwt) {
    alert('Aucun JWT trouvé ! Cliquez sur "Force Login Admin" d\'abord.');
    return;
  }

  try {
    const data = await strapiService.getMe();
    console.log('Réponse /api/users/me:', data);

    const roleName = data.role?.name || data.role?.type || 'Inconnu';
    alert(`DEBUG AUTH:\n- User: ${data.username}\n- Role: ${roleName}\n- Raw Response: ${JSON.stringify(data).substring(0, 100)}...`);
  } catch (e) {
    console.error('Debug auth request failed:', e);
    alert('Erreur de connexion au serveur Strapi.');
  }
}
</script>

<style scoped>
.dev-options {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.dev-button {
  background: rgba(20, 20, 40, 0.4);
  color: white;
  border: 1px solid #444;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.8rem;
  backdrop-filter: blur(4px);
  transition: all 0.2s ease;
  opacity: 0.8;
}

.dev-button:hover, .dev-options:hover .dev-button {
  background: rgba(40, 40, 60, 0.9);
  border-color: #888;
  opacity: 1;
}

.dev-menu {
  background: rgba(15, 15, 25, 0.95);
  border: 1px solid #333;
  border-radius: 8px;
  padding: 15px;
  color: white;
  width: 100%;
  box-sizing: border-box;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.dev-menu h4 {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
  color: #aaa;
  border-bottom: 1px solid #333;
  padding-bottom: 5px;
}

.dev-session-info {
  font-size: 0.7rem;
  color: #00d2ff;
  margin-top: 5px;
  background: rgba(0, 210, 255, 0.1);
  padding: 5px;
  border-radius: 4px;
}

.small-dev-btn {
  background: #333;
  color: #ccc;
  border: 1px solid #444;
  font-size: 0.65rem;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 5px;
  width: 100%;
}

.small-dev-btn:hover {
  background: #444;
  border-color: #666;
}

.small-dev-btn.danger {
  color: #ff0055;
  border-color: rgba(255, 0, 85, 0.3);
}

.small-dev-btn.danger:hover {
  background: rgba(255, 0, 85, 0.1);
  border-color: #ff0055;
}

.dev-buttons {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
}

.dev-buttons button {
  flex: 1;
  background: #444;
  color: #eee;
  border: 1px solid #666;
  padding: 5px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.dev-buttons button:hover {
  background: #555;
  border-color: #00d2ff;
}

.dev-buttons button.danger {
  color: #ff0055;
}

.dev-info {
  font-size: 0.7rem;
  color: #666;
  text-align: right;
}
</style>
