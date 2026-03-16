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
  { path: '/game', component: GameView, meta: { layout: 'BlankLayout' } },
  { path: '/collection', component: CollectionView },
  { path: '/deck-editor', component: DeckEditorPage },
  { path: '/decks', component: DecksPage },
  { path: '/boutique', component: PackOpening },
  { path: '/test-api', component: DevTestPage, meta: { layout: 'AdminLayout' } },
  { path: '/cartographie', component: ArchitectureMapPage, meta: { layout: 'AdminLayout' } },
  { path: '/story', component: StoryPage },
  { path: '/test-card', component: CardTestPage, meta: { layout: 'BlankLayout' } },
  { path: '/test-seed', component: SeedTesterPage, meta: { layout: 'AdminLayout' } },
  { path: '/test-coin', component: CoinTossTestPage, meta: { layout: 'AdminLayout' } },

  // Admin Routes
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('../admin/views/LoginView.vue'),
    meta: { layout: 'BlankLayout' }
  },
  {
    path: '/admin',
    name: 'admin-layout',
    // Le composant parent ici agit juste comme passe-plat, l'interface Admin est dans AdminLayout
    component: () => import('./AdminRouterView.vue'), // Ou juste un div avec <router-view>
    meta: { requiresAdminAuth: true, layout: 'AdminLayout' },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('../admin/views/DashboardView.vue'),
        meta: { layout: 'AdminLayout' }
      },
      {
        path: 'foil-editor',
        name: 'admin-foil-editor',
        component: () => import('../admin/views/FoilEditorView.vue'),
        meta: { layout: 'AdminLayout' }
      },
      {
        path: 'game-config',
        name: 'admin-game-config',
        component: () => import('../admin/views/GameConfigView.vue'),
        meta: { layout: 'AdminLayout' }
      },
      {
        path: ':collection',
        name: 'admin-dynamic-editor',
        component: () => import('../admin/components/DynamicEditor.vue'),
        meta: { layout: 'AdminLayout' }
      }
    ]
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
    const targetLayout = to.meta.layout || 'PlayerLayout';
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
