<template>
  <div class="top-navbar ui-layer">
    <QuestModal :is-open="isQuestModalOpen" @close="isQuestModalOpen = false" />
    <div class="navbar-bg-panel">
      <!-- Animated Border & Shine -->
      <div class="edgeGlow"></div>
      <div class="mirrorShade"></div>
      <div class="shineStrip"></div>
      <!-- Ambient Particles -->
      <span class="particleCloud">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </span>
    </div>

    <div class="navbar-content">
      <!-- Left Menu Toggle Removed -->
      <HoloButton width="auto" @click="isQuestModalOpen = true">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.2rem;">📜</span>
          <span class="username" style="display: none;">Quêtes</span>
        </div>
      </HoloButton>
      
      <!-- Title -->
      <div class="app-title">Terra Nullius</div>

      <!-- Right User Widget -->
      <HoloButton width="auto" @click="toggleRightDrawer">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="username">{{ userStore.user?.username || 'Joueur Anonyme' }}</span>
          <img :src="userStore.user?.avatar" class="avatar" alt="User Avatar" />
        </div>
      </HoloButton>
    </div>
  </div>
</template>

<script setup>
import { state } from '../game/state.js';
import { useUserStore } from '../stores/userStore.js';
const userStore = useUserStore();
import HoloButton from './HoloButton.vue';
import QuestModal from './QuestModal.vue';
import { ref } from 'vue';

const isQuestModalOpen = ref(false);

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
  height: 80px;
  z-index: 100;
  pointer-events: auto; /* Since ui-layer might disable it */
}

.navbar-bg-panel {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(15, 15, 26, 0.9), rgba(20, 20, 35, 0.95), rgba(15, 15, 26, 0.9));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 2px solid rgba(180, 130, 255, 0.2);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  z-index: 10;
}

.navbar-content {
  position: relative;
  z-index: 20;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  box-sizing: border-box;
}

/* --- Holo Panel Aesthetics --- */

.edgeGlow {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(180, 130, 255, 0.8), transparent);
  box-shadow: 0 0 15px #a855f7;
  opacity: 0.7;
  animation: pulseGlow 3s infinite alternate;
}

@keyframes pulseGlow {
  0% { opacity: 0.3; box-shadow: 0 0 5px #a855f7; }
  100% { opacity: 0.9; box-shadow: 0 0 20px #a855f7, 0 0 30px #00d2ff; }
}

.mirrorShade {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.mirrorShade::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 50%, rgba(255, 255, 255, 0.02) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.shineStrip {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.shineStrip::before {
  content: "";
  position: absolute;
  width: 150%;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent 10%,
    rgba(220, 190, 255, 0.3) 50%,
    transparent 90%
  );
  transform: translateX(-150%) skew(-25deg);
  animation: sweepShine 8s infinite linear;
}

@keyframes sweepShine {
  0% { transform: translateX(-150%) skew(-25deg); opacity: 0; }
  20% { opacity: 1; }
  40% { transform: translateX(100%) skew(-25deg); opacity: 0; }
  100% { transform: translateX(100%) skew(-25deg); opacity: 0; }
}

/* Subtle Particles */
.particleCloud {
  position: absolute;
  inset: 0;
  opacity: 0.6;
  pointer-events: none;
}
.dot {
  position: absolute;
  width: 8px;
  height: 2px;
  background: #c084fc;
  filter: blur(1px);
  animation: floatDot 4s infinite linear;
  opacity: 0;
}
.dot:nth-child(1) { left: 10%; top: 80%; --angle: -20deg; --dist: 100px; animation-delay: 0s; }
.dot:nth-child(2) { left: 40%; top: 90%; --angle: -45deg; --dist: 120px; animation-delay: 1.2s; }
.dot:nth-child(3) { left: 70%; top: 85%; --angle: 15deg; --dist: 90px; animation-delay: 2.5s; }
.dot:nth-child(4) { left: 90%; top: 75%; --angle: -10deg; --dist: 110px; animation-delay: 0.8s; }

@keyframes floatDot {
  0% { transform: translateY(0) rotate(var(--angle)) translateX(0); opacity: 0; }
  20% { opacity: 0.8; }
  80% { opacity: 0.8; }
  100% { transform: translateY(-50px) rotate(var(--angle)) translateX(var(--dist)); opacity: 0; }
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
