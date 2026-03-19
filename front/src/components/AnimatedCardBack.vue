<template>
  <div class="logo-container">
    <img :src="svgPath" class="animated-card-svg" :alt="type === 'recto' ? 'Card Front' : 'Card Back'" />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: {
    type: String,
    default: 'verso', // 'recto' or 'verso'
    validator: (val) => ['recto', 'verso'].includes(val)
  }
});

const svgPath = computed(() => {
  return props.type === 'recto' ? '/card-animated-recto.svg' : '/card-animated-verso.svg';
});
</script>

<style scoped>
.logo-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #050505;
    overflow: hidden;
    border-radius: 6px;
}

.animated-card-svg {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
</style>
