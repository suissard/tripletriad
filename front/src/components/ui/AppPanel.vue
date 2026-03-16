<template>
  <div class="glass-panel rounded-2xl" :class="[variantClass, { 'p-6': padding, 'p-0': !padding }]">
    <div v-if="$slots.header" class="panel-header pb-4 mb-4 border-b border-white/10">
      <slot name="header"></slot>
    </div>
    <div class="panel-content">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="panel-footer mt-4 pt-4 border-t border-white/10">
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
/* Inherits from global styles in style.css (.glass-panel, etc.) */
.panel-header, .panel-footer {
  display: flex;
  align-items: center;
}
</style>
