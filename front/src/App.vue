<template>
  <GameCanvas />
  
  <MainMenu />

  <AlertMessage />

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

    <!-- Full Screen Collection View -->
    <CollectionView />
  </template>
</template>

<script setup>
import GameCanvas from './components/GameCanvas.vue';
import MainMenu from './components/MainMenu.vue';
import ScorePanel from './components/ScorePanel.vue';
import TopNavbar from './components/TopNavbar.vue';
import LeftDrawer from './components/LeftDrawer.vue';
import RightDrawer from './components/RightDrawer.vue';
import AlertMessage from './components/AlertMessage.vue';
import GameOver from './components/GameOver.vue';
import DevOptions from './components/DevOptions.vue';
import CollectionView from './components/CollectionView.vue';
import { state } from './game/state.js';
</script>

<style>
/* Global styles can also live here if they aren't in style.css */
#ui { 
    position: absolute; top: 0; width: 100%; pointer-events: none; 
    display: flex; justify-content: space-between; padding: 20px; 
    box-sizing: border-box; z-index: 10;
}
#msg { 
    position: absolute; bottom: 20px; width: 100%; text-align: center; 
    font-size: 1.2rem; color: #aaa; pointer-events: none; z-index: 10;
}
.ui-layer {
    /* Stop pointer events from blocking canvas optionally if needed */
}
</style>
