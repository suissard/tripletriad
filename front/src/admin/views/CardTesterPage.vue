<template>
  <div class="p-8 max-w-7xl mx-auto">
    <div class="mb-10">
      <h1 class="text-4xl font-black text-white tracking-tight mb-2">Testeur de Carte</h1>
      <p class="text-gray-400">Évaluez l'impact d'une carte sur l'équilibrage via des simulations massives IA vs IA.</p>
    </div>

    <!-- Configuration -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
      <div class="lg:col-span-2 space-y-6">
        <div class="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden">
          <div class="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
          
          <h2 class="text-xl font-bold text-white mb-8 flex items-center gap-3">
            <span class="text-primary">01.</span> Paramètres de Simulation
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Card to test -->
            <PremiumSelect 
              v-model="testCardId"
              :options="cardOptions"
              label="Carte à tester"
              placeholder="Choisir une carte..."
              searchable
              searchPlaceholder="Rechercher une carte..."
            >
              <template #icon>🎴</template>
            </PremiumSelect>

            <!-- Base Deck -->
            <PremiumSelect 
              v-model="baseDeckId"
              :options="deckOptions"
              label="Deck de référence (Base)"
              placeholder="Choisir un deck..."
            >
              <template #icon>🃏</template>
            </PremiumSelect>

            <!-- Replacement Count -->
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">
                Nombre de remplacements
              </label>
              <div class="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-2">
                <button 
                  @click="replacementCount = Math.max(1, replacementCount - 1)"
                  class="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >-</button>
                <input 
                  type="number" 
                  v-model.number="replacementCount" 
                  class="flex-1 bg-transparent border-none text-center text-white font-bold focus:outline-none"
                />
                <button 
                  @click="replacementCount = Math.min(8, replacementCount + 1)"
                  class="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >+</button>
              </div>
              <p class="text-[10px] text-gray-500 pl-1 italic">
                Nombre de cartes du deck IA 2 remplacées par la carte testée.
              </p>
            </div>

            <!-- Iterations -->
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">
                Itérations (Nb parties)
              </label>
              <div class="relative group">
                <input 
                  type="number" 
                  v-model.number="numGames" 
                  class="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white font-bold focus:border-primary/50 outline-none transition-all"
                />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 group-focus-within:text-primary/50 transition-colors">GAMES</span>
              </div>
            </div>
          </div>

          <div class="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
             <div class="space-y-3">
                <label class="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">
                  Premier Joueur
                </label>
                <div class="flex gap-2">
                  <button 
                    v-for="opt in ['IA1', 'IA2', 'RANDOM']" 
                    :key="opt"
                    @click="startingPlayerOption = opt"
                    class="flex-1 py-3 rounded-xl text-xs font-bold transition-all border"
                    :class="startingPlayerOption === opt ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'"
                  >
                    {{ opt === 'RANDOM' ? '50/50' : opt }}
                  </button>
                </div>
             </div>

             <AppButton 
              variant="primary" 
              fullWidth 
              class="h-14 !rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-primary/10"
              :disabled="isRunning || !testCardId || !baseDeckId"
              @click="startSimulation"
             >
               {{ isRunning ? 'Simulation...' : 'Lancer le test' }}
             </AppButton>
          </div>
        </div>
      </div>

      <!-- Comparison Preview -->
      <div class="space-y-6">
        <div class="glass-panel p-8 rounded-[2.5rem] h-full flex flex-col">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span class="text-primary">02.</span> Configuration
          </h2>
          
          <div class="space-y-4 flex-1">
            <!-- Card Preview -->
            <div v-if="testCardId" class="flex justify-center mb-6">
              <div class="relative group">
                <div class="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-75 group-hover:scale-110 transition-transform"></div>
                <TripleTriadCard 
                  :card="selectedCardData" 
                  size="xl" 
                  class="relative z-10"
                />
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-white/5 border border-white/5">
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">IA 1 (Contrôle)</span>
              <p class="text-white font-bold">{{ selectedDeckName }}</p>
              <p class="text-[10px] text-gray-400">Deck original non modifié</p>
            </div>

            <div class="flex justify-center text-primary text-xl font-black italic">VS</div>

            <div class="p-4 rounded-2xl bg-primary/10 border border-primary/20 relative overflow-hidden">
               <div class="absolute top-0 right-0 p-2 opacity-10">⚖️</div>
              <span class="text-[10px] font-bold text-primary uppercase tracking-widest block mb-2">IA 2 (Test)</span>
              <p class="text-white font-bold">{{ selectedDeckName }}</p>
              <p class="text-xs text-primary font-bold mt-1">+ {{ replacementCount }}x {{ selectedTestCardName }}</p>
            </div>
          </div>

          <div v-if="hasResults" class="mt-6 p-4 rounded-2xl bg-white/5 border border-white/5">
             <div class="flex justify-between items-end">
                <div>
                  <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Écart de Performance</span>
                  <div class="text-2xl font-black" :class="winDelta >= 0 ? 'text-green-400' : 'text-red-400'">
                    {{ winDelta >= 0 ? '+' : '' }}{{ winDelta.toFixed(1) }}%
                  </div>
                </div>
                <div class="text-[10px] font-bold text-gray-500 text-right uppercase tracking-widest">
                  IA2 vs IA1
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Progression -->
    <transition name="fade">
      <div v-if="isRunning || hasResults" class="glass-panel p-8 rounded-[2.5rem] mb-10 overflow-hidden relative">
        <div class="flex justify-between items-center mb-4">
           <h2 class="text-xl font-bold text-white">Résultats en temps réel</h2>
           <span class="text-sm font-black text-primary">{{ currentIteration }} / {{ numGames }} parties</span>
        </div>

        <div class="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 mb-8">
           <div class="h-full bg-primary transition-all duration-100" :style="{ width: `${progressPercentage}%` }"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- IA 1 -->
          <div class="text-center space-y-2">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">IA 1 (Contrôle)</span>
            <div class="text-5xl font-black text-white">{{ stats.wins1 }}</div>
            <div class="text-sm font-bold text-gray-400">{{ ((stats.wins1 / (currentIteration || 1)) * 100).toFixed(1) }}%</div>
          </div>

          <!-- IA 2 -->
          <div class="text-center space-y-2 relative">
            <div class="absolute inset-0 bg-primary/5 blur-2xl rounded-full"></div>
            <span class="text-[10px] font-bold text-primary uppercase tracking-widest block relative">IA 2 (Variante)</span>
            <div class="text-5xl font-black text-white relative">{{ stats.wins2 }}</div>
            <div class="text-sm font-bold text-primary relative">{{ ((stats.wins2 / (currentIteration || 1)) * 100).toFixed(1) }}%</div>
          </div>

          <!-- Draws -->
          <div class="text-center space-y-2">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Égalités</span>
            <div class="text-5xl font-black text-white">{{ stats.draws }}</div>
            <div class="text-sm font-bold text-gray-400">{{ ((stats.draws / (currentIteration || 1)) * 100).toFixed(1) }}%</div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Detailed Stats -->
    <div v-if="hasResults" class="grid grid-cols-1 md:grid-cols-2 gap-8">
       <div class="glass-panel p-8 rounded-[2.5rem]">
          <h3 class="text-lg font-bold text-white mb-6 uppercase tracking-widest text-xs opacity-50">Métriques moyennes</h3>
          <div class="space-y-6">
             <div class="flex justify-between items-center">
                <span class="text-gray-400 font-medium">Tours par partie</span>
                <span class="text-xl font-black text-white">{{ stats.avgTurns.toFixed(1) }}</span>
             </div>
             <div class="flex justify-between items-center">
                <span class="text-gray-400 font-medium">Cartes jouées</span>
                <span class="text-xl font-black text-white">{{ stats.avgCardsUsed.toFixed(1) }}</span>
             </div>
          </div>
       </div>

       <div class="glass-panel p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
          <h3 class="text-lg font-bold text-white mb-4 uppercase tracking-widest text-xs opacity-50">Verdict Équilibrage</h3>
          <p class="text-sm text-gray-300 leading-relaxed mb-4">
             {{ balanceVerdict }}
          </p>
          <div class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 w-fit">
             <span class="text-xs font-bold text-gray-400">Indice de Puissance :</span>
             <span class="text-xs font-black" :class="powerIndexColor">{{ powerIndexLabel }}</span>
          </div>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';
