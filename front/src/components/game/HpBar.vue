<template>
  <div class="hp-bar-container">
    <div
      v-for="i in maxHp"
      :key="i"
      class="hp-segment"
      :class="{
        'is-active': i <= currentHp,
        'is-player1': owner === 'PLAYER_1' || owner === 'player',
        'is-player2': owner === 'PLAYER_2' || owner === 'ai'
      }"
    ></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  hp: {
    type: Number,
    required: true
  },
  defaultHp: {
    type: Number,
    default: 3
  },
  owner: {
    type: String,
    default: 'neutral'
  }
});

const currentHp = computed(() => Math.max(0, props.hp));
const maxHp = computed(() => Math.max(props.defaultHp, currentHp.value));

</script>

<style scoped>
.hp-bar-container {
  position: absolute;
  bottom: 8px; /* Slightly higher than default to clear stats */
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2px;
  z-index: 10;
  width: 80%;
  height: 6px;
  pointer-events: none;
}

.hp-segment {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(0, 0, 0, 0.8);
  border-radius: 2px;
  transition: all 0.3s ease;
}

.hp-segment.is-active {
  background-color: #ccc;
  box-shadow: 0 0 2px rgba(0,0,0,0.5);
}

.hp-segment.is-active.is-player1 {
  background-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 4px var(--color-primary, #3b82f6);
}

.hp-segment.is-active.is-player2 {
  background-color: var(--color-secondary, #ef4444);
  box-shadow: 0 0 4px var(--color-secondary, #ef4444);
}
</style>
