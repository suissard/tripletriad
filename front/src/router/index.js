import { createRouter, createWebHistory } from 'vue-router'
import GameView from '../components/GameView.vue'
import CollectionView from '../components/CollectionView.vue'
import DeckEditorPage from '../components/DeckEditorPage.vue'
import DecksPage from '../components/DecksPage.vue'
import PackOpening from '../components/PackOpening.vue'
import DevTestPage from '../components/DevTestPage.vue'
import ArchitectureMapPage from '../components/ArchitectureMapPage.vue'
import MainMenu from '../components/MainMenu.vue'
import StoryPage from '../components/StoryPage.vue'


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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
