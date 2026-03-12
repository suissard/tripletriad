<template>
  <div class="element-icon-container" :class="{ 'is-active': active }" v-html="svgContent"></div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  element: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  }
});

const svgContent = ref('');

const loadSvg = async (elementName) => {
  try {
    const response = await fetch(`/elements/${elementName}.svg`);
    if (response.ok) {
      svgContent.value = await response.text();
    } else {
      console.error(`Failed to load SVG for element: ${elementName}`);
      svgContent.value = '';
    }
  } catch (error) {
    console.error(`Error loading SVG for element: ${elementName}`, error);
    svgContent.value = '';
  }
};

onMounted(() => {
  loadSvg(props.element);
});

watch(() => props.element, (newElement) => {
  loadSvg(newElement);
});
</script>

<style scoped>
.element-icon-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* Make sure it scales correctly within the parent container */
  width: 100%;
  height: 100%;
}
.element-icon-container :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
