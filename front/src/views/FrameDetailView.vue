<template>
  <div class="frame-detail-page h-full w-full flex flex-col items-center justify-start py-8 px-4 overflow-y-auto custom-scrollbar relative">
    <!-- Premium Background -->
    <div class="absolute inset-0 bg-gradient-to-br from-[#0a0a12] via-[#1a1a2e] to-[#0a0a12] -z-10"></div>
    <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] -z-10"></div>
    
    <!-- Main Content -->
    <div v-if="frame" class="w-full max-w-7xl shrink-0 bg-black/30 border-t md:border border-white/10 p-6 md:p-12 md:rounded-[40px] backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center md:items-stretch gap-8 md:gap-16 relative overflow-hidden my-auto">
      <!-- Decor Decorative element -->
      <div class="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <!-- Preview Section -->
      <div class="preview-section flex-1 flex flex-col items-center gap-10">
        <div class="card-preview-wrapper relative group">
          <!-- Ambient Glow based on rarity -->
          <div 
            class="absolute -inset-8 rounded-3xl opacity-30 blur-3xl transition-all duration-500"
            :style="{ background: currentRarityColor }"
          ></div>
          
          <!-- We pass the BASE frame image, TripleTriadCard will pick the variant based on dummyCard.rarity -->
          <TripleTriadCard 
            :card="dummyCard" 
            size="zoom"
            :cardFrame="frame.image"
            :flat="false"
            :interactive="true"
            class="relative z-10"
          />
        </div>

        <!-- Rarity Selector -->
        <div class="flex flex-col items-center gap-4">
          <span class="text-[10px] text-white/40 font-black uppercase tracking-[0.3em]">Visualiser les raretés</span>
          <div class="rarity-selector flex flex-wrap justify-center items-center gap-4 p-3 md:p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md w-full">
            <button 
              v-for="r in rarities" 
              :key="r.id"
              @click="selectedRarity = r.id"
              class="w-6 h-6 md:w-8 md:h-8 rounded-full transition-all duration-300 relative flex items-center justify-center cursor-pointer border"
              :class="[
                selectedRarity === r.id 
                  ? 'scale-125 z-10 border-white' 
                  : 'opacity-50 hover:opacity-100 hover:scale-110 border-transparent'
              ]"
              :style="{ 
                backgroundColor: r.color, 
                boxShadow: selectedRarity === r.id ? `0 0 15px ${r.color}, inset 0 0 5px rgba(255,255,255,0.8)` : `0 0 5px ${r.color}80` 
              }"
              :title="r.label"
            >
              <!-- Indicateur central -->
              <div v-if="selectedRarity === r.id" class="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full shadow-lg"></div>
            </button>
          </div>
        </div>
      </div>

      <!-- Info Section -->
      <div class="info-section flex-1 flex flex-col justify-between py-4">
        <div class="description-block">
          <div class="flex items-center gap-6 mb-8">
            <div class="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <span class="text-3xl">🖼️</span>
            </div>
            <div>
              <h3 class="text-white font-black italic tracking-tighter uppercase text-5xl mb-1 leading-none">{{ frame.name }}</h3>
              <div class="flex items-center gap-2">
                <span class="h-1 w-8 bg-indigo-500 rounded-full"></span>
                <span class="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">Cosmétique Premium</span>
              </div>
            </div>
          </div>
          
          <div class="relative mb-12">
            <span class="absolute -top-8 -left-6 text-8xl text-white/5 font-serif pointer-events-none">"</span>
            <p class="text-xl text-white/80 leading-relaxed italic relative z-10 pl-6 border-l-2 border-indigo-500/30">
              {{ frame.description || 'Un cadre majestueux forgé dans les profondeurs de l\'éther, conçu pour magnifier vos cartes les plus précieuses.' }}
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4">
             <div class="flex flex-col p-5 bg-white/5 rounded-2xl border border-white/10">
                <span class="text-[10px] text-white/30 uppercase font-black mb-2 tracking-widest">Aperçu du Rendu</span>
                <span class="text-sm font-black uppercase tracking-wider" :style="{ color: currentRarityColor }">{{ currentRarityLabel }}</span>
             </div>
          </div>
        </div>

        <div class="purchase-block mt-12 pt-8 border-t border-white/10">
          <div class="flex flex-col gap-8">
            <div class="flex flex-col items-center gap-2">
              <h4 class="text-white font-black uppercase tracking-[0.3em] text-xs">Débloquer ce cadre</h4>
              <p class="text-white/40 text-[10px] uppercase font-bold tracking-wider">Le déblocage inclut automatiquement toutes les variantes de rareté</p>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full">
              <!-- Acheter avec Coins -->
              <AppButton 
                v-if="(frame.priceCoins || 0) > 0"
                @click="handlePurchase('coins', frame.priceCoins)"
                variant="primary"
                class="flex-1 h-20 transition-all hover:-translate-y-1"
                :disabled="userCoins < frame.priceCoins || isProcessing"
              >
                <div class="flex flex-col items-center">
                  <div class="flex items-center gap-2">
                    <span class="text-3xl font-black">{{ frame.priceCoins }}</span>
                    <span class="text-2xl">🪙</span>
                  </div>
                  <span class="text-[10px] font-black uppercase opacity-60 tracking-widest">Pièces d'or</span>
                </div>
              </AppButton>
              
              <!-- Acheter avec Gems -->
              <AppButton 
                @click="handlePurchase('gems', frame.priceGems || 250)"
                variant="primary"
                class="flex-1 h-20 transition-all hover:-translate-y-1"
                :disabled="userGems < (frame.priceGems || 250) || isProcessing"
              >
                <div class="flex flex-col items-center">
                  <div class="flex items-center gap-2">
                    <span class="text-3xl font-black">{{ frame.priceGems || 250 }}</span>
                    <span class="text-2xl">💎</span>
                  </div>
                  <span class="text-[10px] font-black uppercase opacity-60 tracking-widest">Gems Premium</span>
                </div>
              </AppButton>
            </div>
            
            <p v-if="userCoins < frame.priceCoins && userGems < (frame.priceGems || 250)" class="text-xs text-red-400/80 text-center font-black uppercase tracking-[0.2em] bg-red-500/10 py-3 rounded-lg border border-red-500/20">
              ⚠️ Ressources insuffisantes pour cet achat
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="flex flex-col items-center justify-center h-64">
      <div class="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
      <p class="text-white/40 font-black uppercase tracking-widest text-sm">Synchronisation des données...</p>
    </div>

    <ConfirmationModal />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { confirmAction } from '../game/state.js';
