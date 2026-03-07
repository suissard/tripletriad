<template>
  <div class="dev-test-page" v-if="state.showDevTestPage">
    <div class="header">
      <h2>🧪 Testeur API Strapi</h2>
      <button class="close-btn" @click="closePage">Fermer</button>
    </div>
    
    <div class="content">
      <!-- Left: Route List -->
      <div class="column left">
        <h3>Routes</h3>
        <button 
          v-for="route in routes" 
          :key="route.name"
          :class="{ active: selectedRoute?.name === route.name }"
          @click="selectRoute(route)"
        >
          <span class="method" :class="route.method.toLowerCase()">{{ route.method }}</span>
          {{ route.name }}
        </button>
      </div>
      
      <!-- Middle: Arguments Form -->
      <div class="column middle">
        <h3>Arguments</h3>
        <div v-if="selectedRoute">
          <div class="form-group" v-for="field in selectedRoute.fields" :key="field.key">
            <label>{{ field.label }}</label>
            <input v-if="field.type === 'text'" type="text" v-model="form[field.key]" />
            <input v-if="field.type === 'number'" type="number" v-model.number="form[field.key]" />
            <textarea v-if="field.type === 'json'" v-model="form[field.key]" rows="5"></textarea>
          </div>
          <button class="test-btn" @click="runTest">🚀 Tester</button>
        </div>
        <div v-else class="empty-state">Sélectionnez une route à tester</div>
      </div>
      
      <!-- Right: Result -->
      <div class="column right" :class="{ error: hasError }">
        <h3>Résultat</h3>
        <div v-if="isLoading" class="loader">
           ⏳ Chargement...
        </div>
        <div v-else-if="result !== null">
           <div class="status-code" v-if="statusCode" :class="{ 'status-error': hasError, 'status-success': !hasError }">Status: {{ statusCode }}</div>
           <pre>{{ formattedResult }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { state } from '../game/state.js';
import strapiService from '../api/strapi.js';

const selectedRoute = ref(null);
const form = reactive({});
const result = ref(null);
const isLoading = ref(false);
const hasError = ref(false);
const statusCode = ref(null);

const routes = [
  {
    name: 'GET /users/me',
    method: 'GET',
    path: '/users/me?populate=*',
    fields: []
  },
  {
    name: 'POST /auth/local (Login)',
    method: 'POST',
    path: '/auth/local',
    fields: [
      { key: 'identifier', label: 'Email', type: 'text', default: 'admin@gmail.com' },
      { key: 'password', label: 'Password', type: 'text', default: 'Password123456789!' }
    ]
  },
  {
    name: 'GET /cards',
    method: 'GET',
    path: '/cards',
    fields: []
  },
  {
    name: 'POST /booster/open',
    method: 'POST',
    path: '/booster/open',
    fields: [
      { key: 'boosterType', label: 'Booster Type', type: 'text', default: 'base' }
    ]
  },
  {
    name: 'POST /user-cards/craft',
    method: 'POST',
    path: '/user-cards/craft',
    fields: [
      { key: 'cardId', label: 'Card ID (Number)', type: 'number', default: 1 }
    ]
  },
  {
    name: 'POST /user-cards/disenchant',
    method: 'POST',
    path: '/user-cards/disenchant',
    fields: [
      { key: 'cardId', label: 'Card ID (Number)', type: 'number', default: 1 }
    ]
  },
  {
    name: 'POST /user-cards/mass-disenchant',
    method: 'POST',
    path: '/user-cards/mass-disenchant',
    fields: []
  },
  {
    name: 'POST /webrtc/matches',
    method: 'POST',
    path: '/webrtc/matches',
    fields: []
  },
  {
    name: 'POST /webrtc/matches/:uuid (Join)',
    method: 'POST',
    path: '/webrtc/matches/',
    dynamicPath: true,
    fields: [
      { key: 'uuid', label: 'Match UUID', type: 'text', default: '' }
    ]
  }
];

function closePage() {
  state.showDevTestPage = false;
  selectedRoute.value = null;
  result.value = null;
  hasError.value = false;
}

function selectRoute(route) {
  selectedRoute.value = route;
  result.value = null;
  hasError.value = false;
  // Initialize form with defaults
  Object.keys(form).forEach(k => delete form[k]);
  if (route.fields) {
    route.fields.forEach(f => {
      form[f.key] = f.default;
    });
  }
}

async function runTest() {
  if (!selectedRoute.value) return;
  
  isLoading.value = true;
  hasError.value = false;
  result.value = null;
  statusCode.value = null;
  
  let url = selectedRoute.value.path;
  if (selectedRoute.value.dynamicPath) {
    url += form['uuid'] || '';
  }
  
  const options = {
    method: selectedRoute.value.method,
    headers: {}
  };
  
  // Construct body for POST/PUT
  if (selectedRoute.value.method !== 'GET') {
    const bodyData = {};
    selectedRoute.value.fields.forEach(f => {
      if (!selectedRoute.value.dynamicPath || f.key !== 'uuid') {
        bodyData[f.key] = form[f.key];
      }
    });
    
    if (Object.keys(bodyData).length > 0) {
      options.body = JSON.stringify(bodyData);
      options.headers['Content-Type'] = 'application/json';
    }
  }

  try {
    const rawClient = strapiService.rawClient;
    const response = await rawClient.fetch(url, options);
    
    statusCode.value = response.status;
    hasError.value = !response.ok;
    
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    result.value = responseData;

  } catch (error) {
    hasError.value = true;
    result.value = {
      error: "Fetch request failed",
      message: error.message || error.toString()
    };
  } finally {
    isLoading.value = false;
  }
}

const formattedResult = computed(() => {
  if (result.value === null) return '';
  if (typeof result.value === 'object') {
    return JSON.stringify(result.value, null, 2);
  }
  return result.value;
});
</script>

<style scoped>
.dev-test-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #121212;
  color: #fff;
  z-index: 20000;
  display: flex;
  flex-direction: column;
  font-family: sans-serif;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #1e1e1e;
  border-bottom: 1px solid #333;
}

