<template>
  <div class="vn-modal-overlay">
    <div class="vn-modal-content fade-in-up">
      <h3 class="modal-title">{{ situation.text || 'Que voulez-vous faire ?' }}</h3>
      <div class="choices-container">
        <AppButton v-for="(option, idx) in situation.options" :key="idx"
          @click.stop="handleChoice(option)"
          :variant="isChoiceSelectable(option) ? 'primary' : 'ghost'"
          :disabled="!isChoiceSelectable(option)"
          class="choice-btn">
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
.vn-modal-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 50;
  pointer-events: auto;
}

.vn-modal-content {
  background: rgba(15, 15, 25, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 3rem;
  max-width: 480px;
  width: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.modal-title { font-size: 1.5rem; color: white; margin-bottom: 2rem; text-transform: uppercase; }

.choices-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}
.choice-btn {
  width: 100%;
}

.fade-in-up {
  animation: slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes slide-up-fade { to { opacity: 1; transform: translateY(0); } }
</style>
