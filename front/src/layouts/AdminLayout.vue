<template>
  <div class="admin-layout">
    <!-- Desktop Persistent Sidebar (≥ md) -->
    <aside class="admin-sidebar-desktop hidden md:flex">
      <div class="sidebar-header">
        <h2 class="sidebar-title">ADMIN</h2>
        <button class="sidebar-collapse-btn" @click="collapsed = !collapsed" :title="collapsed ? 'Agrandir' : 'Réduire'">
          <span class="collapse-icon" :class="{ 'rotate-180': collapsed }">«</span>
        </button>
      </div>
      <AdminSidebar :collapsed="collapsed" />
    </aside>

    <!-- Main Container -->
    <div class="admin-main" :class="{ 'sidebar-collapsed': collapsed }">
      <!-- Header -->
      <header class="admin-header">
        <!-- Mobile Hamburger -->
        <app-button
          @click="state.leftDrawerOpen = true"
          class="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
        >
          <span class="text-xl group-hover:scale-110 transition-transform">☰</span>
        </app-button>

        <div class="flex items-center gap-4">
          <h2 class="header-title">
            {{ pageTitle }}
          </h2>
        </div>

        <div class="header-actions">
          <app-button
            @click="goHome"
            class="header-action-btn"
            title="Retour à l'accueil"
          >
            <span>🏠</span>
          </app-button>
        </div>
      </header>

      <!-- Content Area -->
      <main class="admin-content custom-scrollbar">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { state } from '../game/state.js';
import AppButton from '../components/ui/AppButton.vue';
import AdminSidebar from '../admin/components/AdminSidebar.vue';

const router = useRouter();
const route = useRoute();

const collapsed = ref(false);

const pageTitle = computed(() => {
  if (route.params.collection) {
    return route.params.collection.replace('-', ' ');
  }
  if (route.name === 'admin-dashboard') return 'Dashboard';
  const name = route.name?.replace('admin-', '').replace(/-/g, ' ');
  return name || 'Admin';
});

const goHome = () => {
  state.gameState = 'menu';
  state.menuView = 'main';
  router.push('/');
};
</script>

<style scoped>
.admin-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-deep);
}

/* ─── Desktop Sidebar ─── */
.admin-sidebar-desktop {
  flex-shrink: 0;
  width: 280px;
  height: 100vh;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(7, 7, 21, 0.98), rgba(12, 12, 30, 0.95));
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 4px 0 30px rgba(0, 0, 0, 0.4);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  z-index: 10;
}

.sidebar-collapsed .admin-sidebar-desktop,
.admin-layout:has(.sidebar-collapsed) .admin-sidebar-desktop {
  /* This won't work reliably, we handle via JS class on sidebar */
}

.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.3em;
  color: var(--color-primary);
  text-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 40%, transparent);
  margin: 0;
}

.sidebar-collapse-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.4);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 0.8rem;
}

.sidebar-collapse-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
  border-color: rgba(255, 255, 255, 0.15);
}

.collapse-icon {
  transition: transform 0.3s ease;
  display: inline-block;
}

.collapse-icon.rotate-180 {
  transform: rotate(180deg);
}

/* ─── Main Area ─── */
.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Prevent flex overflow */
  height: 100vh;
  overflow: hidden;
}

/* ─── Header ─── */
.admin-header {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(10, 10, 26, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  z-index: 5;
}

.header-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  text-transform: capitalize;
  letter-spacing: 0.02em;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.header-action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

/* ─── Content ─── */
.admin-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

/* ─── Mobile: sidebar hidden, hamburger visible ─── */
@media (max-width: 767px) {
  .admin-header {
    padding: 0 16px;
    gap: 12px;
  }
}
</style>