import PremiumSelect from '../components/PremiumSelect.vue';
import TripleTriadCard from '@/components/TripleTriadCard.vue';
import strapiService from '@/api/strapi.js';
import { cardLibrary, normalizeCard } from '@/game/state.js';
import { GameEngine } from '@/game/GameEngine.js';
import { getBestAIMovePure } from '@/game/pureAi.js';

// Configuration
const decks = ref([]);
const testCardId = ref(null);
const baseDeckId = ref(null);
const replacementCount = ref(1);
const numGames = ref(100);
const startingPlayerOption = ref('RANDOM');

// Status
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

// Options for PremiumSelect
const cardOptions = computed(() => {
  return cardLibrary.map(c => ({
    value: c.id,
    label: `${c.name || 'Sans nom'} (P:${(Number(c.topValue)||0)+(Number(c.rightValue)||0)+(Number(c.bottomValue)||0)+(Number(c.leftValue)||0)})`
  })).sort((a, b) => a.label.localeCompare(b.label));
});

const deckOptions = computed(() => {
  return decks.value.map(d => ({
    value: d.id,
    label: `${d.name} (${d.cards.length} cartes)`
  }));
});

const selectedDeckName = computed(() => {
  const deck = decks.value.find(d => d.id === baseDeckId.value);
  return deck ? deck.name : 'Aucun deck';
});

