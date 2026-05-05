import { createRouter, createWebHashHistory } from 'vue-router'
import GameView from '../views/GameView.vue'
import CollectionView from '../views/CollectionView.vue'
import DeckEditorPage from '../views/DeckEditorPage.vue'
import DecksPage from '../views/DecksPage.vue'
import PackOpening from '../views/PackOpening.vue'
import BoutiquePage from '../views/BoutiquePage.vue'
import MainMenu from '../views/MainMenu.vue'
import StoryPage from '../views/StoryPage.vue'
import QuestsPage from '../views/QuestsPage.vue'
import StoryStepView from '../views/StoryStepView.vue'
import GuildsPage from '../views/GuildsPage.vue'

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
  { path: '/boutique', component: BoutiquePage },
  { path: '/open-pack/:collection/:type', name: 'pack-opening', component: PackOpening, props: true },
  { path: '/story', component: StoryPage },
  { path: '/story/:storyId/steps', name: 'story-steps', component: () => import('../views/StoryStepsPage.vue'), props: true },
  { path: '/story/:storyId/step/:stepIndex', component: StoryStepView },
  { path: '/quests', component: QuestsPage },
  { path: '/guilds', name: 'guilds', component: GuildsPage },
  { path: '/guilds/:documentId', name: 'guild-detail', component: GuildsPage, props: true },

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
    component: () => import('../admin/views/FoilEditorProView.vue'),
    meta: { layout: 'BlankLayout', requiresAdminAuth: true }
  },
  {
    path: '/admin/foil-editor-pro',
    name: 'admin-foil-editor-pro',
    component: () => import('../admin/views/FoilEditorProView.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/game-config',
    name: 'admin-game-config',
    component: () => import('../admin/views/GameConfigView.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/foil-gallery',
    name: 'admin-foil-gallery',
    component: () => import('../admin/views/FoilGalleryView.vue'),
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
    path: '/admin/cartographie-dyn',
    name: 'admin-cartographie-dyn',
    component: () => import('../admin/views/DynamicArchitectureMapPage.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/test-card',
    name: 'admin-test-card',
    component: () => import('../admin/views/CardTestPage.vue'),
    meta: { layout: 'BlankLayout', requiresAdminAuth: true }
  },
  {
    path: '/admin/deck-editor',
    name: 'admin-deck-editor-new',
    component: () => import('../views/DeckEditorPage.vue'),
    meta: { layout: 'BlankLayout', requiresAdminAuth: true }
  },
  {
    path: '/admin/deck-editor/:documentId',
    name: 'admin-deck-editor-edit',
    component: () => import('../views/DeckEditorPage.vue'),
    meta: { layout: 'BlankLayout', requiresAdminAuth: true },
    props: true
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
    path: '/admin/loading-test',
    name: 'admin-loading-test',
    component: () => import('../admin/views/LoadingTestPage.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/simulateur',
    name: 'admin-simulator',
    component: () => import('../admin/views/AISimulatorPage.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/stories',
    name: 'admin-stories',
    component: () => import('../admin/views/StoryArchivesPage.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/story-diagram/:storyFolder',
    name: 'admin-story-diagram',
    component: () => import('../components/StoryDiagram.vue'),
    meta: { requiresAdminAuth: true },
    props: true
  },
  {
    path: '/admin/frame-editor',
    name: 'admin-frame-editor',
    component: () => import('../admin/views/FrameEditorView.vue'),
    meta: { requiresAdminAuth: true }
  },
  {
    path: '/admin/skill-tester',
    name: 'admin-skill-tester',
    component: () => import('../admin/views/SkillTesterPage.vue'),
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
  history: createWebHashHistory(),
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

router.afterEach(async (to) => {
  const { useLayoutStore } = await import('../stores/layoutStore');
  const layoutStore = useLayoutStore();
  
  let targetLayout = 'PlayerLayout';
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

export default router
