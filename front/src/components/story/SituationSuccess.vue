<template>
  <div class="vn-modal-overlay">
    <div class="vn-modal-content fade-in-up">
      <h3 class="modal-title text-green-400">Succès !</h3>
      <p class="mb-6">{{ situation.message || 'Vous avez terminé cette étape.' }}</p>
      <AppButton @click.stop="$emit('finish')" variant="primary" size="xl" shadow glow class="finish-btn">
        Terminer l'étape 🎉
      </AppButton>
    </div>
  </div>
</template>

<script setup>
import AppButton from '../ui/AppButton.vue';

defineProps({
  situation: { type: Object, required: true }
});
defineEmits(['finish']);
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

.fade-in-up {
  animation: slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes slide-up-fade { to { opacity: 1; transform: translateY(0); } }
</style>
