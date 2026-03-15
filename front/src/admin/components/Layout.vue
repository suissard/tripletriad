<template>
  <div class="flex h-screen bg-gray-100 font-sans">

    <!-- Sidebar -->
    <div class="w-64 bg-gray-900 text-white flex flex-col">
      <div class="p-6 border-b border-gray-800">
        <h1 class="text-2xl font-bold tracking-wider">T.N. ADMIN</h1>
      </div>

      <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <router-link to="/admin" class="block px-4 py-2 rounded text-gray-300 hover:bg-gray-800 hover:text-white" active-class="bg-gray-800 text-white">
          Dashboard
        </router-link>

        <div class="pt-4 pb-2">
          <p class="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Collections</p>
        </div>

        <router-link v-for="col in collections" :key="col.path" :to="`/admin/${col.path}`" class="block px-4 py-2 rounded text-gray-300 hover:bg-gray-800 hover:text-white capitalize" active-class="bg-gray-800 text-white">
          {{ col.name }}
        </router-link>

        <div class="pt-4 pb-2">
          <p class="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Outils</p>
        </div>
        <router-link to="/admin/game-config" class="block px-4 py-2 rounded text-gray-300 hover:bg-gray-800 hover:text-white" active-class="bg-gray-800 text-white">
          ⚙️ Configuration Jeu
        </router-link>
        <router-link to="/admin/foil-editor" class="block px-4 py-2 rounded text-gray-300 hover:bg-gray-800 hover:text-white" active-class="bg-gray-800 text-white">
          ✨ Editeur Foil
        </router-link>
      </nav>

      <div class="p-4 border-t border-gray-800">
        <button @click="handleLogout" class="w-full text-left px-4 py-2 text-gray-400 hover:text-white">
          Déconnexion
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="bg-white shadow-sm h-16 flex items-center justify-between px-6">
        <h2 class="text-xl font-semibold text-gray-800 capitalize">
            {{ route.params.collection ? route.params.collection.replace('-', ' ') : 'Dashboard' }}
        </h2>
        <div class="flex items-center">
            <span class="text-gray-600 text-sm">{{ authStore.user?.username }}</span>
        </div>
      </header>

      <!-- Main view -->
      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
        <router-view :key="route.fullPath"></router-view>
      </main>
    </div>

  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/authStore';
import { useRouter, useRoute } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const collections = [
  { name: 'Utilisateurs', path: 'users' },
  { name: 'Cartes', path: 'cards' },
  { name: 'Decks', path: 'decks' },
  { name: 'Quêtes (Templates)', path: 'quest-templates' },
  { name: 'Quêtes (Joueurs)', path: 'player-quests' },
  { name: 'Boutique', path: 'shops' },
  { name: 'Wallets', path: 'wallets' }
];

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>
