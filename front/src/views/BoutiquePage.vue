<template>
  <div class="boutique-page h-full w-full flex flex-col items-center justify-start py-8 px-4 overflow-y-auto custom-scrollbar relative">
    <!-- Premium Background -->
    <div class="absolute inset-0 bg-gradient-to-br from-[#0a0a12] via-[#1a1a2e] to-[#0a0a12] -z-10"></div>
    <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] -z-10"></div>
    <div class="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary/10 to-transparent -z-10"></div>
    
    <!-- Header -->
    <div class="w-full max-w-6xl flex justify-between items-center mb-8 px-4">
      <div class="flex items-center gap-4">
        <h2 class="text-4xl font-black text-white italic tracking-tighter" style="font-family: var(--font-heading)">BOUTIQUE</h2>
        <div class="h-8 w-[2px] bg-white/20"></div>
        <div class="flex gap-4">
          <div class="coins-display flex items-center gap-2 text-lg font-bold text-yellow-400 bg-black/40 px-4 py-1.5 rounded-full border border-yellow-400/30 backdrop-blur-md">
            🪙 {{ userCoins }} <span class="text-xs uppercase opacity-70 ml-1">Pièces</span>
          </div>
          <div class="gems-display flex items-center gap-2 text-lg font-bold text-indigo-400 bg-black/40 px-4 py-1.5 rounded-full border border-indigo-400/30 backdrop-blur-md">
            💎 {{ userGems }} <span class="text-xs uppercase opacity-70 ml-1">Gems</span>
          </div>
        </div>
      </div>
      <AppButton variant="secondary" class="glass-panel w-10 h-10 !p-0 flex items-center justify-center rounded-full" @click="handleClose">✕</AppButton>
    </div>

    <!-- Messages -->
    <Transition name="fade">
      <div v-if="error" class="error-msg bg-red-500/20 text-red-400 font-bold p-4 rounded-xl mb-6 w-full max-w-4xl text-center border border-red-500/30 backdrop-blur-xl">
        {{ error }}
      </div>
    </Transition>
    <Transition name="fade">
      <div v-if="successMsg" class="success-msg bg-green-500/20 text-green-400 font-bold p-4 rounded-xl mb-6 w-full max-w-4xl text-center border border-green-500/30 backdrop-blur-xl">
        {{ successMsg }}
      </div>
    </Transition>

    <!-- INVENTORY FAN SECTION -->
    <div class="w-full max-w-6xl mb-4 relative z-20" v-if="!isOpening">
      <div class="flex flex-col items-center mb-[-40px]">
        <h3 class="text-xs font-black text-white/40 uppercase tracking-[0.4em] mb-2">Vos Réserves</h3>
        <div class="h-[1px] w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>
      
      <BoosterInventoryFan 
        :boosters="boosters" 
        @open="handleOpenRequest"
      />
    </div>

    <!-- SHOP SECTION -->
    <div class="w-full max-w-6xl mb-12 relative z-10" v-if="!isOpening">
      <div class="flex flex-col items-center mb-12">
        <h3 class="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Collections Disponibles</h3>
        <div class="h-1 w-16 bg-primary rounded-full"></div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
        <BoosterShopCard 
          v-for="coll in availableCollections" 
          :key="coll.code"
          :collection="coll"
          :baseCost="boosterCost"
          @buy="handlePurchaseIntent"
        />
      </div>
    </div>

    <!-- Global Confirmation Modal -->
    <ConfirmationModal />

    <!-- Pack Opening Overlay (existing logic preserved) -->
    <div v-if="isOpening" class="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center overflow-hidden">
      <!-- ... (the rest of the opening logic stays the same) ... -->
      <div v-if="!isRevealing" class="relative z-20 flex flex-col items-center justify-center min-h-[50vh] w-full">
        <div class="pack-container" :class="openingBoosterType === 'premium' ? 'premium-anim' : 'classic-anim'">
          <div class="pack-front">
            <img v-if="openingBoosterImage" :src="openingBoosterImage" class="w-64 h-80 object-contain mb-4 filter drop-shadow-2xl" :class="openingBoosterType === 'premium' ? 'brightness-125 saturate-150' : ''" />
            <div v-else class="text-[120px] mb-4 filter drop-shadow-2xl">{{ openingBoosterType === 'premium' ? '💎' : '📦' }}</div>
            <div class="text-4xl font-black uppercase italic text-white drop-shadow-lg tracking-widest">{{ openingBoosterType === 'premium' ? 'Premium' : 'Classique' }}</div>
            <div class="mt-12 text-sm uppercase tracking-[0.3em] text-white/50 animate-pulse font-light">
              Ouverture en cours...
            </div>
          </div>
        </div>
      </div>

      <div v-if="isRevealing" class="relative z-10 w-full mt-4 flex justify-center overflow-visible">
        <TripleTriadCardGrid
          :cards="openedCardsWithState"
          fitOnRow
          :cardsPerRow="5"
          @left-click="(card, index) => flipCard(index)"
          class="booster-grid-override animate-cards-entry"
        />
      </div>

      <div v-if="isRevealing" class="absolute bottom-12 left-0 right-0 z-[4000] flex justify-center gap-6 animate-fade-in" style="bottom: 48px;">
        <AppButton
          v-if="!allRevealed"
          variant="primary"
          @click="revealAll"
          class="px-16 py-5 text-2xl font-black uppercase italic tracking-tighter rounded-full shadow-[0_0_50px_rgba(59,130,246,0.5)] hover:scale-110 active:scale-95 transition-all"
        >
          TOUT RÉVÉLER
        </AppButton>
        <template v-else>
          <AppButton
            variant="secondary"
            @click="closeOpening"
            class="px-10 py-5 text-xl font-black uppercase italic tracking-tighter rounded-full hover:scale-105 active:scale-95 transition-all"
          >
            Terminer
          </AppButton>
          <AppButton
            v-if="getBoosterCount(openingCollectionCode, openingBoosterType === 'premium') > 0"
            variant="primary"
            @click="openAnother"
            class="px-10 py-5 text-xl font-black uppercase italic tracking-tighter rounded-full hover:scale-105 active:scale-95 transition-all"
          >
            Ouvrir un autre
          </AppButton>
        </template>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import strapiService from '../api/strapi';
