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
    <AuthPromptModal />
    <FpsCounter />
    
    <!-- Floating Admin Button -->
    <button 
      v-if="showAdminButton" 
      class="floating-admin-btn" 
      @click="router.push('/admin')"
      title="Administration"
    >
      ⚙️ ADMIN
    </button>
  </template>
</template>

<script setup>
import { onMounted, watch, computed } from 'vue';
import AppLayout from './layouts/AppLayout.vue';
import NotificationToast from "./components/NotificationToast.vue";
import AlertMessage from './components/AlertMessage.vue';
import ConfirmationModal from './components/ConfirmationModal.vue';
import { state, loadCardsFromStrapi } from './game/state.js';
import AuthPromptModal from './components/AuthPromptModal.vue';
import { useUserStore } from './stores/userStore.js';
import { useRouter, useRoute } from 'vue-router';
import { useNotificationStore } from './stores/notificationStore.js';
import { initNotificationManager } from "./game/notificationManager.js";
import strapiService from './api/strapi.js';
import InitialLoader from './components/InitialLoader.vue';
import LeftDrawer from './components/LeftDrawer.vue';
import ChatWidget from './components/ChatWidget.vue';
import FpsCounter from './components/ui/FpsCounter.vue';

console.warn('--- TRIPLE TRIAD: FRONTEND LOADED (VERSION: VUE_UI_REVAMP) ---');

const userStore = useUserStore();
const notificationStore = useNotificationStore();
const router = useRouter();
const route = useRoute();

const showAdminButton = computed(() => {
  if (!userStore.isAdmin) return false;
  const path = route.path;
  // Masquer si on est déjà dans l'admin ou en pleine partie
  return !path.startsWith('/admin') && path !== '/game';
});

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

  
  function getContrastYIQ(hexcolor) {
    if (!hexcolor) return '#05050a';
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(c => c + c).join('');
    const r = parseInt(hexcolor.substr(0,2), 16);
    const g = parseInt(hexcolor.substr(2,2), 16);
    const b = parseInt(hexcolor.substr(4,2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#05050a' : '#ffffff';
  }

  function applyColors(cfg) {
    const primary = cfg?.colorPrimary || '#FFBF00';
    const secondary = cfg?.colorSecondary || '#0033ff';
    const accent = cfg?.colorAccent || '#FFFF00';

    document.documentElement.style.setProperty('--color-primary', primary);
    document.documentElement.style.setProperty('--color-secondary', secondary);
    document.documentElement.style.setProperty('--color-accent', accent);

    document.documentElement.style.setProperty('--color-primary-text', getContrastYIQ(primary));
    document.documentElement.style.setProperty('--color-secondary-text', getContrastYIQ(secondary));
    document.documentElement.style.setProperty('--color-accent-text', getContrastYIQ(accent));

    document.documentElement.style.setProperty('--ui-btn-hole', cfg?.uiButtonHole ?? 30);
    document.documentElement.style.setProperty('--ui-btn-speed', cfg?.uiButtonSpeed ?? 1.0);
    document.documentElement.style.setProperty('--ui-btn-opacity', cfg?.uiButtonOpacity ?? 0.25);
  }
  
  // 2. Load essential data in parallel
  const initPromises = [
    (async () => {
      if (userStore.strapiConnected) {
        try { await loadCardsFromStrapi(); } catch(e) { console.error('Error loading cards', e); }
      }
    })(),
    (async () => {
      applyColors(config);
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
    if (!userStore.isLoggedIn) {
      state.authModalOpen = true;
    }
  }, 500);

  watch(() => userStore.strapiConnected, (isConnected, wasConnected) => {
      if (isConnected && wasConnected === false) {
          // Transitioning from offline to online
          localStorage.removeItem('tt_offline_decks');
          notificationStore.addNotification('SYSTEM', 'Connexion rétablie ! Les données hors-ligne (decks, boosters) ont été effacées.', 'warning');
          userStore.fetchUserCollection();
          userStore.fetchUserDecks();
          userStore.fetchCollections();
          userStore.updateUserData();
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
                 applyColors(retryConfig);
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
.floating-admin-btn {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: rgba(255, 0, 85, 0.2);
  border: 1px solid rgba(255, 0, 85, 0.5);
  color: #ff0055;
  font-weight: 900;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 17px;
  backdrop-filter: blur(10px);
  cursor: pointer;
  box-shadow: 0 0 15px rgba(255, 0, 85, 0.3);
  transition: all 0.3s ease;
  letter-spacing: 2px;
  font-family: var(--font-heading), sans-serif;
}

.floating-admin-btn:hover {
  background: rgba(255, 0, 85, 0.4);
  box-shadow: 0 0 25px rgba(255, 0, 85, 0.6);
  transform: translateX(-50%) scale(1.05);
}
</style>
