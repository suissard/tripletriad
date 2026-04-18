<template>
  <div class="booster-inventory-fan-container w-full py-12 px-4 relative flex justify-center items-end min-h-[300px] overflow-hidden">
    <div class="fan-wrapper relative w-full max-w-2xl h-64 flex justify-center items-end">
      <div 
        v-for="(booster, index) in flattenedBoosters" 
        :key="index"
        class="booster-fan-item absolute cursor-pointer transition-all duration-500 ease-out hover:z-50"
        :style="getBoosterStyle(index, flattenedBoosters.length)"
        @click="$emit('open', booster)"
      >
        <div class="booster-card relative group">
          <!-- Booster Visual -->
          <div 
            class="booster-inner w-32 h-44 rounded-xl border-2 overflow-hidden shadow-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-8"
            :class="booster.isPremium ? 'border-yellow-400 bg-gradient-to-br from-indigo-900 to-purple-900' : 'border-primary/50 bg-panel'"
          >
            <div class="booster-image-container w-full h-full flex flex-col items-center justify-center p-2 relative">
              <img v-if="getBoosterImage(booster.collection)" :src="getBoosterImage(booster.collection)" class="w-full h-full object-contain filter drop-shadow-md" />
              <div v-else class="text-6xl">{{ booster.isPremium ? '💎' : '📦' }}</div>
              
              <!-- Badge Quantity if > 1 (though we flatten, maybe keep it?) -->
              <!-- For the fan effect, it's often better to show individual packs if possible, 
                   but if they have 50 packs, it's too much. We'll show one per collection/type 
                   with a badge for quantity. -->
              <div class="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border border-white shadow-lg">
                {{ booster.quantity }}
              </div>
            </div>
            
            <!-- Premium Shine -->
            <div v-if="booster.isPremium" class="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-shine"></div>
          </div>
          
          <!-- Tooltip on hover -->
          <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/80 text-white text-[10px] px-2 py-1 rounded uppercase tracking-widest font-bold">
            {{ getCollectionName(booster.collection) }} {{ booster.isPremium ? '(PREMIUM)' : '' }}
          </div>
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

const props = defineProps({
  boosters: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['open']);
const userStore = useUserStore();

// Flatten boosters: keep them grouped by collection/type but show them in the fan
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
  const maxAngle = Math.min(60, (total - 1) * 15);
  const angleStep = total > 1 ? maxAngle / (total - 1) : 0;
  const startAngle = -maxAngle / 2;
  const angle = startAngle + index * angleStep;
  
  // Arc calculation (y-offset)
  const radius = 400;
  const rad = (angle * Math.PI) / 180;
  const ty = radius - radius * Math.cos(rad);
  const tx = radius * Math.sin(rad);

  return {
    transform: `translateX(${tx}px) translateY(${ty}px) rotate(${angle}deg)`,
    zIndex: index,
    transformOrigin: 'bottom center'
  };
};
</script>

<style scoped>
.bg-panel {
  background-color: var(--color-panel, rgba(30, 30, 40, 0.8));
}

@keyframes shine {
  from { transform: translateX(-100%) rotate(45deg); }
  to { transform: translateX(200%) rotate(45deg); }
}

.animate-shine {
  animation: shine 3s infinite linear;
}

.booster-fan-item {
  will-change: transform;
}
</style>
