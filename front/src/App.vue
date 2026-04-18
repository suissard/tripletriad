<template>
  <InitialLoader v-if="userStore.initializationStatus === 'loading'" />
  
  <template v-else>
    <AppLayout>
      <router-view :key="$route.fullPath" />
    </AppLayout>
    <LeftDrawer />

    <!-- Global Overlays -->
    <AlertMessage />
    <NotificationToast />
    <ConfirmationModal />
    <FpsCounter />
  </template>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import AppLayout from './layouts/AppLayout.vue';
import NotificationToast from "./components/NotificationToast.vue";
import AlertMessage from './components/AlertMessage.vue';
import ConfirmationModal from './components/ConfirmationModal.vue';
import { loadCardsFromStrapi } from './game/state.js';
import { useUserStore } from './stores/userStore.js';
import { useNotificationStore } from './stores/notificationStore.js';
import { initNotificationManager } from "./game/notificationManager.js";
import strapiService from './api/strapi.js';
import InitialLoader from './components/InitialLoader.vue';
import LeftDrawer from './components/LeftDrawer.vue';
import FpsCounter from './components/ui/FpsCounter.vue';

console.warn('--- TRIPLE TRIAD: FRONTEND LOADED (VERSION: VUE_UI_REVAMP) ---');

const userStore = useUserStore();
const notificationStore = useNotificationStore();

onMounted(async () => {
  console.warn('--- TRIPLE TRIAD: INITIALIZING ---');
  
  // 1. Determine connection based on reliable healthCheck (with 3s timeout)
  let isAlive = false;
  try {
    isAlive = await strapiService.healthCheck({ timeout: 3000 });
    userStore.setConnectionStatus(isAlive);
  } catch (err) {
    console.error('Initial connection check failed (Strapi unreachable)', err);
    userStore.setConnectionStatus(false);
  }

  // 1b. Load game config if alive
  let config = null;
  if (isAlive) {
    try {
      config = await strapiService.getGameConfig();
      if (config) {
        userStore.setGameConfig(config);
      }
    } catch (err) {
      console.error('Failed to load game config, using defaults', err);
    }
  }

  
  // 2. Load essential data in parallel
  const initPromises = [
    (async () => {
      if (userStore.strapiConnected) {
        try { await loadCardsFromStrapi(); } catch(e) { console.error('Error loading cards', e); }
      }
    })(),
    (async () => {
      if (config) {
        document.documentElement.style.setProperty('--color-primary', config.colorPrimary || '#FFBF00');
        document.documentElement.style.setProperty('--color-secondary', config.colorSecondary || '#0033ff');
        document.documentElement.style.setProperty('--color-accent', config.colorAccent || '#FFFF00');

        document.documentElement.style.setProperty('--ui-btn-hole', config.uiButtonHole ?? 30);
        document.documentElement.style.setProperty('--ui-btn-speed', config.uiButtonSpeed ?? 1.0);
        document.documentElement.style.setProperty('--ui-btn-opacity', config.uiButtonOpacity ?? 0.25);
      } else {
        // Fallback defaults
        document.documentElement.style.setProperty('--color-primary', '#FFBF00');
        document.documentElement.style.setProperty('--color-secondary', '#0033ff');
        document.documentElement.style.setProperty('--color-accent', '#FFFF00');
        document.documentElement.style.setProperty('--ui-btn-hole', 30);
        document.documentElement.style.setProperty('--ui-btn-speed', 1.0);
        document.documentElement.style.setProperty('--ui-btn-opacity', 0.25);
      }
    })()
  ];

  await Promise.all(initPromises);

  // 3. Setup managers and auth
  initNotificationManager();
  userStore.restoreAuth();
  if (userStore.isLoggedIn) {
    userStore.updateUserData();
  }

  // 4. Finalize
  setTimeout(() => {
    userStore.initializationStatus = 'ready';
    console.warn('--- TRIPLE TRIAD: FRONTEND READY ---');
  }, 500);

  watch(() => userStore.strapiConnected, (isConnected, wasConnected) => {
      if (isConnected && wasConnected === false) {
          // Transitioning from offline to online
          localStorage.removeItem('tt_offline_decks');
          notificationStore.addNotification('SYSTEM', 'Connexion rétablie ! Les données hors-ligne (decks, boosters) ont été effacées.', 'warning');
          userStore.fetchUserCollection();
          userStore.fetchUserDecks();
      }
  });
  
  // Background connection check interval
  const connectionInterval = setInterval(async () => {
    if (userStore.hasEverConnected) {
      clearInterval(connectionInterval);
      return;
    }
    
    // Periodically retry healthCheck to see if we can go online
    try {
        const isNowAlive = await strapiService.healthCheck();
        if (isNowAlive) {
            userStore.setConnectionStatus(true);
            // Also try to load config now that we are online
            const retryConfig = await strapiService.getGameConfig();
            if (retryConfig) {
                 userStore.setGameConfig(retryConfig);
                 // Update CSS variables if config loaded
                 document.documentElement.style.setProperty('--color-primary', retryConfig.colorPrimary || '#FFBF00');
                 document.documentElement.style.setProperty('--color-secondary', retryConfig.colorSecondary || '#0033ff');
                 document.documentElement.style.setProperty('--color-accent', retryConfig.colorAccent || '#FFFF00');
            }
        }
    } catch (e) {
        // Still offline
    }

  }, 10000);
});
</script>

<style>
/* Global styles */
</style>
