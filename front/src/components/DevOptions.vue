<template>
  <div class="dev-options">
    <button class="dev-button" @click="toggleMenu">
      ⚙️ Options Dev
    </button>
    <div v-if="isOpen" class="dev-menu">
      <h4>Settings</h4>
      <div class="frame-list">
        <label class="frame-item">
          <input type="checkbox" v-model="devSettings.autoLogin" @change="saveSettings" />
          Auto Login (Admin)
        </label>
        <div class="dev-session-info" v-if="state.isLoggedIn">
          <div :style="{ color: state.user.id ? '#00ff88' : '#ffea00' }">
            👤 {{ state.user.username }} (ID: {{ state.user.id || '?' }})
          </div>
          <div style="font-size: 0.6rem; opacity: 0.7; margin-top: 2px;">
            Token: {{ state.jwt ? state.jwt.substring(0, 10) + '...' : 'AUCUN' }}
          </div>
        </div>
        <div v-else class="dev-session-info" style="color: #ff0055;">
          ❌ NON CONNECTÉ
        </div>

        <button class="small-dev-btn" @click="doAutoLogin">⚡ Force Login Admin</button>
        <button class="small-dev-btn" @click="checkAuthStatus" style="color: #00d2ff;">🔍 Debug Auth</button>
        <button class="small-dev-btn danger" @click="fullLogout">🗑️ Clear Session</button>
      </div>

      <h4>Collection</h4>
      <div class="dev-buttons">
        <button @click="addAllCards">🔓 Débloquer toutes les cartes</button>
        <button class="danger" @click="clearCollection">🗑️ Vider la collection</button>
      </div>

      <div class="dev-info">
        Vers: 1.2 | Possédées: {{ state.collection.length }} / 45
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { state, cardLibrary, setAuth, logout } from '../game/state.js';
import { setCardFrame } from '../game/three-scene.js';
import strapiService from '../api/strapi.js';

const devSettings = reactive({
  autoLogin: true
});

onMounted(() => {
  const saved = localStorage.getItem('dev_options');
  if (saved) {
    Object.assign(devSettings, JSON.parse(saved));
  }
  // devSettings.autoLogin = true; // Forcé par défaut pour le moment

  if (devSettings.autoLogin && !state.isLoggedIn) {
    doAutoLogin();
  }
});

// Watch to auto-relogin if session is cleared but autoLogin is ON
watch(() => state.isLoggedIn, (newVal) => {
  if (!newVal && devSettings.autoLogin) {
    console.log('Session cleared, attempting auto-relogin...');
    doAutoLogin();
  }
});

function saveSettings() {
  localStorage.setItem('dev_options', JSON.stringify(devSettings));
}

async function doAutoLogin() {
  console.log('Attempting Auto-Login...');
  try {
    const data = await strapiService.login({ identifier: 'admin@gmail.com', password: 'Password123456789!' });
    if (data.jwt) {
      setAuth(data.jwt, data.user);
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
  setCardFrame(selected.value);
}

function addAllCards() {
  state.collection = cardLibrary.map(c => ({
    cardId: c.id,
    quantity: 1
  }));
}

function clearCollection() {
  state.collection = [];
}

function fullLogout() {
  logout();
  localStorage.removeItem('tt_jwt');
  localStorage.removeItem('tt_user');
}

async function checkAuthStatus() {
  console.log('--- DEBUG AUTH STATUS ---');
  console.log('JWT:', state.jwt ? 'Présent' : 'Absent');

  if (!state.jwt) {
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
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  pointer-events: auto;
  /* Required as parent '#ui' in App.vue might have pointer-events: none */
}

.dev-button {
  background: rgba(20, 20, 40, 0.8);
  color: white;
  border: 1px solid #444;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  backdrop-filter: blur(4px);
  transition: all 0.2s ease;
}

.dev-button:hover {
  background: rgba(40, 40, 60, 0.9);
  border-color: #888;
}

.dev-menu {
  background: rgba(15, 15, 25, 0.95);
  border: 1px solid #333;
  border-radius: 8px;
  padding: 15px;
  color: white;
  width: 200px;
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
