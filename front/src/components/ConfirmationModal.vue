<template>
  <AppModal
    :modelValue="state.confirmation.isOpen"
    @update:modelValue="state.confirmation.isOpen = $event"
    :title="state.confirmation.title"
    :show-close-button="false"
    :dismissible="false"
    max-width="md"
  >
    <div class="modal-content-center py-4">
      <p class="modal-message mb-6">{{ state.confirmation.message }}</p>
      <div class="modal-actions">
        <AppButton variant="secondary" @click="handleCancel" class="cancel-btn">Annuler</AppButton>
        <AppButton variant="primary" @click="handleConfirm" class="confirm-btn">Confirmer</AppButton>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { state, resolveConfirmation } from '../game/state.js';

function handleConfirm() {
  resolveConfirmation(true);
}

function handleCancel() {
  resolveConfirmation(false);
}
</script>

<style scoped>
.modal-content-center {
  text-align: center;
}
.modal-message {
  color: white;
  font-size: 1.1rem;
  line-height: 1.4;
}
.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}
.cancel-btn {
  border: 1px solid #ff0055 !important;
  color: #ff0055 !important;
}
.cancel-btn:hover {
  background: rgba(255, 0, 85, 0.2) !important;
}
.confirm-btn {
  background: #ff0055 !important;
  color: white !important;
  border-color: #ff0055 !important;
}
.confirm-btn:hover {
  background: #e6004c !important;
}
</style>
