<template>
  <div class="dev-test-page" v-if="state.showDevTestPage">
    <div class="header">
      <h2>🧪 Testeur API Strapi</h2>

      <div class="auth-selector">
        <label>Utilisateur:</label>
        <select v-model="selectedUserToken" @change="changeUserAuth">
          <option value="current">Courant ({{ state.user?.username || 'Non connecté' }})</option>
          <option value="none">Aucun (Public)</option>
          <option value="custom">Token Personnalisé...</option>
          <option v-for="u in userList" :key="u.id" :value="u.mockToken">
             {{ u.username }} (Mocked Token)
          </option>
        </select>
        <input
          v-if="selectedUserToken === 'custom'"
          type="text"
          v-model="customToken"
          placeholder="Coller le JWT ici"
          class="custom-token-input"
        />
      </div>

      <button class="close-btn" @click="closePage">Fermer</button>
    </div>
    
    <div class="content">
      <!-- Left: Route List -->
      <div class="column left">
        <div class="route-filter">
          <input type="text" v-model="routeSearch" placeholder="Rechercher une route..." />
        </div>

        <div class="route-group" v-for="(group, groupName) in groupedRoutes" :key="groupName">
          <h4>{{ groupName }}</h4>
          <button
            v-for="route in group"
            :key="route.name"
            :class="{ active: selectedRoute?.name === route.name }"
            @click="selectRoute(route)"
          >
            <span class="method" :class="route.method.toLowerCase()">{{ route.method }}</span>
            <span class="route-name" :title="route.path">{{ route.name }}</span>
          </button>
        </div>
      </div>
      
      <!-- Middle: Arguments Form -->
      <div class="column middle">
        <h3>Arguments de la requête</h3>
        <div v-if="selectedRoute">
          <div class="endpoint-display">
            <span class="method" :class="selectedRoute.method.toLowerCase()">{{ selectedRoute.method }}</span>
            <code>{{ buildUrl(selectedRoute) }}</code>
          </div>

          <div class="form-group" v-for="field in selectedRoute.fields" :key="field.key">
            <label>{{ field.label }} <span v-if="field.required" class="required">*</span></label>
            <input v-if="field.type === 'text'" type="text" v-model="form[field.key]" :placeholder="field.default" />
            <input v-if="field.type === 'number'" type="number" v-model.number="form[field.key]" :placeholder="field.default" />
            <textarea v-if="field.type === 'json'" v-model="form[field.key]" rows="5" placeholder='{"key": "value"}'></textarea>
            <select v-if="field.type === 'select'" v-model="form[field.key]">
              <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>

          <button class="test-btn" @click="runTest" :disabled="isLoading">
            {{ isLoading ? '⏳ Requête en cours...' : '🚀 Lancer la requête' }}
          </button>
        </div>
        <div v-else class="empty-state">
           <p>Sélectionnez une route à gauche pour la tester.</p>
           <p>Les requêtes utiliseront le Token JWT sélectionné en haut.</p>
        </div>
      </div>
      
      <!-- Right: Result -->
      <div class="column right" :class="{ error: hasError }">
        <h3>Résultat</h3>
        <div v-if="isLoading" class="loader">
           <div class="spinner"></div> Chargement...
        </div>
        <div v-else-if="result !== null">
           <div class="status-bar">
             <div class="status-code" v-if="statusCode" :class="{ 'status-error': hasError, 'status-success': !hasError }">
               HTTP {{ statusCode }}
             </div>
             <div class="response-time" v-if="responseTime">
               {{ responseTime }} ms
             </div>
           </div>
           <pre>{{ formattedResult }}</pre>
        </div>
        <div v-else class="empty-state">Le résultat s'affichera ici.</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { state } from '../game/state.js';
import strapiService from '../api/strapi.js';

const selectedRoute = ref(null);
const form = reactive({});
const result = ref(null);
const isLoading = ref(false);
const hasError = ref(false);
const statusCode = ref(null);
const responseTime = ref(null);
const routeSearch = ref('');

// Auth testing
const selectedUserToken = ref('current');
const customToken = ref('');
const userList = ref([]);

onMounted(async () => {
  // Try to fetch users for the dropdown (requires admin/proper role, might fail and be ignored)
  try {
    const res = await strapiService.request('GET', '/users');
    if (Array.isArray(res)) {
      userList.value = res.map(u => ({ ...u, mockToken: `mock_${u.id}` })); // Mocked for UI purpose if true login isn't possible
    }
  } catch(e) {
    // Silent fail if non-admin cannot list users
    console.log("Impossible de lister les utilisateurs pour le dropdown DevTest.");
  }
});

