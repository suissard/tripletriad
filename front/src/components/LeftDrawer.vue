<template>
  <div class="drawer-container" :class="{ open: state.leftDrawerOpen }">
    <div class="drawer-overlay" @click="state.leftDrawerOpen = false"></div>
    <div class="drawer left-drawer">
      <div class="drawer-header">
        <h2>MENU PRINCIPAL</h2>
        <button class="close-btn" @click="state.leftDrawerOpen = false">×</button>
      </div>
      <div class="drawer-content">
        <!-- We embed the MainMenu here -->
        <MainMenu />
      </div>
    </div>
  </div>
</template>

<script setup>
import { state } from '../game/state.js';
import MainMenu from './MainMenu.vue';
</script>

<style scoped>
.drawer-container {
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
}

.drawer-container.open {
  pointer-events: auto;
}

.drawer-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.drawer-container.open .drawer-overlay {
  opacity: 1;
}

.drawer {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 400px;
  max-width: 90vw;
  background: rgba(15, 15, 25, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(0, 210, 255, 0.2);
  box-shadow: 20px 0 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.left-drawer {
  left: 0;
  transform: translateX(-100%);
}

.drawer-container.open .left-drawer {
  transform: translateX(0);
}

.drawer-header {
  height: 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.drawer-header h2 {
  color: #00d2ff;
  font-size: 1.2rem;
  letter-spacing: 2px;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 2rem;
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}

.close-btn:hover {
  color: #ff0055;
  transform: scale(1.1) rotate(90deg);
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
  position: relative;
}
</style>
