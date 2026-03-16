<template>
  <div class="drawer-container" :class="{ open: state.leftDrawerOpen }">
    <div class="drawer-overlay" @click="state.leftDrawerOpen = false"></div>
    <div class="drawer left-drawer">
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
        <span class="dot"></span>
        <span class="dot"></span>
      </span>

      <div class="drawer-content-wrapper">
        <div class="drawer-header">
          <h2>{{ isAdminRoute ? 'ADMINISTRATION' : 'MENU PRINCIPAL' }}</h2>
          <AppButton variant="secondary"  class="glass-panel px-3 py-1" @click="state.leftDrawerOpen = false">×</AppButton>
        </div>
        <div class="drawer-content">
          <AdminSidebar v-if="isAdminRoute" />
          <MainMenu v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { state } from '../game/state.js';
import MainMenu from '../views/MainMenu.vue';
import AdminSidebar from '../admin/components/AdminSidebar.vue';

const route = useRoute();
const isAdminRoute = computed(() => route.path.startsWith('/admin'));
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
  background: linear-gradient(to right, rgba(15, 15, 26, 0.95), rgba(20, 20, 35, 0.98), rgba(15, 15, 26, 0.95));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 2px solid rgba(180, 130, 255, 0.2);
  box-shadow: 20px 0 50px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
  overflow: hidden; /* Important to contain the inner absolute layers */
}

/* Ensure the textual content is above everything else */
.drawer-content-wrapper {
  position: relative;
  z-index: 20;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* --- Holo Panel Aesthetics --- */

.edgeGlow {
  position: absolute;
  top: 0;
  right: 0;
  width: 2px;
  height: 100%;
  background: linear-gradient(180deg, transparent, rgba(180, 130, 255, 0.8), transparent);
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
  border-right: 1px solid rgba(255, 255, 255, 0.1);
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
    to bottom,
    transparent 10%,
    rgba(220, 190, 255, 0.15) 50%,
    transparent 90%
  );
  transform: translateY(-150%) skew(-25deg);
  animation: sweepShineVert 10s infinite linear;
}

@keyframes sweepShineVert {
  0% { transform: translateY(-150%) skew(-25deg); opacity: 0; }
  10% { opacity: 1; }
  30% { transform: translateY(100%) skew(-25deg); opacity: 0; }
  100% { transform: translateY(100%) skew(-25deg); opacity: 0; }
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
  animation: floatDot 6s infinite linear;
  opacity: 0;
}
.dot:nth-child(1) { left: 20%; top: 90%; --angle: -20deg; --dist: 150px; animation-delay: 0s; }
.dot:nth-child(2) { left: 70%; top: 95%; --angle: -45deg; --dist: 200px; animation-delay: 1.5s; }
.dot:nth-child(3) { left: 40%; top: 85%; --angle: 15deg; --dist: 120px; animation-delay: 3s; }
.dot:nth-child(4) { left: 80%; top: 90%; --angle: -10deg; --dist: 180px; animation-delay: 1s; }
.dot:nth-child(5) { left: 30%; top: 80%; --angle: 30deg; --dist: 130px; animation-delay: 4.5s; }
.dot:nth-child(6) { left: 60%; top: 75%; --angle: -60deg; --dist: 160px; animation-delay: 2.2s; }

@keyframes floatDot {
  0% { transform: translateY(0) rotate(var(--angle)) translateX(0); opacity: 0; }
  20% { opacity: 0.8; }
  80% { opacity: 0.8; }
  100% { transform: translateY(-300px) rotate(var(--angle)) translateX(var(--dist)); opacity: 0; }
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
