<template>
  <div class="fixed inset-0 z-[2000] flex flex-col items-center justify-start p-8 text-white overflow-y-auto shop-background">
    <!-- Animated Background Overlay -->
    <div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-indigo-950 to-black z-0"></div>
    <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] z-0"></div>

    <!-- Flash & Particles Overlay -->
    <div id="flash" class="fixed inset-0 bg-white opacity-0 pointer-events-none z-[3000] transition-opacity duration-150"></div>
    <div id="particles-container" class="fixed inset-0 pointer-events-none z-[2500]"></div>

    <!-- Close Button -->
    <button @click="router.push('/')" class="absolute top-6 right-6 w-12 h-12 rounded-full glass-panel border border-white/20 hover:border-white/50 hover:bg-white/10 transition-all flex items-center justify-center text-2xl font-light z-50 group">
      <span class="group-hover:rotate-90 transition-transform duration-300">✕</span>
    </button>

    <!-- UI Header -->
    <div class="relative z-10 w-full max-w-4xl flex flex-col items-center mt-4 mb-8">
      <h1 class="text-5xl font-black mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500 uppercase italic drop-shadow-2xl">
        Boutique
      </h1>
    </div>

    <!-- Permanent Wallet HUD (Bottom Right) -->
    <div class="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      <div class="glass-panel border border-white/10 rounded-2xl px-5 py-3 shadow-2xl flex flex-col gap-1 min-w-[140px] pointer-events-auto">
        <div class="flex items-center justify-between gap-3">
          <span class="text-xl">🪙</span>
          <span class="text-lg font-black text-yellow-400 tabular-nums">{{ wallet.coins }}</span>
        </div>
        <div class="h-px bg-white/5 w-full"></div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-xl">💎</span>
          <span class="text-lg font-black text-blue-400 tabular-nums">{{ wallet.gems }}</span>
        </div>
      </div>
    </div>

    <!-- Mes Boosters (Inventory & Quick Open) -->
    <div v-if="!packOpened && !isOpening" class="relative z-10 w-full max-w-6xl animate-fade-in flex flex-col gap-8 mb-16 px-4">
      <div class="flex items-center gap-6">
        <h2 class="text-4xl font-black uppercase italic tracking-wider text-primary">Vos Boosters</h2>
        <div class="h-[2px] flex-1 bg-gradient-to-r from-primary/50 to-transparent"></div>
      </div>
      
      <div class="flex flex-wrap justify-start gap-8">
        <template v-for="coll in availableCollections" :key="'inv-'+coll.code">
          <!-- Classic Pack Inventory -->
          <div class="owned-booster-card group" >
            <div class="owned-booster-inner glass-panel border border-white/10 rounded-2xl p-4 flex flex-col gap-3 hover:border-primary/50 transition-all items-center w-48 overflow-hidden">
              <div class="booster-visual-container w-full h-32 relative mb-2 overflow-hidden rounded-xl bg-black/40">
                <img v-if="coll.boosterImage" :src="coll.boosterImage" class="w-full h-full object-cover filter drop-shadow-lg group-hover:scale-110 transition-transform" />
                <div v-else class="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center h-full">📦</div>
              </div>
              <div class="text-center">
                <div class="font-bold text-lg uppercase italic text-white/90">Classique</div>
                <div class="text-[10px] text-white/40 uppercase tracking-widest">{{ coll.name }}</div>
              </div>
              <div class="bg-primary/20 text-primary px-3 py-1 rounded-full font-black text-sm w-full text-center">
                Possédé: {{ boosterCounts[coll.code]?.classic || 0 }}
              </div>
              <AppButton 
                variant="primary" 
                class="w-full text-sm mt-2"
                @click="handlePackPurchase('classic', coll.code)"
              >
                <template v-if="(boosterCounts[coll.code]?.classic || 0) > 0">Ouvrir</template>
                <template v-else>Ouvrir (100🪙)</template>
              </AppButton>
            </div>
          </div>
          
          <!-- Premium Pack Inventory -->
          <div class="owned-booster-card group" >
            <div class="owned-booster-inner glass-panel border border-white/10 rounded-2xl p-4 flex flex-col gap-3 hover:border-blue-500/50 transition-all items-center w-48 overflow-hidden">
              <div class="booster-visual-container w-full h-32 relative mb-2 overflow-hidden rounded-xl bg-black/40">
                <img v-if="coll.boosterImage" :src="coll.boosterImage" class="w-full h-full object-cover filter drop-shadow-lg group-hover:scale-110 transition-transform brightness-125 saturate-150" />
                <div v-else class="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center h-full">💎</div>
              </div>
              <div class="text-center">
                <div class="font-bold text-lg uppercase italic text-white/90">Premium</div>
                <div class="text-[10px] text-white/40 uppercase tracking-widest">{{ coll.name }}</div>
              </div>
              <div class="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-black text-sm w-full text-center">
                Possédé: {{ boosterCounts[coll.code]?.premium || 0 }}
              </div>
              <AppButton 
                variant="primary" 
                class="w-full text-sm mt-2 !bg-blue-600 hover:!bg-blue-500 !shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                @click="handlePackPurchase('premium', coll.code)"
              >
                <template v-if="(boosterCounts[coll.code]?.premium || 0) > 0">Ouvrir</template>
                <template v-else>Ouvrir (100💎)</template>
              </AppButton>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Booster Selection Grouped by Collection (Shop) -->
    <div v-if="!packOpened && !isOpening" class="relative z-10 w-full max-w-6xl animate-fade-in flex flex-col gap-16 mt-4">
      <div class="flex items-center gap-6 px-4">
        <h2 class="text-4xl font-black uppercase italic tracking-wider text-white/80">Boutique</h2>
        <div class="h-[2px] flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
      </div>
      <div v-for="coll in availableCollections" :key="coll.code" class="collection-section">
        <div class="flex items-center gap-6 mb-8 px-4">
          <div class="h-[2px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <h2 class="text-3xl font-black uppercase italic tracking-[0.2em] text-white/50 whitespace-nowrap">
            Collection: <span class="text-white">{{ coll.name }}</span>
          </h2>
          <div class="h-[2px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        <div class="flex flex-wrap justify-center gap-12">
          <!-- Classic Pack -->
          <div class="booster-card classic-theme group">
            <div class="booster-inner">
              <div class="booster-visual h-64">
                <img v-if="coll.boosterImage" :src="coll.boosterImage" class="booster-image z-10" />
                <div v-else class="booster-icon">📦</div>
                <div class="booster-glow"></div>
              </div>
              <div class="booster-info">
                <h2 class="text-2xl font-black uppercase italic tracking-wider mb-1">Pack Classique</h2>
                <p class="text-white/60 text-sm mb-4">5 cartes (Épique garantie)</p>
                
                <div class="flex items-center justify-center gap-4 mb-4" @click.stop>
                  <button @click="updateBuyQuantity(coll.code, 'classic', -1)" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">-</button>
                  <span class="text-xl font-bold w-6">{{ getBuyQuantity(coll.code, 'classic') }}</span>
                  <button @click="updateBuyQuantity(coll.code, 'classic', 1)" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">+</button>
                </div>

                <div class="price-tag cursor-pointer group/btn transition-all duration-300" 
                     :class="[
                        { 'insufficient': wallet.coins < 100 * getBuyQuantity(coll.code, 'classic') },
                        { 'confirming bg-orange-500 scale-105': confirmingKey === `${coll.code}-classic` },
                        { 'buying opacity-70 pointer-events-none': buyingKey === `${coll.code}-classic` }
                     ]"
                     @click="buyOnly('classic', coll.code, getBuyQuantity(coll.code, 'classic'))">
                  <span>{{ 100 * getBuyQuantity(coll.code, 'classic') }}</span>
                  <span class="text-lg ml-1">🪙</span>
                  <span class="text-sm ml-2 font-bold uppercase tracking-wide transition-colors">
                    <template v-if="buyingKey === `${coll.code}-classic`"><span class="animate-pulse">En cours...</span></template>
                    <template v-else-if="confirmingKey === `${coll.code}-classic`">Confirmer ?</template>
                    <template v-else>Acheter</template>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Premium Pack -->
          <div class="booster-card premium-theme group">
            <div class="booster-inner">
              <div class="booster-visual h-64">
                <img v-if="coll.boosterImage" :src="coll.boosterImage" class="booster-image z-10 brightness-125 saturate-150" />
                <div v-else class="booster-icon">💎</div>
                <div class="booster-glow"></div>
              </div>
              <div class="booster-info">
                <h2 class="text-2xl font-black uppercase italic tracking-wider mb-1">Pack Premium</h2>
                <p class="text-white/60 text-sm mb-4">Meilleur taux de Loot</p>
                
                <div class="flex items-center justify-center gap-4 mb-4" @click.stop>
                  <button @click="updateBuyQuantity(coll.code, 'premium', -1)" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">-</button>
                  <span class="text-xl font-bold w-6">{{ getBuyQuantity(coll.code, 'premium') }}</span>
                  <button @click="updateBuyQuantity(coll.code, 'premium', 1)" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">+</button>
                </div>

                <div class="price-tag cursor-pointer group/btn transition-all duration-300" 
                     :class="[
                        { 'insufficient': wallet.gems < 100 * getBuyQuantity(coll.code, 'premium') },
                        { 'confirming bg-blue-500 scale-105': confirmingKey === `${coll.code}-premium` },
                        { 'buying opacity-70 pointer-events-none': buyingKey === `${coll.code}-premium` }
                     ]"
                     @click="buyOnly('premium', coll.code, getBuyQuantity(coll.code, 'premium'))">
                  <span>{{ 100 * getBuyQuantity(coll.code, 'premium') }}</span>
                  <span class="text-lg ml-1">💎</span>
                  <span class="text-sm ml-2 font-bold uppercase tracking-wide transition-colors">
                    <template v-if="buyingKey === `${coll.code}-premium`"><span class="animate-pulse">En cours...</span></template>
                    <template v-else-if="confirmingKey === `${coll.code}-premium`">Confirmer ?</template>
                    <template v-else>Acheter</template>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- The Pack Animation Container -->
    <div v-if="!packOpened && isOpening"
         class="relative z-20 flex flex-col items-center justify-center min-h-[50vh] w-full">
      <div
        class="pack-container"
        :class="[
          selectedPackType === 'premium' ? 'premium-anim' : 'classic-anim',
          { 'shaking': isShakingPack }
        ]"
      >
        <div class="pack-front relative w-full h-full flex flex-col items-center justify-center">
          <img v-if="selectedCollectionImage" :src="selectedCollectionImage" class="absolute inset-0 w-full h-full object-cover rounded-[2rem] filter drop-shadow-2xl" :class="selectedPackType === 'premium' ? 'brightness-125 saturate-150' : ''" />
          <div v-else class="text-[120px] mb-4 filter drop-shadow-2xl z-10">{{ selectedPackType === 'premium' ? '💎' : '📦' }}</div>
          <div class="relative z-10 text-4xl font-black uppercase italic text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] tracking-widest">{{ selectedPackType === 'premium' ? 'Premium' : 'Classic' }}</div>
          <div class="relative z-10 mt-12 text-sm uppercase tracking-[0.3em] text-white/50 animate-pulse font-light bg-black/40 px-4 py-1 rounded-full backdrop-blur-sm">
            Ouverture en cours...
          </div>
        </div>
      </div>
    </div>

    <!-- Cards Display (Fan Layout) -->
    <div v-if="packOpened" class="relative z-10 w-full h-[500px] flex items-center justify-center overflow-visible select-none">
      <div class="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div 
          v-for="(card, index) in drawnCardsWithState" 
          :key="'card-'+index"
          class="absolute transition-all duration-500 ease-out cursor-pointer"
          :class="[
            getFanClass(index),
            { 'premium-reveal-effect': showPremiumEffect[index] }
          ]"
          :style="getFanStyle(index)"
          @click="handleCardClick(index)"
        >
          <TripleTriadCard
            :card="card"
            size="lg"
            :faceDown="card.faceDown"
            :interactive="false"
            :isNew="card.isNew"
            :revealShine="showPremiumEffect[index]"
            class="shadow-2xl"
          />
        </div>
      </div>
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
          <template v-if="(selectedPackType === 'premium' ? boosterCounts[selectedCollection]?.premium : boosterCounts[selectedCollection]?.classic) > 0">
            Ouvrir un autre
            <span class="text-xl flex items-center gap-1 opacity-70">
              ({{ selectedPackType === 'premium' ? boosterCounts[selectedCollection]?.premium : boosterCounts[selectedCollection]?.classic }} dispos)
            </span>
          </template>
          <template v-else>
            Refaire un tirage
            <span class="text-xl flex items-center gap-1 opacity-70">
              (100 {{ selectedPackType === 'premium' ? '💎' : '🪙' }})
            </span>
          </template>
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
import { useRouter } from 'vue-router';
const router = useRouter();

