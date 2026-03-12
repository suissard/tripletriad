const fs = require('fs');
const drawerPath = 'front/src/components/RightDrawer.vue';
let content = fs.readFileSync(drawerPath, 'utf8');

const notifView = `
        <!-- NOTIFICATION SETTINGS VIEW -->
        <template v-else-if="currentView === 'notifications'">
          <div class="notif-settings-list">
            <div class="setting-item">
              <span>Pose de Carte</span>
              <label class="switch">
                <input type="checkbox" :checked="notificationStore.preferences.CARD_PLACED" @change="notificationStore.togglePreference('CARD_PLACED')">
                <span class="slider round"></span>
              </label>
            </div>
            <div class="setting-item">
              <span>Capture de Carte</span>
              <label class="switch">
                <input type="checkbox" :checked="notificationStore.preferences.CARD_CAPTURED" @change="notificationStore.togglePreference('CARD_CAPTURED')">
                <span class="slider round"></span>
              </label>
            </div>
            <div class="setting-item">
              <span>Début de Tour</span>
              <label class="switch">
                <input type="checkbox" :checked="notificationStore.preferences.TURN_START" @change="notificationStore.togglePreference('TURN_START')">
                <span class="slider round"></span>
              </label>
            </div>
            <div class="setting-item">
              <span>Fin de Partie</span>
              <label class="switch">
                <input type="checkbox" :checked="notificationStore.preferences.GAME_OVER" @change="notificationStore.togglePreference('GAME_OVER')">
                <span class="slider round"></span>
              </label>
            </div>
            <div class="setting-item">
              <span>Durée d'affichage (ms)</span>
              <input type="number" class="duration-input" v-model.number="notificationStore.preferences.duration" @change="notificationStore.savePreferences()" step="500" min="1000" max="10000">
            </div>
            <button class="test-btn" @click="notificationStore.addNotification('CARD_PLACED', 'Test : Notification posée !', 'info')">Test Pose</button>
            <button class="test-btn" @click="notificationStore.addNotification('CARD_CAPTURED', 'Test : Carte capturée !', 'warning')">Test Capture</button>
            <button class="test-btn" @click="notificationStore.addNotification('GAME_OVER', 'Test : Partie terminée !', 'success')">Test Fin</button>
          </div>
        </template>
`;

content = content.replace("<!-- PROFILE VIEW -->", notifView + "\n        <!-- PROFILE VIEW -->");
content = content.replace("import { useUserStore } from '../stores/userStore.js';", "import { useUserStore } from '../stores/userStore.js';\nimport { useNotificationStore } from '../stores/notificationStore.js';");
content = content.replace("const userStore = useUserStore();", "const userStore = useUserStore();\nconst notificationStore = useNotificationStore();");

const computedTitleReplace = `  if (currentView.value === 'profile') return 'Profil & Stats';
  if (currentView.value === 'collection') return 'Collection Rapide';
  if (currentView.value === 'decks') return 'Mes Decks';
  if (currentView.value === 'ai-menu') return 'Mode Entraînement';
  if (currentView.value === 'notifications') return 'Paramètres de Notification';
  return 'Menu Principal';`;
content = content.replace(/if \(currentView\.value === 'ai-menu'\) return 'Mode Entraînement';\s*return 'Menu Principal';/g, computedTitleReplace);

const newStyles = `
<style scoped>
/* NOTIFICATION SETTINGS */
.notif-settings-list { display: flex; flex-direction: column; gap: 15px; padding: 10px; }
.setting-item { display: flex; justify-content: space-between; align-items: center; background: rgba(15, 20, 30, 0.7); padding: 10px 15px; border-radius: 8px; border: 1px solid rgba(100, 150, 255, 0.2); color: #fff; }
.duration-input { background: rgba(10, 15, 25, 0.8); border: 1px solid rgba(100, 150, 255, 0.5); color: white; padding: 5px; border-radius: 4px; width: 80px; text-align: right; font-family: 'Rajdhani', sans-serif; }
.test-btn { background: rgba(100, 150, 255, 0.2); color: #4cc9f0; border: 1px solid rgba(100, 150, 255, 0.5); padding: 8px; border-radius: 6px; cursor: pointer; font-family: 'Rajdhani', sans-serif; transition: all 0.2s; }
.test-btn:hover { background: rgba(100, 150, 255, 0.4); color: #fff; }
.switch { position: relative; display: inline-block; width: 50px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #2a3a5a; transition: .4s; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; }
input:checked + .slider { background-color: #4cc9f0; }
input:focus + .slider { box-shadow: 0 0 1px #4cc9f0; }
input:checked + .slider:before { transform: translateX(26px); }
.slider.round { border-radius: 34px; }
.slider.round:before { border-radius: 50%; }
`;

content = content.replace("<style scoped>", newStyles);

fs.writeFileSync(drawerPath, content);
console.log('RightDrawer modified');
