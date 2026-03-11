<template>
  <div class="boutique-page">
    <div class="header">
      <h2>BOUTIQUE</h2>
      <div class="coins-display">
        🪙 {{ userCoins }} Pièces
      </div>
      <button class="close-btn" @click="$emit('close')">X</button>
    </div>

    <div class="shop-content" v-if="!isOpening && !openedCards.length">
      <div class="booster-pack" @click="openBooster">
        <div class="booster-image">
          📦
        </div>
        <div class="booster-info">
          <h3>Booster Classique</h3>
          <p>Contient 5 cartes aléatoires</p>
          <button class="buy-btn" :disabled="userCoins < boosterCost">
            Ouvrir ({{ boosterCost }} 🪙)
          </button>
        </div>
      </div>
      <div v-if="error" class="error-msg">{{ error }}</div>
    </div>

    <div class="opening-scene" v-else-if="isOpening">
      <div class="shaking-booster">📦</div>
      <p>Ouverture en cours...</p>
    </div>

    <div class="results-scene" v-else-if="openedCards.length">
      <h3>Cartes Obtenues !</h3>
      <div class="cards-container">
        <div
          v-for="(card, index) in openedCards"
          :key="index"
          class="card-wrapper"
          @click="revealCard(index)"
        >
          <div class="card-inner" :class="{ 'is-flipped': card.revealed }">
            <div class="card-front card-back-face">
              <!-- Dos de la carte -->
              <div class="card-back-design">🎴</div>
            </div>
            <div class="card-back card-front-face" :class="[getRarityClass(card), { 'premium-glow': card.isDrawnPremium }]">
              <!-- Face de la carte (TripleTriadCard) -->
              <TripleTriadCard :card="card" size="md" :isPremium="card.isDrawnPremium" />
              <div class="rarity-badge">{{ getRarityLabel(card) }}</div>
              <div v-if="card.isDrawnPremium" class="premium-badge">🌟 PREMIUM 🌟</div>
            </div>
          </div>
        </div>
      </div>
      <div class="results-actions" v-if="allRevealed">
        <button class="continue-btn" @click="resetShop">Continuer</button>
        <button 
          class="buy-another-btn" 
          v-if="userCoins >= boosterCost" 
          @click="openAnother"
        >
          Ouvrir un autre ({{ boosterCost }} 🪙)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

import strapiService from '../api/strapi.js';
import TripleTriadCard from './TripleTriadCard.vue';

const emit = defineEmits(['close', 'update-coins']);

import { useUserStore } from '../stores/userStore.js';
const userStore = useUserStore();
const userCoins = ref(userStore.user?.coins || 0);
const boosterCost = ref(100); // Should ideally fetch from game-config

const isOpening = ref(false);
const openedCards = ref([]);
const error = ref(null);

onMounted(async () => {
  // Update coins from user profile
  try {
      const res = await strapiService.request('GET', '/users/me');
      userCoins.value = res?.coins || res?.data?.coins || 0;
  } catch(e) {
      console.error("Failed to fetch user coins", e);
  }

  // Try to fetch booster cost
  try {
      const res = await strapiService.request('GET', '/game-config');
      if (res.data?.data?.attributes?.boosterCost) {
          boosterCost.value = res?.data?.attributes?.boosterCost || res?.data?.data?.attributes?.boosterCost || 100;
      }
  } catch(e) {
      console.log("Using default booster cost");
  }
});

