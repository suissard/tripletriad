<template>
  <button
    class="btn"
    :class="[
      variantClass,
      { 'glass-panel': glass, 'w-full': fullWidth }
    ]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot></slot>
  </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'secondary', // primary, secondary, accent, ghost
  },
  glass: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  fullWidth: {
    type: Boolean,
    default: false,
  }
});

defineEmits(['click']);

const variantClass = computed(() => {
  if (props.variant === 'primary') return 'btn-primary';
  if (props.variant === 'accent') return 'btn-accent';
  if (props.variant === 'secondary') return 'btn-secondary';
  if (props.variant === 'ghost') return 'btn-ghost';
  return ''; // default / none
});
</script>

<style scoped>
/* Inherits from global styles in style.css (.btn, .btn-primary, .glass-panel, etc.) */
.btn-ghost {
  background: transparent;
  border: 1px solid transparent;
  color: inherit;
  box-shadow: none;
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
