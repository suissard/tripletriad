<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[5000] flex flex-col items-center justify-center bg-black/95 text-white overflow-hidden">
      <!-- Animated Background Overlay -->
      <div class="absolute inset-0 bg-gradient-to-br from-[#0a0a12] via-[#1a1a2e] to-[#0a0a12] z-0 opacity-80"></div>
      
      <!-- Flash & Particles Overlay -->
      <div id="opening-flash" class="fixed inset-0 bg-white opacity-0 pointer-events-none z-[6000] transition-opacity duration-150"></div>
      <div id="opening-particles" class="fixed inset-0 pointer-events-none z-[5500]"></div>

      <!-- Close Button (only if finished or error) -->
      <button 
        v-if="allCardsRevealed || error" 
        @click="handleClose" 
        class="absolute top-6 right-6 w-12 h-12 rounded-full glass-panel border border-white/20 hover:border-white/50 hover:bg-white/10 transition-all flex items-center justify-center text-2xl font-light z-[5100] group"
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
          <div class="pack-front relative w-full h-full flex flex-col items-center justify-center overflow-hidden rounded-[2rem]">
            <img v-if="boosterImage" :src="boosterImage" class="absolute inset-0 w-full h-full object-cover filter drop-shadow-2xl" :class="isPremium ? 'brightness-125 saturate-150' : ''" />
            <div v-else class="text-[120px] mb-4 filter drop-shadow-2xl z-10">{{ isPremium ? '💎' : '📦' }}</div>
            
            <div class="relative z-10 text-4xl font-black uppercase italic text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] tracking-widest">
              {{ isPremium ? 'Premium' : 'Classic' }}
            </div>
            
            <div class="relative z-10 mt-12 text-sm uppercase tracking-[0.3em] text-white/50 animate-pulse font-light bg-black/40 px-4 py-1 rounded-full backdrop-blur-sm">
              {{ loadingText }}
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Reveal State (Cards Fan) -->
      <div v-if="status === 'revealing'" class="relative z-10 w-full h-[500px] flex items-center justify-center overflow-visible select-none animate-fade-in">
        <div class="relative w-full max-w-4xl h-full flex items-center justify-center">
          <div 
            v-for="(card, index) in cardsWithState" 
            :key="'drawn-'+index"
            class="absolute transition-all duration-500 ease-out cursor-pointer"
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
              size="lg"
              :faceDown="card.faceDown"
              :interactive="false"
              :isNew="card.isNew"
              :revealShine="showPremiumEffect[index]"
              :dimOnHover="false"
              class="shadow-2xl"
            />
          </div>
        </div>
      </div>

      <!-- 3. Actions Footer -->
      <div v-if="status === 'revealing'" class="absolute bottom-12 left-0 right-0 z-[5200] flex justify-center gap-6 animate-fade-in">
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
            @click="handleClose"
            class="px-10 py-5 text-xl font-black uppercase italic tracking-tighter rounded-full hover:scale-105 active:scale-95 transition-all"
          >
            Terminer
          </AppButton>
          <AppButton
            v-if="hasMoreBoosters"
            variant="primary"
            @click="openAnother"
            class="px-16 py-5 text-2xl font-black uppercase italic tracking-tighter rounded-full shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center gap-3"
          >
            Ouvrir un autre
            <span class="text-xl flex items-center gap-1 opacity-70">
              ({{ boosterCount }} dispos)
            </span>
          </AppButton>
        </template>
      </div>

      <!-- 4. Error State -->
      <div v-if="error" class="relative z-20 flex flex-col items-center gap-6 p-8 glass-panel border border-red-500/30 rounded-3xl max-w-md text-center">
        <div class="text-6xl">⚠️</div>
        <h3 class="text-2xl font-black uppercase italic text-red-400">Erreur</h3>
        <p class="text-white/70">{{ error }}</p>
        <AppButton variant="primary" @click="handleClose">Retour</AppButton>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useUserStore } from '../stores/userStore';
import { normalizeCard } from '../utils/cardUtils.js';
import { getStrapiUrl } from '../utils/url.js';
import TripleTriadCard from './TripleTriadCard.vue';
import AppButton from './ui/AppButton.vue';

const props = defineProps({
  isOpen: Boolean,
  collectionCode: String,
  isPremium: Boolean,
  boosterImage: String
});

const emit = defineEmits(['close', 'complete']);

const userStore = useUserStore();

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

const boosterCount = computed(() => {
  const b = userStore.user?.boosters?.find(b => b.collection === props.collectionCode && b.isPremium === props.isPremium);
  return b ? b.quantity : 0;
});

