<template>
  <AppCard 
    class="mini-deck" 
    :class="{ 'compact': compact, 'selectable': selectable }" 
    :padding="false"
    @click="$emit('click', deck)"
  >
    <div class="deck-background" :class="{ 'placeholder': !deck.cover || !getCardById(deck.cover) }">
      <img 
        :src="deck.cover && getCardById(deck.cover) ? (getCardById(deck.cover).imageUrl || getCardById(deck.cover).img || `https://api.dicebear.com/9.x/bottts/svg?seed=${deck.cover}&backgroundColor=transparent`) : `https://api.dicebear.com/9.x/bottts/svg?seed=${deck.name}&backgroundColor=transparent`" 
        class="bg-img" 
      />
      <div class="glass-overlay"></div>
    </div>

    <!-- Main Content Area -->
    <div v-if="!compact" class="deck-content p-6">
      <div class="deck-header">
        <h3 class="deck-title">{{ deck.name }}</h3>
        <div class="deck-meta">
          <span class="card-count">{{ deck.cards.length }} / 15 CARTES</span>
          <span v-if="deck.cards.length === 15" class="status-badge complete">COMPLET</span>
          <span v-else class="status-badge incomplete">INCOMPLET</span>
        </div>
      </div>

      <!-- Preview Row -->
      <div class="card-previews no-scrollbar">
        <img v-for="cardId in deck.cards.slice(0, 6)" :key="cardId" 
          :src="getCardById(cardId)?.imageUrl || getCardById(cardId)?.img || `https://api.dicebear.com/9.x/bottts/svg?seed=${cardId}&backgroundColor=transparent`"
          class="preview-thumb" />
        <span v-if="deck.cards.length > 6" class="more-count">+{{ deck.cards.length - 6 }}</span>
      </div>
    </div>
    
    <!-- Compact Content Area -->
    <div v-else class="deck-content-compact p-4">
      <h3 class="deck-title-mini">{{ deck.name }}</h3>
      <div class="deck-meta-mini">
        <span class="card-count-mini">{{ deck.cards.length }} CARTES</span>
        <span v-if="deck.cards.length === 15" class="check-mini">✓</span>
      </div>
    </div>

    <!-- Actions Overlay (Top-Right) -->
    <div v-if="$slots.actions" class="deck-actions-layer">
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
    default: true
  }
});

defineEmits(['click']);
</script>

<style scoped>
.mini-deck {
  position: relative;
  min-height: 240px; /* Slightly taller for more gap */
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  overflow: hidden;
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.mini-deck.compact {
  min-height: 140px;
}

/* Ensure AppCard's internal content fills the height */
.mini-deck :deep(.card-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mini-deck:hover {
  transform: translateY(-8px) scale(1.02);
  border-color: rgba(0, 210, 255, 0.5);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 210, 255, 0.2);
}

/* Background Layer */
.deck-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center; /* Align to see the top of the card */
  filter: brightness(0.4) saturate(1.2) blur(1px);
  transition: all 0.8s ease;
  transform: scale(1.05);
}

.mini-deck:hover .bg-img {
  filter: brightness(0.6) saturate(1.5) blur(0px);
  transform: scale(1.15);
}

.fallback-overlay {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(30, 30, 50, 0.8), rgba(15, 15, 25, 0.9));
  display: flex;
  align-items: center;
  justify-content: center;
}

.fallback-logo {
  width: 120px;
  height: 120px;
  opacity: 0.15;
  filter: grayscale(1);
}

.glass-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, 
    rgba(0, 0, 0, 0.4) 0%, 
    transparent 40%, 
    rgba(0, 0, 0, 0.8) 100%
  );
  z-index: 1;
}

/* Content Area */
.deck-content {
  position: relative;
  z-index: 10;
  flex: 1; /* Take all available space */
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* Align header top, previews bottom */
  pointer-events: none;
}

.deck-header {
  padding-top: 4px;
}

.deck-title {
  font-size: 1.8rem;
  font-weight: 900;
  color: white;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 4px 15px rgba(0, 0, 0, 1), 0 0 30px rgba(0, 0, 0, 0.5);
  line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deck-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.card-count {
  font-size: 0.75rem;
  font-weight: 800;
  color: rgba(0, 210, 255, 1);
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.status-badge {
  font-size: 0.65rem;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  letter-spacing: 1px;
}

.status-badge.complete {
  color: #00ffaa;
  border-color: rgba(0, 255, 170, 0.3);
  text-shadow: 0 0 10px rgba(0, 255, 170, 0.5);
}

.status-badge.incomplete {
  color: #ffaa00;
  border-color: rgba(255, 170, 0, 0.3);
}

.card-previews {
  display: flex;
  gap: 8px;
  align-items: center;
  overflow-x: auto;
  padding-bottom: 2px;
  margin-top: auto; /* Push to bottom */
  margin-right: 72px; /* Space for the larger delete button */
}

.preview-thumb {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  object-fit: cover;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.preview-thumb:hover {
  transform: translateY(-6px) scale(1.15);
  border-color: white;
  z-index: 2;
  box-shadow: 0 8px 25px rgba(0, 210, 255, 0.4);
}

.more-count {
  font-size: 0.85rem;
  font-weight: 900;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  margin-left: 4px;
}

/* Compact Content */
.deck-content-compact {
  position: relative;
  z-index: 10;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.deck-title-mini {
  font-size: 1.2rem;
  font-weight: 800;
  color: white;
  margin: 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  text-transform: uppercase;
}

.deck-meta-mini {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.card-count-mini {
  font-size: 0.65rem;
  font-weight: 800;
  color: rgba(0, 210, 255, 1);
}

.check-mini {
  color: #00ffaa;
  font-weight: 900;
  font-size: 1.2rem;
  text-shadow: 0 0 10px rgba(0, 255, 170, 0.5);
}

/* Actions Overlay (Glass Icon Buttons) */
.deck-actions-layer {
  position: absolute;
  bottom: 18px;
  right: 18px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Utility */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
