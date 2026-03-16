<template>
  <div class="glass-card" :class="[variantClass, { 'p-6': padding, 'p-0': !padding }]">
    <div v-if="$slots.header" class="card-header pb-4 mb-4 border-b border-white/10">
      <slot name="header"></slot>
    </div>
    <div class="card-content">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="card-footer mt-4 pt-4 border-t border-white/10">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  variant: {
    type: String,
    default: '', // primary, secondary, accent or none
  },
  padding: {
    type: Boolean,
    default: true,
  }
});

const variantClass = computed(() => {
  if (props.variant === 'primary') return 'primary';
  if (props.variant === 'secondary') return 'secondary';
  if (props.variant === 'accent') return 'accent';
  return '';
});
</script>

<style scoped>
/* Inherits from global styles in style.css (.glass-card, etc.) */
.card-header, .card-footer {
  display: flex;
  align-items: center;
}
</style>
