<template>
  <div class="fps-counter" :class="statusClass">
    <span class="fps-value">{{ Math.round(fps) }}</span>
    <span class="fps-label">FPS</span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const fps = ref(0);
const frameCount = ref(0);
const lastTime = ref(performance.now());
const statusClass = computed(() => {
  if (fps.value >= 55) return 'fps-good';
  if (fps.value >= 30) return 'fps-warning';
  return 'fps-critical';
});

let rafId = null;

const update = () => {
  const now = performance.now();
  frameCount.value++;

  if (now >= lastTime.value + 1000) {
    fps.value = (frameCount.value * 1000) / (now - lastTime.value);
    frameCount.value = 0;
    lastTime.value = now;
  }

  rafId = requestAnimationFrame(update);
};

onMounted(() => {
  rafId = requestAnimationFrame(update);
});

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
});
</script>

<style scoped>
.fps-counter {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 9999;
  padding: 4px 10px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: baseline;
  gap: 4px;
  pointer-events: none;
  user-select: none;
  
  /* Glassmorphism */
  background: color-mix(in srgb, var(--bg-surface, #000) 60%, transparent);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: color 0.3s ease, border-color 0.3s ease;
}

.fps-value {
  font-size: 14px;
}

.fps-label {
  opacity: 0.7;
  font-size: 9px;
}

.fps-good {
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.3);
}

.fps-warning {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.3);
}

.fps-critical {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}
</style>