const routes = [
  // --- AUTH ---
  { group: 'Auth & Users', name: 'Get Current User', method: 'GET', path: '/users/me?populate=*', fields: [] },
  { group: 'Auth & Users', name: 'Login Local', method: 'POST', path: '/auth/local', fields: [
      { key: 'identifier', label: 'Email / Username', type: 'text', default: 'admin@gmail.com', required: true },
      { key: 'password', label: 'Password', type: 'text', default: 'Password123456789!', required: true }
    ]
  },
  { group: 'Auth & Users', name: 'Register Local', method: 'POST', path: '/auth/local/register', fields: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'text', required: true }
    ]
  },
  { group: 'Auth & Users', name: 'List Users', method: 'GET', path: '/users', fields: [] },

  // --- CARDS (Master Data) ---
  { group: 'Cards', name: 'List All Cards', method: 'GET', path: '/cards?populate=*', fields: [] },
  { group: 'Cards', name: 'Get Single Card', method: 'GET', path: '/cards/', dynamicPath: true, dynamicKey: 'id', fields: [
      { key: 'id', label: 'Card ID (Strapi Document ID)', type: 'text', required: true }
  ]},

  // --- USER CARDS (Collection / Crafting) ---
  { group: 'User Collection', name: 'List User Cards', method: 'GET', path: '/user-cards?populate=*', fields: [] },
  { group: 'User Collection', name: 'Craft Card', method: 'POST', path: '/user-cards/craft', fields: [
      { key: 'cardId', label: 'Card ID (Number in game)', type: 'number', default: 1, required: true }
    ]
  },
  { group: 'User Collection', name: 'Disenchant Card', method: 'POST', path: '/user-cards/disenchant', fields: [
      { key: 'cardId', label: 'Card ID (Number in game)', type: 'number', default: 1, required: true }
    ]
  },
  { group: 'User Collection', name: 'Mass Disenchant', method: 'POST', path: '/user-cards/mass-disenchant', fields: [] },

  // --- DECKS ---
  { group: 'Decks', name: 'List Decks', method: 'GET', path: '/decks?populate=*', fields: [] },
  { group: 'Decks', name: 'Create Deck', method: 'POST', path: '/decks', fields: [
      { key: 'data', label: 'Deck Data (JSON)', type: 'json', default: '{"name": "New Deck", "cards": [1,2,3,4,5]}' }
    ]
  },
  { group: 'Decks', name: 'Update Deck', method: 'PUT', path: '/decks/', dynamicPath: true, dynamicKey: 'id', fields: [
      { key: 'id', label: 'Deck Document ID', type: 'text', required: true },
      { key: 'data', label: 'Deck Data (JSON)', type: 'json', default: '{"name": "Updated Deck"}' }
    ]
  },
  { group: 'Decks', name: 'Delete Deck', method: 'DELETE', path: '/decks/', dynamicPath: true, dynamicKey: 'id', fields: [
      { key: 'id', label: 'Deck Document ID', type: 'text', required: true }
    ]
  },

  // --- SHOP / BOOSTERS ---
  { group: 'Shop', name: 'Open Booster Pack', method: 'POST', path: '/shop/open-pack', fields: [
      { key: 'packId', label: 'Booster Type', type: 'select', options: ['base', 'rare', 'epic'], default: 'base' }
    ]
  },

  // --- WALLET ---
  { group: 'Wallet', name: 'Get Wallet', method: 'GET', path: '/wallets?populate=*', fields: [] },

  // --- WEBRTC / MATCHMAKING ---
  { group: 'Matchmaking', name: 'Create/Find Match', method: 'POST', path: '/webrtc/matches', fields: [] },
  { group: 'Matchmaking', name: 'Join Match', method: 'POST', path: '/webrtc/matches/', dynamicPath: true, dynamicKey: 'uuid', fields: [
      { key: 'uuid', label: 'Match UUID', type: 'text', required: true }
    ]
  },
  { group: 'Matchmaking', name: 'Get Match Info', method: 'GET', path: '/webrtc/matches/', dynamicPath: true, dynamicKey: 'uuid', fields: [
      { key: 'uuid', label: 'Match UUID', type: 'text', required: true }
    ]
  },
  { group: 'Matchmaking', name: 'Arbitrate Match', method: 'POST', path: '/match/arbitrate', fields: [
      { key: 'matchId', label: 'Match UUID', type: 'text', required: true },
      { key: 'logs', label: 'Action Logs (JSON Array)', type: 'json', default: '[]' }
    ]
  },

  // --- GAME CONFIG / HISTORY ---
  { group: 'Game System', name: 'Get Game Config', method: 'GET', path: '/game-configs', fields: [] },
  { group: 'Game System', name: 'List Game History', method: 'GET', path: '/game-histories', fields: [] },
  { group: 'Game System', name: 'Create Game History', method: 'POST', path: '/game-histories', fields: [
      { key: 'data', label: 'History Data (JSON)', type: 'json', default: '{"winner": "PLAYER_1", "duration": 120}' }
    ]
  }
];

