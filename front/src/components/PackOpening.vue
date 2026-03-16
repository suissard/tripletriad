<template>
  <div class="fixed inset-0 z-[2000] flex flex-col items-center justify-start p-8 text-white overflow-y-auto shop-background">
    <!-- Animated Background Overlay -->
    <div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-indigo-950 to-black z-0"></div>
    <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] z-0"></div>

    <!-- Close Button -->
    <button @click="$emit('close')" class="absolute top-6 right-6 w-12 h-12 rounded-full glass-panel border border-white/20 hover:border-white/50 hover:bg-white/10 transition-all flex items-center justify-center text-2xl font-light z-50 group">
      <span class="group-hover:rotate-90 transition-transform duration-300">✕</span>
    </button>

    <!-- UI Header / HUD -->
    <div class="relative z-10 w-full max-w-4xl flex flex-col items-center mt-8 mb-12">
      <h1 class="text-7xl font-black mb-8 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500 uppercase italic drop-shadow-2xl">
        Boutique
      </h1>
      
      <div class="flex gap-4 p-1 glass-panel rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div class="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-yellow-600/20 to-transparent rounded-full border border-yellow-500/20">
          <span class="text-2xl">🪙</span>
          <span class="text-xl font-bold text-yellow-400 tabular-nums">{{ wallet.coins }}</span>
        </div>
        <div class="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600/20 to-transparent rounded-full border border-blue-500/20">
          <span class="text-2xl">💎</span>
          <span class="text-xl font-bold text-blue-400 tabular-nums">{{ wallet.gems }}</span>
        </div>
        <div class="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600/20 to-transparent rounded-full border border-purple-500/20">
          <span class="text-2xl">✨</span>
          <span class="text-xl font-bold text-purple-400 tabular-nums">{{ wallet.dust }}</span>
        </div>
      </div>
    </div>

    <!-- Booster Selection -->
    <div v-if="!packOpened && !isOpening" class="relative z-10 flex flex-wrap justify-center gap-12 mt-4 animate-fade-in">
      <!-- Classic Pack -->
      <div class="booster-card classic-theme group" @click="handlePackPurchase('classic')">
        <div class="booster-inner">
          <div class="booster-visual">
            <div class="booster-icon">📦</div>
            <div class="booster-glow"></div>
          </div>
          <div class="booster-info">
            <h2 class="text-2xl font-black uppercase italic tracking-wider mb-1">Pack Classique</h2>
            <p class="text-white/60 text-sm mb-6">5 cartes (Épique garantie)</p>
            <div class="price-tag group-hover:scale-110 transition-transform" :class="{ 'insufficient': wallet.coins < 100 }">
              <span>100</span>
              <span class="text-lg ml-1">🪙</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Premium Pack -->
      <div class="booster-card premium-theme group" @click="handlePackPurchase('premium')">
        <div class="booster-inner">
          <div class="booster-visual">
            <div class="booster-icon">💎</div>
            <div class="booster-glow"></div>
          </div>
          <div class="booster-info">
            <h2 class="text-2xl font-black uppercase italic tracking-wider mb-1">Pack Premium</h2>
            <p class="text-white/60 text-sm mb-6">Meilleur taux de Loot</p>
            <div class="price-tag group-hover:scale-110 transition-transform" :class="{ 'insufficient': wallet.gems < 100 }">
              <span>100</span>
              <span class="text-lg ml-1">💎</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- The Pack Animation Container -->
    <div v-if="!packOpened && isOpening"
         class="relative z-20 flex flex-col items-center justify-center min-h-[50vh] w-full">
      <AppButton
        variant="ghost"
        class="pack-container"
        :class="selectedPackType === 'premium' ? 'premium-anim' : 'classic-anim'"
        @click="hitBooster"
      >
        <div class="pack-front">
          <div class="text-[120px] mb-4 filter drop-shadow-2xl">{{ selectedPackType === 'premium' ? '💎' : '📦' }}</div>
          <div class="text-4xl font-black uppercase italic text-white drop-shadow-lg tracking-widest">{{ selectedPackType === 'premium' ? 'Premium' : 'Classic' }}</div>
          <div class="mt-12 text-sm uppercase tracking-[0.3em] text-white/50 animate-pulse font-light">
            {{ remainingHits > 0 ? `Clics restants: ${remainingHits}` : 'Ouverture...' }}
          </div>
        </div>
      </AppButton>
    </div>

    <!-- Cards Display -->
    <div v-if="packOpened" class="relative z-10 w-full mt-4 flex justify-center overflow-visible">
      <TripleTriadCardGrid
        :cards="drawnCards.map((c, i) => ({ 
          ...c, 
          rarity: c.drawnRarity || c.rarity, 
          isPremium: c.isDrawnPremium,
          faceDown: !isFlipped[i]
        }))"
        fitOnRow
        :cardsPerRow="5"
        @left-click="(card, index) => flipCard(index)"
        class="booster-grid-override"
      />
    </div>

    <!-- Actions Footer -->
    <div v-if="packOpened" class="fixed bottom-12 left-0 right-0 z-[4000] flex justify-center gap-6 animate-fade-in" style="bottom: 48px;">
      <AppButton
        v-if="!allCardsRevealed"
        variant="primary"
        @click="revealAllCards"
        class="px-16 py-5 text-2xl font-black uppercase italic tracking-tighter rounded-full shadow-[0_0_50px_rgba(59,130,246,0.5)] hover:scale-110 active:scale-95 transition-all"
      >
        TOUT RÉVÉLER
      </AppButton>
      <template v-else>
        <AppButton
          variant="secondary"
          @click="reset"
          class="px-10 py-5 text-xl font-black uppercase italic tracking-tighter rounded-full hover:scale-105 active:scale-95 transition-all"
        >
          Retour
        </AppButton>
        <AppButton
          variant="primary"
          @click="handlePackPurchase(selectedPackType)"
          class="px-16 py-5 text-2xl font-black uppercase italic tracking-tighter rounded-full shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center gap-3"
        >
          Refaire un tirage
          <span class="text-xl flex items-center gap-1 opacity-70">
            (100 {{ selectedPackType === 'premium' ? '💎' : '🪙' }})
          </span>
        </AppButton>
      </template>
    </div>

    <!-- Error Message -->
    <Transition name="slide-up">
      <div v-if="errorMessage" class="fixed bottom-8 left-1/2 -translate-x-1/2 glass-panel border border-red-500/50 text-red-400 px-8 py-4 rounded-2xl shadow-2xl z-[60] flex items-center gap-3">
        <span class="text-xl">⚠️</span>
        <span class="font-bold uppercase tracking-wider">{{ errorMessage }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import TripleTriadCard from './TripleTriadCard.vue';
import { state } from '../game/state.js';
import { useUserStore } from '../stores/userStore.js';
import strapiMock from '../api/strapiMock.js';
import TripleTriadCardGrid from './TripleTriadCardGrid.vue';
import AppButton from './ui/AppButton.vue';
import strapiService from '../api/strapi.js';

const userStore = useUserStore();

const emit = defineEmits(['close']);

const maxHits = ref(5);

onMounted(async () => {
  userStore.fetchUserCollection();
  if (userStore.strapiConnected) {
    try {
      const res = await strapiService.request('GET', '/game-config');
      if (res?.data?.attributes?.boosterHits) {
          maxHits.value = res.data.attributes.boosterHits;
      } else if (res?.data?.data?.attributes?.boosterHits) {
          maxHits.value = res.data.data.attributes.boosterHits;
      }
    } catch (e) {
      console.warn("Could not load boosterHits from config", e);
    }
  }
});

const wallet = computed(() => ({
  coins: userStore.user?.coins || 0,
  gems: userStore.user?.gems || 0,
  dust: userStore.user?.dust || 0
}));

const drawnCards = ref([]);
const isFlipped = ref([]);
const isOpening = ref(false);
const packOpened = ref(false);
const selectedPackType = ref('classic');
const errorMessage = ref('');
const hits = ref(0);

const remainingHits = computed(() => {
  return Math.max(0, maxHits.value - hits.value);
});

const handlePackPurchase = (type) => {
  selectedPackType.value = type;
  openPack();
};

const openPack = async () => {
  const currency = selectedPackType.value === 'premium' ? 'gems' : 'coins';

  if (userStore.strapiConnected && wallet.value[currency] < 100) {
    errorMessage.value = `Pas assez de ${currency === 'gems' ? 'gemmes' : 'pièces'} !`;
    setTimeout(() => errorMessage.value = '', 3000);
    return;
  }

  if (packOpened.value) {
    reset();
  }

  isOpening.value = true;
  hits.value = 0;
  errorMessage.value = '';

  try {
    let data;
    if (!userStore.strapiConnected) {
        data = strapiMock.openBooster();
        data.wallet = { coins: wallet.value.coins - (selectedPackType.value === 'classic' ? 100 : 0), gems: wallet.value.gems - (selectedPackType.value === 'premium' ? 100 : 0), dust: wallet.value.dust };
    } else {
        const token = localStorage.getItem('tt_jwt');
        const response = await fetch('http://localhost:1337/api/booster/open', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ type: selectedPackType.value })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to open pack');
        }

        data = await response.json();
    }
    drawnCards.value = data.cards;
    
    // Update global wallet (the computed property will reflect this automatically)
    userStore.user.coins = data.wallet.coins;
    userStore.user.gems = data.wallet.gems;
    userStore.user.dust = data.wallet.dust;
    userStore.syncLocalUserWallets();

    isFlipped.value = new Array(drawnCards.value.length).fill(false);

  } catch (err) {
    errorMessage.value = err.message;
    isOpening.value = false;
    setTimeout(() => errorMessage.value = '', 3000);
  }
};

