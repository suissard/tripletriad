<template>
  <div class="flex h-screen bg-[#070715] font-sans text-[#e0e0f0]">

    <!-- Sidebar -->
    <div class="w-64 glass-panel border-r border-white/5 flex flex-col shadow-2xl z-50">
      <div class="p-10 border-b border-white/5">
        <h1 class="text-xl font-black tracking-[0.3em] text-white flex items-center gap-3">
          <span class="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_15px_rgba(255,191,0,0.5)]" style="background: var(--color-primary); box-shadow: 0 0 15px color-mix(in srgb, var(--color-primary) 50%, transparent);"></span>
          T.N.<span class="text-primary italic" style="color: var(--color-primary);">OS</span>
        </h1>
      </div>

      <nav class="flex-1 px-6 py-10 space-y-3 overflow-y-auto custom-scrollbar flex flex-col">
        <AppButton
          variant="ghost"
          fullWidth
          @click="router.push('/admin')"
          class="premium-nav-item"
          :class="{ 'premium-nav-item-active': route.path === '/admin' }"
        >
          <span class="icon">📊</span> Dashboard
        </AppButton>

        <div class="pt-12 pb-5">
          <p class="px-6 text-[9px] font-black uppercase tracking-premium opacity-50">Collections</p>
        </div>

        <AppButton
          variant="ghost"
          fullWidth
          v-for="col in collections" 
          :key="col.path" 
          @click="router.push(`/admin/${col.path}`)"
          class="premium-nav-item"
          :class="{ 'premium-nav-item-active': route.path === `/admin/${col.path}` }"
        >
          <span class="icon">{{ col.icon || '📁' }}</span>
          <span class="capitalize">{{ col.name }}</span>
        </AppButton>

        <div class="pt-12 pb-5">
          <p class="px-6 text-[9px] font-black uppercase tracking-premium opacity-50">Visual FX & Core</p>
        </div>

        <AppButton
          variant="ghost"
          fullWidth
          @click="router.push('/admin/game-config')"
          class="premium-nav-item"
          :class="{ 'premium-nav-item-active': route.path === '/admin/game-config' }"
        >
          <span class="icon">⚙️</span> Configuration
        </AppButton>

        <AppButton
          variant="ghost"
          fullWidth
          @click="router.push('/admin/foil-editor')"
          class="premium-nav-item"
          :class="{ 'premium-nav-item-active': route.path === '/admin/foil-editor' }"
        >
          <span class="icon">✨</span> HoloEditor Pro
        </AppButton>
      </nav>

      <div class="p-8 border-t border-white/5">
        <AppButton variant="ghost" fullWidth @click="handleLogout" class="w-full flex items-center justify-between px-6 py-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/20 transition-all group text-[10px] font-black uppercase tracking-widest">
          <span class="text-gray-500 group-hover:text-red-400">Exit System</span>
          <span class="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-red-400 font-bold">→</span>
        </AppButton>
      </div>
    </div>




    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden bg-transparent relative">
      <!-- Background Ambient Glow -->
      <div class="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none" style="background: color-mix(in srgb, var(--color-primary) 10%, transparent);"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] blur-[100px] rounded-full pointer-events-none" style="background: color-mix(in srgb, var(--color-secondary) 5%, transparent);"></div>

      <!-- Header -->
      <header class="h-20 flex items-center justify-between px-10 z-10 border-b border-white/5 bg-transparent backdrop-blur-md glass-panel">
        <h2 class="text-2xl font-bold text-white capitalize tracking-tight">
            {{ route.params.collection ? route.params.collection.replace('-', ' ') : 'Dashboard' }}
        </h2>
        
        <div class="flex items-center gap-4">
            <div class="flex flex-col items-end">
              <span class="text-white font-semibold text-sm">{{ authStore.user?.username }}</span>
              <span class="text-[10px] text-primary uppercase font-bold tracking-widest">Administrator</span>
            </div>
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-[#e6ac00] p-[1px]">
              <div class="w-full h-full rounded-full bg-[#0a0a1a] flex items-center justify-center overflow-hidden">
                <img :src="`https://api.dicebear.com/9.x/bottts/png?seed=${authStore.user?.username}&backgroundColor=transparent`" class="w-8 h-8" />
              </div>
            </div>
        </div>
      </header>

      <!-- Main view -->
      <main class="flex-1 min-h-0 overflow-x-hidden overflow-y-auto p-10 z-10 custom-scrollbar">
        <slot />
      </main>
    </div>

  </div>
</template>

<script setup>
import { useAuthStore } from '../admin/stores/authStore';
import { useRouter, useRoute } from 'vue-router';
import AppButton from '../components/ui/AppButton.vue';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const collections = [
  { name: 'Utilisateurs', path: 'users', icon: '👥' },
  { name: 'Cartes', path: 'cards', icon: '🎴' },
  { name: 'Decks', path: 'decks', icon: '🃏' },
  { name: 'Quêtes (Templates)', path: 'quest-templates', icon: '📜' },
  { name: 'Quêtes (Joueurs)', path: 'player-quests', icon: '⚔️' },
  { name: 'Boutique', path: 'shops', icon: '🛒' },
  { name: 'Wallets', path: 'wallets', icon: '💰' }
];

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
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