const groupedRoutes = computed(() => {
  let filtered = routes;
  if (routeSearch.value) {
    const q = routeSearch.value.toLowerCase();
    filtered = routes.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.path.toLowerCase().includes(q) ||
      r.group.toLowerCase().includes(q)
    );
  }

  return filtered.reduce((acc, route) => {
    if (!acc[route.group]) acc[route.group] = [];
    acc[route.group].push(route);
    return acc;
  }, {});
});

function closePage() {
  state.showDevTestPage = false;
  window.history.pushState({}, '', '/');
  selectedRoute.value = null;
  result.value = null;
  hasError.value = false;
}

function selectRoute(route) {
  selectedRoute.value = route;
  result.value = null;
  hasError.value = false;
  statusCode.value = null;
  responseTime.value = null;

  // Initialize form with defaults
  Object.keys(form).forEach(k => delete form[k]);
  if (route.fields) {
    route.fields.forEach(f => {
      form[f.key] = f.default || '';
    });
  }
}

function buildUrl(route) {
  let url = route.path;
  if (route.dynamicPath && route.dynamicKey) {
    url += form[route.dynamicKey] || `:${route.dynamicKey}`;
  }
  return '/api' + (url.startsWith('/') ? url : '/' + url);
}

function getActiveToken() {
  if (selectedUserToken.value === 'current') {
    return localStorage.getItem('tt_jwt'); // fallback to actual jwt
  } else if (selectedUserToken.value === 'none') {
    return null;
  } else if (selectedUserToken.value === 'custom') {
    return customToken.value;
  } else {
    return selectedUserToken.value; // It's a mocked token or other string
  }
}

async function runTest() {
  if (!selectedRoute.value) return;
  
  isLoading.value = true;
  hasError.value = false;
  result.value = null;
  statusCode.value = null;
  responseTime.value = null;
  
  let url = selectedRoute.value.path;
  if (selectedRoute.value.dynamicPath && selectedRoute.value.dynamicKey) {
    url += form[selectedRoute.value.dynamicKey] || '';
  }
  
  const options = {
    method: selectedRoute.value.method,
    headers: {}
  };

  // Auth Injection
  const token = getActiveToken();
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Construct body for POST/PUT
  if (selectedRoute.value.method !== 'GET' && selectedRoute.value.method !== 'DELETE') {
    let bodyData = {};

    // Check if there is a 'data' json field (Strapi v4/v5 often expects wrapped { data: {...} })
    if (form['data'] !== undefined) {
      try {
        const parsed = JSON.parse(form['data']);
        // If the path is core strapi CRUD, it might need { data: {} }
        if (['/decks', '/game-histories'].some(p => url.startsWith(p))) {
           bodyData = { data: parsed };
        } else {
           bodyData = parsed;
        }
      } catch (e) {
        hasError.value = true;
        result.value = { error: "Invalid JSON in 'data' field", details: e.message };
        isLoading.value = false;
        return;
      }
    } else {
      selectedRoute.value.fields.forEach(f => {
        if (!selectedRoute.value.dynamicPath || f.key !== selectedRoute.value.dynamicKey) {
          if (f.type === 'json') {
             try { bodyData[f.key] = form[f.key] ? JSON.parse(form[f.key]) : null; } catch(e){}
          } else {
             bodyData[f.key] = form[f.key];
          }
        }
      });
    }
    
    if (Object.keys(bodyData).length > 0) {
      options.body = JSON.stringify(bodyData);
      options.headers['Content-Type'] = 'application/json';
    }
  }

  const startTime = performance.now();
  try {
    const fullUrl = `http://localhost:1337/api${url.startsWith('/') ? url : '/' + url}`;
    const response = await fetch(fullUrl, options);
    
    const endTime = performance.now();
    responseTime.value = Math.round(endTime - startTime);
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
      error: "Fetch request failed (Network or CORS)",
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
  background-color: #0f1115;
  color: #e1e1e1;
  z-index: 20000;
  display: flex;
  flex-direction: column;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: #1a1d24;
  border-bottom: 1px solid #2a2e38;
}

.header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #58a6ff;
  display: flex;
  align-items: center;
  gap: 10px;
}

