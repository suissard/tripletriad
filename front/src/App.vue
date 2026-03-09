<template>
  <!-- Game View (replaces GameCanvas + inline UI) -->
  <GameView />

  <MainMenu />

  <AlertMessage />
  <ConfirmationModal />

  <TopNavbar />
  <RightDrawer />

  <DevOptions />

  <!-- Full Screen Collection View -->
  <CollectionView />

  <!-- Full Screen Deck Editor -->
  <DeckEditorPage />

  <!-- Full Screen Dev Test Page -->
  <DevTestPage />

  <!-- Full Screen Boutique Page -->
  <PackOpening v-if="state.showPackOpening" @close="state.showPackOpening = false; window.history.pushState({}, '', '/');" @update-coins="c => state.user.coins = c" />

  <!-- Full Screen Decks Page -->
  <DecksPage />
</template>

<script setup>
import GameView from './components/GameView.vue';
import MainMenu from './components/MainMenu.vue';
import TopNavbar from './components/TopNavbar.vue';
import RightDrawer from './components/RightDrawer.vue';
import AlertMessage from './components/AlertMessage.vue';
import ConfirmationModal from './components/ConfirmationModal.vue';
import DevOptions from './components/DevOptions.vue';
import DevTestPage from './components/DevTestPage.vue';
import CollectionView from './components/CollectionView.vue';
import DeckEditorPage from './components/DeckEditorPage.vue';
import DecksPage from './components/DecksPage.vue';
import PackOpening from './components/PackOpening.vue';
import { state } from './game/state.js';

console.warn('--- TRIPLE TRIAD: FRONTEND LOADED (VERSION: VUE_UI_REVAMP) ---');
</script>

<style>
/* Global styles */
</style>
