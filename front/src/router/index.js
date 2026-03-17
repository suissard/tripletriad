import { createRouter, createWebHistory } from 'vue-router'
import GameView from '../views/GameView.vue'
import CollectionView from '../views/CollectionView.vue'
import DeckEditorPage from '../views/DeckEditorPage.vue'
import DecksPage from '../views/DecksPage.vue'
import PackOpening from '../views/PackOpening.vue'
import MainMenu from '../views/MainMenu.vue'
import StoryPage from '../views/StoryPage.vue'
import QuestsPage from '../views/QuestsPage.vue'

import { useAuthStore } from '../admin/stores/authStore'
// On ne peut pas importer useLayoutStore ici directement car pinia n'est peut-être pas encore instancié.
// On l'importera dans beforeEach.

const routes = [
  { path: '/', component: MainMenu },
  { path: '/game', component: GameView },
  { path: '/collection', component: CollectionView },
  { path: '/deck-editor', component: DeckEditorPage },
  { path: '/decks', component: DecksPage },
  { path: '/boutique', component: PackOpening },
  { path: '/story', component: StoryPage },
  { path: '/quests', component: QuestsPage },

  // Admin Routes
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('../admin/views/LoginView.vue'),
    meta: { layout: 'BlankLayout' }
  },
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: () => import('../admin/views/DashboardView.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/foil-editor',
    name: 'admin-foil-editor',
    component: () => import('../admin/views/FoilEditorView.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/game-config',
    name: 'admin-game-config',
    component: () => import('../admin/views/GameConfigView.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/test-api',
    name: 'admin-test-api',
    component: () => import('../admin/views/DevTestPage.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/cartographie',
    name: 'admin-cartographie',
    component: () => import('../admin/views/ArchitectureMapPage.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/test-card',
    name: 'admin-test-card',
    component: () => import('../admin/views/CardTestPage.vue'),
    meta: { layout: 'BlankLayout', requiresAdminAuth: true }
  },
  {
    path: '/admin/test-seed',
    name: 'admin-test-seed',
    component: () => import('../admin/views/SeedTesterPage.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/test-coin',
    name: 'admin-test-coin',
    component: () => import('../admin/views/CoinTossTestPage.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/:collection',
    name: 'admin-dynamic-editor',
    component: () => import('../admin/components/DynamicEditor.vue'),
    meta: { requiresAdminAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  // Import dynamique pour éviter l'erreur "Pinia is not active" au chargement du module
  import('../stores/layoutStore').then(({ useLayoutStore }) => {
    const layoutStore = useLayoutStore();
    
    // Détermination automatique du layout
    let targetLayout = 'PlayerLayout'; // Défaut
    
    if (to.meta.layout) {
      targetLayout = to.meta.layout;
    } else if (to.path.startsWith('/admin')) {
      targetLayout = 'AdminLayout';
    } else if (to.path.startsWith('/game')) {
      targetLayout = 'BlankLayout';
    }

    if (layoutStore.currentLayout !== targetLayout) {
      layoutStore.setLayout(targetLayout);
    }
  });

  if (to.meta.requiresAdminAuth && !authStore.isAuthenticated) {
    next('/admin/login');
  } else if (to.name === 'admin-login' && authStore.isAuthenticated) {
    next('/admin');
  } else {
    next();
  }
});

export default router
