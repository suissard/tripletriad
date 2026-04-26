<template>
  <div 
    class="arched-fan-container" 
    :style="containerStyle"
  >
    <TransitionGroup :name="transitionName" tag="div" class="fan-wrapper">
      <div 
        v-for="(item, index) in items" 
        :key="item[itemKey] || index"
        class="fan-item-slot"
        :class="[
          itemClass,
          { 'is-selected': selectedIndex === index }
        ]"
        :style="{ 
          '--card-i': index + 1,
          '--cards': items.length,
          '--local-arc-size': arcSize,
          '--local-arc-radius': radius,
          '--local-arc-delta': hoverDelta,
          '--local-arc-center': arcCenter,
          '--local-arc-y': verticalOffset,
          ...getItemStyle(index)
        }"
        @click="handleItemClick(item, index)"
        @pointerdown="$emit('pointerdown', { event: $event, item, index })"
      >
        <slot :item="item" :index="index"></slot>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  itemKey: {
    type: String,
    default: 'id'
  },
  selectedIndex: {
    type: Number,
    default: null
  },
  // Reglage de la proximité entre les cartes (0.1 - 0.5)
  arcSize: {
    type: [Number, String],
    default: 0.15
  },
  // Courbure (ex: 60vh, 500px)
  radius: {
    type: String,
    default: '60vh'
  },
  // Écartement au survol (ex: 0.006)
  hoverDelta: {
    type: Number,
    default: 0.006
  },
  // Point central de l'arc (0.75 = 12h dans bcp de configs)
  arcCenter: {
    type: Number,
    default: 0.75
  },
  // Position verticale du centre du cercle (ex: 120%)
  verticalOffset: {
    type: String,
    default: '120%'
  },
  // Hauteur du conteneur
  height: {
    type: String,
    default: '220px'
  },
  transitionName: {
    type: String,
    default: 'fan-item'
  },
  itemClass: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['click', 'hover', 'pointerdown']);

const containerStyle = computed(() => ({
  height: props.height
}));

function handleItemClick(item, index) {
  emit('click', { item, index });
}

function getItemStyle(index) {
    // Add any specific logic if needed
    return {};
}
</script>

<style scoped>
.arched-fan-container {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
  touch-action: none;
}

.fan-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.fan-item-slot {
  /* Dynamic timing and easing */
  --trans-duration: 800ms;
  --trans-easing: linear(0, 0.01 0.8%, 0.038 1.6%, 0.154 3.4%, 0.781 9.7%, 1.01 12.5%, 1.089 13.8%, 1.153 15.2%, 1.195 16.6%, 1.219 18%, 1.224 19.7%, 1.208 21.6%, 1.172 23.6%, 1.057 28.6%, 1.007 31.2%, 0.969 34.1%, 0.951 37.1%, 0.953 40.9%, 0.998 50.4%, 1.011 56%, 0.998 74.7%, 1);
  
  position: absolute;
  user-select: none;
  cursor: pointer;

  /* Arched logic */
  --arc-shift: 0;
  --arc-step: calc(var(--local-arc-size) / (max(var(--cards) - 1, 1)));
  --arc-start: calc(var(--local-arc-center) - var(--local-arc-size) / 2);

  offset-path: circle(var(--local-arc-radius) at 50% var(--local-arc-y));
  offset-distance: calc(
    (var(--arc-start)
     + (var(--card-i) - 1) * var(--arc-step)
     + var(--arc-shift)
    ) * 100%
  );
  offset-rotate: auto;
  offset-anchor: 50% 50%;
  
  transition: all var(--trans-duration) var(--trans-easing);
  z-index: calc(100 + var(--card-i));
}

.fan-item-slot:hover {
  offset-anchor: 50% 40%; /* Simple lift effect */
  z-index: 1000 !important;
}

.fan-item-slot.is-selected {
  offset-anchor: 50% 35%; /* Higher lift when selected */
  z-index: 1100 !important;
  filter: brightness(1.1);
}

/* Hover Spread Logic */
.fan-item-slot:hover + .fan-item-slot {
  --arc-shift: calc(var(--local-arc-delta) * 3);
}
.fan-item-slot:hover + .fan-item-slot + .fan-item-slot {
  --arc-shift: calc(var(--local-arc-delta) * 2);
}
.fan-item-slot:hover + .fan-item-slot + .fan-item-slot + .fan-item-slot {
  --arc-shift: calc(var(--local-arc-delta) * 1);
}

.fan-item-slot:has(+ .fan-item-slot:hover) {
  --arc-shift: calc(var(--local-arc-delta) * -3);
}
.fan-item-slot:has(+ .fan-item-slot + .fan-item-slot:hover) {
  --arc-shift: calc(var(--local-arc-delta) * -2);
}
.fan-item-slot:has(+ .fan-item-slot + .fan-item-slot + .fan-item-slot:hover) {
  --arc-shift: calc(var(--local-arc-delta) * -1);
}

/* Transitions */
.fan-item-enter-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fan-item-leave-active {
  transition: all 0.3s ease-in;
  position: absolute;
}
.fan-item-enter-from {
  opacity: 0;
  transform: scale(0.5) translateY(50px);
}
.fan-item-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-30px);
}
.fan-item-move {
  transition: all 0.5s var(--trans-easing);
}
</style>
