<template>
  <div class="booster-shop-card relative aspect-square group">
    <div class="card-inner absolute inset-0 bg-panel/40 backdrop-blur-xl border-2 border-white/10 rounded-3xl p-6 flex flex-col items-center transition-all duration-300 group-hover:border-primary/50 group-hover:bg-panel/60 shadow-xl overflow-hidden">
      
      <!-- Background Decorative Element -->
      <div class="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-primary/40 transition-colors"></div>
      
      <!-- Collection Info -->
      <div class="text-center mb-4 z-10">
        <h4 class="text-xl font-bold text-white uppercase tracking-wider mb-1">{{ collection.name }}</h4>
        <div class="h-1 w-12 bg-primary mx-auto rounded-full"></div>
      </div>

      <!-- Booster Visual -->
      <div class="booster-visual flex-1 flex items-center justify-center mb-4 relative z-10">
        <div class="relative w-24 h-32 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
          <img v-if="collection.boosterImage" :src="collection.boosterImage" class="w-full h-full object-contain filter drop-shadow-2xl" />
          <div v-else class="text-7xl drop-shadow-2xl">📦</div>
          
          <!-- Premium Sparkles if selected -->
          <div v-if="isPremium" class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="absolute top-0 left-0 animate-pulse text-yellow-400">✨</div>
            <div class="absolute bottom-0 right-0 animate-pulse text-yellow-400 delay-700">✨</div>
          </div>
        </div>
      </div>

      <!-- Selectors Row -->
      <div class="w-full flex flex-col gap-4 z-10">
        <div class="flex items-center justify-between gap-2">
          <!-- Quantity Stepper -->
          <div class="quantity-stepper flex items-center bg-black/40 rounded-xl border border-white/10 overflow-hidden">
            <button 
              class="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
              @click="decrement"
              :disabled="quantity <= 1"
            >
              <span class="text-xl">-</span>
            </button>
            <div class="w-10 text-center font-bold text-white">{{ quantity }}</div>
            <button 
              class="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
              @click="increment"
              :disabled="quantity >= 10"
            >
              <span class="text-xl">+</span>
            </button>
          </div>

          <!-- Type Toggle (Classic / Premium) -->
          <div class="type-toggle flex bg-black/40 rounded-xl border border-white/10 p-1 flex-1">
            <button 
              class="flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all"
              :class="!isPremium ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/70'"
              @click="isPremium = false"
            >
              Classic
            </button>
            <button 
              class="flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all"
              :class="isPremium ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white/70'"
              @click="isPremium = true"
            >
              Premium
            </button>
          </div>
        </div>

        <!-- Price / Buy Button -->
        <button 
          class="buy-button w-full py-3 rounded-2xl font-black uppercase italic tracking-tighter transition-all relative overflow-hidden group/btn flex items-center justify-center gap-3 border-b-4 active:border-b-0 active:translate-y-1"
          :class="isPremium 
            ? 'bg-yellow-400 border-yellow-600 text-black hover:bg-yellow-300' 
            : 'bg-primary border-blue-700 text-white hover:bg-blue-500'"
          @click="$emit('buy', { collection: collection.code, quantity, isPremium, totalCost })"
        >
          <span>Valider</span>
          <span class="flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full text-sm">
            {{ totalCost }}
            <span class="text-lg">{{ isPremium ? '💎' : '🪙' }}</span>
          </span>
          
          <!-- Gloss shine effect -->
          <div class="absolute inset-0 bg-white/20 translate-x-[-100%] skew-x-[-20deg] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  collection: {
    type: Object,
    required: true
  },
  baseCost: {
    type: Number,
    default: 100
  }
});

defineEmits(['buy']);

const quantity = ref(1);
const isPremium = ref(false);

const totalCost = computed(() => props.baseCost * quantity.value);

const increment = () => {
  if (quantity.value < 10) quantity.value++;
};

const decrement = () => {
  if (quantity.value > 1) quantity.value--;
};
</script>

<style scoped>
.bg-panel {
  background-color: var(--color-panel, rgba(30, 30, 40, 0.8));
}
.booster-shop-card {
  max-width: 400px;
  width: 100%;
}
</style>
