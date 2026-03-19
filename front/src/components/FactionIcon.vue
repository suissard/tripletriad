<template>
  <div class="faction-icon" v-if="mappedElement">
    <ElementIcon :element="mappedElement" :active="true" />
  </div>
  <div class="faction-icon" v-else-if="svgContent" v-html="svgContent"></div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { factions } from '../data/factions';
import ElementIcon from './ElementIcon.vue';

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const svgContent = ref('');

const mappedElement = computed(() => {
  const faction = factions.find(f => f.id === props.id);
  return faction ? faction.element : null;
});

async function loadSvg() {
  if (!props.id || mappedElement.value) return;
  try {
    const response = await fetch(`/icons/factions/${props.id}.svg`);
    if (response.ok) {
      svgContent.value = await response.text();
    }
  } catch (error) {
    console.error('Error loading faction icon:', error);
  }
}

watch(() => props.id, loadSvg);
onMounted(loadSvg);
</script>

<style scoped>
.faction-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.faction-icon :deep(svg) {
  width: 100%;
  height: 100%;
  fill: currentColor;
}
</style>
