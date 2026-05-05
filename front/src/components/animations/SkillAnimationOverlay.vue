<template>
  <div class="mutation-container">
    <div 
      v-for="p in particles" 
      :key="p.id"
      class="particle active"
      :style="p.style"
    ></div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  duration: { type: Number, default: 1.5 },
  particleCount: { type: Number, default: 100 },
  minSize: { type: Number, default: 8 },
  maxSize: { type: Number, default: 20 },
  travelDistance: { type: Number, default: 60 },
  colors: { type: Array, default: () => ['#8b5cf6', '#10b981', '#34d399', '#c084fc', '#ec4899'] }
});

const particles = ref([]);
let nextId = 0;
let isAnimating = false;

function trigger(type = 'grow') {
  if (isAnimating) return;
  isAnimating = true;

  const totalDuration = props.duration * 1000;
  
  function easeInQuad(t) { return t * t; }

  const currentColors = type === 'decrease' 
    ? ['#4a5568', '#718096', '#2d3748', '#1a202c', '#4a4a4a'] 
    : props.colors;

  for (let i = 0; i < props.particleCount; i++) {
    const progressLinear = i / props.particleCount;
    const delayPercentage = 1 - easeInQuad(1 - progressLinear);
    const delay = delayPercentage * totalDuration;
    
    setTimeout(() => {
      // For grow: 1 -> 3.5
      // For decrease: 3.5 -> 1
      const sizeMultiplier = type === 'decrease'
        ? 3.5 - (delay / totalDuration) * 2.5
        : 1 + (delay / totalDuration) * 2.5;

      spawnParticle(sizeMultiplier, props.travelDistance, currentColors);
    }, delay);
  }

  const clearTime = totalDuration + (totalDuration * 0.33) + 100;
  
  setTimeout(() => {
    particles.value = [];
    isAnimating = false;
  }, clearTime);
}

function spawnParticle(sizeMultiplier, travelDistance, colorsList) {
  const originX = Math.random() * 100;
  const originY = Math.random() * 100;
  
  const angle = Math.random() * Math.PI * 2;
  const tx = Math.cos(angle) * (travelDistance * Math.random());
  const ty = Math.sin(angle) * (travelDistance * Math.random());
  
  const color = colorsList[Math.floor(Math.random() * colorsList.length)];
  
  const sizeRatio = Math.random();
  const approxSize = (props.minSize + (props.maxSize - props.minSize) * sizeRatio) * sizeMultiplier;
  
  const animDuration = props.duration * 0.33;

  particles.value.push({
    id: nextId++,
    style: {
      background: color,
      boxShadow: `0 0 ${approxSize/2}px ${color}`,
      left: `${originX}%`,
      top: `${originY}%`,
      '--tx': `${tx}px`,
      '--ty': `${ty}px`,
      '--size-ratio': sizeRatio,
      '--multiplier': sizeMultiplier,
      '--min-size': `${props.minSize}px`,
      '--max-size': `${props.maxSize}px`,
      '--anim-duration': `${animDuration}s`
    }
  });
}

defineExpose({ trigger });
</script>

<style scoped>
.mutation-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
  overflow: hidden;
  border-radius: inherit;
}

.particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0;
  mix-blend-mode: screen;
  filter: blur(1px);
  width: calc(var(--min-size) + (var(--max-size) - var(--min-size)) * var(--size-ratio) * var(--multiplier));
  height: calc(var(--min-size) + (var(--max-size) - var(--min-size)) * var(--size-ratio) * var(--multiplier));
  transform: translate(-50%, -50%);
}

.particle.active {
  animation: pulse-particle var(--anim-duration) ease-in-out forwards;
}

@keyframes pulse-particle {
  0% { 
    transform: translate(-50%, -50%) scale(0.1); 
    opacity: 0; 
  }
  50% { 
    opacity: 1; 
    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1);
  }
  100% { 
    transform: translate(calc(-50% + var(--tx) * 1.1), calc(-50% + var(--ty) * 1.1)) scale(0); 
    opacity: 0; 
  }
}
</style>
