<template>
  <div class="fixed inset-0 z-[2000] flex flex-col items-center justify-center text-white overflow-hidden page-background">
    <!-- Premium Background -->
    <div class="absolute inset-0 bg-gradient-to-br from-[#0a0a12] via-[#1a1a2e] to-[#0a0a12] z-0 opacity-80"></div>
    <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] z-0"></div>
    
    <!-- Flash & Particles Overlay -->
    <div id="opening-flash" class="fixed inset-0 bg-white opacity-0 pointer-events-none z-[8000] transition-opacity duration-150"></div>
    <div id="opening-particles" class="fixed inset-0 pointer-events-none z-[7500]"></div>

    <!-- Close Button (only if finished or error) -->
    <button 
      v-if="allCardsRevealed || error" 
      @click="handleClose" 
      class="absolute top-8 right-8 w-14 h-14 rounded-full glass-panel border border-white/20 hover:border-white/50 hover:bg-white/10 transition-all flex items-center justify-center text-3xl font-light z-[5100] group"
    >
      <span class="group-hover:rotate-90 transition-transform duration-300">✕</span>
    </button>

    <!-- 1. Opening Animation (Pack) -->
    <div v-if="status === 'opening'" class="relative z-20 flex flex-col items-center justify-center min-h-[50vh] w-full animate-fade-in">
      <div 
        class="pack-container"
        :class="[
          isPremium ? 'premium-anim' : 'classic-anim',
          { 'shaking': isShaking }
        ]"
      >
        <div class="pack-front relative w-full h-full flex flex-col items-center justify-center overflow-hidden rounded-[2.5rem]">
          <img v-if="boosterImage" :src="boosterImage" class="absolute inset-0 w-full h-full object-cover filter drop-shadow-2xl" :class="isPremium ? 'brightness-125 saturate-150' : ''" />
          <div v-else class="text-[140px] mb-4 filter drop-shadow-2xl z-10">{{ isPremium ? '💎' : '📦' }}</div>
          
          <div class="relative z-10 text-5xl font-black uppercase italic text-white drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] tracking-widest">
            {{ isPremium ? 'Premium' : 'Classic' }}
          </div>
          
          <div class="relative z-10 mt-16 text-sm uppercase tracking-[0.4em] text-white/50 animate-pulse font-bold bg-black/60 px-6 py-2 rounded-full backdrop-blur-md">
            {{ loadingText }}
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Reveal State (Cards Fan) -->
    <div v-if="status === 'revealing'" class="relative z-10 w-full h-[600px] flex items-center justify-center overflow-visible select-none animate-fade-in">
      <div class="relative w-full max-w-6xl h-full flex items-center justify-center">
        <div 
          v-for="(card, index) in cardsWithState" 
          :key="'drawn-'+index"
          class="absolute transition-all duration-700 ease-out cursor-pointer reveal-card-wrapper"
          :class="[
            getFanClass(index),
            { 'premium-reveal-effect': showPremiumEffect[index] }
          ]"
          :style="getFanStyle(index)"
          @click="handleCardClick(index)"
          @mouseenter="hoveredCardIndex = index"
          @mouseleave="hoveredCardIndex = null"
        >
          <TripleTriadCard
            :card="card"
            size="xl"
            :faceDown="card.faceDown"
            :interactive="false"
            :isNew="card.isNew"
            :revealShine="showPremiumEffect[index]"
            :dimOnHover="true"
            class="shadow-[0_30px_60px_rgba(0,0,0,0.8)]"
          />
        </div>
      </div>
    </div>

    <!-- 3. Actions Footer -->
    <div v-if="status === 'revealing'" class="absolute bottom-16 left-0 right-0 z-[5200] flex justify-center gap-8 animate-fade-in">
      <AppButton
        v-if="!allCardsRevealed"
        variant="primary"
        @click="revealAllCards"
        class="px-20 py-6 text-2xl font-black uppercase italic tracking-tighter rounded-full shadow-[0_0_60px_rgba(59,130,246,0.6)] hover:scale-110 active:scale-95 transition-all"
      >
        TOUT RÉVÉLER
      </AppButton>
      <template v-else>
        <AppButton
          variant="secondary"
          @click="handleClose"
          class="px-12 py-6 text-xl font-black uppercase italic tracking-tighter rounded-full hover:scale-105 active:scale-95 transition-all border border-white/10"
        >
          Terminer
        </AppButton>
        <AppButton
          v-if="hasMoreBoosters"
          variant="primary"
          @click="openAnother"
          class="px-20 py-6 text-2xl font-black uppercase italic tracking-tighter rounded-full shadow-[0_0_60px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-95 transition-all flex items-center gap-4"
        >
          Ouvrir un autre
          <span class="text-xl flex items-center gap-1 opacity-70 font-bold">
            ({{ boosterCount }} dispos)
          </span>
        </AppButton>
      </template>
    </div>

    <!-- 4. Error State -->
    <div v-if="error" class="relative z-20 flex flex-col items-center gap-8 p-12 glass-panel border border-red-500/30 rounded-[3rem] max-w-lg text-center shadow-2xl">
      <div class="text-8xl">⚠️</div>
      <h3 class="text-3xl font-black uppercase italic text-red-400 tracking-tighter">Erreur d'Ouverture</h3>
      <p class="text-xl text-white/70">{{ error }}</p>
      <AppButton variant="primary" @click="handleClose" class="px-12 py-4 text-xl">Retour à la Boutique</AppButton>
    </div>

    <!-- Wallet Display (Top Left) -->
    <div class="fixed top-8 left-8 z-[100] flex gap-4 pointer-events-none">
       <div class="glass-panel border border-white/10 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-3">
          <span class="text-2xl">🪙</span>
          <span class="text-xl font-black text-yellow-400 tabular-nums">{{ userStore.user?.coins || 0 }}</span>
       </div>
       <div class="glass-panel border border-white/10 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-3">
          <span class="text-2xl">💎</span>
          <span class="text-xl font-black text-blue-400 tabular-nums">{{ userStore.user?.gems || 0 }}</span>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { normalizeCard } from '../utils/cardUtils.js';
