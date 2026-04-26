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
          :defaultClassicCost="defaultBoosterCost"
          :defaultPremiumCost="defaultPremiumBoosterCost"
          @buy="handlePurchaseIntent"
        />
      </div>
    </div>

    <!-- FRAMES SECTION -->
    <div class="w-full max-w-6xl mb-12 relative z-10" v-if="!isOpening && availableFrames.length > 0">
      <div class="flex flex-col items-center mb-12">
        <h3 class="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Cadres Exclusifs</h3>
        <div class="h-1 w-16 bg-indigo-500 rounded-full"></div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        <div 
          v-for="frame in availableFrames" 
          :key="frame.id"
          class="bg-black/40 border border-white/10 rounded-xl overflow-hidden flex flex-col backdrop-blur-sm transition-all hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
        >
          <div class="h-48 relative bg-gradient-to-b from-white/5 to-black/80 p-4 flex items-center justify-center">
            <img v-if="frame.image" :src="frame.image" class="h-full object-contain filter drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
          </div>
          <div class="p-4 flex flex-col flex-1">
            <h4 class="text-lg font-bold text-white mb-1 uppercase tracking-wider">{{ frame.name }}</h4>
            <p class="text-xs text-white/50 mb-4 flex-1 line-clamp-2">{{ frame.description || 'Personnalisez vos cartes' }}</p>
            
            <div class="flex gap-2 mt-auto">
              <!-- Acheter avec Coins -->
              <button 
                v-if="(frame.priceCoins || 0) > 0"
                @click="handleFramePurchaseIntent(frame, 'coins', frame.priceCoins)"
                class="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded py-2 flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="userCoins < frame.priceCoins"
              >
                <span class="text-yellow-400 font-bold text-sm">{{ frame.priceCoins }}</span>🪙
              </button>
              
              <!-- Acheter avec Gems -->
              <button 
                @click="handleFramePurchaseIntent(frame, 'gems', frame.priceGems || 250)"
                class="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded py-2 flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="userGems < (frame.priceGems || 250)"
              >
                <span class="text-indigo-400 font-bold text-sm">{{ frame.priceGems || 250 }}</span>💎
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- BACKS SECTION -->
    <div class="w-full max-w-6xl mb-12 relative z-10" v-if="!isOpening && availableBacks.length > 0">
      <div class="flex flex-col items-center mb-12">
        <h3 class="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Dos de Cartes</h3>
        <div class="h-1 w-16 bg-pink-500 rounded-full"></div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        <div 
          v-for="back in availableBacks" 
          :key="back.id"
          class="bg-black/40 border border-white/10 rounded-xl overflow-hidden flex flex-col backdrop-blur-sm transition-all hover:border-pink-500/50 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]"
        >
          <div class="h-48 relative bg-gradient-to-b from-white/5 to-black/80 p-4 flex items-center justify-center">
             <!-- Card preview with back -->
             <div class="w-32 aspect-square relative">
                <img v-if="back.image" :src="back.image" class="w-full h-full object-cover rounded-lg border border-white/20 shadow-2xl" />
             </div>
          </div>
          <div class="p-4 flex flex-col flex-1">
            <h4 class="text-lg font-bold text-white mb-1 uppercase tracking-wider">{{ back.name }}</h4>
            <p class="text-xs text-white/50 mb-4 flex-1 line-clamp-2">{{ back.description || 'Changez le style de vos cartes' }}</p>
            
            <div class="flex gap-2 mt-auto">
              <!-- Acheter avec Coins -->
              <button 
                v-if="(back.priceCoins || 0) > 0"
                @click="handleBackPurchaseIntent(back, 'coins', back.priceCoins)"
                class="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded py-2 flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="userCoins < back.priceCoins"
              >
                <span class="text-yellow-400 font-bold text-sm">{{ back.priceCoins }}</span>🪙
              </button>
              
              <!-- Acheter avec Gems -->
              <button 
                @click="handleBackPurchaseIntent(back, 'gems', back.priceGems || 250)"
                class="flex-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded py-2 flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="userGems < (back.priceGems || 250)"
              >
                <span class="text-indigo-400 font-bold text-sm">{{ back.priceGems || 250 }}</span>💎
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Global Confirmation Modal -->
    <ConfirmationModal />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import strapiService from '../api/strapi';
import { confirmAction } from '../game/state.js';
import AppButton from '../components/ui/AppButton.vue';
import BoosterInventoryFan from '../components/BoosterInventoryFan.vue';
import BoosterShopCard from '../components/BoosterShopCard.vue';
import ConfirmationModal from '../components/ConfirmationModal.vue';

