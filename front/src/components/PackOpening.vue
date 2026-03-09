<template>
  <div class="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 bg-gray-900 text-white overflow-y-auto">

    <!-- Close Button -->
    <button @click="$emit('close')" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-800 text-white border-2 border-gray-600 hover:bg-gray-700 hover:border-white transition-colors flex items-center justify-center text-xl font-bold z-50">
      X
    </button>

    <!-- Header -->
    <div class="mb-12 text-center mt-10">
      <h1 class="text-4xl font-bold mb-4 text-yellow-400">Ouverture de Pack</h1>
      <p class="text-xl">Solde : <span class="font-bold text-yellow-300">{{ wallet.gems }} Gemmes</span></p>
    </div>

    <!-- Opening Button -->
    <div v-if="!packOpened && !isOpening" class="mb-12 z-10 relative">
      <button
        @click="openPack"
        :disabled="wallet.gems < 100"
        class="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-bold rounded-lg text-xl shadow-lg transition-all transform hover:scale-105"
      >
        Ouvrir (100 Gemmes)
      </button>
    </div>

    <!-- The Pack Animation Container -->
    <div v-if="!packOpened && isOpening"
         class="mb-12 relative z-10 w-64 h-80 bg-indigo-700 rounded-xl shadow-2xl flex items-center justify-center border-4 border-yellow-400 pack-shake cursor-pointer"
         @click="revealCards">
      <div class="text-center">
        <div class="text-6xl mb-4">💎</div>
        <div class="text-2xl font-bold text-yellow-300">Pack Premium</div>
        <div class="text-sm mt-4 text-indigo-200">Cliquez pour ouvrir</div>
      </div>
    </div>

    <!-- Cards Display -->
    <div v-if="packOpened" class="flex flex-wrap justify-center gap-6 mt-8 z-10 relative">
      <div
        v-for="(card, index) in drawnCards"
        :key="index"
        class="card-container cursor-pointer"
        @click="flipCard(index)"
      >
        <div class="card-inner" :class="{ 'is-flipped': isFlipped[index] }">
          <!-- Card Back -->
          <div class="card-face card-back flex items-center justify-center bg-gray-800 rounded-lg shadow-xl overflow-hidden hover:scale-105 transition-transform duration-300">
             <img src="/card-back.svg" alt="Card Back" class="w-full h-full object-cover" />
          </div>

          <!-- Card Front -->
          <div class="card-face card-front rounded-lg" :class="getGlowClass(card.rarity)">
            <TripleTriadCard
              :card="card"
              class="w-full h-full transform scale-110"
              style="transform-origin: top left; width: 90.9%; height: 90.9%;"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Reset Button -->
    <div v-if="packOpened && allCardsRevealed" class="mt-16 z-10 relative pb-10">
      <button
        @click="reset"
        class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
      >
        Ouvrir un autre pack
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
      {{ errorMessage }}
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import TripleTriadCard from './TripleTriadCard.vue';

const emit = defineEmits(['close', 'update-coins']);

const wallet = ref({ gems: 0, dust: 0 });
const drawnCards = ref([]);
const isFlipped = ref([]);
const isOpening = ref(false);
const packOpened = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  try {
    const token = localStorage.getItem('tt_jwt');
    if (!token) return;

    const meResponse = await fetch('http://localhost:1337/api/users/me?populate=wallet', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const userData = await meResponse.json();
    if (userData.wallet) {
      wallet.value = userData.wallet;
    }
  } catch (err) {
    console.error('Failed to fetch user wallet:', err);
  }
});

const openPack = async () => {
  if (wallet.value.gems < 100) {
    errorMessage.value = "Pas assez de gemmes !";
    setTimeout(() => errorMessage.value = '', 3000);
    return;
  }

  isOpening.value = true;
  errorMessage.value = '';

  try {
    const token = localStorage.getItem('tt_jwt');
    const response = await fetch('http://localhost:1337/api/shop/open-pack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to open pack');
    }

    const data = await response.json();
    drawnCards.value = data.cards;
    wallet.value = data.wallet;
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
  isFlipped.value[index] = true;
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
  switch (rarity) {
    case 'Legendary': return 'glow-legendary';
    case 'Epic': return 'glow-epic';
    case 'Rare': return 'glow-rare';
    default: return '';
  }
};
</script>

<style scoped>
.pack-shake {
  animation: shake 0.5s infinite alternate ease-in-out;
  box-shadow: 0 0 20px rgba(250, 204, 21, 0.6);
}

@keyframes shake {
  0% { transform: rotate(-2deg) scale(1); }
  100% { transform: rotate(2deg) scale(1.05); }
}

.card-container {
  width: 200px;
  height: 280px;
  perspective: 1000px;
}

.card-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-style: preserve-3d;
}

.card-inner.is-flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 0.5rem;
}

.card-front {
  transform: rotateY(180deg);
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Glow Effects */
.glow-legendary {
  box-shadow: 0 0 25px 8px rgba(250, 204, 21, 0.9);
  animation: pulse-glow-legendary 2s infinite alternate;
}

.glow-epic {
  box-shadow: 0 0 20px 6px rgba(168, 85, 247, 0.8);
}

.glow-rare {
  box-shadow: 0 0 15px 4px rgba(59, 130, 246, 0.6);
}

@keyframes pulse-glow-legendary {
  0% { box-shadow: 0 0 20px 5px rgba(250, 204, 21, 0.7); }
  100% { box-shadow: 0 0 40px 12px rgba(250, 204, 21, 1); }
}
</style>
