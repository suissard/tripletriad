<template>
  <router-view />

  <!-- Global Overlays -->
  <AlertMessage />
  <ConfirmationModal />
  <TopNavbar />
  <RightDrawer />
  <DevOptions />
</template>

<script setup>
import TopNavbar from './components/TopNavbar.vue';
import RightDrawer from './components/RightDrawer.vue';
import AlertMessage from './components/AlertMessage.vue';
import ConfirmationModal from './components/ConfirmationModal.vue';
import DevOptions from './components/DevOptions.vue';
import { state } from './game/state.js';

console.warn('--- TRIPLE TRIAD: FRONTEND LOADED (VERSION: VUE_UI_REVAMP) ---');
</script>

<style>
/* Global styles */
</style>