const selectedTestCardName = computed(() => {
  const card = cardLibrary.find(c => c.id === testCardId.value);
  return card ? card.name : 'Aucune carte';
});

const selectedCardData = computed(() => {
  return cardLibrary.find(c => c.id === testCardId.value) || null;
});

const progressPercentage = computed(() => {
  if (numGames.value <= 0) return 0;
  return Math.floor((currentIteration.value / numGames.value) * 100);
});

const winDelta = computed(() => {
  if (!hasResults.value && !isRunning.value) return 0;
  const total = currentIteration.value || 1;
  const wr1 = (stats.value.wins1 / total) * 100;
  const wr2 = (stats.value.wins2 / total) * 100;
  return wr2 - wr1;
});

const balanceVerdict = computed(() => {
  const delta = winDelta.value;
  if (delta > 15) return "Cette carte semble TRÈS PUISSANTE. Elle augmente significativement le taux de victoire du deck. Envisagez de réduire ses valeurs ou d'ajouter une contrepartie.";
  if (delta > 5) return "La carte apporte un avantage net. Elle est probablement au-dessus de la moyenne mais pourrait être équilibrée dans le bon contexte.";
  if (delta > -5) return "La carte est parfaitement équilibrée par rapport au deck de référence. Elle ne change pas radicalement les chances de victoire.";
  if (delta > -15) return "La carte semble sous-performante. Elle pourrait avoir besoin d'un léger buff pour être compétitive.";
  return "Cette carte affaiblit considérablement le deck. Ses valeurs sont probablement trop basses ou ses compétences ne sont pas bien exploitées par l'IA.";
});

const powerIndexLabel = computed(() => {
  const delta = winDelta.value;
  if (delta > 20) return "S-TIER / OP";
  if (delta > 10) return "A-TIER / STRONG";
  if (delta > -5) return "B-TIER / BALANCED";
  if (delta > -15) return "C-TIER / WEAK";
  return "D-TIER / TRASH";
});

const powerIndexColor = computed(() => {
  const delta = winDelta.value;
  if (delta > 10) return "text-primary";
  if (delta > -5) return "text-green-400";
  if (delta > -15) return "text-yellow-400";
  return "text-red-400";
});

