<template>
  <div class="score-panel">
      <div class="score-label">{{ label }}</div>
      <div class="score" :style="{ color: color }">{{ score }}</div>
  </div>
</template>

<script setup>
defineProps({
  label: String,
  score: Number,
  color: String
});
</script>

<style scoped>
.score-panel { display: flex; flex-direction: column; align-items: center; }
.score-label { font-size: 1rem; color: #888; text-transform: uppercase; letter-spacing: 2px; }
.score { font-size: 3.5rem; font-weight: bold; text-shadow: 0 0 15px rgba(0,0,0,0.8); line-height: 1; }
</style>
