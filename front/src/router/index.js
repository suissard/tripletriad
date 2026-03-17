import { createRouter, createWebHistory } from 'vue-router'
import GameView from '../views/GameView.vue'
import CollectionView from '../views/CollectionView.vue'
import DeckEditorPage from '../views/DeckEditorPage.vue'
import DecksPage from '../views/DecksPage.vue'
import PackOpening from '../views/PackOpening.vue'
import DevTestPage from '../admin/views/DevTestPage.vue'
import ArchitectureMapPage from '../admin/views/ArchitectureMapPage.vue'
import MainMenu from '../views/MainMenu.vue'
import StoryPage from '../views/StoryPage.vue'
import CardTestPage from '../admin/views/CardTestPage.vue'
import SeedTesterPage from '../admin/views/SeedTesterPage.vue'
import CoinTossTestPage from '../admin/views/CoinTossTestPage.vue'

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
  { path: '/test-api', component: DevTestPage },
  { path: '/cartographie', component: ArchitectureMapPage },
  { path: '/story', component: StoryPage },
  { path: '/test-card', component: CardTestPage, meta: { layout: 'BlankLayout' } },
  { path: '/test-seed', component: SeedTesterPage },
  { path: '/test-coin', component: CoinTossTestPage },

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
