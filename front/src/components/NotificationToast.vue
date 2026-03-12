<template>
  <div class="notification-container">
    <TransitionGroup name="notification-list" tag="div" class="notification-list">
      <div
        v-for="notification in notificationStore.notifications"
        :key="notification.id"
        class="notification-toast"
        :class="[`type-${notification.type}`]"
      >
        <div class="notification-content">
          <div class="notification-icon">
            <span v-if="notification.type === 'success'">✅</span>
            <span v-else-if="notification.type === 'error'">❌</span>
            <span v-else-if="notification.type === 'warning'">⚠️</span>
            <span v-else>🔔</span>
          </div>
          <div class="notification-message">
            {{ notification.message }}
          </div>
        </div>
        <button class="notification-close" @click="notificationStore.removeNotification(notification.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useNotificationStore } from '../stores/notificationStore';

const notificationStore = useNotificationStore();
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none; /* Let clicks pass through container */
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.notification-toast {
  pointer-events: auto; /* Re-enable clicks on the toast itself */
  min-width: 250px;
  max-width: 350px;
  background: rgba(15, 20, 30, 0.95);
  border: 1px solid rgba(100, 150, 255, 0.3);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5), 0 0 10px rgba(100, 150, 255, 0.2);
  border-radius: 8px;
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(5px);
  color: #fff;
  font-family: 'Rajdhani', sans-serif;
  overflow: hidden;
  position: relative;
}

/* Sci-fi glow effect */
.notification-toast::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: #4cc9f0;
  box-shadow: 0 0 10px #4cc9f0;
}

.notification-toast.type-success::before { background: #4caf50; box-shadow: 0 0 10px #4caf50; }
.notification-toast.type-error::before { background: #f44336; box-shadow: 0 0 10px #f44336; }
.notification-toast.type-warning::before { background: #ff9800; box-shadow: 0 0 10px #ff9800; }
.notification-toast.type-info::before { background: #2196f3; box-shadow: 0 0 10px #2196f3; }

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.notification-icon {
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-message {
  font-size: 1.1rem;
  font-weight: 500;
  line-height: 1.3;
}

.notification-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 0 0 10px;
  line-height: 1;
  transition: color 0.2s;
}

.notification-close:hover {
  color: white;
}

/* Animations */
.notification-list-enter-active,
.notification-list-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.notification-list-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.9);
}

.notification-list-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.notification-list-move {
  transition: transform 0.4s ease;
}
</style>
