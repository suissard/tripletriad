<template>
  <div id="main-menu" v-if="state.gameState === 'menu'">
    <h1 style="color: #00d2ff; font-size: 4rem; text-shadow: 0 0 20px currentColor; margin-bottom: 2rem;">MENU PRINCIPAL</h1>

    <div v-if="!showDifficultyOptions" class="menu-buttons">
      <button @click="showDifficultyOptions = true">JOUER CONTRE UNE IA 🤖</button>
      <button @click="showUnavailableMessage('Partie privée')">PARTIE PRIVÉE 🔒</button>
      <button @click="showUnavailableMessage('Partie multijoueur')">PARTIE MULTIJOUEUR 🌍</button>
    </div>

    <div v-else class="difficulty-options">
      <h2 style="color: white; margin-bottom: 1.5rem;">CHOISIS LA DIFFICULTÉ</h2>
      <div class="difficulty-grid">
        <button v-for="level in 10" :key="level" @click="startGame(level)" class="diff-btn">
          Niveau {{ level }}
        </button>
      </div>
      <button class="back-btn" @click="showDifficultyOptions = false">RETOUR</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { state } from '../game/state.js';

const showDifficultyOptions = ref(false);

function showUnavailableMessage(type) {
  // To trigger the alert multiple times, we can use a slight variation or just set it
  state.alerts = ''; // reset first
  setTimeout(() => {
    state.alerts = `${type} : Bientôt disponible !`;
  }, 10);
}

function startGame(level) {
  state.aiDifficulty = level;
  state.gameState = 'playing';
}
</script>

<style scoped>
#main-menu {
    position: absolute; inset: 0; background: rgba(0,0,0,0.9);
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    z-index: 100; pointer-events: auto;
}
.menu-buttons {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 400px;
}
button {
    padding: 15px 40px; font-size: 1.5rem; cursor: pointer; border: none;
    border-radius: 50px; background: linear-gradient(45deg, #00d2ff, #3a7bd5);
    color: #fff; font-weight: bold; transition: transform 0.2s;
}
button:hover { transform: scale(1.05); }

.difficulty-options {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.difficulty-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 15px;
    margin-bottom: 30px;
}
.diff-btn {
    padding: 15px 20px;
    font-size: 1.2rem;
}
.back-btn {
    background: linear-gradient(45deg, #ff0055, #d53a3a);
    padding: 10px 30px;
    font-size: 1.2rem;
}
</style>