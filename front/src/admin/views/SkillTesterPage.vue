<template>
  <div class="skill-tester-container p-10 max-w-6xl mx-auto">
    <div class="header mb-10 flex items-center justify-between">
      <div>
        <h1 class="text-4xl font-black text-white tracking-tight mb-2">Skill Tester</h1>
        <p class="text-gray-400">Configurez une carte et testez ses compétences dans un environnement contrôlé.</p>
      </div>
      <div class="actions flex gap-4">
        <AppButton 
          v-if="selectedCard" 
          variant="primary" 
          @click="isEditorOpen = true"
          class="px-8 py-4"
        >
          ✨ Éditer les Skills
        </AppButton>
        <AppButton 
          v-if="selectedCard" 
          variant="primary" 
          @click="startTestMatch"
          class="px-8 py-4 bg-green-500 hover:bg-green-600 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
        >
          🎮 Lancer le Match
        </AppButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <!-- Selector -->
      <div class="lg:col-span-1 glass-panel p-8 rounded-[32px] border border-white/10">
        <h3 class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Sélection de Carte</h3>
        
        <div class="mb-6">
          <label class="block text-xs text-gray-500 uppercase font-black mb-2">Rechercher</label>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Nom de la carte..." 
            class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
          />
        </div>

        <div class="cards-list h-[500px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
          <div 
            v-for="card in filteredCards" 
            :key="card.id"
            @click="selectCard(card)"
            class="card-select-item flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all border border-transparent"
            :class="selectedCard?.id === card.id ? 'bg-primary/10 border-primary/30' : 'hover:bg-white/5'"
          >
            <div class="w-12 h-16 bg-black/40 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
              <img :src="card.imageUrl" class="w-full h-full object-cover" />
            </div>
            <div class="overflow-hidden">
              <div class="text-sm font-bold text-white truncate">{{ card.name }}</div>
              <div class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Niveau {{ card.level }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div class="lg:col-span-2 flex flex-col items-center justify-center glass-panel p-10 rounded-[40px] border border-white/10 min-h-[600px] relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 pointer-events-none"></div>
        
        <div v-if="selectedCard" class="card-preview-wrapper relative z-10">
          <TripleTriadCard 
            :card="selectedCard" 
            size="xl" 
            class="transform hover:scale-105 transition-transform duration-500"
          />
          
          <div class="mt-10 space-y-4 w-full max-w-md">
            <div v-if="selectedCard.skills && selectedCard.skills.length > 0" class="skills-info">
              <h4 class="text-xs font-black text-primary uppercase tracking-widest mb-3">Compétences Actives</h4>
              <div class="space-y-2">
                <div v-for="(s, i) in selectedCard.skills" :key="i" class="p-3 bg-white/5 rounded-xl border border-white/10 text-xs">
                  <span class="text-white font-bold">{{ s.type }}</span>
                  <span v-if="s.value" class="text-gray-400 ml-2">Valeur: {{ s.value }}</span>
                  <span v-if="s.range" class="text-gray-400 ml-2">Portée: {{ s.range }}</span>
                </div>
              </div>
            </div>
            <div v-else class="text-center p-6 border border-dashed border-white/10 rounded-2xl">
              <p class="text-gray-500 text-sm italic">Aucune compétence configurée.</p>
            </div>
          </div>
        </div>

        <div v-else class="text-center space-y-6">
          <div class="text-6xl opacity-20">🎴</div>
          <p class="text-gray-500 font-medium">Sélectionnez une carte pour commencer la configuration.</p>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <SkillEditorModal 
      v-if="selectedCard"
      v-model="isEditorOpen" 
      :card="selectedCard" 
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { cardLibrary, state, normalizeCard, shuffle } from '../../game/state.js';
import TripleTriadCard from '../../components/TripleTriadCard.vue';
import AppButton from '../../components/ui/AppButton.vue';
import SkillEditorModal from '../components/SkillEditorModal.vue';

const router = useRouter();
const searchQuery = ref('');
const selectedCard = ref(null);
const isEditorOpen = ref(false);

const filteredCards = computed(() => {
  if (!searchQuery.value) return cardLibrary;
  const query = searchQuery.value.toLowerCase();
  return cardLibrary.filter(c => c.name?.toLowerCase().includes(query));
});

function selectCard(card) {
  // We clone to avoid modifying the library directly until we are sure
  // Actually, for testing purposes, we want to modify a "test instance"
  selectedCard.value = JSON.parse(JSON.stringify(card));
}

function startTestMatch() {
  if (!selectedCard.value) return;

  // Prepare game state
  state.skillTestCard = selectedCard.value;
  
  // Player deck: 15 identical cards
  const pDeck = Array.from({ length: 15 }, (v, i) => ({
    ...JSON.parse(JSON.stringify(selectedCard.value)),
    id: `${selectedCard.value.id}_test_${i}`, // Unique ID for each instance
    revealed: true
  }));
  
  // AI deck: Random cards for challenge
  const aiDeck = [];
  for (let i = 0; i < 15; i++) {
    const randomCard = cardLibrary[Math.floor(Math.random() * cardLibrary.length)];
    aiDeck.push(normalizeCard(randomCard));
  }

  // Set global state
  state.playerDeckSelection = pDeck; // This will be used by GameView onCoinTossFinished
  // But wait, GameView re-normalizes and shuffles in onCoinTossFinished.
  // We should bypass coin toss or force its result.
  
  state.gameState = 'coin-toss';
  state.coinTossResult = 'player';
  state.showCoinToss = true;
  state.online = false;
  state.isStoryMatch = false;

  // Navigate to game with special flag
  router.push({ path: '/game', query: { mode: 'ia', skillTest: 'true' } });
}
</script>

<style scoped>
.skill-tester-container {
  min-height: 100%;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.card-select-item:hover {
  transform: translateX(4px);
}

.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
}
</style>
