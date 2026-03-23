<template>
  <div class="vn-modal-overlay">
    <div class="vn-modal-content fade-in-up">
      <h3 class="modal-title">Un combat se prépare...</h3>
      <AppButton @click.stop="$emit('play-combat')" variant="danger" size="xl" shadow glow class="combat-btn mt-4">
        Entrer en combat ⚔️
      </AppButton>
    </div>
  </div>
</template>

<script setup>
import AppButton from '../ui/AppButton.vue';
defineEmits(['play-combat']);
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