const hasMoreBoosters = computed(() => boosterCount.value > 0);

// --- Methods ---
const resetLocalState = () => {
  status.value = 'opening';
  isShaking.value = false;
  error.value = null;
  drawnCards.value = [];
  isFlipped.value = [];
  showPremiumEffect.value = [];
  loadingText.value = 'Préparation...';
  hoveredCardIndex.value = null;
  focusedCardIndex.value = null;
  entranceFinished.value = false;
};

const handleClose = () => {
  emit('close');
  resetLocalState();
};

const openAnother = () => {
  resetLocalState();
  startOpening();
};

const startOpening = async () => {
  if (!props.isOpen) return;
  
  status.value = 'opening';
  isShaking.value = true;
  loadingText.value = 'Ouverture en cours...';
  
  const startTime = Date.now();
  const previousCollection = [...(userStore.collection || [])];

  try {
    // 1. API Call
    const token = localStorage.getItem('tt_jwt');
    const response = await fetch(getStrapiUrl('/booster/open'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        isPremium: props.isPremium,
        collection: props.collectionCode 
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData?.error?.message || "Erreur lors de l'ouverture.");
    }

    const data = await response.json();
    
    // 2. Process Cards
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

    if (!drawnCards.value.length) throw new Error("Aucune carte trouvée dans le booster.");

    // 3. Update User Store
    userStore.handleBoosterResults(data);
    emit('complete', data);

    isFlipped.value = new Array(drawnCards.value.length).fill(false);
    showPremiumEffect.value = new Array(drawnCards.value.length).fill(false);

    // 4. Animation Sequence
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, 1500 - elapsed);

    setTimeout(() => {
      triggerExplosion();
      setTimeout(() => {
        isShaking.value = false;
        status.value = 'revealing';
        // Mark entrance as finished after animations
        setTimeout(() => {
          entranceFinished.value = true;
        }, 1000);
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
  
  const colors = props.isPremium ? ['#3b82f6', '#60a5fa', '#ffffff', '#fbbf24'] : ['#f59e0b', '#fbbf24', '#ffffff', '#78350f'];
  
  for (let i = 0; i < 60; i++) {
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
    const distance = Math.random() * 500 + 150;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    
    particle.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
    ], {
      duration: 800 + Math.random() * 600,
      easing: 'ease-out',
      fill: 'forwards'
    });
    
    container.appendChild(particle);
    setTimeout(() => particle.remove(), 1500);
  }
};

// --- Fan Layout Helpers ---
const getFanClass = (index) => `fan-card-${index}`;

const getFanStyle = (index) => {
  const isFocused = focusedCardIndex.value === index;
  const isHovered = hoveredCardIndex.value === index;
  const isRevealed = isFlipped.value[index];

  // Desktop offsets for 5 cards
  const xOffsets = [-240, -120, 0, 120, 240];
  const yOffsets = [40, 10, 0, 10, 40];
  const rotations = [-20, -10, 0, 10, 20];

  if (isFocused) {
    return {
      transform: `translate(0px, -120px) scale(1.3) rotate(0deg)`,
      zIndex: 5500,
      transitionDuration: '400ms'
    };
  }

  if (isHovered && isRevealed) {
    return {
      transform: `translate(${xOffsets[index] || 0}px, ${(yOffsets[index] || 0) - 60}px) scale(1.15) rotate(0deg)`,
      zIndex: 5400,
      transitionDuration: '250ms'
    };
  }
  
  const delay = index * 100;
  
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
      setTimeout(() => { showPremiumEffect.value[index] = false; }, 1500);
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
      await new Promise(r => setTimeout(r, 120));
    }
  }
};

// --- Watchers ---
watch(() => props.isOpen, (newVal) => {
  if (newVal) startOpening();
  else resetLocalState();
});

</script>

<style scoped>
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
}

.pack-container {
  width: 320px;
  height: 440px;
  perspective: 2000px;
  position: relative;
  animation: float-pack 4s infinite ease-in-out;
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

.premium-reveal-effect {
  z-index: 5500 !important;
}

.premium-reveal-effect::before {
  content: '';
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, transparent 70%);
  border-radius: 50%;
  animation: premium-flash-pulse 1s ease-out forwards;
  z-index: -1;
}

@keyframes premium-flash-pulse {
  0% { transform: scale(0.5); opacity: 0; }
  30% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.6s forwards cubic-bezier(0.16, 1, 0.3, 1);
}

/* Mobile Adjustments */
@media (max-width: 640px) {
  .relative.h-\[500px\] {
    height: 400px;
    transform: scale(0.7);
  }
  .pack-container {
    transform: scale(0.8);
  }
}
</style>
