<template>
  <div class="flex">
    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Background Ambient Glown
      <div class="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none" style="background: color-mix(in srgb, var(--color-primary) 10%, transparent);"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] blur-[100px] rounded-full pointer-events-none" style="background: color-mix(in srgb, var(--color-secondary) 5%, transparent);"></div> -->

      <!-- Header -->
      <header
        class="h-20 flex items-center justify-between px-10 bg-transparent backdrop-blur-md glass-panel">
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

        <!-- <div class="flex items-center gap-4">
            <div class="flex flex-col items-end">
              <span class="text-white font-semibold text-sm">{{ userStore.user?.username }}</span>
              <span class="text-[10px] text-primary uppercase font-bold tracking-widest">Administrator</span>
            </div>
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-[#e6ac00] p-[1px]">
              <div class="w-full h-full rounded-full bg-[#0a0a1a] flex items-center justify-center overflow-hidden">
                <img :src="`https://api.dicebear.com/9.x/bottts/png?seed=${userStore.user?.username}&backgroundColor=transparent`" class="w-8 h-8" />
              </div>
            </div>
        </div> -->
      </header>

      <!-- Main view -->
      <main class="flex">
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
