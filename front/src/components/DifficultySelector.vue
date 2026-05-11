<template>
  <div class="difficulty-selector glass-panel p-8 rounded-3xl w-full max-w-md mx-auto">
    <div class="header mb-8 text-center">
      <h3 class="text-xs font-black tracking-premium uppercase text-primary mb-3 opacity-70">Niveau de l'Intelligence Artificielle</h3>
      <div class="difficulty-value-display flex items-center justify-center gap-3">
        <span class="text-5xl font-black text-white glow-text transition-all duration-300" :style="{ color: difficultyColor }">
          {{ modelValue }}
        </span>
        <span class="text-xl font-bold text-white/30">%</span>
      </div>
    </div>

    <div class="slider-container relative mb-10">
      <input 
        type="range" 
        min="0" 
        max="100" 
        step="1"
        :value="modelValue"
        @input="$emit('update:modelValue', parseInt($event.target.value))"
        class="premium-slider"
        :style="sliderStyle"
      >
      <div class="marks flex justify-between mt-6 px-1">
        <span class="mark-label text-[10px] font-black text-white/20 tracking-widest uppercase">Novice</span>
        <span class="mark-label text-[10px] font-black text-white/20 tracking-widest uppercase">Expert</span>
        <span class="mark-label text-[10px] font-black text-white/20 tracking-widest uppercase">Légende</span>
      </div>
    </div>

    <div class="difficulty-feedback min-h-[60px] flex items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
      <p class="text-sm italic text-white/70 leading-relaxed">
        "{{ feedbackText }}"
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  }
});

defineEmits(['update:modelValue']);

// Dynamic color from Green (Easy) to Red (Nightmare)
const difficultyColor = computed(() => {
  const val = props.modelValue;
  if (val <= 33) return '#a8e063'; // Greenish
  if (val <= 66) return '#f6d365'; // Yellowish
  return '#ff0844'; // Reddish
});

const sliderStyle = computed(() => {
  return {
    '--range-progress': `${props.modelValue}%`,
    '--accent-color': difficultyColor.value
  };
});

const feedbackText = computed(() => {
  const val = props.modelValue;
  if (val === 0) return "L'IA joue au hasard total. Une victoire facile en perspective.";
  if (val <= 20) return "L'IA est distraite. Elle ne capturera vos cartes que par chance.";
  if (val <= 40) return "L'IA connaît les règles de base mais manque cruellement de stratégie.";
  if (val <= 60) return "Un adversaire équilibré. Elle commence à anticiper certains coups.";
  if (val <= 80) return "Attention, l'IA cherche activement les combos et les captures multiples.";
  if (val < 100) return "L'IA analyse chaque recoin du plateau. Une erreur et c'est la défaite.";
  return "Calculateur divin activé. Bonne chance, vous en aurez besoin.";
});
</script>

<style scoped>
.difficulty-selector {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.glow-text {
  text-shadow: 0 0 20px var(--accent-color);
}

.premium-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  outline: none;
  cursor: pointer;
  position: relative;
}

/* Progress track for Webkit */
.premium-slider::-webkit-slider-runnable-track {
  width: 100%;
  height: 6px;
  background: linear-gradient(to right, 
    var(--accent-color) 0%, 
    var(--accent-color) var(--range-progress), 
    rgba(255, 255, 255, 0.05) var(--range-progress), 
    rgba(255, 255, 255, 0.05) 100%
  );
  border-radius: 10px;
  transition: background 0.3s ease;
}

.premium-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  border: 6px solid var(--accent-color);
  cursor: pointer;
  margin-top: -11px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3), 0 0 10px var(--accent-color);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.premium-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 25px var(--accent-color);
}

/* Firefox support */
.premium-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 6px solid var(--accent-color);
  cursor: pointer;
  box-shadow: 0 0 15px var(--accent-color);
}

.premium-slider::-moz-range-progress {
  background-color: var(--accent-color);
  height: 6px;
  border-radius: 10px;
}
</style>