import { ref, computed, onMounted } from 'vue';
import TripleTriadCard from '../components/TripleTriadCard.vue';
import { state, normalizeCard } from '../game/state.js';
import { useUserStore } from '../stores/userStore.js';
import strapiMock from '../api/strapiMock.js';
import TripleTriadCardGrid from '../components/TripleTriadCardGrid.vue';
import AppButton from '../components/ui/AppButton.vue';
import strapiService from '../api/strapi.js';
import { getStrapiUrl } from '../utils/url.js';

const userStore = useUserStore();

const emit = defineEmits(['close']);

onMounted(async () => {
  userStore.fetchUserCollection();
  fetchCollections();
});

const totalBoosters = computed(() => {
  if (!userStore.user?.boosters) return 0;
  return userStore.user.boosters.reduce((acc, b) => acc + (b.quantity || 0), 0);
});

const availableCollections = computed(() => userStore.collections);
const selectedCollectionImage = computed(() => {
  const coll = availableCollections.value.find(c => c.code === selectedCollection.value);
  return coll?.boosterImage || null;
});

const wallet = computed(() => ({
  coins: userStore.user?.coins || 0,
  gems: userStore.user?.gems || 0,
  dust: userStore.user?.dust || 0
}));

const boosters = computed(() => userStore.user?.boosters || []);