const hitBooster = () => {
  if (!isOpening.value) return;
  hits.value++;
  if (hits.value >= maxHits.value) {
    revealCards();
  }
};

const revealCards = () => {
  isOpening.value = false;
  packOpened.value = true;
};

const revealAllCards = () => {
  isFlipped.value = isFlipped.value.map(() => true);
};

const flipCard = (index) => {
  if (!isFlipped.value[index]) {
    isFlipped.value[index] = true;
  }
};

const reset = () => {
  packOpened.value = false;
  drawnCards.value = [];
  isFlipped.value = [];
};

const allCardsRevealed = computed(() => {
  return isFlipped.value.length > 0 && isFlipped.value.every(val => val === true);
});

const getGlowClass = (rarity) => {
  const r = rarity?.toLowerCase() || 'common';
  return `glow-${r}`;
};
</script>

<style scoped>
.shop-background {
  background-color: #050505;
}

.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
}

/* Booster Cards */
.booster-card {
  width: 320px;
  height: 480px;
  perspective: 2000px;
  cursor: pointer;
}

.booster-inner {
  /* width: 100%;
  height: 100%; */
  background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 3rem 2rem;
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
}

.booster-card:hover .booster-inner {
  transform: translateY(-20px) rotateX(10deg);
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.08);
  box-shadow: 0 40px 80px rgba(0,0,0,0.8);
}

