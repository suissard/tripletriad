<template>
  <AppCard 
    class="mini-deck" 
    :class="{ 'compact': compact, 'selectable': selectable }" 
    :padding="false"
    @click="$emit('click', deck)"
  >
    <div class="deck-cover">
      <img v-if="deck.cover && getCardById(deck.cover)" :src="getCardById(deck.cover).imageUrl || getCardById(deck.cover).img" class="cover-img" />
      <div v-else class="cover-placeholder">
        <AnimatedCardBack type="recto" class="fallback-icon" />
      </div>
      <div v-if="compact" class="compact-overlay">
        <div class="deck-name">{{ deck.name }}</div>
      </div>
    </div>

    <div v-if="!compact" class="deck-body">
      <h3 class="deck-name">{{ deck.name }}</h3>
      <div class="deck-stats">
        <span class="card-count">{{ deck.cards.length }} / 15 cartes</span>
        <span v-if="deck.cards.length === 15" class="complete-badge">✓ Complet</span>
        <span v-else class="incomplete-badge">Incomplet</span>
      </div>

      <!-- Mini card preview -->
      <div class="card-preview-row">
        <img v-for="cardId in deck.cards.slice(0, 5)" :key="cardId" :src="getCardById(cardId)?.imageUrl || getCardById(cardId)?.img"
          class="preview-thumb" />
        <span v-if="deck.cards.length > 5" class="more-cards">+{{ deck.cards.length - 5 }}</span>
      </div>
    </div>
    
    <div v-else class="deck-info-compact">
        <span class="card-count">{{ deck.cards.length }} cartes</span>
        <span v-if="deck.cards.length === 15" class="complete-badge-mini">✓</span>
    </div>

    <div v-if="$slots.actions" class="deck-actions flex gap-2 p-2">
      <slot name="actions"></slot>
    </div>
  </AppCard>
</template>

<script setup>
import { getCardById } from '../game/state.js';
import AppCard from './ui/AppCard.vue';
import AnimatedCardBack from './AnimatedCardBack.vue';

const props = defineProps({
  deck: {
    type: Object,
    required: true
  },
  compact: {
    type: Boolean,
    default: false
  },
  selectable: {
    type: Boolean,
    default: false
  }
});

defineEmits(['click']);
</script>

<style scoped>
.mini-deck {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
}

.mini-deck.selectable {
  cursor: pointer;
}

.mini-deck.selectable:hover {
  border-color: rgba(0, 210, 255, 0.5);
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 15px rgba(0, 210, 255, 0.2);
}

.deck-cover {
  height: 120px;
  background: linear-gradient(135deg, rgba(255, 0, 85, 0.1), rgba(0, 210, 255, 0.05));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.compact .deck-cover {
  height: 100px;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.8);
  transition: filter 0.3s;
}

.mini-deck.selectable:hover .cover-img {
  filter: brightness(1);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
}

.fallback-icon {
  width: 80px;
  height: 80px;
  opacity: 0.6;
}

.compact .fallback-icon {
  width: 60px;
  height: 60px;
}

.deck-body {
  padding: 20px;
  flex: 1;
}

.deck-name {
  margin: 0 0 8px 0;
  font-size: 1.3rem;
  color: white;
  letter-spacing: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compact-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: 10px;
  display: flex;
  align-items: flex-end;
}

.compact-overlay .deck-name {
  margin-bottom: 0;
  font-size: 1rem;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.deck-stats {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.card-count {
  font-size: 0.9rem;
  color: #888;
}

.complete-badge {
  background: rgba(0, 255, 136, 0.15);
  color: #00ff88;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(0, 255, 136, 0.5);
}

.complete-badge-mini {
  color: #00ff88;
  font-weight: bold;
}

.incomplete-badge {
  background: rgba(255, 200, 0, 0.15);
  color: #ffc800;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
}

.card-preview-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.preview-thumb {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  object-fit: cover;
}

.more-cards {
  font-size: 0.8rem;
  color: #666;
  margin-left: 4px;
}

.deck-info-compact {
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
}

.deck-info-compact .card-count {
  font-size: 0.8rem;
  color: #00d2ff;
}
</style>