import { getStrapiUrl } from '../utils/url.js';
import TripleTriadCard from '../components/TripleTriadCard.vue';
import AppButton from '../components/ui/AppButton.vue';

const props = defineProps({
  collection: String,
  type: String
});

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// --- Computed ---
const isPremium = computed(() => props.type === 'premium');
const collectionCode = computed(() => props.collection || 'base');

const boosterImage = computed(() => {
  const coll = userStore.collections.find(c => c.code === collectionCode.value);
  return coll?.boosterImage || null;
});

const boosterCount = computed(() => {
  const b = userStore.user?.boosters?.find(b => b.collection === collectionCode.value && b.isPremium === isPremium.value);
  return b ? b.quantity : 0;
});

const hasMoreBoosters = computed(() => boosterCount.value > 0);

// --- Local State ---
const status = ref('opening'); // opening, revealing, error
const isShaking = ref(false);
const error = ref(null);
const drawnCards = ref([]);
const isFlipped = ref([]);
const showPremiumEffect = ref([]);
const loadingText = ref('Préparation...');
const hoveredCardIndex = ref(null);
const focusedCardIndex = ref(null);
const entranceFinished = ref(false);

const cardsWithState = computed(() => {
  return drawnCards.value.map((c, i) => ({
    ...c,
    faceDown: !isFlipped.value[i]
  }));
});

const allCardsRevealed = computed(() => {
  return isFlipped.value.length > 0 && isFlipped.value.every(v => v);
});

// --- Lifecycle ---
onMounted(() => {
  // Ensure we have collections loaded
  if (userStore.collections.length === 0) {
    userStore.fetchCollections();
  }
  startOpening();
});

// --- Methods ---
const handleClose = () => {
  router.push('/boutique');
};

const openAnother = () => {
  if (!hasMoreBoosters.value) {
    handleClose();
    return;
  }
  resetLocalState();
  startOpening();
};

const resetLocalState = () => {
  status.value = 'opening';
  isShaking.value = false;
  error.value = null;
  drawnCards.value = [];
  isFlipped.value = [];
  showPremiumEffect.value = [];
  loadingText.value = 'Ouverture en cours...';
  hoveredCardIndex.value = null;
  focusedCardIndex.value = null;
  entranceFinished.value = false;
};

