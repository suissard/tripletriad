const fs = require('fs');

const appPath = 'front/src/App.vue';
let content = fs.readFileSync(appPath, 'utf8');

if (!content.includes('watch(')) {
    content = content.replace("import { onMounted } from 'vue';", "import { onMounted, watch } from 'vue';");
}

if (!content.includes('useNotificationStore')) {
    content = content.replace("import { useUserStore } from './stores/userStore.js';", "import { useUserStore } from './stores/userStore.js';\nimport { useNotificationStore } from './stores/notificationStore.js';");
}

const watcherCode = `
  const notificationStore = useNotificationStore();

  watch(() => userStore.strapiConnected, (isConnected, wasConnected) => {
      if (isConnected && wasConnected === false) {
          // Transitioning from offline to online
          localStorage.removeItem('tt_offline_decks');
          notificationStore.addNotification('SYSTEM', 'Connexion rétablie ! Les données hors-ligne (decks, boosters) ont été effacées.', 'warning');
          userStore.fetchUserCollection();
          userStore.fetchUserDecks();
      }
  });
`;

if (!content.includes('watch(() => userStore.strapiConnected')) {
    content = content.replace("userStore.restoreAuth();", "userStore.restoreAuth();" + watcherCode);
}

fs.writeFileSync(appPath, content);
console.log('App.vue patched');