import { getStrapiUrl } from '../utils/url.js';
import { confirmAction } from '../game/state.js';
import AppButton from '../components/ui/AppButton.vue';
import PurchaseButton from '../components/ui/PurchaseButton.vue';
import TripleTriadCardGrid from '../components/TripleTriadCardGrid.vue';
import BoosterInventoryFan from '../components/BoosterInventoryFan.vue';
import BoosterShopCard from '../components/BoosterShopCard.vue';
import ConfirmationModal from '../components/ConfirmationModal.vue';
import { normalizeCard } from '../game/state.js';

const router = useRouter();
const userStore = useUserStore();

const emit = defineEmits(['close', 'update-coins']);

// --- État de base ---
const error = ref(null);
const successMsg = ref(null);
const loadingAction = ref(false);

const userCoins = computed(() => userStore.user?.coins || 0);
const userGems = computed(() => userStore.user?.gems || 0);
const boosterCost = ref(100);

// --- État Inventaire ---
const boosters = computed(() => {
  return userStore.user?.boosters || [];
});

const availableCollections = computed(() => userStore.collections);

const getBoosterCount = (code, isPremium) => {
  const b = boosters.value.find(b => b.collection === code && b.isPremium === isPremium);
  return b ? b.quantity : 0;
};

// --- État Ouverture ---
const isOpening = ref(false);
const isRevealing = ref(false);
const openingBoosterType = ref('classic');
const openingCollectionCode = ref('base');
const openedCards = ref([]);
const isFlipped = ref([]);

const openingBoosterImage = computed(() => {
  const coll = availableCollections.value.find(c => c.code === openingCollectionCode.value);
  return coll?.boosterImage || null;
});

const openedCardsWithState = computed(() => {
   return openedCards.value.map((c, i) => ({
      ...c,
      faceDown: !isFlipped.value[i]
   }));
});

// --- Lifecycle ---
onMounted(async () => {
  try {
      const res = await strapiService.request('GET', '/game-config');
      if (res.data?.data?.attributes?.boosterCost) {
          boosterCost.value = res?.data?.attributes?.boosterCost || res?.data?.data?.attributes?.boosterCost || 100;
      }
  } catch(e) {
      console.log("Using default booster cost");
  }
});

const clearMessages = () => {
  error.value = null;
  successMsg.value = null;
};

const handleClose = () => {
    emit('close');
    router.push('/');
};

// --- Logique d'Achat (Confirmation) ---
const handlePurchaseIntent = async ({ collection, quantity, isPremium, totalCost }) => {
  clearMessages();
  
  const currency = isPremium ? 'Gems' : 'Pièces';
  const confirmed = await confirmAction(
    "Confirmer l'achat",
    `Voulez-vous acheter ${quantity} booster(s) ${collection} pour ${totalCost} ${currency} ?`
  );

  if (confirmed) {
    buyBoosters(collection, quantity, isPremium);
  }
};