const startOpening = async () => {
  status.value = 'opening';
  isShaking.value = true;
  loadingText.value = 'Ouverture en cours...';
  
  const startTime = Date.now();
  const previousCollection = [...(userStore.collection || [])];

  try {
    const token = localStorage.getItem('tt_jwt');
    const response = await fetch(getStrapiUrl('/booster/open'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        isPremium: isPremium.value,
        collection: collectionCode.value 
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData?.error?.message || "Erreur lors de l'ouverture.");
    }

    const data = await response.json();
    
    // Process Cards
    const processedCards = (data.cards || []).map(c => {
      const isPremiumCard = !!c.isDrawnPremium;
      const isNew = !previousCollection.some(ec => ec.cardId === c.id && ec.isPremium === isPremiumCard);
      const normalized = normalizeCard(c);
      return {
        ...normalized,
        drawnRarity: c.drawnRarity,
        isDrawnPremium: isPremiumCard,
        isNew: isNew,
        // Calculate rarity score based on sum of stats as defined in AGENTS.md
        rarityScore: normalized.top + normalized.right + normalized.bottom + normalized.left
      };
    });

    // Sort by rarityScore: common (lowest sum) to rare (highest sum)
    // Tie-breaker: Premium cards are placed to the right of non-premium cards with same stats
    processedCards.sort((a, b) => {
      if (a.rarityScore !== b.rarityScore) {
        return a.rarityScore - b.rarityScore;
      }
      return (a.isDrawnPremium ? 1 : 0) - (b.isDrawnPremium ? 1 : 0);
    });

    drawnCards.value = processedCards;

    if (!drawnCards.value.length) throw new Error("Aucune carte trouvée dans le booster.");

    // Update User Store
    userStore.handleBoosterResults(data);

    isFlipped.value = new Array(drawnCards.value.length).fill(false);
    showPremiumEffect.value = new Array(drawnCards.value.length).fill(false);

    // Animation Sequence
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, 1500 - elapsed);

    setTimeout(() => {
      triggerExplosion();
      setTimeout(() => {
        isShaking.value = false;
        status.value = 'revealing';
        // Mark entrance as finished after animations (wait for the last card + duration)
        setTimeout(() => {
          entranceFinished.value = true;
          console.log("[PackOpening] Entrance finished, interactivity now instant.");
        }, 2000);
      }, 300);
    }, remainingTime);

  } catch (err) {
    error.value = err.message;
    status.value = 'error';
    isShaking.value = false;
  }
};

const triggerExplosion = () => {
  const flash = document.getElementById('opening-flash');
  if (flash) {
    flash.style.opacity = '1';
    setTimeout(() => flash.style.opacity = '0', 150);
  }
  createParticles();
};

const createParticles = () => {
  const container = document.getElementById('opening-particles');
  if (!container) return;
  
  const colors = isPremium.value ? ['#3b82f6', '#60a5fa', '#ffffff', '#fbbf24'] : ['#f59e0b', '#fbbf24', '#ffffff', '#78350f'];
  
  for (let i = 0; i < 80; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const size = Math.random() * 10 + 4;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = '50%';
    particle.style.top = '50%';
    particle.style.position = 'absolute';
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.boxShadow = `0 0 10px ${particle.style.background}`;
    
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 600 + 200;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    
    particle.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
    ], {
      duration: 1000 + Math.random() * 800,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards'
    });
    
    container.appendChild(particle);
    setTimeout(() => particle.remove(), 2000);
  }
};

// --- Fan Layout Helpers ---
const getFanClass = (index) => `fan-card-${index}`;

