<template>
  <nav class="bottom-mobile-nav">
    <div class="nav-container">
      <button
        class="nav-item"
        :class="{ active: route.path === '/' }"
        @click="router.push('/')"
      >
        <div class="icon-container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
        <span class="nav-label">Accueil</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: route.path.includes('/collection') }"
        @click="router.push('/collection')"
      >
        <div class="icon-container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <rect x="3" y="3" width="7" height="7"></rect>
             <rect x="14" y="3" width="7" height="7"></rect>
             <rect x="14" y="14" width="7" height="7"></rect>
             <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </div>
        <span class="nav-label">Collection</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: route.path.includes('/deck') }"
        @click="router.push('/decks')"
      >
        <div class="icon-container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
            <path d="M16 4h-8"></path>
          </svg>
        </div>
        <span class="nav-label">Decks</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: route.path.includes('/boutique') }"
        @click="router.push('/boutique')"
      >
        <div class="icon-container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </div>
        <span class="nav-label">Boutique</span>
      </button>
      <button
        class="nav-item"
        :class="{ active: route.path.includes('/wallet/boosters') }"
        @click="router.push('/wallet/boosters')"
      >
        <div class="icon-container">
          <span style="font-size: 1.5rem;">🎒</span>
        </div>
        <span class="nav-label">Boosters</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
</script>

<style scoped>
.bottom-mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  /* Dark Glassmorphism inspired by Stitch layouts */
  background: color-mix(in srgb, var(--color-primary, #00d2ff) 10%, rgba(10, 10, 20, 0.85));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(0, 210, 255, 0.2);
  padding-bottom: env(safe-area-inset-bottom, 10px);
}

.nav-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 70px;
  max-width: 600px;
  margin: 0 auto;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 8px 12px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  width: 25%;
  position: relative;
}

.icon-container {
  width: 28px;
  height: 28px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.icon-container svg {
  width: 100%;
  height: 100%;
}

.nav-label {
  font-size: 0.7rem;
  font-family: 'Space Grotesk', sans-serif; /* Inspired by the Stitch generated theme font */
  font-weight: 600;
  letter-spacing: 0.5px;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

/* Active State Styles - Neon Blue Glow */
.nav-item.active {
  color: #00d2ff;
}

.nav-item.active .icon-container {
  transform: translateY(-4px);
  filter: drop-shadow(0 0 8px rgba(0, 210, 255, 0.6));
}

.nav-item.active .nav-label {
  opacity: 1;
  text-shadow: 0 0 5px rgba(0, 210, 255, 0.4);
}

/* Optional: Active dot indicator */
.nav-item.active::after {
  content: '';
  position: absolute;
  top: 0;
  width: 30px;
  height: 3px;
  background: #00d2ff;
  border-radius: 0 0 4px 4px;
  box-shadow: 0 2px 10px rgba(0, 210, 255, 0.8);
}

.nav-item:hover:not(.active) {
  color: rgba(255, 255, 255, 0.8);
}
</style>
