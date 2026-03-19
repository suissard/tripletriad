import { createRouter, createWebHistory } from 'vue-router'
import GameView from '../views/GameView.vue'
import CollectionView from '../views/CollectionView.vue'
import DeckEditorPage from '../views/DeckEditorPage.vue'
import DecksPage from '../views/DecksPage.vue'
import PackOpening from '../views/PackOpening.vue'
import MainMenu from '../views/MainMenu.vue'
import StoryPage from '../views/StoryPage.vue'
import QuestsPage from '../views/QuestsPage.vue'

import { useUserStore } from '../stores/userStore'
// On ne peut pas importer useLayoutStore ici directement car pinia n'est peut-être pas encore instancié.
// On l'importera dans beforeEach.

const routes = [
  { path: '/', component: MainMenu },
  { path: '/game', component: GameView },
  { path: '/collection', component: CollectionView },
  { path: '/deck-editor', name: 'deck-editor-new', component: DeckEditorPage },
  { path: '/deck-editor/:documentId', name: 'deck-editor-edit', component: DeckEditorPage, props: true },
  { path: '/decks', component: DecksPage },
  { path: '/boutique', component: PackOpening },
  { path: '/story', component: StoryPage },
  { path: '/quests', component: QuestsPage },

  // Admin Routes
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

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  
  // Import dynamique pour éviter l'erreur "Pinia is not active" au chargement du module
  const { useLayoutStore } = await import('../stores/layoutStore');
  const layoutStore = useLayoutStore();
  const { state } = await import('../game/state.js');
  const { useNotificationStore } = await import('../stores/notificationStore');
  const notificationStore = useNotificationStore();
    
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

  if (to.meta.requiresAdminAuth) {
    if (!userStore.isLoggedIn) {
      // Pas connecté -> on ouvre le drawer d'auth et on reste sur la page actuelle ou on va à l'accueil
      state.rightDrawerOpen = true;
      notificationStore.addNotification('SYSTEM', 'Connexion requise pour accéder à la partie administration.', 'warning');
      next('/');
    } else if (!userStore.isAdmin) {
      // Connecté mais pas admin
      notificationStore.addNotification('SYSTEM', 'Accès refusé : Droits administrateur requis.', 'error');
      next('/');
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router
