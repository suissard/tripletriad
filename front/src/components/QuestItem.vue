<template>
  <div class="quest-item bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 transition-all hover:border-blue-500/50">
    <div class="quest-info flex-1 w-full">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-white font-bold text-lg">{{ quest.title }}</h3>
        <div class="reward text-yellow-400 font-semibold flex items-center gap-1">
          <span>+{{ quest.reward }}</span>
          <span class="text-sm">🪙</span>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="relative w-full h-3 bg-gray-900 rounded-full overflow-hidden mt-3">
        <div
          class="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-500 ease-out"
          :style="{ width: progressPercentage + '%' }"
        ></div>
      </div>
    </div>

    <div class="quest-actions flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
      <!-- Claim Button (Completed) -->
      <button
        v-if="isCompleted"
        @click="emit('claim', quest.id)"
        class="claim-btn relative px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white font-bold rounded-md shadow-[0_0_15px_rgba(234,179,8,0.5)] transition-all transform hover:scale-105"
      >
        Récupérer
      </button>

      <!-- Progress Text & Reroll (Incomplete) -->
      <template v-else>
        <span class="text-gray-300 font-mono font-medium">{{ quest.progress }} / {{ quest.target }}</span>
        <button
          @click="emit('reroll', quest.id)"
          class="reroll-btn p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Reroll Quest"
        >
          🎲
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Quest {
  id: number;
  title: string;
  progress: number;
  target: number;
  reward: number;
}

const props = defineProps<{
  quest: Quest;
}>();

const emit = defineEmits<{
  (e: 'claim', id: number): void;
  (e: 'reroll', id: number): void;
}>();

const isCompleted = computed(() => {
  return props.quest.progress >= props.quest.target;
});

const progressPercentage = computed(() => {
  if (props.quest.target <= 0) return 0;
  const percentage = (props.quest.progress / props.quest.target) * 100;
  return Math.min(Math.max(percentage, 0), 100);
});
</script>

<style scoped>
.claim-btn {
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0% {
    box-shadow: 0 0 10px rgba(234, 179, 8, 0.4);
  }
  50% {
    box-shadow: 0 0 20px rgba(234, 179, 8, 0.8);
  }
  100% {
    box-shadow: 0 0 10px rgba(234, 179, 8, 0.4);
  }
}
</style>
