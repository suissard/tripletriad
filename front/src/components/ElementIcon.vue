<template>
  <div 
    class="element-icon-container" 
    :class="{ 'is-active': active }" 
    v-html="processedSvg"
    :title="element"
  ></div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';

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
const loadError = ref(false);

const loadSvg = async (elementName) => {
  if (!elementName) return;
  loadError.value = false;
  try {
    const response = await fetch(`/elements/${elementName.toLowerCase()}.svg`);
    if (response.ok) {
      svgContent.value = await response.text();
    } else {
      console.warn(`Failed to load SVG for element: ${elementName}`);
      svgContent.value = '';
      loadError.value = true;
    }
  } catch (error) {
    console.error(`Error loading SVG for element: ${elementName}`, error);
    svgContent.value = '';
    loadError.value = true;
  }
};

const processedSvg = computed(() => {
  if (loadError.value) {
    return `<div style="color: red; font-size: 0.5em;">!</div>`;
  }
  if (!svgContent.value) return '';

  // Ensure is-active is on the SVG element itself for better internal style matching
  let content = svgContent.value;
  if (props.active) {
    if (content.includes('<svg')) {
      // Add or append to class attribute
      content = content.replace(/<svg([^>]*)>/, (match, p1) => {
        if (p1.includes('class="')) {
          return match.replace('class="', 'class="is-active ');
        }
        return `<svg class="is-active" ${p1}>`;
      });
    }
  }
  return content;
});

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
