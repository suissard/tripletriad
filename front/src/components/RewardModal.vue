<template>
  <Teleport to="body">
    <Transition name="reward-modal">
      <div v-if="show" class="reward-overlay" @click.self="handleClaim">
        <!-- Confetti particles -->
        <div class="confetti-container">
          <div v-for="i in 30" :key="i" class="confetti-particle" :style="confettiStyle(i)"></div>
        </div>

        <div class="reward-modal-content" :class="{ 'is-visible': contentVisible }">
          <!-- Glow ring -->
          <div class="reward-glow"></div>

          <!-- Title -->
          <h2 class="reward-title">{{ title }}</h2>
          <p v-if="subtitle" class="reward-subtitle">{{ subtitle }}</p>

          <!-- Card display area -->
          <div class="reward-card-showcase">
            <div class="reward-card-wrapper">
              <TripleTriadCard
                v-if="reward"
                :card="normalizedCard"
                size="xl"
                :flat="false"
                :disable-zoom="true"
                :show-detail-on-hover="false"
              />
            </div>
            <p v-if="reward" class="reward-card-name">{{ reward.name }}</p>
          </div>

          <!-- Coins reward (if applicable) -->
          <div v-if="coins > 0" class="reward-coins-showcase">
            <span class="coins-icon">🪙</span>
            <span class="coins-amount">+{{ coins }}</span>
            <span class="coins-label">Coins</span>
          </div>

          <!-- Claim button -->
          <button class="reward-claim-btn" @click.stop="handleClaim">
            <span class="claim-text">{{ claimLabel }}</span>
            <span class="claim-sparkle">✨</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import TripleTriadCard from './TripleTriadCard.vue';
import strapiService from '../api/strapi.js';

const props = defineProps({
  show: { type: Boolean, default: false },
  reward: { type: Object, default: null },      // Card object
  coins: { type: Number, default: 0 },          // Coin reward amount
  title: { type: String, default: 'Récompense débloquée !' },
  subtitle: { type: String, default: '' },
  claimLabel: { type: String, default: 'Récupérer' },
});

const emit = defineEmits(['claimed', 'close']);

const contentVisible = ref(false);

// Normalize card data for TripleTriadCard
const normalizedCard = computed(() => {
  if (!props.reward) return {};
  const card = props.reward.attributes || props.reward;
  
  let imageUrl = card.imageUrl || card.img;
  if (!imageUrl && card.image?.url) {
    imageUrl = card.image.url.startsWith('http') ? card.image.url : `${strapiService.MEDIA_URL}${card.image.url}`;
  }
  if (!imageUrl && card.image?.data?.attributes?.url) {
    const attrUrl = card.image.data.attributes.url;
    imageUrl = attrUrl.startsWith('http') ? attrUrl : `${strapiService.MEDIA_URL}${attrUrl}`;
  }
  if (!imageUrl) {
    const seed = card.id || props.reward.id || card.name || '0';
    imageUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
  }
  return {
    id: props.reward.id || card.id,
    name: card.name,
    topValue: card.topValue,
    rightValue: card.rightValue,
    bottomValue: card.bottomValue,
    leftValue: card.leftValue,
    element: card.element,
    elements: card.elements,
    imageUrl,
    rarity: card.rarity,
  };
});