const openBooster = async () => {
  if (userCoins.value < boosterCost.value) {
    error.value = "Pas assez de pièces !";
    return;
  }

  error.value = null;
  isOpening.value = true;

  try {
    const response = await strapiService.request('POST', '/booster/open');

    setTimeout(() => {
        isOpening.value = false;
        // Add revealed state to each card
        openedCards.value = (response?.cards || response?.data?.cards || []).map(c => {
            // Normalize image: Strapi returns image.url, but TripleTriadCard expects card.img
            let img = c.img;
            if (!img && c.image?.url) {
                img = c.image.url.startsWith('http') ? c.image.url : `http://localhost:1337${c.image.url}`;
            }
            if (!img) {
                img = `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(c.name)}&backgroundColor=transparent`;
            }
            return {...c, img, revealed: false};
        });
        userCoins.value = response?.coins || response?.data?.coins || 0;
        emit('update-coins', userCoins.value);
        
        // Update the collection cache so new cards appear immediately
        userStore.fetchUserCollection();
    }, 1500); // 1.5s shaking animation

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

const resetShop = () => {
    openedCards.value = [];
};

const openAnother = () => {
    resetShop();
    setTimeout(() => {
        openBooster();
    }, 100);
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
.boutique-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #444;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.coins-display {
  font-size: 1.2rem;
  font-weight: bold;
  color: gold;
  background: rgba(0,0,0,0.5);
  padding: 5px 15px;
  border-radius: 20px;
  border: 1px solid gold;
}

.close-btn {
  background: red;
  color: white;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px 15px;
  border-radius: 5px;
}

.shop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.booster-pack {
  background: linear-gradient(135deg, #1e3c72, #2a5298);
  border: 3px solid #ffce00;
  border-radius: 15px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 0 20px rgba(255, 206, 0, 0.3);
}

.booster-pack:hover {
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(255, 206, 0, 0.6);
}

.booster-image {
  font-size: 5rem;
  margin-bottom: 15px;
}

.buy-btn {
  margin-top: 15px;
  background: #ffce00;
  color: black;
  border: none;
  padding: 10px 20px;
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 5px;
  cursor: pointer;
}

.buy-btn:disabled {
  background: #555;
  color: #888;
  cursor: not-allowed;
}

.error-msg {
  color: #ff4444;
  margin-top: 20px;
  font-size: 1.2rem;
  font-weight: bold;
}

.opening-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.shaking-booster {
  font-size: 8rem;
  animation: shake 0.5s infinite;
}

@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  20% { transform: translate(-3px, 0px) rotate(1deg); }
  30% { transform: translate(3px, 2px) rotate(0deg); }
  40% { transform: translate(1px, -1px) rotate(1deg); }
  50% { transform: translate(-1px, 2px) rotate(-1deg); }
  60% { transform: translate(-3px, 1px) rotate(0deg); }
  70% { transform: translate(3px, 1px) rotate(-1deg); }
  80% { transform: translate(-1px, -1px) rotate(1deg); }
  90% { transform: translate(1px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -2px) rotate(-1deg); }
}

.results-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.cards-container {
  display: flex;
  gap: 20px;
  margin-top: 40px;
  flex-wrap: wrap;
  justify-content: center;
}

/* Flip Animation Setup */
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
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.card-inner.is-flipped {
  transform: rotateY(180deg);
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

.card-back-face {
  background: repeating-linear-gradient(
    45deg,
    #2a2a2a,
    #2a2a2a 10px,
    #333 10px,
    #333 20px
  );
  border: 2px solid #555;
  box-shadow: inset 0 0 10px black;
}

.card-back-design {
  font-size: 3rem;
}

.card-front-face {
  transform: rotateY(180deg);
  background: #222;
  border: 3px solid #555;
  position: relative;
}

/* Rarity Colors for Revealed Cards */
.rarity-common { border-color: #a0a0a0; box-shadow: 0 0 10px #a0a0a0; }
.rarity-uncommon { border-color: #4caf50; box-shadow: 0 0 15px #4caf50; }
.rarity-rare { border-color: #2196f3; box-shadow: 0 0 20px #2196f3; }
.rarity-epic { border-color: #9c27b0; box-shadow: 0 0 25px #9c27b0; }
.rarity-legendary { border-color: #ffc107; box-shadow: 0 0 35px #ffc107; }

.rarity-badge {
  position: absolute;
  bottom: -15px;
  background: rgba(0,0,0,0.8);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: bold;
  white-space: nowrap;
}

.premium-glow {
  animation: premiumPulse 2s infinite alternate;
}

.premium-badge {
  position: absolute;
  top: -15px;
  background: linear-gradient(90deg, #ffce00, #ff5722);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: bold;
  white-space: nowrap;
  animation: shine 1.5s infinite;
}

@keyframes premiumPulse {
  0% { filter: drop-shadow(0 0 5px gold) hue-rotate(0deg); }
  100% { filter: drop-shadow(0 0 20px gold) hue-rotate(30deg); }
}

@keyframes shine {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
}

.continue-btn {
  margin-top: 40px;
  background: #4caf50;
  color: white;
  border: none;
  padding: 15px 30px;
  font-size: 1.2rem;
  border-radius: 5px;
  cursor: pointer;
}

.continue-btn:hover {
  background: #45a049;
}

.results-actions {
  margin-top: 40px;
  display: flex;
  gap: 20px;
  justify-content: center;
}

.buy-another-btn {
  background: #ffce00;
  color: black;
  border: none;
  padding: 15px 30px;
  font-size: 1.2rem;
  font-weight: bold;
  border-radius: 5px;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(255, 206, 0, 0.4);
}

.buy-another-btn:hover {
  background: #ffeb3b;
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(255, 206, 0, 0.6);
}
</style>
