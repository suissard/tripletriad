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
import { state } from './game/state.js';
import { useUserStore } from './stores/userStore.js';
import { useNotificationStore } from './stores/notificationStore.js';
import { initNotificationManager } from "./game/notificationManager.js";
import strapiService from './api/strapi.js';

console.warn('--- TRIPLE TRIAD: FRONTEND LOADED (VERSION: VUE_UI_REVAMP) ---');

onMounted(() => {
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

  
  setInterval(async () => {
    if (userStore.isLoggedIn) {
      try {
        const check = await fetch(`${strapiService.rawClient.baseURL.replace('/api', '')}/admin/init`, { method: 'HEAD' });
        userStore.strapiConnected = check.ok || check.status < 500;
      } catch (e) {
        userStore.strapiConnected = false;
      }
    }
  }, 10000); // Check every 10 seconds
});
</script>

<style>
/* Global styles */
</style>
