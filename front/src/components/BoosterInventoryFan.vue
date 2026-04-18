<template>
  <div class="booster-inventory-fan-container w-full py-12 px-4 relative flex justify-center items-end min-h-[350px] overflow-visible">
    <div class="fan-wrapper relative w-full max-w-2xl h-64 flex justify-center items-end">
      <div 
        v-for="(booster, index) in flattenedBoosters" 
        :key="index"
        class="booster-fan-item absolute cursor-pointer transition-all duration-500 ease-out"
        :style="getBoosterStyle(index, flattenedBoosters.length)"
        @click="$emit('open', booster)"
      >
        <BoosterCard
          :name="getCollectionName(booster.collection)"
          :image="getBoosterImage(booster.collection)"
          :isPremium="booster.isPremium"
          :quantity="booster.quantity"
          size="md"
        />
        
        <!-- Tooltip on hover -->
        <div class="absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/80 text-white text-[10px] px-2 py-1 rounded uppercase tracking-widest font-bold pointer-events-none z-[100]">
          {{ getCollectionName(booster.collection) }} {{ booster.isPremium ? '(PREMIUM)' : '' }}
        </div>
      </div>
    </div>
    
    <div v-if="flattenedBoosters.length === 0" class="empty-inventory text-white/30 italic flex flex-col items-center gap-2">
      <div class="text-4xl">📭</div>
      <p>Aucun booster en inventaire</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '../stores/userStore';
import BoosterCard from './BoosterCard.vue';

const props = defineProps({
  boosters: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['open']);
const userStore = useUserStore();

// Group boosters by collection and type for the fan
const flattenedBoosters = computed(() => {
  return props.boosters.filter(b => b.quantity > 0);
});

const getCollectionName = (code) => {
  const coll = userStore.collections.find(c => c.code === code);
  return coll?.name || code;
};

const getBoosterImage = (code) => {
  const coll = userStore.collections.find(c => c.code === code);
  return coll?.boosterImage || null;
};

const getBoosterStyle = (index, total) => {
  if (total === 0) return {};
  
  // Angle distribution
  const maxAngle = Math.min(70, (total - 1) * 12);
  const angleStep = total > 1 ? maxAngle / (total - 1) : 0;
  const startAngle = -maxAngle / 2;
  const angle = startAngle + index * angleStep;
  
  // Arc calculation (y-offset)
  const radius = 500;
  const rad = (angle * Math.PI) / 180;
  const ty = radius - radius * Math.cos(rad);
  const tx = radius * Math.sin(rad);

  return {
    transform: `translateX(${tx}px) translateY(${ty}px) rotate(${angle}deg)`,
    zIndex: 10 + index,
    transformOrigin: 'bottom center'
  };
};
</script>

<style scoped>
.booster-fan-item {
  will-change: transform;
}

.booster-fan-item:hover {
  z-index: 500 !important;
}

.empty-inventory {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
