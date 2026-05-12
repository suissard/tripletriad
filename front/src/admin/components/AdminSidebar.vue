<template>
  <nav class="admin-nav custom-scrollbar" :class="{ 'is-collapsed': collapsed }">
    <!-- Dashboard - Always Visible -->
    <div class="nav-section-top">
      <button
        class="nav-item dashboard-item"
        :class="{ active: route.path === '/admin' }"
        @click="navigate('/admin')"
        :title="collapsed ? 'Dashboard' : undefined"
      >
        <span class="nav-icon">📊</span>
        <span class="nav-label" v-show="!collapsed">Dashboard</span>
      </button>
    </div>

    <!-- Collapsible Categories -->
    <div class="nav-categories">
      <div v-for="category in menuCategories" :key="category.id" class="category">
        <button
          class="category-toggle"
          @click="toggleCategory(category.id)"
          :title="collapsed ? category.title : undefined"
        >
          <span class="category-icon">{{ category.icon }}</span>
          <span class="category-label" v-show="!collapsed">{{ category.title }}</span>
          <span
            v-show="!collapsed"
            class="category-chevron"
            :class="{ expanded: expandedCategories[category.id] }"
          >
            ‹
          </span>
        </button>

        <transition name="expand">
          <div
            v-if="expandedCategories[category.id] && !collapsed"
            class="category-items"
          >
            <button
              v-for="item in category.items"
              :key="item.path"
              class="nav-item sub-item"
              :class="{ active: route.path === item.path }"
              @click="navigate(item.path)"
              @mouseenter="item.desc && showTooltip($event, item.desc)"
              @mouseleave="hideTooltip"
            >
              <span class="nav-icon sub-icon">{{ item.icon || '📁' }}</span>
              <span class="nav-label">{{ item.name }}</span>
            </button>
          </div>
        </transition>
      </div>
    </div>

    <!-- Bottom Section: Quick Dev + Home -->
    <div class="nav-bottom" v-show="!collapsed">
      <!-- Dev Quick Actions (inline, no submenu) -->
      <div class="dev-quick-section">
        <div class="dev-quick-header">
          <span class="category-icon">🔧</span>
          <span class="category-label">Quick Dev</span>
        </div>
        <div class="dev-quick-row">
          <button class="dev-chip" @click="doAutoLogin" title="Auto-login Admin">
            ⚡ Login
          </button>
          <button class="dev-chip" @click="checkAuth" title="Debug auth status">
            🔍 Auth
          </button>
          <button class="dev-chip danger" @click="fullLogout" title="Clear session">
            🗑️ Clear
          </button>
        </div>
        <div class="dev-quick-row">
          <button class="dev-chip" @click="addCurrency('coins')" title="+1000 Coins">
            💰 +Coins
          </button>
          <button class="dev-chip" @click="addCurrency('gems')" title="+1000 Gems">
            💎 +Gems
          </button>
          <button class="dev-chip" @click="addCurrency('dust')" title="+1000 Dust">
            ✨ +Dust
          </button>
        </div>
        <!-- Session status -->
        <div class="dev-status" v-if="userStore.isLoggedIn">
          <span class="status-dot online"></span>
          <span class="status-text">{{ userStore.user?.username }} (ID: {{ userStore.user?.id || '?' }})</span>
        </div>
        <div class="dev-status" v-else>
          <span class="status-dot offline"></span>
          <span class="status-text">Non connecté</span>
        </div>
      </div>

      <!-- Return Home -->
      <button class="nav-item home-btn" @click="goHome">
        <span class="nav-icon">←</span>
        <span class="nav-label">Retour Accueil</span>
      </button>
    </div>
  </nav>

  <!-- Teleported Tooltip (renders at body level to avoid overflow clipping) -->
  <Teleport to="body">
    <transition name="tooltip-fade">
      <div
        v-if="tooltip.visible"
        class="admin-nav-tooltip"
        :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
      >
        <div class="tooltip-arrow"></div>
        {{ tooltip.text }}
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, onMounted, defineProps } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { state } from '../../game/state.js';
import { useUserStore } from '../../stores/userStore.js';
import strapiService from '../../api/strapi.js';