// Confetti particle style generator
function confettiStyle(index) {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF69B4'];
  const color = colors[index % colors.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 2;
  const duration = 2 + Math.random() * 3;
  const size = 4 + Math.random() * 8;
  const rotation = Math.random() * 360;

  return {
    '--confetti-color': color,
    '--confetti-left': `${left}%`,
    '--confetti-delay': `${delay}s`,
    '--confetti-duration': `${duration}s`,
    '--confetti-size': `${size}px`,
    '--confetti-rotation': `${rotation}deg`,
  };
}

function handleClaim() {
  emit('claimed');
  emit('close');
}

// Stagger the content visibility for dramatic effect
watch(() => props.show, async (newVal) => {
  if (newVal) {
    contentVisible.value = false;
    await nextTick();
    setTimeout(() => {
      contentVisible.value = true;
    }, 300);
  } else {
    contentVisible.value = false;
  }
}, { immediate: true });
</script>

<style scoped>
/* ========================= */
/* OVERLAY                    */
/* ========================= */
.reward-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* ========================= */
/* CONFETTI                   */
/* ========================= */
.confetti-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.confetti-particle {
  position: absolute;
  top: -10%;
  left: var(--confetti-left);
  width: var(--confetti-size);
  height: var(--confetti-size);
  background: var(--confetti-color);
  border-radius: 2px;
  animation: confetti-fall var(--confetti-duration) ease-in var(--confetti-delay) infinite;
  transform: rotate(var(--confetti-rotation));
  opacity: 0;
}

@keyframes confetti-fall {
  0% {
    opacity: 1;
    transform: translateY(0) rotate(var(--confetti-rotation)) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(110vh) rotate(calc(var(--confetti-rotation) + 720deg)) scale(0.5);
  }
}

/* ========================= */
/* MODAL CONTENT              */
/* ========================= */
.reward-modal-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 3rem 2.5rem;
  max-width: 420px;
  width: 90%;
  z-index: 1;
  opacity: 0;
  transform: translateY(40px) scale(0.9);
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.reward-modal-content.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* ========================= */
/* GLOW RING                  */
/* ========================= */
.reward-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 350px;
  height: 350px;
  transform: translate(-50%, -55%);
  background: radial-gradient(circle, rgba(255, 215, 0, 0.25) 0%, rgba(255, 215, 0, 0.08) 40%, transparent 70%);
  border-radius: 50%;
  animation: glow-pulse 2.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glow-pulse {
  0%, 100% { transform: translate(-50%, -55%) scale(1); opacity: 0.7; }
  50% { transform: translate(-50%, -55%) scale(1.15); opacity: 1; }
}

/* ========================= */
/* TITLE                      */
/* ========================= */
.reward-title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 3px;
  text-align: center;
  background: linear-gradient(135deg, #FFD700, #FFA500, #FFD700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 2px 10px rgba(255, 215, 0, 0.4));
  animation: title-shimmer 3s ease-in-out infinite;
}

@keyframes title-shimmer {
  0%, 100% { filter: drop-shadow(0 2px 10px rgba(255, 215, 0, 0.4)); }
  50% { filter: drop-shadow(0 2px 20px rgba(255, 215, 0, 0.8)); }
}

.reward-subtitle {
  margin: -0.5rem 0 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  text-align: center;
  font-style: italic;
}

/* ========================= */
/* CARD SHOWCASE              */
/* ========================= */
.reward-card-showcase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.reward-card-wrapper {
  animation: card-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both;
  filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.5));
}

@keyframes card-entrance {
  0% {
    opacity: 0;
    transform: translateY(60px) scale(0.5) rotateY(180deg);
  }
  60% {
    opacity: 1;
    transform: translateY(-10px) scale(1.05) rotateY(10deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateY(0deg);
  }
}

.reward-card-name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
  text-align: center;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  letter-spacing: 1px;
}

/* ========================= */
/* COINS SHOWCASE             */
/* ========================= */
.reward-coins-showcase {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 191, 0, 0.1);
  border: 1px solid rgba(255, 191, 0, 0.3);
  border-radius: 16px;
  animation: coins-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s both;
}

@keyframes coins-pop {
  0% { opacity: 0; transform: scale(0.5); }
  100% { opacity: 1; transform: scale(1); }
}

.coins-icon {
  font-size: 1.5rem;
}

.coins-amount {
  font-size: 1.8rem;
  font-weight: 900;
  color: #FFD700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.coins-label {
  font-size: 1rem;
  color: rgba(255, 191, 0, 0.8);
  font-weight: 600;
}

/* ========================= */
/* CLAIM BUTTON               */
/* ========================= */
.reward-claim-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 3rem;
  border: none;
  border-radius: 50px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #1a1a2e;
  font-size: 1.2rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 165, 0, 0.2);
  animation: btn-entrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s both;
}

@keyframes btn-entrance {
  0% { opacity: 0; transform: translateY(20px) scale(0.8); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.reward-claim-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 165, 0, 0.3);
}

.reward-claim-btn:active {
  transform: translateY(0) scale(0.98);
}

.reward-claim-btn::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%);
  animation: btn-shine 3s ease-in-out infinite;
}

@keyframes btn-shine {
  0% { transform: translateX(-100%) rotate(45deg); }
  30%, 100% { transform: translateX(100%) rotate(45deg); }
}

.claim-text {
  position: relative;
  z-index: 1;
}

.claim-sparkle {
  position: relative;
  z-index: 1;
  font-size: 1.3rem;
}

/* ========================= */
/* TRANSITIONS                */
/* ========================= */
.reward-modal-enter-active {
  transition: opacity 0.4s ease;
}

.reward-modal-leave-active {
  transition: opacity 0.3s ease;
}

.reward-modal-enter-from,
.reward-modal-leave-to {
  opacity: 0;
}

/* ========================= */
/* RESPONSIVE                 */
/* ========================= */
@media (max-width: 480px) {
  .reward-modal-content {
    padding: 2rem 1.5rem;
    gap: 1rem;
  }
  .reward-title {
    font-size: 1.4rem;
    letter-spacing: 2px;
  }
  .reward-claim-btn {
    padding: 0.8rem 2rem;
    font-size: 1rem;
  }
  .reward-glow {
    width: 250px;
    height: 250px;
  }
}
</style>