const boosterCounts = computed(() => {
  const counts = {};
  if (!availableCollections.value) return {};
  availableCollections.value.forEach(coll => {
    const classic = boosters.value.filter(b => b.collection === coll.code && !b.isPremium).reduce((sum, b) => sum + b.quantity, 0);
    const premium = boosters.value.filter(b => b.collection === coll.code && b.isPremium).reduce((sum, b) => sum + b.quantity, 0);
    counts[coll.code] = { classic, premium };
  });
  return counts;
});

const drawnCards = ref([]);
const isFlipped = ref([]);
const clickedCards = ref([]); // Tracking up/down animation state
const showPremiumEffect = ref([]); // Tracking reveal shine for premium cards
const isShakingPack = ref(false);

const drawnCardsWithState = computed(() => {
   return drawnCards.value.map((c, i) => ({
      ...c,
      faceDown: !isFlipped.value[i]
   }));
});
const isOpening = ref(false);
const packOpened = ref(false);
const selectedPackType = ref('classic');
const selectedCollection = ref('base');
const errorMessage = ref('');
const buyingKey = ref(null);
const confirmingKey = ref(null);

// --- Animation Utils ---
function createParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;
    const colors = selectedPackType.value === 'premium' ? ['#3b82f6', '#60a5fa', '#ffffff', '#fbbf24'] : ['#f59e0b', '#fbbf24', '#ffffff', '#78350f'];
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        const size = Math.random() * 8 + 4;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.position = 'absolute';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 400 + 100;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
        ], {
            duration: 800 + Math.random() * 400,
            easing: 'ease-out',
            fill: 'forwards'
        });
        
        container.appendChild(particle);
        setTimeout(() => particle.remove(), 1200);
    }
}

