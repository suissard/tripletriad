<template>
  <div class="min-h-full p-8 bg-[#0a0a1a] text-white font-sans">
    <div class="mb-12 text-center">
      <h1 class="text-5xl font-black italic tracking-tighter uppercase mb-4">
        Premium <span class="text-primary italic">Gallery</span>
      </h1>
      <p class="text-gray-400 max-w-2xl mx-auto font-medium">
        Explorez et prévisualisez tous les modes d'effets holographiques disponibles pour les cartes premium.
      </p>
    </div>

    <!-- Global Controls -->
    <div class="flex flex-col lg:flex-row gap-8 mb-12 max-w-5xl mx-auto">
      <!-- Tilt Simulator -->
      <AppPanel class="flex-1 p-6 border border-white/10 bg-white/5 backdrop-blur-xl rounded-[32px]">
        <div class="space-y-6">
          <div class="flex justify-between items-center px-2">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Simulateur d'inclinaison</span>
            <AppButton variant="ghost" size="xs" @click="resetTilt" class="text-[10px] font-bold text-primary active:scale-95 transition-transform">RESET</AppButton>
          </div>
          
          <div class="space-y-4">
            <div class="setting-group">
              <div class="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                <label>Axe X (Vertical)</label>
                <span>{{ tilt.x }}°</span>
              </div>
              <input type="range" v-model.number="tilt.x" min="-30" max="30" step="1" class="w-full h-1 bg-white/10 rounded-full appearance-none accent-primary">
            </div>
            
            <div class="setting-group">
              <div class="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                <label>Axe Y (Horizontal)</label>
                <span>{{ tilt.y }}°</span>
              </div>
              <input type="range" v-model.number="tilt.y" min="-30" max="30" step="1" class="w-full h-1 bg-white/10 rounded-full appearance-none accent-primary">
            </div>
          </div>
        </div>
      </AppPanel>

      <!-- Card Selection -->
      <AppPanel class="flex-1 p-6 border border-white/10 bg-white/5 backdrop-blur-xl rounded-[32px]">
        <div class="space-y-6 h-full flex flex-col">
          <div class="px-2">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Sélection de Carte</span>
          </div>

          <div v-if="loadingCards" class="flex-1 flex flex-col items-center justify-center py-4">
            <div class="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-2"></div>
            <span class="text-[9px] font-bold text-gray-600 uppercase tracking-tighter">Chargement de la DB...</span>
          </div>

          <div v-else class="flex-1 flex flex-col gap-4">
             <div class="relative group">
                <input 
                  type="text" 
                  v-model="searchQuery" 
                  placeholder="Rechercher une carte..." 
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-colors"
                />
                <span class="absolute right-4 top-3.5 opacity-30">🔍</span>
             </div>

             <!-- Thumbnail Selection -->
             <div class="flex-1 overflow-x-auto pb-2 custom-scrollbar-mini">
                <div class="flex gap-3">
                   <div 
                      v-for="card in filteredCards" 
                      :key="card.id"
                      @click="selectedCard = card"
                      class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-105"
                      :class="selectedCard?.id === card.id ? 'border-primary ring-4 ring-primary/20' : 'border-white/5 opacity-60 hover:opacity-100'"
                   >
                      <img :src="getCardImageUrl(card)" class="w-full h-full object-cover" />
                   </div>
                </div>
             </div>

             <div v-if="selectedCard" class="text-center">
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  {{ selectedCard.attributes?.name || selectedCard.name || 'Sans Nom' }}
                </span>
             </div>
          </div>
        </div>
      </AppPanel>
    </div>

    <!-- Effect Grid (Full Width) -->
    <div class="w-full mt-4">
      <TripleTriadCardGrid 
        v-if="selectedCard"
        :cards="galleryCards"
        cardSize="lg"
        :showOwnNum="false"
        :cardsPerRow="5"
      />
      <div v-else class="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/10 dashed text-gray-500 italic">
        Veuillez sélectionner une carte dans le panel ci-dessus pour prévisualiser les effets.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import AppPanel from '../../components/ui/AppPanel.vue';
import AppButton from '../../components/ui/AppButton.vue';
import TripleTriadCardGrid from '../../components/TripleTriadCardGrid.vue';
import { normalizeCard } from '../../game/state.js';
import strapiService from '@/api/strapi';
import { ref, onMounted, computed } from 'vue';

const tilt = ref({ x: 0, y: 0 });
const cards = ref([]);
const selectedCard = ref(null);
const loadingCards = ref(true);
const searchQuery = ref('');

function resetTilt() {
  tilt.value = { x: 0, y: 0 };
}

onMounted(async () => {
  try {
    const res = await strapiService.fetchAll('cards', { populate: 'image' });
    cards.value = Array.isArray(res) ? res : (res.data || []);
    if (cards.value.length > 0) {
      selectedCard.value = cards.value[0];
    }
  } catch (err) {
    console.error('Failed to fetch cards for gallery', err);
  } finally {
    loadingCards.value = false;
  }
});

const filteredCards = computed(() => {
  if (!searchQuery.value) return cards.value.slice(0, 15);
  const q = searchQuery.value.toLowerCase();
  return cards.value.filter(c => {
    const name = (c.attributes?.name || c.name || '').toLowerCase();
    return name.includes(q);
  }).slice(0, 15);
});

function getCardImageUrl(card) {
  const data = getCardData(card);
  return data?.imageUrl || '';
}

function getCardData(card) {
  if (!card) return null;
  const rawData = card.attributes ? { id: card.id, ...card.attributes } : card;
  return normalizeCard(rawData);
}

const galleryCards = computed(() => {
  if (!selectedCard.value) return [];
  const baseData = getCardData(selectedCard.value);
  
  return modes.map(mode => ({
    ...baseData,
    id: `${baseData.id}-${mode.value}`,
    name: mode.label,
    overrideEffect: {
      layers: [{
        foilMode: mode.value,
        enabled: true,
        holoIntensity: mode.intensity || 0.6,
        foilColor: mode.color || '#ffffff',
        foilScale: 4,
        foilSpeed: 1,
        parallaxDepth: 1.0
      }]
    }
  }));
});

const modes = [
  { value: 0, label: 'Standard', intensity: 0.6 },
  { value: 11, label: 'Rare Radiant', intensity: 0.6 },
  { value: 12, label: 'Galaxy', intensity: 0.6 },
  { value: 13, label: 'Secret Gold', intensity: 0.6 },
  { value: 14, label: 'Ultra Holo', intensity: 0.6 },
  { value: 19, label: 'Rainbow', intensity: 0.6 }
];
</script>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}

.setting-group {
  display: flex;
  flex-direction: column;
}

.custom-scrollbar-mini::-webkit-scrollbar {
  height: 4px;
}
.custom-scrollbar-mini::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  box-shadow: 0 0 10px rgba(var(--color-primary-rgb), 0.5);
}
</style>