.auth-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #21262d;
  padding: 5px 15px;
  border-radius: 6px;
  border: 1px solid #30363d;
}

.auth-selector select, .auth-selector input {
  background: #0d1117;
  color: #c9d1d9;
  border: 1px solid #30363d;
  padding: 4px 8px;
  border-radius: 4px;
}

.close-btn {
  background: #da3633;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}
.close-btn:hover { background: #f85149; }

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.column {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid #2a2e38;
  box-sizing: border-box;
}
.column:last-child { border-right: none; }

.column h3 {
  margin-top: 0;
  border-bottom: 1px solid #30363d;
  padding-bottom: 12px;
  color: #c9d1d9;
  font-size: 1.1rem;
}

/* LEFT COLUMN - ROUTES */
.left {
  flex: 0 0 320px;
  background-color: #161b22;
  padding: 15px;
}

.route-filter input {
  width: 100%;
  padding: 10px;
  background: #0d1117;
  border: 1px solid #30363d;
  color: #fff;
  border-radius: 6px;
  margin-bottom: 15px;
  box-sizing: border-box;
}

.route-group {
  margin-bottom: 15px;
}
.route-group h4 {
  margin: 0 0 8px 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #8b949e;
  letter-spacing: 0.05em;
}

.left button {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  background: transparent;
  border: 1px solid transparent;
  color: #c9d1d9;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: inherit;
  font-size: 0.9rem;
  transition: all 0.2s;
  margin-bottom: 2px;
}

.left button:hover {
  background: #21262d;
}

.left button.active {
  background: rgba(88, 166, 255, 0.15);
  border-color: rgba(88, 166, 255, 0.4);
  color: #58a6ff;
}

.route-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.method {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 3px 6px;
  border-radius: 4px;
  color: white;
  min-width: 45px;
  text-align: center;
  text-transform: uppercase;
}
.method.get { background: #238636; }
.method.post { background: #8957e5; }
.method.put { background: #d29922; color: #000; }
.method.delete { background: #da3633; }

/* MIDDLE COLUMN - FORM */
.middle {
  flex: 0 0 400px;
  background: #0d1117;
}

.endpoint-display {
  background: #161b22;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #30363d;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.endpoint-display code {
  color: #58a6ff;
  font-family: monospace;
  font-size: 1rem;
}

.empty-state {
  color: #8b949e;
  text-align: center;
  padding: 40px 20px;
  font-style: italic;
  border: 1px dashed #30363d;
  border-radius: 8px;
  margin-top: 20px;
}

.form-group { margin-bottom: 15px; }
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.85rem;
  color: #8b949e;
  font-weight: 600;
}
.required { color: #f85149; }

.form-group input, 
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  background: #161b22;
  border: 1px solid #30363d;
  color: #e6edf3;
  border-radius: 6px;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-group input:focus, .form-group textarea:focus, .form-group select:focus {
  outline: none;
  border-color: #58a6ff;
}

.test-btn {
  width: 100%;
  background: #238636;
  color: white;
  border: 1px solid rgba(240, 246, 252, 0.1);
  padding: 12px;
  font-weight: 600;
  font-size: 1rem;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 15px;
  transition: background 0.2s;
}
.test-btn:hover:not(:disabled) { background: #2ea043; }
.test-btn:disabled { background: #21262d; color: #8b949e; cursor: not-allowed; }

/* RIGHT COLUMN - RESULTS */
.right {
  display: flex;
  flex-direction: column;
  background: #0d1117;
  position: relative;
}

.right.error pre { border-color: rgba(248, 81, 73, 0.4); }

.loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 40px;
  color: #58a6ff;
  font-size: 1.1rem;
}
.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(88, 166, 255, 0.3);
  border-radius: 50%;
  border-top-color: #58a6ff;
  animation: spin 1s ease-in-out infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.status-bar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.status-code {
  font-size: 0.9rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 20px;
}
.status-success { background: rgba(46, 160, 67, 0.15); color: #3fb950; border: 1px solid rgba(46, 160, 67, 0.4); }
.status-error { background: rgba(248, 81, 73, 0.15); color: #f85149; border: 1px solid rgba(248, 81, 73, 0.4); }

.response-time {
  color: #8b949e;
  font-size: 0.9rem;
  background: #161b22;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #30363d;
}

pre {
  background: #161b22;
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
  margin: 0;
  color: #e6edf3;
  border: 1px solid #30363d;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.4;
}
</style>
