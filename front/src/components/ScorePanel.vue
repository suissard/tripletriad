<template>
  <div class="score-panel">
    <div class="label" :style="{ color }">{{ label }}</div>
    <div class="score">{{ score }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: String,
  score: Number,
  color: String
});
</script>

<style scoped>
.score-panel {
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 20px;
  border-radius: 10px;
  border: 2px solid;
  border-color: v-bind(color);
  box-shadow: 0 0 15px v-bind(color);
  backdrop-filter: blur(5px);
  pointer-events: auto;
  min-width: 150px;
}
.label {
  font-size: 1rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 5px;
  text-align: center;
}
.score {
  font-size: 2.5rem;
  font-weight: bold;
  color: white;
  text-align: center;
  text-shadow: 0 0 10px v-bind(color);
}
</style>