const router = useRouter();
const userStore = useUserStore();

const emit = defineEmits(['close', 'update-coins']);

// --- État de base ---
const error = ref(null);
const successMsg = ref(null);
const loadingAction = ref(false);

const userCoins = computed(() => userStore.user?.coins || 0);
const userGems = computed(() => userStore.user?.gems || 0);
const defaultBoosterCost = ref(100);
const defaultPremiumBoosterCost = ref(50);

// --- État Inventaire ---
const boosters = computed(() => {
  return userStore.user?.boosters || [];
});

const availableCollections = computed(() => {
  return [...userStore.collections].sort((a, b) => {
    // Active ones first
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    // Then by code
    return a.code.localeCompare(b.code);
  });
});

const availableFrames = computed(() => {
  const allFrames = userStore.cardFrames || [];
  const unlocked = userStore.unlockedFrames;
  return allFrames.filter(frame => {
    const fId = String(frame.documentId || frame.id);
    return !unlocked.some(u => String(u.documentId || u.id) === fId);
  });
});

const availableBacks = computed(() => {
  const allBacks = userStore.cardBacks || [];
  const unlocked = userStore.unlockedBacks;
  return allBacks.filter(back => {
    const bId = String(back.documentId || back.id);
    return !unlocked.some(u => String(u.documentId || u.id) === bId);
  });
});

// --- État Ouverture ---
// Les états d'ouverture sont maintenant gérés par la page dédiée /open-pack

// --- Lifecycle ---
onMounted(async () => {
  userStore.fetchCardBacks();
  userStore.fetchCardFrames();
  try {
      const res = await strapiService.request('GET', '/game-config');
      const config = res.data?.attributes || res.data?.data?.attributes || res.data || res;
      if (config) {
          defaultBoosterCost.value = config.defaultBoosterCost || 100;
          defaultPremiumBoosterCost.value = config.defaultPremiumBoosterCost || 50;
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
        const unit = isPremium ? defaultPremiumBoosterCost.value : defaultBoosterCost.value;
        const total = unit * quantity;
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
            body: {
                type,
                collection: collectionCode,
                quantity: quantity
            }
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

const handleFramePurchaseIntent = async (frame, currency, cost) => {
  clearMessages();
  const currencyName = currency === 'gems' ? 'Gems' : 'Pièces';
  
  const confirmed = await confirmAction(
    "Confirmer l'achat",
    `Voulez-vous débloquer le cadre "${frame.name}" pour ${cost} ${currencyName} ?`
  );

  if (confirmed) {
    loadingAction.value = true;
    try {
      const result = await userStore.buyFrame(frame.id || frame.documentId, currency);
      if (result.success) {
        successMsg.value = `Cadre "${frame.name}" débloqué avec succès !`;
      } else {
        error.value = result.error || "Erreur lors de l'achat du cadre.";
      }
      setTimeout(clearMessages, 3000);
    } catch (err) {
      error.value = "Erreur réseau.";
      setTimeout(clearMessages, 4000);
    } finally {
      loadingAction.value = false;
    }
  }
};

const handleBackPurchaseIntent = async (back, currency, cost) => {
  clearMessages();
  const currencyName = currency === 'gems' ? 'Gems' : 'Pièces';
  
  const confirmed = await confirmAction(
    "Confirmer l'achat",
    `Voulez-vous débloquer le dos de carte "${back.name}" pour ${cost} ${currencyName} ?`
  );

  if (confirmed) {
    loadingAction.value = true;
    try {
      const result = await userStore.buyCardBack(back.id || back.documentId, currency);
      if (result.success) {
        successMsg.value = `Dos de carte "${back.name}" débloqué avec succès !`;
      } else {
        error.value = result.error || "Erreur lors de l'achat du dos.";
      }
      setTimeout(clearMessages, 3000);
    } catch (err) {
      error.value = "Erreur réseau.";
      setTimeout(clearMessages, 4000);
    } finally {
      loadingAction.value = false;
    }
  }
};

// --- Logique d'Ouverture ---
const handleOpenRequest = (booster) => {
  const type = booster.isPremium ? 'premium' : 'classic';
  router.push({ 
    name: 'pack-opening', 
    params: { 
      collection: booster.collection, 
      type: type 
    } 
  });
};

</script>

<style scoped>
.bg-panel {
  background-color: var(--color-panel, rgba(30, 30, 40, 0.8));
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

