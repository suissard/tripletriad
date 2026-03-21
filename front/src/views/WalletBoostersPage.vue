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
    <div v-if="isOpening" class="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
      <div v-if="!allRevealed" class="shaking-booster text-9xl">
        {{ openingBoosterType === 'premium' ? '💎' : '📦' }}
      </div>

      <div v-if="allRevealed" class="results-scene w-full max-w-6xl px-4 flex flex-col items-center">
        <h2 class="text-3xl font-bold text-primary mb-8 animate-bounce">Cartes obtenues !</h2>

        <div class="flex flex-wrap gap-4 justify-center items-center">
          <div
            v-for="(card, index) in openedCards"
            :key="index"
            class="card-wrapper"
            @click="revealCard(index)"
          >
            <div class="card-inner" :class="{ 'is-flipped': card.revealed }">
              <div class="card-back">
                <AnimatedCardBack />
              </div>
              <div class="card-front" :class="[getRarityClass(card), { 'premium-glow': card.isDrawnPremium }]">
                <TripleTriadCard :card="card" size="md" :isPremium="card.isDrawnPremium" />
                <div class="rarity-badge">{{ getRarityLabel(card) }}</div>
                <div v-if="card.isDrawnPremium" class="premium-badge">🌟 PREMIUM 🌟</div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-12">
          <AppButton variant="primary" @click="closeOpening">Continuer</AppButton>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import strapiService from '../api/strapi';
import AppButton from '../components/ui/AppButton.vue';
import TripleTriadCard from '../components/TripleTriadCard.vue';
import AnimatedCardBack from '../components/AnimatedCardBack.vue';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(true);
const error = ref(null);
const boosters = ref([]);

const isOpening = ref(false);
const openingBoosterType = ref('classic');
const openedCards = ref([]);

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
  openingBoosterType.value = booster.isPremium ? 'premium' : 'classic';
  openedCards.value = [];

  try {
    if (!userStore.strapiConnected) {
       // Mock
       setTimeout(() => {
          openedCards.value = Array(5).fill(0).map((_, i) => ({
             id: i+100, name: 'Mock Card', topValue: '5', rightValue: '5', bottomValue: '5', leftValue: '5', element: 'None', rarity: 'Common', drawnRarity: 'common', isDrawnPremium: false, img: 'https://api.dicebear.com/9.x/bottts/png?seed=mock&backgroundColor=transparent', revealed: false
          }));
          booster.quantity--;
       }, 1500);
    } else {
      const res = await strapiService.request('POST', '/booster/open', {
        collection: booster.collection,
        isPremium: booster.isPremium
      });

      setTimeout(() => {
        openedCards.value = (res?.cards || res?.data?.cards || []).map(c => {
          let imageUrl = c.img || c.imageUrl;
          if (!imageUrl && c.image?.url) {
              imageUrl = c.image.url.startsWith('http') ? c.image.url : `http://localhost:1337${c.image.url}`;
          }
          if (!imageUrl) {
              imageUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(c.name)}&backgroundColor=transparent`;
          }
          return {...c, imageUrl, revealed: false};
        });

        // Update local booster count
        booster.quantity--;
        if (booster.quantity <= 0) {
            boosters.value = boosters.value.filter(b => b.quantity > 0);
        }

        userStore.fetchUserCollection();
      }, 1500); // 1.5s shake animation
    }
  } catch (err) {
    console.error(err);
    error.value = err.response?.data?.error?.message || "Erreur lors de l'ouverture.";
    isOpening.value = false;
  }
};

const revealCard = (index) => {
  if (openedCards.value[index]) {
    openedCards.value[index].revealed = true;
  }
};

const allRevealed = computed(() => {
    return openedCards.value.length > 0 && openedCards.value.every(c => c.revealed);
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

.shaking-booster {
  animation: shake 0.5s infinite;
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.5));
}

@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg) scale(1.5); }
  10% { transform: translate(-1px, -2px) rotate(-1deg) scale(1.5); }
  20% { transform: translate(-3px, 0px) rotate(1deg) scale(1.5); }
  30% { transform: translate(3px, 2px) rotate(0deg) scale(1.5); }
  40% { transform: translate(1px, -1px) rotate(1deg) scale(1.5); }
  50% { transform: translate(-1px, 2px) rotate(-1deg) scale(1.5); }
  60% { transform: translate(-3px, 1px) rotate(0deg) scale(1.5); }
  70% { transform: translate(3px, 1px) rotate(-1deg) scale(1.5); }
  80% { transform: translate(-1px, -1px) rotate(1deg) scale(1.5); }
  90% { transform: translate(1px, 2px) rotate(0deg) scale(1.5); }
  100% { transform: translate(1px, -2px) rotate(-1deg) scale(1.5); }
}

.card-wrapper {
  width: 150px;
  height: 210px;
  perspective: 1000px;
  cursor: pointer;
}

.card-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-style: preserve-3d;
}

.card-inner.is-flipped {
  transform: rotateY(180deg) scale(1.1);
}

.card-front, .card-back {
  width: 100%;
  height: 100%;
  position: absolute;
  backface-visibility: hidden;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.card-back {
  background: #111;
  border: 2px solid #333;
}

.card-front {
  transform: rotateY(180deg);
  background: #222;
  border: 3px solid #555;
  position: relative;
}

/* Rarity Styles */
.rarity-common { border-color: #a0a0a0; box-shadow: 0 0 15px rgba(160,160,160,0.3); }
.rarity-uncommon { border-color: #4caf50; box-shadow: 0 0 20px rgba(76,175,80,0.4); }
.rarity-rare { border-color: #2196f3; box-shadow: 0 0 25px rgba(33,150,243,0.5); }
.rarity-epic { border-color: #9c27b0; box-shadow: 0 0 30px rgba(156,39,176,0.6); }
.rarity-legendary { border-color: #ffc107; box-shadow: 0 0 40px rgba(255,193,7,0.7); }

.rarity-badge {
  position: absolute;
  bottom: -12px;
  background: rgba(0,0,0,0.9);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
  white-space: nowrap;
  border: 1px solid inherit;
  z-index: 10;
}

.premium-badge {
  position: absolute;
  top: -12px;
  background: linear-gradient(90deg, #ffce00, #ff5722);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: bold;
  white-space: nowrap;
  animation: shine 1.5s infinite;
  z-index: 10;
  box-shadow: 0 0 10px gold;
}

.premium-glow {
  animation: premiumPulse 2s infinite alternate;
}

@keyframes premiumPulse {
  0% { filter: drop-shadow(0 0 5px gold) hue-rotate(0deg); }
  100% { filter: drop-shadow(0 0 25px gold) hue-rotate(15deg); }
}

@keyframes shine {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
}

@media (max-width: 640px) {
  .card-wrapper {
    width: 120px;
    height: 168px;
  }
}
</style>