const getFanStyle = (index) => {
  const isFocused = focusedCardIndex.value === index;
  const isHovered = hoveredCardIndex.value === index;
  const isRevealed = isFlipped.value[index];

  // Desktop offsets for 5 cards
  const xOffsets = [-350, -175, 0, 175, 350];
  const yOffsets = [60, 20, 0, 20, 60];
  const rotations = [-25, -12, 0, 12, 25];

  if (isFocused) {
    return {
      transform: `translate(0px, -150px) scale(1.4) rotate(0deg)`,
      zIndex: 7000,
      transitionDuration: '500ms'
    };
  }

  if (isHovered && isRevealed) {
    return {
      transform: `translate(${xOffsets[index] || 0}px, ${(yOffsets[index] || 0) - 80}px) scale(1.2) rotate(0deg)`,
      zIndex: 6500,
      transitionDuration: '250ms'
    };
  }
  
  const delay = index * 120;
  
  return {
    transform: `translate(${xOffsets[index] || 0}px, ${yOffsets[index] || 0}px) rotate(${rotations[index] || 0}deg)`,
    transitionDelay: (!entranceFinished.value && status.value === 'revealing') ? `${delay}ms` : '0ms',
    zIndex: 5100 + index
  };
};

const handleCardClick = (index) => {
  // If not revealed, reveal it (identical to automatic mode, no movement)
  if (!isFlipped.value[index]) {
    isFlipped.value[index] = true;
    focusedCardIndex.value = null; // Clear focus when revealing new cards
    
    const isPremiumCard = drawnCards.value[index].isDrawnPremium;
    if (isPremiumCard) {
      showPremiumEffect.value[index] = true;
      setTimeout(() => { showPremiumEffect.value[index] = false; }, 2000);
    }
    return;
  }
  
  // If already revealed, handle focus/zoom
  if (focusedCardIndex.value === index) {
    focusedCardIndex.value = null;
  } else {
    focusedCardIndex.value = index;
  }
};

const revealAllCards = async () => {
  for (let i = 0; i < drawnCards.value.length; i++) {
    if (!isFlipped.value[i]) {
      const isPremiumCard = drawnCards.value[i].isDrawnPremium;
      isFlipped.value[i] = true;
      if (isPremiumCard) {
        showPremiumEffect.value[i] = true;
        setTimeout(() => { showPremiumEffect.value[i] = false; }, 1500);
      }
      await new Promise(r => setTimeout(r, 150));
    }
  }
};
</script>

<style scoped>
.page-background {
  background-color: #050505;
}

.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
}

.pack-container {
  width: 350px;
  height: 480px;
  perspective: 2500px;
  position: relative;
  animation: float-pack 4s infinite ease-in-out;
}

.classic-anim {
  background: linear-gradient(135deg, #78350f, #2d0e00);
  border: 2px solid rgba(245, 158, 11, 0.5);
  box-shadow: 0 0 120px rgba(245, 158, 11, 0.2);
}

.premium-anim {
  background: linear-gradient(135deg, #1e3a8a, #020617);
  border: 2px solid rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 120px rgba(59, 130, 246, 0.2);
}

@keyframes float-pack {
  0%, 100% { transform: translateY(0) rotate(0); }
  50% { transform: translateY(-40px) rotate(4deg); }
}

@keyframes shake {
  10%, 90% { transform: translate3d(-3px, 3px, 0) scale(1.05); }
  20%, 80% { transform: translate3d(5px, -3px, 0) scale(1.05); }
  30%, 50%, 70% { transform: translate3d(-8px, 5px, 0) scale(1.15) rotate(-4deg); }
  40%, 60% { transform: translate3d(8px, -5px, 0) scale(1.15) rotate(4deg); }
}

.shaking {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) infinite both;
}

.premium-reveal-effect {
  z-index: 5500 !important;
}

.premium-reveal-effect::before {
  content: '';
  position: absolute;
  inset: -40px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.7) 0%, transparent 70%);
  border-radius: 50%;
  animation: premium-flash-pulse 1.2s ease-out forwards;
  z-index: -1;
}

@keyframes premium-flash-pulse {
  0% { transform: scale(0.5); opacity: 0; }
  30% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.8s forwards cubic-bezier(0.16, 1, 0.3, 1);
}

.reveal-card-wrapper {
  will-change: transform;
}

/* Mobile Adjustments */
@media (max-width: 640px) {
  .relative.h-\[600px\] {
    height: 450px;
    transform: scale(0.65);
  }
  .pack-container {
    transform: scale(0.75);
  }
}
</style>
