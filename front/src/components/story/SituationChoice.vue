<template>
  <div class="choice-overlay">
    <div class="choice-card fade-in-up">
      <h3 class="choice-title">{{ situation.text || 'Que voulez-vous faire ?' }}</h3>
      <div class="choices-list">
        <AppButton v-for="(option, idx) in situation.options" :key="idx"
          @click.stop="handleChoice(option)"
          :variant="isChoiceSelectable(option) ? 'primary' : 'ghost'"
          :disabled="!isChoiceSelectable(option)"
          class="choice-item">
          {{ option.text }}
          <span v-if="!isChoiceSelectable(option)" class="text-xs text-red-400 ml-2">(Conditions non remplies)</span>
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '../../stores/userStore.js';
import AppButton from '../ui/AppButton.vue';

const props = defineProps({
  situation: { type: Object, required: true }
});
const emit = defineEmits(['choice']);
const userStore = useUserStore();

function isChoiceSelectable(option) {
  if (!option.conditions || option.conditions.length === 0) return true;
  for (const condition of option.conditions) {
    if (condition.type === 'hasCoin') {
      if (userStore.user.coins < parseInt(condition.value, 10)) return false;
    }
  }
  return true;
}

function handleChoice(option) {
  if (!isChoiceSelectable(option)) return;
  emit('choice', option);
}
</script>

<style scoped>
.choice-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  /* Remove blur and heavy dark overlay */
  background: rgba(0, 0, 0, 0.4);
  z-index: 50;
  pointer-events: auto;
}

.choice-card {
  background: rgba(25, 25, 45, 0.95); /* Deep slate/blue background */
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(100, 100, 255, 0.2);
  border-radius: 24px;
  padding: 2.5rem;
  max-width: 500px;
  width: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.choice-title { 
  font-size: 1.4rem; 
  color: #fff; 
  margin-bottom: 2rem; 
  text-transform: uppercase; 
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.choices-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.choice-item {
  width: 100%;
  text-align: center;
  padding: 1rem !important;
  font-size: 1rem !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.choice-item:hover {
  background: rgba(100, 100, 255, 0.2) !important;
  border-color: rgba(100, 100, 255, 0.5) !important;
  transform: translateY(-2px);
}

.fade-in-up {
  animation: slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slide-up-fade { 
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); } 
}
</style>