.booster-visual {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
}

.booster-icon {
  font-size: 8rem;
  z-index: 1;
  filter: drop-shadow(0 0 30px rgba(255,255,255,0.1));
  transition: transform 0.6s estate;
}

.booster-card:hover .booster-icon {
  transform: scale(1.15) rotate(8deg);
}

.booster-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.2;
  transition: all 0.6s;
}

.classic-theme .booster-glow { background: #f59e0b; }
.premium-theme .booster-glow { background: #3b82f6; }

.booster-card:hover .booster-glow {
  opacity: 0.5;
  width: 280px;
  height: 280px;
}

.booster-info {
  text-align: center;
  width: 100%;
}

.price-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 900;
  background: white;
  color: black;
  padding: 0.75rem 2.5rem;
  border-radius: 9999px;
  box-shadow: 0 15px 30px rgba(0,0,0,0.4);
}

.price-tag.insufficient {
  background: #1f2937;
  color: #4b5563;
  box-shadow: none;
}

/* Pack Opening Area */
.pack-container {
  width: 320px;
  height: 440px;
  border-radius: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  animation: float-pack 4s infinite ease-in-out;
}

.pack-front {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.classic-anim {
  background: linear-gradient(135deg, #78350f, #2d0e00);
  border: 2px solid rgba(245, 158, 11, 0.5);
  box-shadow: 0 0 100px rgba(245, 158, 11, 0.2);
}

.premium-anim {
  background: linear-gradient(135deg, #1e3a8a, #020617);
  border: 2px solid rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 100px rgba(59, 130, 246, 0.2);
}


.booster-grid-override {
  padding: 10px;
  width: 100%;
  max-width: 1200px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 15px;
}

:deep(.booster-grid-override .tt-card) {
  border-radius: 1rem;
  transition: box-shadow 0.5s;
  /* Use fixed clamp values for card size rather than 100% width,
     but let it grow up to 280px max */
  width: clamp(60px, 18vw, 220px) !important;
  aspect-ratio: 2.5 / 3.5 !important;
  height: auto !important;
  font-size: clamp(10px, 1.5vw, 24px) !important;
}

/* Ensuring inner wrapper scales properly inside the overridden card */
:deep(.booster-grid-override .tt-card-inner) {
  width: 100%;
  height: 100%;
}

:deep(.booster-grid-override .rarity-common) { box-shadow: 0 0 15px rgba(255,255,255,0.1); }
:deep(.booster-grid-override .rarity-uncommon) { box-shadow: 0 0 20px 5px rgba(76, 175, 80, 0.2); }
:deep(.booster-grid-override .rarity-rare) { box-shadow: 0 0 25px 6px rgba(59, 130, 246, 0.3), inset 0 0 10px rgba(59, 130, 246, 0.2); }
:deep(.booster-grid-override .rarity-epic) { box-shadow: 0 0 35px 8px rgba(168, 85, 247, 0.4), inset 0 0 15px rgba(168, 85, 247, 0.2); }
:deep(.booster-grid-override .rarity-legendary) { box-shadow: 0 0 40px 10px rgba(250, 204, 21, 0.5), inset 0 0 20px rgba(250, 204, 21, 0.3); }

@media (max-width: 768px) {
  .text-7xl { font-size: 3.5rem; }
  .booster-card { width: 260px; height: 390px; }
  .booster-icon { font-size: 6rem; }
}












/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Keyframes */
@keyframes float-pack {
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-30px) rotate(3deg); }
}

@keyframes bounce-in {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in { animation: fade-in 1s forwards cubic-bezier(0.16, 1, 0.3, 1); }
.animate-cards-entry { animation: fade-in 1s forwards ease-out; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translate(-50%, 40px); opacity: 0; }
</style>