import AppButton from '../components/ui/AppButton.vue';
import TripleTriadCard from '../components/TripleTriadCard.vue';
import ConfirmationModal from '../components/ConfirmationModal.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const frameId = route.params.id;
const isProcessing = ref(false);
const selectedRarity = ref('common');

const userCoins = computed(() => userStore.user?.coins || 0);
const userGems = computed(() => userStore.user?.gems || 0);

const frame = computed(() => {
  return userStore.cardFrames.find(f => String(f.documentId || f.id) === String(frameId));
});

const rarities = computed(() => {
  const strapiRarities = userStore.gameConfig?.rarities || [];
  const getColor = (id, defaultColor) => {
    const strapiRarity = strapiRarities.find(r => r.name?.toLowerCase() === id.toLowerCase() || r.id === id);
    return strapiRarity?.color || defaultColor;
  };

  return [
    { id: 'common', label: 'Commun', color: getColor('common', '#a0a0a0'), stats: { top: 4, right: 4, bottom: 4, left: 4 } },
    { id: 'uncommon', label: 'Peu Commun', color: getColor('uncommon', '#4caf50'), stats: { top: 6, right: 6, bottom: 5, left: 5 } },
    { id: 'rare', label: 'Rare', color: getColor('rare', '#2196f3'), stats: { top: 8, right: 7, bottom: 7, left: 6 } },
    { id: 'epic', label: 'Épique', color: getColor('epic', '#9c27b0'), stats: { top: 9, right: 9, bottom: 8, left: 8 } },
    { id: 'legendary', label: 'Légendaire', color: getColor('legendary', '#ffc107'), stats: { top: 100, right: 100, bottom: 100, left: 100 } }
  ];
});

const currentRarityColor = computed(() => {
  return rarities.value.find(r => r.id === selectedRarity.value)?.color || '#a0a0a0';
});

const currentRarityLabel = computed(() => {
  return rarities.value.find(r => r.id === selectedRarity.value)?.label || 'Commun';
});

const dummyCard = computed(() => {
  const r = rarities.value.find(r => r.id === selectedRarity.value);
  return {
    id: 'dummy-preview',
    name: 'Aperçu du Cadre',
    // Using a neutral grey placeholder to represent "no image"
    imageUrl: 'https://placehold.co/600x600/1a1a2e/white?text=PAS+D\'IMAGE',
    top: r.stats.top,
    right: r.stats.right,
    bottom: r.stats.bottom,
    left: r.stats.left,
    topValue: r.stats.top === 100 ? 'A' : String(r.stats.top),
    rightValue: r.stats.right === 100 ? 'A' : String(r.stats.right),
    bottomValue: r.stats.bottom === 100 ? 'A' : String(r.stats.bottom),
    leftValue: r.stats.left === 100 ? 'A' : String(r.stats.left),
    rarity: selectedRarity.value,
    revealed: true
  };
});

onMounted(async () => {
  if (!userStore.cardFramesLoaded) {
    await userStore.fetchCardFrames();
  }
});

const handlePurchase = async (currency, cost) => {
  if (!frame.value) return;
  
  const currencyName = currency === 'gems' ? 'Gems' : 'Pièces';
  const confirmed = await confirmAction(
    "Confirmer l'achat",
    `Voulez-vous débloquer le cadre "${frame.value.name}" pour ${cost} ${currencyName} ?`
  );

  if (confirmed) {
    isProcessing.value = true;
    try {
      const result = await userStore.buyFrame(frame.value.id || frame.value.documentId, currency);
      if (result.success) {
        router.push('/boutique');
      }
    } catch (err) {
      console.error(err);
    } finally {
      isProcessing.value = false;
    }
  }
};
</script>

<style scoped>
.frame-detail-page {
  background-color: #05050a;
}

.card-preview-wrapper {
  perspective: 2000px;
}

.rarity-btn {
  letter-spacing: 0.2em;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

/* Animations */
.frame-detail-page > div {
  animation: fadeIn 0.8s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
