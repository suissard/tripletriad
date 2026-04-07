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

    <!-- Effect Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
      <div v-for="mode in modes" :key="mode.value" class="flex flex-col items-center group">
        <div class="relative w-full aspect-square max-w-[240px] rounded-2xl overflow-visible mb-4 perspective-1000">
          <!-- Card Container -->
          <div 
            class="w-full h-full relative rounded-2xl border-2 border-white/10 overflow-hidden shadow-2xl transition-transform duration-200 ease-out"
            :style="{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }"
          >
            <!-- Card Image -->
            <img 
              :src="getCardImageUrl(selectedCard)" 
              class="w-full h-full object-cover"
              v-if="selectedCard"
            />
            <div v-else class="w-full h-full bg-white/5 flex items-center justify-center italic text-gray-600 text-xs">
              Aucune carte
            </div>
            
            <!-- Holo Overlay -->
            <HoloOverlay 
              :layers="[{ foilMode: mode.value, enabled: true, holoIntensity: mode.intensity || 1.0, foilColor: mode.color || '#ffffff', foilScale: 4, foilSpeed: 1 }]"
              :tiltX="tilt.x"
              :tiltY="tilt.y"
              :alwaysVisible="true"
              :seed="42 + mode.value"
            />
            
            <!-- Label Overlay -->
            <div class="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div class="text-[10px] font-black uppercase tracking-widest text-primary">{{ mode.label }}</div>
            </div>
          </div>
        </div>
        
        <p class="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Mode {{ mode.value }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import AppPanel from '../../components/ui/AppPanel.vue';
import AppButton from '../../components/ui/AppButton.vue';
import HoloOverlay from '../../components/HoloOverlay.vue';
import strapiService from '@/api/strapi';
import { getStrapiMediaUrl } from '@/utils/url';

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
    cards.value = res.data || [];
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
  if (!searchQuery.value) return cards.value.slice(0, 15); // Show top 15 by default
  const q = searchQuery.value.toLowerCase();
  return cards.value.filter(c => {
    const name = (c.attributes?.name || c.name || '').toLowerCase();
    return name.includes(q);
  }).slice(0, 15);
});

function getCardImageUrl(card) {
  if (!card) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop';
  
  // Handle Strapi 5 data structure
  const imgData = card.attributes?.image?.data || card.image?.data || card.image;
  if (!imgData) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop';
  
  // If it's the simplified image object from state/some other place
  const url = imgData.attributes?.url || imgData.url || imgData;
  if (typeof url !== 'string') return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop';
  
  return getStrapiMediaUrl(url);
}

const modes = [
  { value: 0, label: 'Arc-en-ciel (Standard)', color: '#ffffff' },
  { value: 1, label: 'Pulsation Glow', color: '#ff00ff', intensity: 1.5 },
  { value: 2, label: 'Énergie Électrique', color: '#00d2ff', intensity: 1.2 },
  { value: 3, label: 'Scintillement', color: '#ffffff', intensity: 0.8 },
  { value: 4, label: 'Halo (Flare)', color: '#ffffff', intensity: 1.0 },
  { value: 5, label: 'Prisme de Verre', color: '#ffaa00', intensity: 0.9 },
  { value: 6, label: 'Fluide Aqua', color: '#00ffaa', intensity: 1.0 },
  { value: 7, label: 'Digital Matrix', color: '#00ff00', intensity: 0.7 },
  { value: 8, label: 'Étoiles Célestes', color: '#ffffff', intensity: 0.9 },
  { value: 9, label: 'Nébuleuse Profonde', color: '#ff0055', intensity: 1.2 }
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