onMounted(async () => {
  try {
    // Load decks
    const response = await strapiService.request('GET', '/decks?populate=*');
    if (response && response.data) {
       decks.value = response.data.map(d => ({
         id: d.id,
         name: d.attributes?.name || d.name || 'Deck',
         cards: d.attributes?.cards || d.cards || []
       }));
    }

    // Load cards if library empty
    if (cardLibrary.length === 0) {
       const cardsRes = await strapiService.request('GET', '/cards?pagination[limit]=1000');
       const rawCards = cardsRes.data || [];
       rawCards.forEach(c => {
         const norm = normalizeCard({ id: c.id, ...c.attributes, ...c });
         cardLibrary.push(norm);
       });
    }
  } catch (e) {
    console.error("Failed to load data for card tester", e);
  }
});

const yieldThread = () => new Promise(r => setTimeout(r, 0));

const startSimulation = async () => {
  if (!testCardId.value || !baseDeckId.value || numGames.value <= 0) return;

  isRunning.value = true;
  hasResults.value = false;
  currentIteration.value = 0;
  stats.value = { wins1: 0, wins2: 0, draws: 0, totalTurns: 0, totalCardsUsed: 0, avgTurns: 0, avgCardsUsed: 0 };

  const deckData = decks.value.find(d => d.id === baseDeckId.value);
  const baseCards = deckData.cards.map(cId => {
    const id = typeof cId === 'object' ? cId.id : cId;
    return cardLibrary.find(c => c.id === id) || cardLibrary[0];
  }).filter(Boolean);

  const testCard = cardLibrary.find(c => c.id === testCardId.value);

  const chunkSize = 20;

  for (let i = 0; i < numGames.value; i++) {
    // IA 1 keeps base cards
    const deck1 = [...baseCards];
    
    // IA 2 replaces X cards with test card
    const deck2 = [...baseCards];
    for (let r = 0; r < replacementCount.value; r++) {
      if (deck2.length > 0) {
        const idx = Math.floor(Math.random() * deck2.length);
        deck2[idx] = testCard;
      }
    }

    runSingleGame(deck1, deck2);
    currentIteration.value = i + 1;

    if (i % chunkSize === 0) {
      await yieldThread();
    }
  }

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

  let d1 = [...deck1Data].sort(() => Math.random() - 0.5);
  let d2 = [...deck2Data].sort(() => Math.random() - 0.5);

  let h1 = [];
  let h2 = [];

  for(let j=0; j<3; j++) {
    if(d1.length > 0) h1.push(d1.pop());
    if(d2.length > 0) h2.push(d2.pop());
  }

  let turnCount = 0;
  let cardsUsed = 0;

  while (!gameState.isFinished && cardsUsed < 16) {
    const currentPlayer = gameState.currentPlayer;
    let currentHand = currentPlayer === 'PLAYER_1' ? h1 : h2;

    if (currentHand.length === 0) break;

    if (GameEngine.isBoardFull(gameState.board)) {
       gameState.isFinished = true;
       gameState.winner = GameEngine.computeWinner(gameState.board);
       break;
    }

    const move = getBestAIMovePure(gameState.board, currentHand, currentPlayer, {});

    if (move) {
      const cardToPlay = currentHand[move.cardIdx];
      gameState = GameEngine.computeNextState(gameState, {
         player: currentPlayer,
         x: move.x,
         y: move.y,
         card: cardToPlay
      });

      currentHand.splice(move.cardIdx, 1);
      cardsUsed++;

      let currentDeck = currentPlayer === 'PLAYER_1' ? d1 : d2;
      if (currentDeck.length > 0 && currentHand.length < 3) {
         currentHand.push(currentDeck.pop());
      }
    } else {
      break;
    }
    turnCount++;
  }

  if (!gameState.isFinished && GameEngine.isBoardFull(gameState.board)) {
      gameState.isFinished = true;
      gameState.winner = GameEngine.computeWinner(gameState.board);
  }

  stats.value.totalTurns += turnCount;
  stats.value.totalCardsUsed += cardsUsed;

  if (gameState.winner === 'PLAYER_1') stats.value.wins1++;
  else if (gameState.winner === 'PLAYER_2') stats.value.wins2++;
  else stats.value.draws++;
};
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: all 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
