<template>
  <div class="flex flex-col w-screen h-screen overflow-hidden">
    <!-- Header -->
    <header
      class="fixed top-0 left-0 h-20 w-screen flex items-center justify-between px-10 bg-transparent backdrop-blur-md glass-panel z-50 border-x-0 border-t-0 rounded-none"
      style="width: 100vw !important; max-width: 100vw !important; margin: 0 !important;">
      <div class="flex items-center gap-6">
        <app-button @click="state.leftDrawerOpen = true"
          class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group">
          <span class="text-xl group-hover:scale-110 transition-transform">☰</span>
        </app-button>
        <h2 class="text-2xl font-bold text-white capitalize tracking-tight">
          {{ route.params.collection ? route.params.collection.replace('-', ' ') : (route.name === 'admin-dashboard' ?
            'Dashboard' : route.name?.replace('admin-', '').replace('-', ' ')) }}
        </h2>
      </div>
    </header>

    <!-- Content Area -->
    <div class="flex-1 w-full overflow-hidden flex flex-col pt-20">
      <main class="flex-1 overflow-y-auto custom-scrollbar">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '../stores/userStore';
import { useRouter, useRoute } from 'vue-router';
import { state } from '../game/state.js';
import AppButton from '../components/ui/AppButton.vue';

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

const handleLogout = () => {
  userStore.logout();
  router.push('/');
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

/* Override inner glass-content styling from AppButton to match sidebar alignment */
:deep(.glass-content) {
  justify-content: flex-start !important;
  gap: 1rem;
}

.premium-nav-item {
  justify-content: flex-start;
  text-align: left;
}
</style>
