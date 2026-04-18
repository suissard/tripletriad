<template>
  <div 
    class="booster-card tt-card"
    :class="[
      isPremium ? 'is-premium rarity-legendary' : 'rarity-common'
    ]"
    :style="cardStyle"
  >
    <div class="tt-card-inner">
      <div class="tt-card-front">
        <!-- Shine effect (internal to component, clean) -->
        <div v-if="isPremium" class="premium-shine"></div>
        
        <!-- Booster Image -->
        <img v-if="image" :src="image" class="card-img" :alt="name" />
        <div v-else class="card-img-placeholder flex items-center justify-center text-5xl">
          {{ isPremium ? '💎' : '📦' }}
        </div>

        <!-- Collection Name Bar -->
        <div class="card-name-bar" :style="{'--glow-color': isPremium ? '#ffd700' : '#a0a0a0'}">
          {{ name }}
        </div>

        <!-- Premium Badge (Pastille) -->
        <div v-if="isPremium" class="premium-tag">PREMIUM</div>
      </div>
    </div>

    <!-- Quantity Badge -->
    <AppBadge 
      v-if="quantity > 1" 
      variant="danger" 
      class="quantity-badge"
    >
      ×{{ quantity }}
    </AppBadge>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import AppBadge from './ui/AppBadge.vue';

const props = defineProps({
  name: String,
  image: String,
  isPremium: Boolean,
  quantity: Number,
  size: { type: [String, Number], default: 'md' }
});

const SIZES = {
  sm: 100,
  md: 140,
  lg: 180
};

const cardStyle = computed(() => {
  const width = typeof props.size === 'number' ? props.size : (SIZES[props.size] || 140);
  return {
    width: `${width}px`,
    aspectRatio: '1 / 1.4', // Standard booster pack ratio
    '--card-border-width': '2px'
  };
});
</script>

<style scoped>
/* Reusing some logic from TripleTriadCard but adapted */
.booster-card {
  position: relative;
  border-radius: 12px;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.tt-card-inner {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: #1a1a2e;
  border: var(--card-border-width) solid #333;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 20px rgba(0,0,0,0.4);
}

.tt-card-front {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

.card-img-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #2a2a3a 0%, #1a1a2a 100%);
}

.card-name-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.9));
  color: white;
  font-size: 10px;
  font-weight: 800;
  padding: 20px 8px 6px;
  text-align: center;
  z-index: 3;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.card-name-bar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, var(--glow-color) 0%, transparent 100%);
  mix-blend-mode: screen;
  opacity: 0.4;
  z-index: -1;
}

.premium-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, 
    transparent 0%, 
    rgba(255,255,255,0) 40%, 
    rgba(255,255,255,0.2) 50%, 
    rgba(255,255,255,0) 60%, 
    transparent 100%);
  z-index: 5;
  background-size: 200% 200%;
  animation: shine-flow 4s infinite linear;
  pointer-events: none;
}

@keyframes shine-flow {
  0% { background-position: -200% -200%; }
  100% { background-position: 200% 200%; }
}

.premium-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ffd700;
  color: #000;
  font-size: 8px;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 10;
  box-shadow: 0 0 10px rgba(255,215,0,0.5);
}

.quantity-badge {
  position: absolute;
  top: -8px;
  left: -8px;
  z-index: 20;
}

/* Rarity-like borders */
.rarity-common .tt-card-inner { border-color: #555; }
.rarity-legendary .tt-card-inner { 
  border-color: #ffd700; 
  box-shadow: 0 0 15px rgba(255,215,0,0.3);
}

.booster-card:hover {
  transform: translateY(-10px) scale(1.05);
  z-index: 100;
}
</style>
