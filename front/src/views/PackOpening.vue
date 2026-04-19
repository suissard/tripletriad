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
       <!-- Pack Opening Overlay (new unified component) -->
    <PackOpeningOverlay 
      :is-open="isOpeningOverlayOpen"
      :collection-code="selectedCollection"
      :is-premium="selectedPackType === 'premium'"
      :booster-image="selectedCollectionImage"
      @close="closeOpening"
    />

  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();

import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '../stores/userStore.js';
import AppButton from '../components/ui/AppButton.vue';
import PackOpeningOverlay from '../components/PackOpeningOverlay.vue';
import { getStrapiUrl } from '../utils/url.js';

const userStore = useUserStore();

onMounted(async () => {
  userStore.fetchUserCollection();
  userStore.fetchCollections();
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

const isOpeningOverlayOpen = ref(false);
const selectedPackType = ref('classic');
const selectedCollection = ref('base');
const errorMessage = ref('');
const buyingKey = ref(null);
const confirmingKey = ref(null);

const handlePackPurchase = (type, collection = 'base') => {
  selectedPackType.value = type;
  selectedCollection.value = collection;
  
  // Quick check if we need to buy first
  const isPremium = type === 'premium';
  const currency = isPremium ? 'gems' : 'coins';
  const hasBooster = (boosterCounts.value[collection]?.[type] || 0) > 0;

  if (!hasBooster) {
    if (wallet.value[currency] < 100) {
      errorMessage.value = `Pas assez de ${currency === 'gems' ? 'gemmes' : 'pièces'} !`;
      setTimeout(() => errorMessage.value = '', 3000);
      return;
    }
    // If we need to buy, we'll let the overlay handle it if we want, 
    // but for now let's buy here or just show the overlay and let it error if no booster.
    // Actually, the overlay only OPENS. So we should buy here if needed.
    buyAndOpen(type, collection);
  } else {
    isOpeningOverlayOpen.value = true;
  }
};

const buyAndOpen = async (type, collection) => {
  const isPremium = type === 'premium';
  const currency = isPremium ? 'gems' : 'coins';
  
  try {
    const token = localStorage.getItem('tt_jwt');
    const buyRes = await fetch(getStrapiUrl('/booster/buy'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type, collection, quantity: 1 })
    });
    
    if (!buyRes.ok) throw new Error("Erreur d'achat");
    
    const buyData = await buyRes.json();
    userStore.user.coins = buyData.wallet.coins;
    userStore.user.gems = buyData.wallet.gems;
    userStore.user.boosters = buyData.wallet.boosters;
    
    isOpeningOverlayOpen.value = true;
  } catch (err) {
    errorMessage.value = err.message;
    setTimeout(() => errorMessage.value = '', 3000);
  }
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
  if (confirmingKey.value !== key) {
    confirmingKey.value = key;
    setTimeout(() => { if (confirmingKey.value === key) confirmingKey.value = null; }, 3000);
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
     const token = localStorage.getItem('tt_jwt');
     const buyRes = await fetch(getStrapiUrl('/booster/buy'), {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       },
       body: JSON.stringify({ type, collection, quantity })
     });
     
     if (!buyRes.ok) throw new Error("Erreur d'achat");
     
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

const closeOpening = () => {
  isOpeningOverlayOpen.value = false;
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

@keyframes fade-in {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in { animation: fade-in 1s forwards cubic-bezier(0.16, 1, 0.3, 1); }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translate(-50%, 40px); opacity: 0; }
@media (max-width: 640px) {
  .relative.z-10.w-full.h-\[500px\] {
    height: 400px;
    transform: scale(0.7);
  }
}
</style>