const props = defineProps({
  collapsed: { type: Boolean, default: false }
});

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// ─── Reorganized Categories ───
const menuCategories = [
  {
    id: 'data',
    title: 'Données',
    icon: '📦',
    items: [
      { name: 'Utilisateurs', path: '/admin/users', icon: '👥', desc: 'Gérer les comptes joueurs, rôles et permissions.' },
      { name: 'Cartes', path: '/admin/cards', icon: '🎴', desc: 'Créer, modifier et équilibrer les cartes du jeu.' },
      { name: 'Decks', path: '/admin/decks', icon: '🃏', desc: 'Voir et gérer tous les decks créés par les joueurs.' },
      { name: 'Quêtes (Templates)', path: '/admin/quest-templates', icon: '📜', desc: 'Définir les modèles de quêtes et leurs récompenses.' },
      { name: 'Quêtes (Joueurs)', path: '/admin/player-quests', icon: '⚔️', desc: 'Suivre la progression des quêtes par joueur.' },
      { name: 'Collections', path: '/admin/collections', icon: '📦', desc: 'Gérer les sets de boosters et packs disponibles.' },
      { name: 'Boutique', path: '/admin/shops', icon: '🛒', desc: 'Configurer les articles de la boutique en jeu.' },
      { name: 'Wallets', path: '/admin/wallets', icon: '💰', desc: 'Consulter les portefeuilles et devises des joueurs.' }
    ]
  },
  {
    id: 'editors',
    title: 'Éditeurs',
    icon: '🎨',
    items: [
      { name: 'Configuration', path: '/admin/game-config', icon: '⚙️', desc: 'Paramètres globaux : couleurs, règles, économie du jeu.' },
      { name: 'HoloEditor Pro', path: '/admin/foil-editor', icon: '✨', desc: 'Éditeur visuel pour les effets holographiques des cartes.' },
      { name: 'Éditeur de Cadres', path: '/admin/frame-editor', icon: '🖼️', desc: 'Créer et positionner les cadres visuels des cartes.' },
      { name: 'Foil Gallery', path: '/admin/foil-gallery', icon: '🎨', desc: 'Galerie de tous les effets foil enregistrés.' }
    ]
  },
  {
    id: 'gameplay',
    title: 'Gameplay',
    icon: '⚔️',
    items: [
      { name: 'Simulateur IA', path: '/admin/simulateur', icon: '🤖', desc: 'Simuler des matchs IA vs IA pour tester l\'équilibrage.' },
      { name: 'Testeur de Carte', path: '/admin/card-tester', icon: '⚖️', desc: 'Tester une carte en combat avec prévisualisation live.' },
      { name: 'Skill Tester', path: '/admin/skill-tester', icon: '✨', desc: 'Tester les compétences et effets spéciaux des cartes.' },
      { name: 'Mode Histoire', path: '/admin/stories', icon: '📖', desc: 'Gérer les arcs narratifs et situations du mode histoire.' }
    ]
  },
  {
    id: 'dev',
    title: 'Dev Tools',
    icon: '🔧',
    items: [
      { name: 'Testeur API', path: '/admin/test-api', icon: '🧪', desc: 'Envoyer des requêtes brutes à l\'API Strapi.' },
      { name: 'Architecture', path: '/admin/cartographie-dyn', icon: '🔭', desc: 'Carte interactive de l\'architecture du projet.' },
      { name: 'Testeur Seed', path: '/admin/test-seed', icon: '🎲', desc: 'Tester la distribution aléatoire et les seeds.' },
      { name: 'Coin Toss', path: '/admin/test-coin', icon: '🪙', desc: 'Testeur visuel du lancer de pièce (pile ou face).' },
      { name: 'Layout Tester', path: '/admin/layouts', icon: '🖥️', desc: 'Basculer entre les différents layouts de l\'app.' },
      { name: 'Card Test', path: '/admin/test-card', icon: '🎴', desc: 'Prévisualiser le rendu visuel d\'une carte isolée.' },
      { name: 'Design System', path: '/admin/design-system', icon: '🧩', desc: 'Référentiel des composants UI et boutons du projet.' }
    ]
  }
];

// Collapse state — auto-expand active category
const expandedCategories = reactive({
  data: false,
  editors: false,
  gameplay: false,
  dev: false
});

onMounted(() => {
  menuCategories.forEach(cat => {
    if (cat.items.some(item => route.path === item.path)) {
      expandedCategories[cat.id] = true;
    }
  });
});

const toggleCategory = (id) => {
  expandedCategories[id] = !expandedCategories[id];
};

const navigate = (path) => {
  router.push(path);
  // On mobile, close the drawer
  state.leftDrawerOpen = false;
  hideTooltip();
};

// ─── Tooltip Logic ───
const tooltip = reactive({
  visible: false,
  text: '',
  x: 0,
  y: 0
});

let tooltipTimer = null;

function showTooltip(event, desc) {
  clearTimeout(tooltipTimer);
  tooltipTimer = setTimeout(() => {
    const rect = event.currentTarget.getBoundingClientRect();
    tooltip.text = desc;
    tooltip.x = rect.right + 12;
    tooltip.y = rect.top + rect.height / 2;
    tooltip.visible = true;
  }, 300);
}

function hideTooltip() {
  clearTimeout(tooltipTimer);
  tooltip.visible = false;
}

const goHome = () => {
  router.push('/');
  state.leftDrawerOpen = false;
};

// ─── Dev Actions (absorbed from DevOptions) ───
async function doAutoLogin() {
  try {
    const data = await strapiService.login({ identifier: 'admin@gmail.com', password: 'Password123456789!' });
    if (data.jwt) {
      userStore.setAuth(data.jwt, data.user);
    }
  } catch (error) {
    console.error('Auto-login error:', error);
  }
}

