<template>
  <nav class="flex-1 px-6 py-10 space-y-3 overflow-y-auto custom-scrollbar flex flex-col">
    <AppButton
      variant="ghost"
      fullWidth
      @click="navigate('/admin')"
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
      @click="navigate(`/admin/${col.path}`)"
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
      @click="navigate('/admin/game-config')"
      class="premium-nav-item"
      :class="{ 'premium-nav-item-active': route.path === '/admin/game-config' }"
    >
      <span class="icon">⚙️</span> Configuration
    </AppButton>

    <AppButton
      variant="ghost"
      fullWidth
      @click="navigate('/admin/foil-editor')"
      class="premium-nav-item"
      :class="{ 'premium-nav-item-active': route.path === '/admin/foil-editor' }"
    >
      <span class="icon">✨</span> HoloEditor Pro
    </AppButton>

    <div class="mt-auto pt-10 border-t border-white/5">
      <AppButton variant="ghost" fullWidth @click="handleLogout" class="w-full flex items-center justify-between px-6 py-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/20 transition-all group text-[10px] font-black uppercase tracking-widest">
        <span class="text-gray-500 group-hover:text-red-400">Exit System</span>
        <span class="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-red-400 font-bold">→</span>
      </AppButton>
    </div>
  </nav>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router';
import AppButton from '../../components/ui/AppButton.vue';
import { useAuthStore } from '../stores/authStore';
import { state } from '../../game/state.js';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const collections = [
  { name: 'Utilisateurs', path: 'users', icon: '👥' },
  { name: 'Cartes', path: 'cards', icon: '🎴' },
  { name: 'Decks', path: 'decks', icon: '🃏' },
  { name: 'Quêtes (Templates)', path: 'quest-templates', icon: '📜' },
  { name: 'Quêtes (Joueurs)', path: 'player-quests', icon: '⚔️' },
  { name: 'Boutique', path: 'shops', icon: '🛒' },
  { name: 'Wallets', path: 'wallets', icon: '💰' }
];

const navigate = (path) => {
  router.push(path);
  state.leftDrawerOpen = false;
};

const handleLogout = () => {
  authStore.logout();
  router.push('/admin/login');
  state.leftDrawerOpen = false;
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

:deep(.glass-content) {
  justify-content: flex-start !important;
  gap: 1rem;
}

.premium-nav-item {
  justify-content: flex-start;
  text-align: left;
}
</style>
