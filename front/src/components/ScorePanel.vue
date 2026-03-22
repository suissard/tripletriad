<template>
  <div class="score-panel">
    <div class="label" :style="{ color }">{{ label }}</div>

    <div class="bars">
      <!-- Health Bar -->
      <div class="bar-container hp-bar-container">
        <div class="bar-icon">❤️</div>
        <div class="bar-bg">
          <div class="bar-fill hp" :style="{ width: hpPercent + '%', backgroundColor: '#e74c3c' }"></div>
        </div>
        <div class="bar-text">{{ health }} / 20</div>
      </div>

      <!-- Mana Bar -->
      <div class="bar-container mana-bar-container">
        <div class="bar-icon">🔮</div>
        <div class="bar-bg">
          <div class="bar-fill mana" :style="{ width: manaPercent + '%', backgroundColor: '#3498db' }"></div>
        </div>
        <div class="bar-text">{{ mana }} / {{ maxMana }}</div>
      </div>

      <!-- Deck Count -->
      <div class="bar-container deck-count-container" v-if="deckCount !== undefined">
        <div class="bar-icon">🃏</div>
        <div class="deck-label">Cartes restantes</div>
        <div class="bar-text">{{ deckCount }}</div>
      </div>
    </div>

    <div class="score">{{ score }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: String,
  score: Number,
  color: String,
  health: { type: Number, default: 20 },
  mana: { type: Number, default: 1 },
  maxMana: { type: Number, default: 1 },
  deckCount: Number
});

const hpPercent = computed(() => {
  return Math.max(0, (props.health / 20) * 100);
});

const manaPercent = computed(() => {
  if (props.maxMana === 0) return 0;
  return Math.max(0, (props.mana / props.maxMana) * 100);
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
  min-width: 250px;
}
.label {
  font-size: 1rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 10px;
  text-align: center;
}
.score {
  font-size: 2rem;
  font-weight: bold;
  color: white;
  text-align: center;
  margin-top: 10px;
  text-shadow: 0 0 10px v-bind(color);
}
.bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bar-container {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bar-icon {
  font-size: 1.2rem;
  width: 25px;
  text-align: center;
}
.bar-bg {
  flex: 1;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.bar-fill {
  height: 100%;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.bar-text {
  font-size: 0.8rem;
  color: #fff;
  font-weight: bold;
  width: 45px;
  text-align: right;
}
.deck-label {
  flex: 1;
  font-size: 0.75rem;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 1px;
}
</style>
