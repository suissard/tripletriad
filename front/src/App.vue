<template>
  <!-- <div v-if="true" style="position:fixed; top:0; left:0; width:100%; height:40px; background:#007bff; color:white; z-index:100000; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; border-bottom:2px solid white; pointer-events:none;">
    VERSION: FORCE_RELOAD_DIAG_1.2 (SI VOUS VOYEZ CECI, LE CODE EST À JOUR)
  </div> -->

  <GameCanvas />

  <MainMenu />

  <AlertMessage />
  <ConfirmationModal />

  <TopNavbar />
  <LeftDrawer />
  <RightDrawer />

  <DevOptions />

  <template v-if="state.gameState === 'playing' || state.gameState === 'gameover'">
    <div id="ui" class="ui-layer">
      <ScorePanel label="Plateau Joueur" :score="state.pScore" color="#00d2ff" />
      <ScorePanel label="Plateau IA" :score="state.aiScore" color="#ff0055" />
    </div>

    <!-- Rules Panel moved out for now per user request -->

    <div id="msg" class="ui-layer">Glisse une carte bleue sur le plateau 👆</div>

    <GameOver />

    <GameOver />
  </template>

  <!-- Full Screen Collection View -->
  <CollectionView />

  <!-- Full Screen Deck Editor -->
  <DeckEditorPage />

  <!-- Full Screen Decks Page -->
  <DecksPage />
</template>

<script setup>
import GameCanvas from './components/GameCanvas.vue';
import MainMenu from './components/MainMenu.vue';
import ScorePanel from './components/ScorePanel.vue';
import TopNavbar from './components/TopNavbar.vue';
import LeftDrawer from './components/LeftDrawer.vue';
import RightDrawer from './components/RightDrawer.vue';
import AlertMessage from './components/AlertMessage.vue';
import ConfirmationModal from './components/ConfirmationModal.vue';
import GameOver from './components/GameOver.vue';
import DevOptions from './components/DevOptions.vue';
import CollectionView from './components/CollectionView.vue';
import DeckEditorPage from './components/DeckEditorPage.vue';
import DecksPage from './components/DecksPage.vue';
import { state } from './game/state.js';

console.warn('--- TRIPLE TRIAD: FRONTEND LOADED (VERSION: FORCE_RELOAD_DIAG_1.0) ---');
</script>

<style>
/* Global styles can also live here if they aren't in style.css */
#ui {
  position: absolute;
  top: 0;
  width: 100%;
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  padding: 20px;
  box-sizing: border-box;
  z-index: 10;
}

#msg {
  position: absolute;
  bottom: 20px;
  width: 100%;
  text-align: center;
  font-size: 1.2rem;
  color: #aaa;
  pointer-events: none;
  z-index: 10;
}

.ui-layer {
  /* Stop pointer events from blocking canvas optionally if needed */
}
</style>
