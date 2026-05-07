<template>
  <component :is="layoutComponent">
    <slot />
  </component>
</template>

<script setup>
import { computed } from 'vue';
import { useLayoutStore } from '../stores/layoutStore';

const layoutStore = useLayoutStore();

const layoutFiles = import.meta.glob('../layouts/*.vue', { eager: true });
const layouts = Object.entries(layoutFiles).reduce((acc, [path, module]) => {
  const name = path.split('/').pop().replace('.vue', '');
  if (name !== 'AppLayout') {
    acc[name] = module.default;
  }
  return acc;
}, {});

const layoutComponent = computed(() => {
  return layouts[layoutStore.currentLayout] || layouts['PlayerLayout'] || Object.values(layouts)[0];
});
</script>
