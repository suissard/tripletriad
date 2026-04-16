<template>
  <div class="wallet-boosters-page h-full w-full flex flex-col items-center justify-start py-8 px-4 overflow-y-auto custom-scrollbar">
    <h1 class="text-4xl font-bold text-primary mb-8 text-center" style="font-family: var(--font-heading)">Mes Boosters</h1>

    <!-- Loading State -->
    <div v-if="loading" class="text-white text-xl">
      Chargement de vos boosters...
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-red-500 font-bold mb-4">
      {{ error }}
    </div>

    <!-- Empty State -->
    <div v-else-if="!boosters.length" class="text-white text-center flex flex-col items-center gap-4 mt-12">
      <div class="text-6xl opacity-50">🎒</div>
      <h2 class="text-2xl font-bold text-gray-300">Votre inventaire est vide.</h2>
      <p class="text-gray-400">Visitez la boutique pour obtenir des boosters et découvrir de nouvelles cartes !</p>
      <AppButton variant="primary" @click="router.push('/shop')">Aller à la boutique</AppButton>
    </div>

    <!-- Boosters List -->
    <div v-else class="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      <div
        v-for="(booster, idx) in boosters"
        :key="idx"
        class="booster-item relative group cursor-pointer"
        @click="openBooster(booster)"
      >
        <div class="booster-inner bg-panel/80 backdrop-blur-md border-2 border-primary/30 rounded-2xl p-6 flex flex-col items-center justify-center transition-all duration-300 group-hover:-translate-y-2 group-hover:border-primary group-hover:shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.5)] h-full min-h-[250px]">
          <!-- Visual -->
          <div class="booster-visual relative mb-4">
            <div class="text-6xl drop-shadow-lg z-10 relative">{{ booster.isPremium ? '💎' : '📦' }}</div>
            <div class="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 -z-10 group-hover:bg-primary/40 transition-colors duration-300" :class="{ 'bg-blue-500/20 group-hover:bg-blue-500/40': booster.isPremium }"></div>
          </div>

          <!-- Info -->
          <div class="text-center">
            <h3 class="text-xl font-bold text-white mb-1">Booster {{ booster.isPremium ? 'Premium' : 'Classique' }}</h3>
            <p class="text-sm text-gray-400 mb-4 capitalize">Collection : {{ booster.collection || 'base' }}</p>

            <div class="inline-block bg-black/50 border border-primary/50 px-4 py-1 rounded-full text-primary font-bold">
              x{{ booster.quantity }}
            </div>
          </div>

          <!-- Overlay CTA -->
          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-center justify-center">
            <AppButton variant="primary" class="pointer-events-none">Ouvrir</AppButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Pack Opening Overlay -->
    <div v-if="isOpening" class="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center overflow-hidden">
      
      <!-- The Pack Animation Container -->
      <div v-if="!isRevealing"
           class="relative z-20 flex flex-col items-center justify-center min-h-[50vh] w-full">
        <div
          class="pack-container"
          :class="openingBoosterType === 'premium' ? 'premium-anim' : 'classic-anim'"
        >
          <div class="pack-front">
            <div class="text-[120px] mb-4 filter drop-shadow-2xl">{{ openingBoosterType === 'premium' ? '💎' : '📦' }}</div>
            <div class="text-4xl font-black uppercase italic text-white drop-shadow-lg tracking-widest">{{ openingBoosterType === 'premium' ? 'Premium' : 'Classique' }}</div>
            <div class="mt-12 text-sm uppercase tracking-[0.3em] text-white/50 animate-pulse font-light">
              Ouverture en cours...
            </div>
          </div>
        </div>
      </div>

      <!-- Cards Display -->
      <div v-if="isRevealing" class="relative z-10 w-full mt-4 flex justify-center overflow-visible">
        <TripleTriadCardGrid
          :cards="openedCardsWithState"
          fitOnRow
          :cardsPerRow="5"
          @left-click="(card, index) => flipCard(index)"
          class="booster-grid-override animate-cards-entry"
        />
      </div>

      <!-- Actions Footer -->
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
            Continuer
          </AppButton>
        </template>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import strapiService from '../api/strapi';
