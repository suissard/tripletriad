<template>
  <div class="layout-tester-page">
    <div class="header">
      <h1>🎨 Testeur de Layouts</h1>
      <p>Basculez entre les différentes coques d'interface en un clic pour tester le rendu et l'édition.</p>
    </div>

    <div class="layouts-grid">
      <div 
        v-for="layout in availableLayouts" 
        :key="layout" 
        class="layout-card"
        :class="{ active: layoutStore.currentLayout === layout }"
        @click="activateLayout(layout)"
      >
        <div class="layout-icon">
          <span v-if="layout === 'AdminLayout'">🛠️</span>
          <span v-else-if="layout === 'PlayerLayout'">👤</span>
          <span v-else-if="layout === 'BlankLayout'">🔲</span>
          <span v-else>📦</span>
        </div>
        <div class="layout-info">
          <h3>{{ layout }}</h3>
          <span class="status-badge" v-if="layoutStore.currentLayout === layout">ACTIF</span>
        </div>
        <div class="layout-action">
          <AppButton 
            :variant="layoutStore.currentLayout === layout ? 'primary' : 'secondary'"
            size="small"
            style="width: 100%"
          >
            {{ layoutStore.currentLayout === layout ? 'Actif' : 'Activer' }}
          </AppButton>
        </div>
      </div>
    </div>

    <div class="info-section">
      <h3>ℹ️ Note Technique</h3>
      <p>
        Cette liste est générée dynamiquement à partir du dossier <code>front/src/layouts/</code>. 
        Tout nouveau fichier <code>.vue</code> ajouté dans ce dossier apparaîtra ici automatiquement (hors <code>AppLayout.vue</code>).
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useLayoutStore } from '../../stores/layoutStore';
import AppButton from '../../components/ui/AppButton.vue';

const layoutStore = useLayoutStore();

// Scan dynamique des layouts
const layoutFiles = import.meta.glob('../../layouts/*.vue');
const availableLayouts = computed(() => {
  return Object.keys(layoutFiles)
    .map(path => path.split('/').pop().replace('.vue', ''))
    .filter(name => name !== 'AppLayout');
});

function activateLayout(name) {
  layoutStore.setLayout(name);
}
</script>

<style scoped>
.layout-tester-page {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
  color: white;
}

.header {
  margin-bottom: 3rem;
  text-align: center;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(to right, var(--color-primary, #FFBF00), #fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header p {
  opacity: 0.7;
  font-size: 1.1rem;
}

.layouts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 4rem;
}

.layout-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.layout-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--color-primary, #FFBF00);
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.layout-card.active {
  background: color-mix(in srgb, var(--color-primary, #FFBF00) 15%, rgba(0, 0, 0, 0.4));
  border-color: var(--color-primary, #FFBF00);
  box-shadow: 0 0 20px color-mix(in srgb, var(--color-primary, #FFBF00) 30%, transparent);
}

.layout-icon {
  font-size: 3rem;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-info {
  text-align: center;
  flex-grow: 1;
}

.layout-info h3 {
  margin: 0;
  font-size: 1.4rem;
}

.status-badge {
  display: inline-block;
  background: var(--color-primary, #FFBF00);
  color: black;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 10px;
  margin-top: 5px;
}

.layout-action {
  width: 100%;
}

.info-section {
  background: rgba(0, 210, 255, 0.05);
  border: 1px solid rgba(0, 210, 255, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
}

.info-section h3 {
  margin-top: 0;
  color: #00d2ff;
}

.info-section code {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
