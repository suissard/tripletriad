<template>
  <div class="coin-base" :style="{ '--coin-color': color }">
    <svg viewBox="0 0 100 100" class="coin-svg" preserveAspectRatio="xMidYMid meet">
      <!-- Outer Glow/Shadow -->
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- Irregular Hexagon Shape (Main Body) -->
      <path 
        d="M 30 5 L 80 10 L 95 50 L 85 90 L 25 95 L 5 55 Z" 
        class="coin-body"
      />
      
      <!-- Inner detail/frame for depth -->
      <path 
        d="M 32 10 L 78 14 L 90 50 L 82 85 L 28 89 L 10 54 Z" 
        class="coin-inner-frame"
      />

      <!-- Tech/Scaveger Patterns -->
      <g class="patterns">
        <circle cx="50" cy="50" r="35" class="pattern-circle" />
        <path d="M 30 5 L 50 50 L 80 10" class="pattern-line" />
        <path d="M 25 95 L 50 50 L 85 90" class="pattern-line" />
        <path d="M 5 55 L 50 50 L 95 50" class="pattern-line" />
        
        <!-- Corner details -->
        <circle cx="30" cy="5" r="2" class="corner-dot" />
        <circle cx="80" cy="10" r="2" class="corner-dot" />
        <circle cx="95" cy="50" r="2" class="corner-dot" />
        <circle cx="85" cy="90" r="2" class="corner-dot" />
        <circle cx="25" cy="95" r="2" class="corner-dot" />
        <circle cx="5" cy="55" r="2" class="corner-dot" />
      </g>
    </svg>
    <div class="coin-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  color: {
    type: String,
    default: '#333'
  }
});
</script>

<style scoped>
.coin-base {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.coin-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.8));
}

.coin-body {
  fill: #111;
  stroke: var(--coin-color);
  stroke-width: 2.5;
  transition: stroke 0.3s ease;
}

.coin-inner-frame {
  fill: rgba(255, 255, 255, 0.02);
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 1;
}

.patterns {
  opacity: 0.6;
}

.pattern-circle {
  fill: none;
  stroke: rgba(255, 255, 255, 0.05);
  stroke-width: 0.8;
  stroke-dasharray: 5 3;
}

.pattern-line {
  fill: none;
  stroke: rgba(255, 255, 255, 0.04);
  stroke-width: 0.5;
}

.corner-dot {
  fill: var(--coin-color);
  opacity: 0.5;
}

.coin-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 55%;
  height: 55%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
}
</style>
