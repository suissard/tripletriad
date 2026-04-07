<template>
  <nav class="flex-1 px-4 py-8 space-y-4 overflow-y-auto custom-scrollbar flex flex-col">
    <!-- Dashboard - Always Visible -->
    <AppButton
      variant="ghost"
      fullWidth
      @click="navigate('/admin')"
      class="premium-nav-item mb-4"
      :class="{ 'premium-nav-item-active': route.path === '/admin' }"
    >
      <div class="flex items-center gap-4 w-full overflow-hidden">
        <span class="icon flex-shrink-0 text-lg">📊</span>
        <span class="truncate font-semibold tracking-wide">Dashboard</span>
      </div>
    </AppButton>

    <!-- Collapsible Categories -->
    <div v-for="(category, index) in menuCategories" :key="index" class="category-wrapper">
      <button 
        @click="toggleCategory(category.id)"
        class="category-header w-full flex items-center justify-between px-6 py-4 rounded-xl hover:bg-white/5 transition-all group backdrop-blur-sm"
      >
        <span class="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-opacity">
          {{ category.title }}
        </span>
        <span 
          class="text-[10px] transition-transform duration-300 transform opacity-30 group-hover:opacity-100"
          :class="{ 'rotate-180': expandedCategories[category.id] }"
        >
          ▼
        </span>
      </button>

      <div 
        class="category-content overflow-hidden transition-all duration-300 ease-in-out"
        :style="{ maxHeight: expandedCategories[category.id] ? '800px' : '0px', opacity: expandedCategories[category.id] ? 1 : 0 }"
      >
        <div class="pt-2 space-y-2 pb-2">
          <AppButton
            v-for="item in category.items"
            :key="item.path"
            variant="ghost"
            fullWidth
            @click="navigate(item.path)"
            class="premium-nav-item pl-8"
            :class="{ 'premium-nav-item-active': route.path === item.path }"
          >
            <div class="flex items-center gap-4 w-full overflow-hidden">
              <span class="icon flex-shrink-0 text-lg">{{ item.icon || '📁' }}</span>
              <span class="truncate font-medium capitalize">{{ item.name }}</span>
            </div>
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Return Home & Dev Options -->
    <div class="mt-auto pt-8 border-t border-white/5 space-y-4">
      <DevOptions />
      <AppButton variant="ghost" fullWidth @click="goHome" class="w-full rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10 transition-all group text-[10px] font-black uppercase tracking-widest">
        <div class="flex items-center justify-between px-6 py-4 w-full font-black">
          <span class="text-gray-400 group-hover:text-white">Retour Accueil</span>
          <span class="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary font-bold">←</span>
        </div>
      </AppButton>
    </div>
  </nav>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AppButton from '../../components/ui/AppButton.vue';
import DevOptions from './DevOptions.vue';
import { useUserStore } from '../../stores/userStore';
import { state } from '../../game/state.js';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// Define categories and their items
const menuCategories = [
  {
    id: 'collections',
    title: 'Collections',
    items: [
      { name: 'Utilisateurs', path: '/admin/users', icon: '👥' },
      { name: 'Cartes', path: '/admin/cards', icon: '🎴' },
      { name: 'Decks', path: '/admin/decks', icon: '🃏' },
      { name: 'Quêtes (Templates)', path: '/admin/quest-templates', icon: '📜' },
      { name: 'Quêtes (Joueurs)', path: '/admin/player-quests', icon: '⚔️' },
      { name: 'Boutique', path: '/admin/shops', icon: '🛒' },
      { name: 'Wallets', path: '/admin/wallets', icon: '💰' }
    ]
  },
  {
    id: 'visual-core',
    title: 'Visual FX & Core',
    items: [
      { name: 'Configuration', path: '/admin/game-config', icon: '⚙️' },
      { name: 'HoloEditor Pro', path: '/admin/foil-editor', icon: '✨' },
      { name: 'Foil Gallery', path: '/admin/foil-gallery', icon: '🎨' },
      { name: 'Simulateur IA', path: '/admin/simulateur', icon: '🤖' }
    ]
  },
  {
    id: 'dev-tools',
    title: 'Developer Tools',
    items: [
      { name: 'Testeur API', path: '/admin/test-api', icon: '🧪' },
      { name: 'Archi. Statique', path: '/admin/cartographie', icon: '🗺️' },
      { name: 'Archi. Dynamique', path: '/admin/cartographie-dyn', icon: '🔭' },
      { name: 'Testeur Aléatoire', path: '/admin/test-seed', icon: '🎲' },
      { name: 'Coin Toss', path: '/admin/test-coin', icon: '🪙' },
      { name: 'Éditeur de Deck', path: '/admin/deck-editor', icon: '🃏' },
      { name: 'Card Test', path: '/admin/test-card', icon: '🎴' }
    ]
  }
];

// Open/collapsed state
// User request: "dissimulé par defaut"
const expandedCategories = reactive({
  collections: false,
  'visual-core': false,
  'dev-tools': false
});

const toggleCategory = (id) => {
  expandedCategories[id] = !expandedCategories[id];
};

// Expand category ONLY if user is currently on a specific route, to help user orientation
onMounted(() => {
  menuCategories.forEach(cat => {
    if (cat.items.some(item => route.path === item.path)) {
      expandedCategories[cat.id] = true;
    }
  });
});

const navigate = (path) => {
  router.push(path);
  state.leftDrawerOpen = false;
};

const goHome = () => {
  router.push('/');
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

.category-header {
  background: transparent;
  border: none;
  cursor: pointer;
  outline: none;
}

.category-content {
  will-change: max-height, opacity;
}
</style>
