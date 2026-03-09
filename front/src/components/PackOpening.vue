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
      <div class="pack-container" :class="selectedPackType === 'premium' ? 'premium-anim' : 'classic-anim'" @click="revealCards">
        <div class="pack-front">
          <div class="text-[120px] mb-4 filter drop-shadow-2xl">{{ selectedPackType === 'premium' ? '💎' : '📦' }}</div>
          <div class="text-4xl font-black uppercase italic text-white drop-shadow-lg tracking-widest">{{ selectedPackType === 'premium' ? 'Premium' : 'Classic' }}</div>
          <div class="mt-12 text-sm uppercase tracking-[0.3em] text-white/50 animate-pulse font-light">Cliquer pour ouvrir</div>
        </div>
      </div>
    </div>

    <!-- Cards Display -->
    <div v-if="packOpened" class="relative z-10 w-full overflow-x-auto pb-16 mt-4 custom-scrollbar">
      <div class="flex justify-center items-center gap-12 md:gap-24 px-12 md:px-32 min-w-full animate-cards-entry">
        <div
          v-for="(card, index) in drawnCards"
          :key="index"
          class="card-wrapper"
          :style="{ '--delay': index * 0.1 + 's' }"
          @click="flipCard(index)"
        >
          <div class="card-pivot" :class="{ 'is-flipped': isFlipped[index] }">
            <!-- Card Back -->
            <div class="card-side back-side" :class="getGlowClass(card.drawnRarity || card.rarity)">
               <img src="/card-back.svg" alt="Card Back" class="w-full h-full object-cover rounded-xl" />
               <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10"></div>
               <div class="absolute inset-0 flex items-center justify-center uppercase tracking-widest text-white/20 font-black text-2xl -rotate-45">Triple Triad</div>
            </div>

            <!-- Card Front -->
            <div class="card-side front-side" :class="getGlowClass(card.drawnRarity || card.rarity)">
              <TripleTriadCard
                :card="card"
                class="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions Footer -->
    <div v-if="packOpened && allCardsRevealed" class="fixed bottom-12 left-0 right-0 z-30 flex justify-center animate-bounce-in">
      <button
        @click="reset"
        class="px-16 py-5 bg-white text-black font-black uppercase italic tracking-tighter text-2xl rounded-full shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-110 active:scale-95 transition-all cursor-pointer"
      >
        Terminer
      </button>
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
import { state, fetchUserCollection } from '../game/state.js';

const emit = defineEmits(['close']);

onMounted(() => {
  fetchUserCollection();
});

const wallet = computed(() => ({
  coins: state.user?.coins || 0,
  gems: state.user?.gems || 0,
  dust: state.user?.dust || 0
}));

const drawnCards = ref([]);
const isFlipped = ref([]);
const isOpening = ref(false);
const packOpened = ref(false);
const selectedPackType = ref('classic');
const errorMessage = ref('');

const handlePackPurchase = (type) => {
  selectedPackType.value = type;
  openPack();
};

const openPack = async () => {
  const currency = selectedPackType.value === 'premium' ? 'gems' : 'coins';
  if (wallet.value[currency] < 100) {
    errorMessage.value = `Pas assez de ${currency === 'gems' ? 'gemmes' : 'pièces'} !`;
    setTimeout(() => errorMessage.value = '', 3000);
    return;
  }

  isOpening.value = true;
  errorMessage.value = '';

  try {
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

    const data = await response.json();
    drawnCards.value = data.cards;
    
    // Update global wallet (the computed property will reflect this automatically)
    state.user.coins = data.wallet.coins;
    state.user.gems = data.wallet.gems;
    state.user.dust = data.wallet.dust;

    isFlipped.value = new Array(5).fill(false);

  } catch (err) {
    errorMessage.value = err.message;
    isOpening.value = false;
    setTimeout(() => errorMessage.value = '', 3000);
  }
};

const revealCards = () => {
  isOpening.value = false;
  packOpened.value = true;
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
  return isFlipped.value.length === 5 && isFlipped.value.every(val => val === true);
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

/* Card Presentation */
.card-wrapper {
  width: 220px;
  height: 308px;
  perspective: 1500px;
  animation: bounce-in 0.8s backwards;
  animation-delay: var(--delay);
  flex-shrink: 0;
  margin: 60px 30px; /* More vertical space and adequate horizontal space for glow */
}

@media (max-width: 768px) {
  .card-wrapper {
    width: 180px;
    height: 252px;
  }
  
  .text-7xl { font-size: 3.5rem; }
  .booster-card { width: 260px; height: 390px; }
  .booster-icon { font-size: 6rem; }
}

.card-pivot {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 1.2s cubic-bezier(0.19, 1, 0.22, 1);
  transform-style: preserve-3d;
}

.card-pivot.is-flipped {
  transform: rotateY(180deg) scale(1.05);
}

.card-side {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 1rem;
  /* overflow: hidden; */
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: center
}

.back-side {
  background: #0a0a0a;
  box-shadow: 0 15px 40px rgba(0,0,0,0.6);
}

.front-side {
  transform: rotateY(180deg);
  background: transparent;
}

/* Glow Effects - Optimized and padded */
.glow-legendary { box-shadow: 0 0 40px 10px rgba(250, 204, 21, 0.5), inset 0 0 20px rgba(250, 204, 21, 0.3); }
.glow-epic { box-shadow: 0 0 35px 8px rgba(168, 85, 247, 0.4), inset 0 0 15px rgba(168, 85, 247, 0.2); }
.glow-rare { box-shadow: 0 0 25px 6px rgba(59, 130, 246, 0.3), inset 0 0 10px rgba(59, 130, 246, 0.2); }
.glow-uncommon { box-shadow: 0 0 20px 5px rgba(76, 175, 80, 0.2); }
.glow-common { box-shadow: 0 0 15px rgba(255,255,255,0.1); }

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
