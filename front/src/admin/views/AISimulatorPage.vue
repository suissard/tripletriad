<template>
  <div class="p-8">
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold text-white tracking-tight">Simulateur IA vs IA</h1>
      <p class="text-gray-400 mt-2">Effectuez des simulations rapides de parties pour équilibrer les decks et les cartes.</p>
    </div>

    <!-- Configuration -->
    <div class="glass-panel p-6 rounded-3xl mb-8">
      <h2 class="text-xl font-bold text-white mb-6">Configuration de la simulation</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        <!-- Joueur 1 (IA 1) -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-300">Deck IA 1 (Player 1)</label>
          <div class="relative">
            <select v-model="selectedDeck1" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-primary/50">
              <option value="" disabled>Sélectionner un deck</option>
              <option v-for="deck in decks" :key="deck.id" :value="deck">{{ deck.name }} ({{ deck.cards.length }} cartes)</option>
            </select>
            <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">▼</div>
          </div>
        </div>

        <!-- Joueur 2 (IA 2) -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-300">Deck IA 2 (Player 2)</label>
          <div class="relative">
            <select v-model="selectedDeck2" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-red-500/50">
              <option value="" disabled>Sélectionner un deck</option>
              <option v-for="deck in decks" :key="deck.id" :value="deck">{{ deck.name }} ({{ deck.cards.length }} cartes)</option>
            </select>
            <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">▼</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-300">Nombre de parties à simuler</label>
          <input type="number" v-model.number="numGames" min="1" max="10000" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30" />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-300">Premier joueur</label>
          <div class="relative">
            <select v-model="startingPlayerOption" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-primary/50">
              <option value="IA1">Toujours IA 1</option>
              <option value="IA2">Toujours IA 2</option>
              <option value="RANDOM">Aléatoire (50/50)</option>
            </select>
            <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">▼</div>
          </div>
        </div>

        <AppButton
          variant="primary"
          class="w-full py-3 text-lg font-bold"
          :disabled="isRunning || !selectedDeck1 || !selectedDeck2 || numGames <= 0"
          @click="startSimulation"
        >
          {{ isRunning ? 'Simulation en cours...' : 'Démarrer la simulation' }}
        </AppButton>
      </div>
    </div>

    <!-- Progression -->
    <div v-if="isRunning || hasResults" class="glass-panel p-6 rounded-3xl mb-8">
      <div class="flex justify-between text-sm font-bold mb-2">
        <span class="text-gray-300">Progression</span>
        <span class="text-primary">{{ progressPercentage }}% ({{ currentIteration }} / {{ numGames }})</span>
      </div>
      <div class="w-full h-4 bg-black/50 rounded-full overflow-hidden border border-white/10">
        <div class="h-full bg-gradient-to-r from-blue-500 to-primary transition-all duration-75" :style="{ width: `${progressPercentage}%` }"></div>
      </div>
    </div>

    <!-- Résultats -->
    <div v-if="hasResults" class="grid grid-cols-1 md:grid-cols-3 gap-6">

      <!-- Victoires IA 1 -->
      <div class="glass-panel p-6 rounded-3xl relative overflow-hidden group">
        <div class="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-[40px] group-hover:bg-primary/20 transition-all"></div>
        <h3 class="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">Victoires IA 1</h3>
        <div class="flex items-end gap-3">
          <span class="text-5xl font-black text-white">{{ stats.wins1 }}</span>
          <span class="text-primary font-bold mb-1">{{ ((stats.wins1 / numGames) * 100).toFixed(1) }}%</span>
        </div>
      </div>

      <!-- Victoires IA 2 -->
      <div class="glass-panel p-6 rounded-3xl relative overflow-hidden group">
        <div class="absolute -right-10 -top-10 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] group-hover:bg-red-500/20 transition-all"></div>
        <h3 class="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">Victoires IA 2</h3>
        <div class="flex items-end gap-3">
          <span class="text-5xl font-black text-white">{{ stats.wins2 }}</span>
          <span class="text-red-400 font-bold mb-1">{{ ((stats.wins2 / numGames) * 100).toFixed(1) }}%</span>
        </div>
      </div>

      <!-- Égalités -->
      <div class="glass-panel p-6 rounded-3xl relative overflow-hidden group">
        <div class="absolute -right-10 -top-10 w-32 h-32 bg-gray-500/10 rounded-full blur-[40px] group-hover:bg-gray-500/20 transition-all"></div>
        <h3 class="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">Égalités</h3>
        <div class="flex items-end gap-3">
          <span class="text-5xl font-black text-white">{{ stats.draws }}</span>
          <span class="text-gray-400 font-bold mb-1">{{ ((stats.draws / numGames) * 100).toFixed(1) }}%</span>
        </div>
      </div>

      <!-- Stats Moyennes -->
      <div class="glass-panel p-6 rounded-3xl col-span-1 md:col-span-3">
        <h3 class="text-lg font-bold text-white mb-4">Moyennes par partie</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center">
            <span class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Tours joués</span>
            <span class="text-2xl font-black text-white">{{ stats.avgTurns.toFixed(1) }}</span>
          </div>
          <div class="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center">
            <span class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Cartes posées</span>
            <span class="text-2xl font-black text-white">{{ stats.avgCardsUsed.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import strapiService from '@/api/strapi.js';
import { cardLibrary, normalizeCard } from '@/game/state.js';
import { GameEngine } from '@/game/GameEngine.js';
import { getBestAIMovePure } from '@/game/pureAi.js';

const decks = ref([]);
const selectedDeck1 = ref('');
const selectedDeck2 = ref('');
const numGames = ref(100);
const startingPlayerOption = ref('IA1');

const isRunning = ref(false);
const hasResults = ref(false);
const currentIteration = ref(0);

const stats = ref({
  wins1: 0,
  wins2: 0,
  draws: 0,
  totalTurns: 0,
  totalCardsUsed: 0,
  avgTurns: 0,
  avgCardsUsed: 0
});

const progressPercentage = computed(() => {
  if (numGames.value <= 0) return 0;
  return Math.floor((currentIteration.value / numGames.value) * 100);
});

onMounted(async () => {
  // Fetch all decks from strapi
  try {
    const response = await strapiService.request('GET', '/decks?populate=*');
    if (response && response.data) {
       decks.value = response.data.map(d => ({
         id: d.id,
         name: d.attributes?.name || d.name || 'Deck',
         cards: d.attributes?.cards || d.cards || []
       }));
    }

    // Make sure cardLibrary is populated for simulation
    if (cardLibrary.length === 0) {
       const cardsRes = await strapiService.request('GET', '/cards?pagination[limit]=1000');
       const rawCards = cardsRes.data || [];
       rawCards.forEach(c => {
         const norm = normalizeCard({ id: c.id, ...c.attributes, ...c });
         cardLibrary.push(norm);
       });
    }
  } catch (e) {
    console.error("Failed to load decks/cards for simulator", e);
  }
});

// Sleep function to yield to the main thread
const yieldThread = () => new Promise(r => setTimeout(r, 0));

const startSimulation = async () => {
  if (!selectedDeck1.value || !selectedDeck2.value || numGames.value <= 0) return;

  isRunning.value = true;
  hasResults.value = false;
  currentIteration.value = 0;

  // Reset stats
  stats.value = {
    wins1: 0,
    wins2: 0,
    draws: 0,
    totalTurns: 0,
    totalCardsUsed: 0,
    avgTurns: 0,
    avgCardsUsed: 0
  };

  // Prepare full card data for the decks
  const deck1Cards = selectedDeck1.value.cards.map(cId => {
    const id = typeof cId === 'object' ? cId.id : cId;
    return cardLibrary.find(c => c.id === id) || cardLibrary[0];
  }).filter(Boolean);

  const deck2Cards = selectedDeck2.value.cards.map(cId => {
    const id = typeof cId === 'object' ? cId.id : cId;
    return cardLibrary.find(c => c.id === id) || cardLibrary[0];
  }).filter(Boolean);

  const chunkSize = 10; // Number of games to run before yielding to the UI

  for (let i = 0; i < numGames.value; i++) {
    runSingleGame(deck1Cards, deck2Cards);
    currentIteration.value = i + 1;

    if (i % chunkSize === 0) {
      await yieldThread();
    }
  }

  // Calculate averages
  stats.value.avgTurns = stats.value.totalTurns / numGames.value;
  stats.value.avgCardsUsed = stats.value.totalCardsUsed / numGames.value;

  isRunning.value = false;
  hasResults.value = true;
};

const runSingleGame = (deck1Data, deck2Data) => {
  let startingPlayer = 'PLAYER_1';
  if (startingPlayerOption.value === 'IA2') {
    startingPlayer = 'PLAYER_2';
  } else if (startingPlayerOption.value === 'RANDOM') {
    startingPlayer = Math.random() < 0.5 ? 'PLAYER_1' : 'PLAYER_2';
  }

  let gameState = GameEngine.createInitialState(startingPlayer);

  // Clone decks for this game
  let d1 = [...deck1Data].sort(() => Math.random() - 0.5);
  let d2 = [...deck2Data].sort(() => Math.random() - 0.5);

  let h1 = [];
  let h2 = [];

  // Initial draw
  for(let j=0; j<3; j++) {
    if(d1.length > 0) h1.push(d1.pop());
    if(d2.length > 0) h2.push(d2.pop());
  }

  let turnCount = 0;
  let cardsUsed = 0;

  while (!gameState.isFinished && cardsUsed < 16) { // 16 is max board size 4x4
    const currentPlayer = gameState.currentPlayer;
    let currentHand = currentPlayer === 'PLAYER_1' ? h1 : h2;

    if (currentHand.length === 0) {
       // Should not happen if deck size >= 8, but just in case
       break;
    }

    // Check if board is full manually since the dynamic sizing might prevent it
    if (GameEngine.isBoardFull(gameState.board)) {
       gameState.isFinished = true;
       gameState.winner = GameEngine.computeWinner(gameState.board);
       break;
    }

    const move = getBestAIMovePure(gameState.board, currentHand, currentPlayer, {});

    if (move) {
      const cardToPlay = currentHand[move.cardIdx];

      // Compute next state
      gameState = GameEngine.computeNextState(gameState, {
         player: currentPlayer,
         x: move.x,
         y: move.y,
         card: cardToPlay
      });

      // Remove played card from hand
      currentHand.splice(move.cardIdx, 1);
      cardsUsed++;

      // Draw a new card
      let currentDeck = currentPlayer === 'PLAYER_1' ? d1 : d2;
      if (currentDeck.length > 0 && currentHand.length < 3) {
         currentHand.push(currentDeck.pop());
      }
    } else {
      // No valid move found, could happen if board full or no mana (not implemented here)
      break;
    }
    turnCount++;
  }

  // Final check if loop exited due to board size limit
  if (!gameState.isFinished && GameEngine.isBoardFull(gameState.board)) {
      gameState.isFinished = true;
      gameState.winner = GameEngine.computeWinner(gameState.board);
  }

  // Tally results
  stats.value.totalTurns += turnCount;
  stats.value.totalCardsUsed += cardsUsed;

  if (gameState.winner === 'PLAYER_1') {
    stats.value.wins1++;
  } else if (gameState.winner === 'PLAYER_2') {
    stats.value.wins2++;
  } else {
    stats.value.draws++;
  }
};
</script>

<style scoped>
</style>