import { getStrapiMediaUrl } from '../utils/url.js';
import AppButton from '../components/ui/AppButton.vue';
import TripleTriadCardGrid from '../components/TripleTriadCardGrid.vue';
import { normalizeCard } from '../game/state.js';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(true);
const error = ref(null);
const boosters = ref([]);

const isOpening = ref(false);
const isRevealing = ref(false);
const openingBoosterType = ref('classic');
const openedCards = ref([]);
const isFlipped = ref([]);

const openedCardsWithState = computed(() => {
   return openedCards.value.map((c, i) => ({
      ...c,
      faceDown: !isFlipped.value[i]
   }));
});

const fetchBoosters = async () => {
  loading.value = true;
  error.value = null;
  try {
    if (!userStore.strapiConnected) {
      // Mock logic if needed, but assuming mostly online
      boosters.value = [
        { collection: 'base', isPremium: false, quantity: 2 },
        { collection: 'base', isPremium: true, quantity: 1 }
      ];
    } else {
      const res = await strapiService.request('GET', '/wallets/me');
      // If the wallet endpoint doesn't return boosters, we might need a custom endpoint or fetch user with wallet
      // For now, let's assume /wallets/me returns the user's wallet including boosters
      // We might need to adjust this depending on how /wallets/me is implemented in Strapi
      // Since /wallets/me is likely custom or missing populate, let's fetch user instead
      const userRes = await strapiService.request('GET', '/users/me?populate=wallet');
      const wallet = userRes?.wallet || userRes?.data?.wallet;
      boosters.value = wallet?.boosters || [];
    }
  } catch (err) {
    console.error("Failed to fetch boosters:", err);
    error.value = "Impossible de récupérer vos boosters.";
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchBoosters();
});

const openBooster = async (booster) => {
  if (booster.quantity <= 0) return;

  error.value = null;
  isOpening.value = true;
  isRevealing.value = false;
  openingBoosterType.value = booster.isPremium ? 'premium' : 'classic';
  openedCards.value = [];

  try {
    const startTime = Date.now();
    let data;

    if (!userStore.strapiConnected) {
       // Mock
       return; // Handle mock somewhere else or ignore
    } else {
      const openRes = await fetch(getStrapiUrl('/booster/open'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tt_jwt')}`
        },
        body: JSON.stringify({ 
          collection: booster.collection,
          isPremium: booster.isPremium
        })
      });

      if (!openRes.ok) throw new Error("Failed to open pack");
      data = await openRes.json();


      openedCards.value = (data.cards || []).map(c => {
        return {
          ...normalizeCard(c),
          drawnRarity: c.drawnRarity,
          isDrawnPremium: !!c.isDrawnPremium
        };
      });

      // Update local booster count safely since we know the fetch succeeded
      booster.quantity--;
      if (booster.quantity <= 0) {
          boosters.value = boosters.value.filter(b => b.quantity > 0);
      }

      userStore.handleBoosterResults(data);
      isFlipped.value = new Array(openedCards.value.length).fill(false);

      if (userStore.strapiConnected) {
         strapiService.trackEvent('open_booster').catch(() => {});
      }

      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 3000 - elapsed);

      setTimeout(() => {
          isRevealing.value = true;
      }, remainingTime);
    }
  } catch (err) {
    console.error(err);
    error.value = err.message || "Erreur lors de l'ouverture.";
    isOpening.value = false;
  }
};

const flipCard = (index) => {
  if (!isFlipped.value[index]) {
    isFlipped.value[index] = true;
  }
};

const revealAll = () => {
  isFlipped.value.fill(true);
};

const allRevealed = computed(() => {
    return isFlipped.value.length > 0 && isFlipped.value.every(v => v);
});

const closeOpening = () => {
  isOpening.value = false;
  openedCards.value = [];
};

const getRarityClass = (card) => {
    return `rarity-${card.drawnRarity || 'common'}`;
};

const getRarityLabel = (card) => {
    const labels = {
        common: 'Commune',
        uncommon: 'Peu Commune',
        rare: 'Rare',
        epic: 'Épique',
        legendary: 'Légendaire'
    };
    return labels[card.drawnRarity || 'common'];
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
:deep(.booster-grid-override .tt-card) {
  width: clamp(60px, 18vw, 220px) !important;
  aspect-ratio: 1 / 1 !important;
  height: auto !important;
  font-size: clamp(10px, 1.5vw, 24px) !important;
  transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
</style>
