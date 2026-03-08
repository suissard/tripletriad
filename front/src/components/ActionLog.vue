<template>
  <div class="action-log-container" v-if="state.gameState === 'playing' || state.gameState === 'gameover'">
    <div class="log-title">Historique</div>
    <div class="log-list">
      <transition-group name="list" tag="div">
        <div class="log-item" v-for="(log, index) in reversedLog" :key="index + '-' + log.playedCard.id">
          <div class="played-card">
             <img :src="log.playedCard.img" class="card-thumb" :class="log.owner" />
          </div>
          <div class="arrow">➔</div>
          <div class="captured-cards" v-if="log.capturedCards.length > 0">
             <img v-for="(cap, i) in log.capturedCards" :key="i" :src="cap.img" class="card-thumb cap" :class="log.owner" />
          </div>
          <div class="captured-cards empty" v-else>
             ∅
          </div>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { state } from '../game/state.js';

const reversedLog = computed(() => {
    return [...state.actionLog].reverse();
});
</script>

<style scoped>
.action-log-container {
  width: 100%;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 10px;
  color: white;
  z-index: 20;
  max-height: 50vh;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  overflow: hidden;
}

.log-title {
  text-align: center;
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  color: #ccc;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  flex: 1;
}

.log-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.05);
  padding: 5px;
  border-radius: 8px;
}

.arrow {
  font-size: 0.8rem;
  color: #888;
  margin: 0 5px;
}

.card-thumb {
  width: 30px;
  height: 30px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid transparent;
}

.card-thumb.player {
  border-color: #00d2ff;
  box-shadow: 0 0 5px rgba(0, 210, 255, 0.5);
}

.card-thumb.ai {
  border-color: #ff0055;
  box-shadow: 0 0 5px rgba(255, 0, 85, 0.5);
}

.captured-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  flex: 1;
  justify-content: flex-end;
}

.captured-cards.empty {
  font-size: 1rem;
  color: #555;
  justify-content: center;
}

/* Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
