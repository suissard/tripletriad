<template>
  <div 
    v-if="show" 
    class="app-badge" 
    :class="[
      variant, 
      size,
      { 
        'is-bouncing': bounce,
        'is-pulsating': pulsate,
        'has-shadow': shadow
      }
    ]"
  >
    <div class="badge-content">
      <slot>{{ content }}</slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  content: { type: [String, Number], default: '' },
  variant: { type: String, default: 'primary' }, // primary, secondary, danger, success, warning, info
  size: { type: String, default: 'md' },        // xs, sm, md, lg
  bounce: { type: Boolean, default: false },
  pulsate: { type: Boolean, default: false },
  show: { type: Boolean, default: true },
  shadow: { type: Boolean, default: true }
});
</script>

<style scoped>
.app-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-weight: 800;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  user-select: none;
  box-sizing: border-box;
}

/* --- Sizes --- */
.xs { font-size: 0.6rem; padding: 1px 5px; min-width: 16px; height: 16px; }
.sm { font-size: 0.75rem; padding: 2px 8px; min-width: 20px; height: 20px; }
.md { font-size: 0.9rem; padding: 4px 12px; min-width: 28px; height: 28px; }
.lg { font-size: 1.1rem; padding: 6px 16px; min-width: 36px; height: 36px; }

/* --- Variants --- */
.primary {
  background: color-mix(in srgb, var(--color-primary, #ffbf00) 85%, black);
  color: white;
  border-color: rgba(255, 255, 255, 0.4);
}
.secondary {
  background: color-mix(in srgb, var(--color-secondary, #3c5096) 30%, rgba(60, 60, 80, 0.8));
  color: white;
  border-color: rgba(255, 255, 255, 0.1);
}
.danger {
  background: linear-gradient(135deg, #ff0055, #cc0044);
  color: white;
  border-color: rgba(255, 100, 150, 0.5);
}
.success {
  background: linear-gradient(135deg, #00ffaa, #00cc88);
  color: #004d33;
  border-color: rgba(255, 255, 255, 0.5);
}
.warning {
  background: linear-gradient(135deg, #ffcc00, #ffaa00);
  color: #4d3300;
  border-color: rgba(255, 255, 255, 0.5);
}
.info {
  background: linear-gradient(135deg, #00d2ff, #3a7bd5);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

/* --- Animations --- */
.is-bouncing {
  animation: badge-bounce 3s infinite cubic-bezier(0.28, 0.84, 0.42, 1);
}

@keyframes badge-bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-12px); }
  60% { transform: translateY(-6px); }
}

.is-pulsating {
  animation: badge-pulse 2s infinite ease-in-out;
}

@keyframes badge-pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}

.has-shadow {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}

.badge-content {
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
</style>