const getFanClass = (index) => {
    return `fan-card-${index}`;
};

const getFanStyle = (index) => {
    // If clicked, move to center and zoom
    if (clickedCards.value[index]) {
        return {
            transform: `translate(0px, -140px) scale(1.4) rotate(0deg)`,
            zIndex: 200,
            transitionDelay: '0ms',
            transitionDuration: '400ms'
        };
    }

    // Standard fan positions (Desktop)
    const xOffsets = [-240, -120, 0, 120, 240];
    const yOffsets = [40, 0, -20, 0, 40];
    const rotations = [-20, -10, 0, 10, 20];
    
    // Staggered entry delay
    const delay = index * 100;
    
    return {
        transform: `translate(${xOffsets[index]}px, ${yOffsets[index]}px) rotate(${rotations[index]}deg)`,
        transitionDelay: packOpened.value ? `${delay}ms` : '0ms',
        zIndex: 10 + index
    };
};

const handlePackPurchase = (type, collection = 'base') => {
  selectedPackType.value = type;
  selectedCollection.value = collection;
  openPack();
};

const buyQuantities = ref({});
const getBuyQuantity = (collId, type) => {
  const key = `${collId}-${type}`;
  return buyQuantities.value[key] || 1;
};
const updateBuyQuantity = (collId, type, delta) => {
  const key = `${collId}-${type}`;
  const current = buyQuantities.value[key] || 1;
  const next = Math.max(1, Math.min(100, current + delta));
  buyQuantities.value[key] = next;
};

