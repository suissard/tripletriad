<template>
  <div v-if="state.confirmation.isOpen" class="modal-overlay">
    <div class="modal-content">
      <h3 class="modal-title">{{ state.confirmation.title }}</h3>
      <p class="modal-message">{{ state.confirmation.message }}</p>
      <div class="modal-actions">
        <button class="btn cancel-btn" @click="handleCancel">Annuler</button>
        <button class="btn confirm-btn" @click="handleConfirm">Confirmer</button>
      </div>
    </div>
  </div>
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
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: #1a1a2e;
  border: 2px solid #00d2ff;
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 0 20px rgba(0, 210, 255, 0.3);
}

.modal-title {
  color: #00d2ff;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.5rem;
}

.modal-message {
  color: white;
  margin-bottom: 25px;
  font-size: 1.1rem;
  line-height: 1.4;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: transparent;
  border: 1px solid #ff0055;
  color: #ff0055;
}

.cancel-btn:hover {
  background: rgba(255, 0, 85, 0.2);
}

.confirm-btn {
  background: #ff0055;
  color: white;
}

.confirm-btn:hover {
  background: #e6004c;
  transform: scale(1.05);
}
</style>