async function checkAuth() {
  if (!userStore.jwt) {
    alert('Aucun JWT trouvé ! Utilisez "⚡ Login" d\'abord.');
    return;
  }
  try {
    const data = await strapiService.getMe();
    const roleName = data.role?.name || data.role?.type || 'Inconnu';
    alert(`Auth OK:\n- User: ${data.username}\n- Role: ${roleName}`);
  } catch (e) {
    alert('Erreur de connexion au serveur Strapi.');
  }
}

function fullLogout() {
  userStore.logout();
  localStorage.removeItem('tt_jwt');
  localStorage.removeItem('tt_user');
}

function addCurrency(type) {
  const payload = {};
  payload[type] = 1000;
  userStore.addDevCurrencies(payload);
}
</script>

<style scoped>
.admin-nav {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 8px;
  gap: 4px;
}

.admin-nav.is-collapsed {
  padding: 12px 4px;
  align-items: center;
}

/* ─── Scrollbar ─── */
.custom-scrollbar::-webkit-scrollbar {
  width: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

/* ─── Top Section ─── */
.nav-section-top {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

/* ─── Nav Items ─── */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.85);
}

.nav-item.active {
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 25%, transparent);
  box-shadow: 0 4px 15px color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.nav-item.active .nav-icon {
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--color-primary) 60%, transparent));
}

.dashboard-item {
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav-icon {
  flex-shrink: 0;
  font-size: 1rem;
  opacity: 0.6;
  transition: all 0.2s ease;
}

.nav-item:hover .nav-icon,
.nav-item.active .nav-icon {
  opacity: 1;
}

.sub-item {
  padding-left: 24px;
  font-size: 0.75rem;
  font-weight: 500;
}

.sub-icon {
  font-size: 0.85rem;
}

.nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Category Toggle ─── */
.category {
  margin-bottom: 2px;
}

.category-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.3);
  transition: all 0.2s ease;
}

.category-toggle:hover {
  color: rgba(255, 255, 255, 0.6);
}

.category-icon {
  flex-shrink: 0;
  font-size: 0.85rem;
}

.category-label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  flex: 1;
  text-align: left;
}

.category-chevron {
  font-size: 0.7rem;
  transition: transform 0.3s ease;
  transform: rotate(-90deg);
  opacity: 0.5;
}

.category-chevron.expanded {
  transform: rotate(-270deg);
}

/* ─── Category Expand Animation ─── */
.category-items {
  padding: 2px 0 4px 0;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-4px);
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
  transform: translateY(0);
}

/* ─── Bottom Section ─── */
.nav-bottom {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.home-btn {
  color: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.home-btn:hover {
  color: rgba(255, 255, 255, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
}

/* ─── Dev Quick Actions ─── */
.dev-quick-section {
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.dev-quick-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  margin-bottom: 6px;
}

.dev-quick-header .category-label {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.3);
}

.dev-quick-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.dev-chip {
  flex: 1;
  padding: 4px 6px;
  font-size: 0.6rem;
  font-weight: 700;
  font-family: inherit;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.dev-chip:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.15);
}

.dev-chip.danger {
  color: rgba(255, 0, 85, 0.6);
  border-color: rgba(255, 0, 85, 0.15);
}

.dev-chip.danger:hover {
  background: rgba(255, 0, 85, 0.1);
  color: #ff0055;
  border-color: rgba(255, 0, 85, 0.3);
}

/* ─── Dev Status ─── */
.dev-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.35);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.online {
  background: #00ff88;
  box-shadow: 0 0 4px #00ff88;
}

.status-dot.offline {
  background: #ff0055;
  box-shadow: 0 0 4px #ff0055;
}

.status-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Tooltip styles are in the unscoped block below */
</style>

<!-- Unscoped styles for Teleported tooltip (renders at body level) -->
<style>
.admin-nav-tooltip {
  position: fixed;
  transform: translateY(-50%);
  padding: 10px 16px;
  min-width: 200px;
  max-width: 300px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
  line-height: 1.5;
  letter-spacing: 0.01em;
  color: rgba(255, 255, 255, 0.9);
  white-space: normal;
  word-wrap: break-word;
  pointer-events: none;
  z-index: 10000;

  /* Glassmorphism */
  background: rgba(8, 8, 22, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    0 0 20px rgba(0, 210, 255, 0.05);
}

.tooltip-arrow {
  position: absolute;
  left: -5px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: rgba(8, 8, 22, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

/* Transition */
.tooltip-fade-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tooltip-fade-leave-active {
  transition: opacity 0.1s ease;
}
.tooltip-fade-enter-from {
  opacity: 0;
  transform: translateY(-50%) translateX(6px);
}
.tooltip-fade-leave-to {
  opacity: 0;
}
.tooltip-fade-enter-to {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}
</style>
