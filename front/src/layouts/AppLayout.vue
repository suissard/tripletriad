<template>
  <component :is="layoutComponent">
    <slot />
  </component>
</template>

<script setup>
import { computed } from 'vue';
import { useLayoutStore } from '../stores/layoutStore';
import PlayerLayout from './PlayerLayout.vue';
import AdminLayout from './AdminLayout.vue';
import BlankLayout from './BlankLayout.vue';

const layoutStore = useLayoutStore();

const layouts = {
  PlayerLayout,
  AdminLayout,
  BlankLayout
};

const layoutComponent = computed(() => {
  return layouts[layoutStore.currentLayout] || PlayerLayout;
});
</script>
