<template>
  <AppCard
    :variant="isActuallyCompleted ? 'accent' : 'secondary'"
    :class="['quest-item', {
      'pending': isPending,
      'expiring-soon': isExpiringSoon,
      'completed': quest.status === 'completed',
      'no-hover': !isClaimable
    }]"
  >
    <div class="quest-layout flex flex-col md:flex-row gap-4 items-center justify-between relative overflow-hidden">
      <!-- Info Section -->
      <div class="quest-info flex-1 w-full">
        <div class="flex flex-col mb-3">
          <h3 class="text-white font-bold text-xl mb-1 flex items-center gap-2">
            {{ quest.title }}
            <span v-if="isActuallyCompleted && quest.status !== 'completed'" class="ready-badge text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">PRÊTE</span>
          </h3>
          <p class="text-gray-400 text-sm italic">{{ quest.description }}</p>
        </div>

        <!-- Progress and Timers -->
        <div v-if="isPending" class="quest-pending-timer flex items-center gap-2 text-yellow-500 font-semibold mb-3">
          <span class="text-lg">⏳</span>
          <span>Disponible dans : {{ formatTime(quest.startsAt) }}</span>
        </div>

        <div v-else class="quest-active-meta flex flex-col gap-3">
          <!-- Progress Bar -->
          <div class="quest-progress-container relative w-full h-5 bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-inner">
            <div
              class="progress-fill absolute top-0 left-0 h-full transition-all duration-700 ease-out"
              :class="isActuallyCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-blue-600 to-cyan-400'"
              :style="{ width: progressPercentage + '%' }"
            ></div>
            <div class="progress-text absolute inset-0 flex items-center justify-center text-xs font-bold text-white uppercase tracking-widest drop-shadow-md">
              {{ quest.progress }} / {{ quest.target }}
            </div>
          </div>

          <!-- Expiration Timer -->
          <div v-if="!isActuallyCompleted" class="quest-timer text-xs font-mono flex items-center gap-2" :class="isExpiringSoon ? 'text-orange-500 animate-pulse font-bold' : 'text-gray-500'">
            <span>🕒</span>
            <span v-if="quest.type === 'weekly'">Expire le : {{ formatDate(quest.expiresAt) }}</span>
            <span v-else>Expire dans : {{ formatTime(quest.expiresAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Reward & Actions -->
      <div class="quest-actions-wrapper flex flex-row md:flex-col items-center md:items-end gap-4 md:w-48">
        <div class="quest-reward-stack flex flex-col gap-1 items-end">
          <div v-if="quest.rewardCoins > 0" class="reward-pill bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded flex items-center gap-2">
            <span class="text-yellow-400 font-bold">+{{ quest.rewardCoins }}</span>
            <span>🪙</span>
          </div>
          <div v-if="quest.rewardGems > 0" class="reward-pill bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded flex items-center gap-2">
            <span class="text-purple-400 font-bold">+{{ quest.rewardGems }}</span>
            <span>💎</span>
          </div>
        </div>

        <div class="flex-1 md:flex-none flex justify-end">
          <button
            v-if="isActuallyCompleted && quest.status !== 'completed'"
            @click="emit('claim', quest.id)"
            class="claim-btn relative px-8 py-2.5 bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white font-black rounded-lg shadow-xl shadow-orange-500/20 transition-all hover:scale-110 active:scale-95 uppercase tracking-tighter"
          >
            Récupérer
          </button>
          
          <button
            v-else-if="!isActuallyCompleted && !isPending"
            @click="emit('reroll', quest.id)"
            class="reroll-btn p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all text-xl grayscale hover:grayscale-0"
            title="Relancer la quête"
          >
            🎲
          </button>

          <div v-else-if="quest.status === 'completed'" class="flex items-center gap-2 text-green-500 font-bold py-2">
            <span>✅</span>
            <span class="uppercase text-xs">Terminée</span>
          </div>
        </div>
      </div>
    </div>


  </AppCard>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import AppCard from './ui/AppCard.vue';

interface Quest {
  id: number;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardCoins: number;
  rewardGems: number;
  status: string;
  startsAt: Date | null;
  expiresAt: Date | null;
  type?: string;
}

const props = defineProps<{
  quest: Quest;
}>();

const emit = defineEmits<{
  (e: 'claim', id: number): void;
  (e: 'reroll', id: number): void;
}>();

const now = ref(new Date());
let timerInterval: any = null;

const isActuallyCompleted = computed(() => {
  return props.quest.progress >= props.quest.target;
});

const isClaimable = computed(() => {
  return isActuallyCompleted.value && props.quest.status !== 'completed';
});

const isPending = computed(() => {
  if (!props.quest.startsAt) return false;
  return props.quest.startsAt > now.value;
});

const isExpiringSoon = computed(() => {
  if (!props.quest.expiresAt || isActuallyCompleted.value) return false;
  const diff = props.quest.expiresAt.getTime() - now.value.getTime();
  return diff > 0 && diff < (1000 * 60 * 60 * 4); // Soon = less than 4 hours
});

const progressPercentage = computed(() => {
  if (props.quest.target <= 0) return 0;
  return Math.min(100, (props.quest.progress / props.quest.target) * 100);
});

const formatTime = (date: Date | null) => {
  if (!date) return '...';
  const diff = date.getTime() - now.value.getTime();
  if (diff <= 0) return 'Expiré';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}j ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
};

const formatDate = (date: Date | null) => {
  if (!date) return '...';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

onMounted(() => {
  timerInterval = setInterval(() => {
    now.value = new Date();
  }, 30000); // 30s update
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<style scoped>
.quest-item {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.quest-item.expiring-soon {
  border-color: rgba(249, 115, 22, 0.4);
  box-shadow: 0 0 15px rgba(249, 115, 22, 0.1);
}

.quest-item.pending {
  opacity: 0.45;
  filter: grayscale(0.6);
  cursor: default;
}

.quest-item.completed {
  border-top: 2px solid #10b981;
  box-shadow: 0 -2px 12px rgba(16, 185, 129, 0.15);
}



.ready-badge {
  text-shadow: 0 0 8px rgba(34, 197, 94, 1);
}

.progress-fill {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.claim-btn {
  animation: epic-pulse 2s infinite;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.claim-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 50%; height: 100%;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent);
  transform: skewX(-20deg);
  transition: none;
  animation: shine-sweep 3s infinite;
}

@keyframes epic-pulse {
  0%, 100% { box-shadow: 0 0 15px rgba(245, 158, 11, 0.4), inset 0 -2px 0 rgba(0,0,0,0.2); transform: scale(1); }
  50% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.8), inset 0 -2px 0 rgba(0,0,0,0.2); transform: scale(1.05); }
}

@keyframes shine-sweep {
  0% { left: -100%; }
  20% { left: 200%; }
  100% { left: 200%; }
}

.claim-btn:hover {
  animation: none;
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 10px 30px rgba(245, 158, 11, 0.8), inset 0 -2px 0 rgba(0,0,0,0.2);
}

.claim-btn:active {
  transform: scale(0.95) translateY(2px);
  box-shadow: 0 2px 10px rgba(245, 158, 11, 0.4), inset 0 2px 0 rgba(0,0,0,0.2);
}
</style>