const buyOnly = async (type, collection, quantity) => {
  const key = `${collection}-${type}`;
  
  // Step 1: Confirmation
  if (confirmingKey.value !== key) {
    confirmingKey.value = key;
    // Auto-cancel confirmation after 3 seconds
    setTimeout(() => {
        if (confirmingKey.value === key) confirmingKey.value = null;
    }, 3000);
    return;
  }

  const isPremium = type === 'premium';
  const currency = isPremium ? 'gems' : 'coins';
  const cost = 100 * quantity;
  
  if (wallet.value[currency] < cost) {
    errorMessage.value = `Pas assez de ${currency === 'gems' ? 'gemmes' : 'pièces'} !`;
    setTimeout(() => errorMessage.value = '', 3000);
    confirmingKey.value = null;
    return;
  }
  
  buyingKey.value = key;
  confirmingKey.value = null;
  
  try {
     if (!userStore.strapiConnected) {
         userStore.user[currency] -= cost;
         if (!userStore.user.boosters) userStore.user.boosters = [];
         const existing = userStore.user.boosters.find(b => b.collection === collection && b.isPremium === isPremium);
         if (existing) existing.quantity += quantity;
         else userStore.user.boosters.push({ collection, isPremium, quantity });
         userStore.syncLocalUserWallets();
         buyingKey.value = null;
         return;
     }
     
     const token = localStorage.getItem('tt_jwt');
     const buyRes = await fetch(getStrapiUrl('/booster/buy'), {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       },
       body: JSON.stringify({ type, collection, quantity })
     });
     
     if (!buyRes.ok) {
       const err = await buyRes.json();
       throw new Error(err.error?.message || "Erreur d'achat");
     }
     
     const buyData = await buyRes.json();
     userStore.user.coins = buyData.wallet.coins;
     userStore.user.gems = buyData.wallet.gems;
     userStore.user.boosters = buyData.wallet.boosters;
     
  } catch (err) {
     errorMessage.value = err.message;
     setTimeout(() => errorMessage.value = '', 3000);
  } finally {
     buyingKey.value = null;
  }
};