const buyBoosters = async (collectionCode, quantity, isPremium) => {
  loadingAction.value = true;
  const type = isPremium ? 'premium' : 'classic';
  const currency = isPremium ? 'gems' : 'coins';

  try {
    if (!userStore.strapiConnected) {
        // Mode offline (mock)
        const total = boosterCost.value * quantity;
        if (userStore.user[currency] < total) {
          error.value = "Fonds insuffisants.";
          return;
        }
        userStore.user[currency] -= total;
        if (!userStore.user.boosters) userStore.user.boosters = [];
        const existing = userStore.user.boosters.find(b => b.collection === collectionCode && b.isPremium === isPremium);
        if (existing) existing.quantity += quantity;
        else userStore.user.boosters.push({ collection: collectionCode, isPremium, quantity: quantity });
        userStore.syncLocalUserWallets();
        successMsg.value = "Achat réussi (Mode Hors-ligne)";
    } else {
        const response = await strapiService.request('POST', '/booster/buy', {
            type,
            collection: collectionCode,
            quantity: quantity
        });
        
        if (response.wallet) {
          userStore.user.coins = response.wallet.coins;
          userStore.user.gems = response.wallet.gems;
          userStore.user.boosters = response.wallet.boosters;
          userStore.syncLocalUserWallets();
        }
        successMsg.value = `${quantity} booster(s) ajouté(s) !`;
    }
    setTimeout(clearMessages, 3000);
  } catch (err) {
    error.value = err.response?.data?.error?.message || "Erreur lors de l'achat.";
    setTimeout(clearMessages, 4000);
  } finally {
    loadingAction.value = false;
  }
};

// --- Logique d'Ouverture ---
const handleOpenRequest = (booster) => {
  openBooster(booster.collection, booster.isPremium);
};

const openBooster = async (collection, isPremium) => {
  clearMessages();
  loadingAction.value = true;

  try {
    if (!userStore.strapiConnected) {
       error.value = "L'ouverture est indisponible hors-ligne.";
       loadingAction.value = false;
       return;
    }

    isOpening.value = true;
    isRevealing.value = false;
    openingBoosterType.value = isPremium ? 'premium' : 'classic';
    openingCollectionCode.value = collection;
    openedCards.value = [];

    const startTime = Date.now();
    
    const openRes = await fetch(getStrapiUrl('/booster/open'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('tt_jwt')}`
      },
      body: JSON.stringify({ collection, isPremium })
    });

    if (!openRes.ok) {
       const errData = await openRes.json();
       throw new Error(errData?.error?.message || "Erreur lors de l'ouverture.");
    }
    const data = await openRes.json();

    openedCards.value = (data.cards || []).map(c => ({
      ...normalizeCard(c),
      drawnRarity: c.drawnRarity,
      isDrawnPremium: !!c.isDrawnPremium
    }));

    if (data.wallet && data.wallet.boosters) {
       userStore.user.boosters = data.wallet.boosters;
    }

    userStore.handleBoosterResults(data);
    isFlipped.value = new Array(openedCards.value.length).fill(false);

    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, 3000 - elapsed);

    setTimeout(() => {
        isRevealing.value = true;
        loadingAction.value = false;
    }, remainingTime);

  } catch (err) {
    error.value = err.message || "Erreur lors de l'ouverture.";
    isOpening.value = false;
    loadingAction.value = false;
  }
};

const flipCard = (index) => {
  if (!isFlipped.value[index]) isFlipped.value[index] = true;
};

const revealAll = () => isFlipped.value.fill(true);

const allRevealed = computed(() => isFlipped.value.length > 0 && isFlipped.value.every(v => v));

const closeOpening = () => {
  isOpening.value = false;
  openedCards.value = [];
};

const openAnother = () => {
  const isPremium = openingBoosterType.value === 'premium';
  closeOpening();
  setTimeout(() => openBooster(openingCollectionCode.value, isPremium), 100);
};

</script>

<style scoped>
.bg-panel {
  background-color: var(--color-panel, rgba(30, 30, 40, 0.8));
}

.pack-container {
  width: 320px;
  height: 440px;
  border-radius: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: float-pack 4s infinite ease-in-out;
}
.pack-front {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
}
.classic-anim {
  background: linear-gradient(135deg, #2a2a35 0%, #1a1a24 100%);
  border: 4px solid #4a4a5a;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.1);
}
.premium-anim {
  background: linear-gradient(135deg, #1f1c2c 0%, #928dab 100%);
  border: 4px solid #ffd700;
  box-shadow: 0 0 40px rgba(255,215,0,0.3), inset 0 0 30px rgba(255,215,0,0.2);
}

@keyframes float-pack {
  0% { transform: translateY(0) scale(1) rotate(0deg); }
  25% { transform: translateY(-15px) scale(1.02) rotate(2deg); }
  50% { transform: translateY(0) scale(1) rotate(0deg); }
  75% { transform: translateY(-15px) scale(1.02) rotate(-2deg); }
  100% { transform: translateY(0) scale(1) rotate(0deg); }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

:deep(.booster-grid-override .tt-card) {
  width: clamp(60px, 18vw, 220px) !important;
  aspect-ratio: 1 / 1 !important;
  height: auto !important;
  font-size: clamp(10px, 1.5vw, 24px) !important;
  transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
</style>
