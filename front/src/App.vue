<template>
  <router-view />

  <!-- Global Overlays -->
  <AlertMessage />
  <NotificationToast />
  <ConfirmationModal />
  <TopNavbar />
  <RightDrawer />
  <DevOptions />
</template>

<script setup>
import { onMounted, watch } from 'vue';
import TopNavbar from './components/TopNavbar.vue';
import RightDrawer from './components/RightDrawer.vue';
import NotificationToast from "./components/NotificationToast.vue";
import AlertMessage from './components/AlertMessage.vue';
import ConfirmationModal from './components/ConfirmationModal.vue';
import DevOptions from './components/DevOptions.vue';
import { state, loadCardsFromStrapi } from './game/state.js';
import { useUserStore } from './stores/userStore.js';
import { useNotificationStore } from './stores/notificationStore.js';
import { initNotificationManager } from "./game/notificationManager.js";
import strapiService from './api/strapi.js';

console.warn('--- TRIPLE TRIAD: FRONTEND LOADED (VERSION: VUE_UI_REVAMP) ---');

onMounted(async () => {
  // Load cards from Strapi
  loadCardsFromStrapi();

  try {
    const config = await strapiService.getGameConfig();
    if (config) {
      document.documentElement.style.setProperty('--color-primary', config.colorPrimary || '#FFBF00');
      document.documentElement.style.setProperty('--color-secondary', config.colorSecondary || '#0033ff');
      document.documentElement.style.setProperty('--color-accent', config.colorAccent || '#FFFF00');

      document.documentElement.style.setProperty('--ui-btn-hole', config.uiButtonHole ?? 30);
      document.documentElement.style.setProperty('--ui-btn-speed', config.uiButtonSpeed ?? 1.0);
      document.documentElement.style.setProperty('--ui-btn-opacity', config.uiButtonOpacity ?? 0.25);
    }
  } catch (err) {
    console.error('Failed to load theme colors and ui config', err);
    document.documentElement.style.setProperty('--color-primary', '#FFBF00');
    document.documentElement.style.setProperty('--color-secondary', '#0033ff');
    document.documentElement.style.setProperty('--color-accent', '#FFFF00');

    document.documentElement.style.setProperty('--ui-btn-hole', 30);
    document.documentElement.style.setProperty('--ui-btn-speed', 1.0);
    document.documentElement.style.setProperty('--ui-btn-opacity', 0.25);
  }

  const userStore = useUserStore();
initNotificationManager();
  userStore.restoreAuth();
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

  // Initial check
  userStore.checkStrapiConnection();
  
  const connectionInterval = setInterval(async () => {
    // Stop checking if we have successfully connected once
    if (userStore.hasEverConnected) {
      clearInterval(connectionInterval);
      return;
    }
    await userStore.checkStrapiConnection();
  }, 5000); // Check every 5 seconds until connected
});
</script>

<style>
/* Global styles */
</style>