.header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #00d2ff;
}

.close-btn {
  background: #ff0055;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.close-btn:hover {
  background: #e6004c;
}

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.column {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid #333;
  box-sizing: border-box;
}

.column h3 {
  margin-top: 0;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
  color: #ccc;
  font-size: 1.1rem;
}

.left {
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.left button {
  text-align: left;
  padding: 10px;
  background: #2a2a2a;
  border: 1px solid #444;
  color: white;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: inherit;
  transition: all 0.2s;
}

.left button:hover {
  background: #3a3a3a;
  border-color: #666;
}

.left button.active {
  background: rgba(0, 210, 255, 0.1);
  color: #fff;
  border-color: #00d2ff;
}

.method {
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 3px;
  color: white;
  min-width: 40px;
  text-align: center;
}
.method.get { background: #00a2ff; }
.method.post { background: #00ff88; color: #000; }
.method.put { background: #ffaa00; color: #000; }
.method.delete { background: #ff0055; }

.middle {
  flex: 0 0 350px;
  background: #1a1a1a;
}

.empty-state {
  color: #666;
  font-style: italic;
  padding: 20px 0;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 0.9rem;
  color: #ccc;
}

.form-group input, 
.form-group textarea {
  width: 100%;
  padding: 10px;
  background: #222;
  border: 1px solid #444;
  color: white;
  border-radius: 4px;
  box-sizing: border-box;
  font-family: inherit;
}

.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: #00d2ff;
}

.test-btn {
  width: 100%;
  background: #00ff88;
  color: #000;
  border: none;
  padding: 12px;
  font-weight: bold;
  font-size: 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
  transition: background 0.2s;
}
.test-btn:hover {
  background: #00cc6a;
}

.right {
  display: flex;
  flex-direction: column;
  background: #121212;
  transition: background-color 0.3s ease;
}

.right.error {
  background-color: #2b0000;
}

.loader {
  font-size: 1.2rem;
  color: #00d2ff;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
}

.status-code {
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 15px;
  padding: 8px 12px;
  border-radius: 4px;
  display: inline-block;
}

.status-success {
  background: rgba(0, 255, 136, 0.1);
  color: #00ff88;
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.status-error {
  background: rgba(255, 0, 85, 0.1);
  color: #ff0055;
  border: 1px solid rgba(255, 0, 85, 0.3);
}

pre {
  background: rgba(0,0,0,0.5);
  padding: 15px;
  border-radius: 5px;
  overflow-x: auto;
  flex: 1;
  margin: 0;
  color: #a5d6ff;
  border: 1px solid #333;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: monospace;
}
</style>