const openPack = async () => {
  const isPremium = selectedPackType.value === 'premium';
  const collection = selectedCollection.value;
  const currency = isPremium ? 'gems' : 'coins';
  const hasBooster = (boosterCounts.value[collection]?.[selectedPackType.value === 'premium' ? 'premium' : 'classic'] || 0) > 0;

  if (!hasBooster && userStore.strapiConnected && wallet.value[currency] < 100) {
    errorMessage.value = `Pas assez de ${currency === 'gems' ? 'gemmes' : 'pièces'} !`;
    setTimeout(() => errorMessage.value = '', 3000);
    return;
  }

  if (packOpened.value) {
    reset();
  }

  isOpening.value = true;
  errorMessage.value = '';

    const previousCollection = [...userStore.collection];
    
    try {
      const startTime = Date.now();
      let data;
      if (!userStore.strapiConnected) {
          data = strapiMock.openBooster();
          const cost = hasBooster ? 0 : 100;
          data.wallet = { 
            coins: wallet.value.coins - (selectedPackType.value === 'classic' ? cost : 0), 
            gems: wallet.value.gems - (selectedPackType.value === 'premium' ? cost : 0), 
            dust: wallet.value.dust 
          };
      } else {
          const token = localStorage.getItem('tt_jwt');
          
          // 1. Buy if needed
          if (!hasBooster) {
            const buyRes = await fetch(getStrapiUrl('/booster/buy'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ 
                type: selectedPackType.value,
                collection: selectedCollection.value 
              })
            });
            if (!buyRes.ok) {
              const errorData = await buyRes.json();
              throw new Error(errorData.error?.message || 'Failed to buy pack');
            }
            // Update wallet immediately to show deduction
            const buyData = await buyRes.json();
            userStore.user.coins = buyData.wallet.coins;
            userStore.user.gems = buyData.wallet.gems;
            userStore.user.boosters = buyData.wallet.boosters;
          }

          // 2. Open
          const openRes = await fetch(getStrapiUrl('/booster/open'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              isPremium: isPremium,
              collection: selectedCollection.value 
            })
          });

          if (!openRes.ok) {
            const errorData = await openRes.json();
            throw new Error(errorData.error?.message || 'Failed to open pack');
          }

          data = await openRes.json();
      }
      
      drawnCards.value = (data.cards || []).map(c => {
        const isPremiumCard = !!c.isDrawnPremium;
        const isNew = !previousCollection.some(ec => ec.cardId === c.id && ec.isPremium === isPremiumCard);
        return {
          ...normalizeCard(c),
          drawnRarity: c.drawnRarity,
          isDrawnPremium: isPremiumCard,
          isNew: isNew
        };
      });
    if (!drawnCards.value.length) {
       throw new Error("No cards found in pack");
    }
    
    // Update global wallet, boosters and collection
    userStore.handleBoosterResults(data);

    if (userStore.strapiConnected) {
       strapiService.trackEvent('open_booster').catch(e => console.error(e));
    }

    isFlipped.value = new Array(drawnCards.value.length).fill(false);

    // START ANIMATION SEQUENCE
    isShakingPack.value = true;
    
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, 2000 - elapsed); // Reduced to 2s for better flow

    setTimeout(() => {
        // Flash Effect
        const flash = document.getElementById('flash');
        if (flash) {
            flash.style.opacity = '1';
            setTimeout(() => flash.style.opacity = '0', 150);
        }
        
        createParticles();
        isShakingPack.value = false;
        
        setTimeout(() => {
            revealCards();
        }, 300);
    }, remainingTime);

  } catch (err) {
    console.error("Open pack error:", err);
    errorMessage.value = err.message || "Erreur lors de l'ouverture.";
    isOpening.value = false;
    setTimeout(() => errorMessage.value = '', 3000);
  }
};

