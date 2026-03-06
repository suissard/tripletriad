<template>
  <div class="top-navbar ui-layer">
    <!-- Left Menu Toggle -->
    <button class="icon-btn left-btn" @click="toggleLeftDrawer">
      <svg viewBox="0 0 24 24" fill="none" class="icon"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    
    <!-- Title -->
    <div class="app-title">TRIPLE TRIAD</div>

    <!-- Right User Widget -->
    <button class="user-widget" @click="toggleRightDrawer">
      <span class="username">{{ state.user.username }}</span>
      <img :src="state.user.avatar" class="avatar" alt="User Avatar" />
    </button>
  </div>
</template>

<script setup>
import { state } from '../game/state.js';

function toggleLeftDrawer() {
  state.leftDrawerOpen = !state.leftDrawerOpen;
  if (state.leftDrawerOpen) state.rightDrawerOpen = false;
}

function toggleRightDrawer() {
  state.rightDrawerOpen = !state.rightDrawerOpen;
  if (state.rightDrawerOpen) state.leftDrawerOpen = false;
}
</script>

<style scoped>
.top-navbar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
  background: rgba(10, 10, 20, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-sizing: border-box;
  z-index: 100;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
  pointer-events: auto; /* Since ui-layer might disable it */
}

.icon-btn {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.2s, transform 0.2s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}

.icon {
  width: 28px;
  height: 28px;
}

.app-title {
  color: #00d2ff;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(0, 210, 255, 0.8);
  pointer-events: none;
}

.user-widget {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  padding: 5px 5px 5px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
}

.user-widget:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: #00d2ff;
  box-shadow: 0 0 15px rgba(0, 210, 255, 0.3);
  transform: translateY(-2px);
}

.username {
  font-weight: bold;
  font-size: 0.9rem;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #111;
  border: 2px solid #00d2ff;
}
</style>
