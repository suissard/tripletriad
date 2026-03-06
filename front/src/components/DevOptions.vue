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
      </div>

      <h4>Collection</h4>
      <div class="dev-buttons">
        <button @click="addAllCards">Add All</button>
        <button class="danger" @click="clearCollection">Clear</button>
      </div>

      <div class="dev-info">
        Possédées: {{ state.collection.length }} / 45
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { state, cardLibrary, setAuth } from '../game/state.js';
import { setCardFrame } from '../game/three-scene.js';

const devSettings = reactive({
  autoLogin: true
});

onMounted(() => {
  const saved = localStorage.getItem('dev_options');
  if (saved) {
    Object.assign(devSettings, JSON.parse(saved));
  }
  devSettings.autoLogin = true; // Forcé par défaut selon la demande temporaire

  if (devSettings.autoLogin && !state.isLoggedIn) {
    doAutoLogin();
  }
});

function saveSettings() {
  localStorage.setItem('dev_options', JSON.stringify(devSettings));
}

async function doAutoLogin() {
  try {
    const response = await fetch('http://localhost:1337/api/auth/local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@admin.com', password: 'admin' })
    });

    if (response.ok) {
      const data = await response.json();
      setAuth(data.jwt, data.user);
      console.log('Auto-login successful.');
    } else {
      console.warn('Auto-login failed.', await response.text());
      // Bypass auth since we are in dev options
      setAuth('fake-jwt-token', { username: 'Guest Dev', email: 'guest@dev.local' });
    }
  } catch (error) {
    console.error('Auto-login error:', error);
    setAuth('fake-jwt-token', { username: 'Guest Dev', email: 'guest@dev.local' });
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
  pointer-events: auto; /* Required as parent '#ui' in App.vue might have pointer-events: none */
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.dev-menu h4 {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
  color: #aaa;
  border-bottom: 1px solid #333;
  padding-bottom: 5px;
}

.frame-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.frame-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}

.frame-item input {
  cursor: pointer;
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