const revealCards = () => {
  isOpening.value = false;
  packOpened.value = true;
  clickedCards.value = new Array(drawnCards.value.length).fill(false);
  showPremiumEffect.value = new Array(drawnCards.value.length).fill(false);
};

const revealAllCards = async () => {
  for (let i = 0; i < drawnCards.value.length; i++) {
    if (!isFlipped.value[i]) {
      const isPremium = drawnCards.value[i].isDrawnPremium;
      flipCard(i);
      if (isPremium) {
        showPremiumEffect.value[i] = true;
        setTimeout(() => { showPremiumEffect.value[i] = false; }, 1500);
      }
      await new Promise(r => setTimeout(r, 150));
    }
  }
};

const handleCardClick = (index) => {
    if (isFlipped.value[index]) return; // Already revealed
    if (clickedCards.value[index]) return; // Already animating
    
    const isPremium = drawnCards.value[index].isDrawnPremium;

    // 1. Move up
    clickedCards.value[index] = true;
    
    // 2. Flip halfway through
    setTimeout(() => {
        isFlipped.value[index] = true;
        
        // 3. Shine effect for premium
        if (isPremium) {
            showPremiumEffect.value[index] = true;
            setTimeout(() => { showPremiumEffect.value[index] = false; }, 1500);
        }

        // 4. Move back down
        setTimeout(() => {
            clickedCards.value[index] = false;
        }, 600);
    }, 400);
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
  clickedCards.value = [];
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

/* Booster Cards & Collections */
.collection-section {
  animation: fade-in 1s forwards cubic-bezier(0.16, 1, 0.3, 1);
}

.booster-card {
  width: 280px;
  height: 400px;
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
  padding: 2rem 1.5rem;
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
  height: 100%;
  overflow: hidden;
  border-radius: 1.5rem;
}

.booster-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.booster-icon {
  font-size: 6rem;
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
  padding: 0.5rem 1.5rem;
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
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease;
  /* Use fixed clamp values for card size rather than 100% width,
     but let it grow up to 280px max */
  width: clamp(60px, 18vw, 220px) !important;
  aspect-ratio: 1 / 1 !important;
  height: auto !important;
  font-size: clamp(10px, 1.5vw, 24px) !important;
  cursor: pointer;
}

:deep(.booster-grid-override .tt-card:hover) {
  transform: scale(1.2) translateY(-15px);
  z-index: 100;
}

/* Ensuring inner wrapper scales properly inside the overridden card */
:deep(.booster-grid-override .tt-card-inner) {
  width: 100%;
  height: 100%;
}

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

@keyframes shake {
    10%, 90% { transform: translate3d(-2px, 2px, 0) scale(1.05); }
    20%, 80% { transform: translate3d(4px, -2px, 0) scale(1.05); }
    30%, 50%, 70% { transform: translate3d(-6px, 4px, 0) scale(1.1) rotate(-3deg); }
    40%, 60% { transform: translate3d(6px, -4px, 0) scale(1.1) rotate(3deg); }
}

.shaking {
    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) infinite both;
}

.particle {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
}

/* Premium Reveal Effects */
.premium-reveal-effect {
    z-index: 300 !important;
}

.premium-reveal-effect::before {
    content: '';
    position: absolute;
    inset: -10px;
    background: radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, transparent 70%);
    border-radius: 50%;
    animation: premium-flash-pulse 1s ease-out forwards;
    z-index: -1;
}

@keyframes premium-flash-pulse {
    0% { transform: scale(0.5); opacity: 0; }
    30% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1.8); opacity: 0; }
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

/* Responsive adjustments for fan */
@media (max-width: 640px) {
    .relative.z-10.w-full.h-\[500px\] {
        height: 400px;
        transform: scale(0.7);
    }
}
</style>
