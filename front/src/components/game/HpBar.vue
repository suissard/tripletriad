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
  bottom: -7px; /* Positionné juste en dessous, collé à la carte */
  left: 0;
  right: 0;
  display: flex;
  gap: 1px;
  z-index: 10;
  height: 6px;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.hp-segment {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.6);
  border-radius: 1px;
  transition: all 0.3s ease;
}

.hp-segment.is-active {
  background-color: #ccc;
  box-shadow: 0 0 2px rgba(0,0,0,0.5);
}

/* Joueur 1 (Bleu/Cyan) - Actif et Inactif */
.hp-segment.is-player1 {
  border-color: color-mix(in srgb, var(--color-primary, #00d2ff) 50%, black);
  background-color: color-mix(in srgb, var(--color-primary, #00d2ff) 20%, transparent);
}
.hp-segment.is-active.is-player1 {
  background-color: var(--color-primary, #00d2ff);
  box-shadow: 0 0 4px var(--color-primary, #00d2ff);
}

/* Joueur 2 (Rouge/Pink / IA) - Actif et Inactif */
.hp-segment.is-player2 {
  border-color: color-mix(in srgb, var(--color-secondary, #ff0055) 50%, black);
  background-color: color-mix(in srgb, var(--color-secondary, #ff0055) 20%, transparent);
}
.hp-segment.is-active.is-player2 {
  background-color: var(--color-secondary, #ff0055);
  box-shadow: 0 0 4px var(--color-secondary, #ff0055);
}
</style>
