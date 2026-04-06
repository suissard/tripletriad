<template>
  <div class="architecture-map-page">
    <div class="header">
      <div class="title-group">
        <h2>🗺️ Architecture (Arborescence)</h2>
        <span class="subtitle">Vue hiérarchique du projet</span>
      </div>
      
      <div class="filters-bar glass-panel">
        <div class="filter-item">
          <input v-model="filters.search" placeholder="Rechercher un fichier..." class="search-input" />
        </div>
        <div class="filter-item">
          <label>Profondeur max:</label>
          <input type="range" v-model.number="filters.maxDepth" min="0" max="6" />
          <span class="depth-val">{{ filters.maxDepth }}</span>
        </div>
        <div class="filter-item categories">
          <label v-for="cat in availableCategories" :key="cat" class="cat-checkbox">
            <input type="checkbox" v-model="filters.categories" :value="cat" />
            <span>{{ cat }}</span>
          </label>
        </div>
        <div class="filter-item">
          <label class="switch">
            <input type="checkbox" v-model="filters.focusMode">
            <span class="slider"></span>
          </label>
          <span class="label">Mode Focus</span>
        </div>
      </div>

      <div class="actions">
        <AppButton variant="primary" size="small" class="glass-panel" @click="reloadMap">Recharger</AppButton>
        <AppButton variant="secondary" class="glass-panel" @click="closeMap">Fermer</AppButton>
      </div>
    </div>

    <div class="map-container">
      <VueFlow 
        v-model="elements" 
        :default-zoom="0.3" 
        :min-zoom="0.01" 
        :max-zoom="4" 
        fit-view-on-init 
        class="vue-flow-custom"
        @node-click="onNodeClick"
        @pane-click="onPaneClick"
      >
        <Background pattern-color="#30363d" />
        <Controls />
      </VueFlow>

      <!-- Panel d'informations sur le nœud sélectionné -->
      <Transition name="slide-right">
        <div v-if="selectedNode" class="node-info-panel glass-panel">
          <div class="panel-header">
            <h3>Fiche Technique</h3>
            <button class="close-panel" @click="selectedNode = null">×</button>
          </div>
          <div class="panel-content">
            <div class="info-item">
              <label>Fichier</label>
              <span>{{ selectedNode.label.split('\n')[0] }}</span>
            </div>
            <div class="info-item">
              <label>Chemin</label>
              <code class="path-code">{{ selectedNode.data?.filePath || 'N/A' }}</code>
            </div>
            <div class="info-item">
              <label>Catégorie</label>
              <span class="category-tag" :style="{ backgroundColor: selectedNode.style?.backgroundColor }">
                {{ selectedNode.data?.category?.toUpperCase() || 'LOGIC' }}
              </span>
            </div>
            <div class="info-item" v-if="selectedNode.label.includes('KB')">
              <label>Taille</label>
              <span>{{ selectedNode.label.split('\n')[1].replace(/[()]/g, '') }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import AppButton from '@/components/ui/AppButton.vue';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';

const router = useRouter();
const allElements = ref([]);
const { fitView } = useVueFlow();

const filters = reactive({
  search: '',
  maxDepth: 6,
  categories: ['component', 'view', 'logic', 'store', 'admin', 'api', 'mechanic', 'config'],
  focusMode: false
});

const availableCategories = ['component', 'view', 'logic', 'store', 'admin', 'api', 'mechanic', 'config'];
const selectedNode = ref(null);

const elements = computed(() => {
  if (!allElements.value.length) return [];

  const nodes = allElements.value.filter(el => !el.source);
  const edges = allElements.value.filter(el => el.source);

  // 1. Filtrage des nœuds
  let filteredNodes = nodes.filter(node => {
    // Recherche
    if (filters.search && !node.label.toLowerCase().includes(filters.search.toLowerCase())) return false;
    // Profondeur
    if (node.data?.depth > filters.maxDepth) return false;
    // Catégorie
    if (!filters.categories.includes(node.data?.category)) return false;
    
    return true;
  });

  // 2. Mode Focus
  if (filters.focusMode && selectedNode.value) {
    const neighborIds = new Set();
    neighborIds.add(selectedNode.value.id);
    
    edges.forEach(edge => {
      if (edge.source === selectedNode.value.id) neighborIds.add(edge.target);
      if (edge.target === selectedNode.value.id) neighborIds.add(edge.source);
    });
    
    filteredNodes = filteredNodes.filter(node => neighborIds.has(node.id));
  }

  const nodeIds = new Set(filteredNodes.map(n => n.id));

  // 3. Filtrage des connexions (garder seulement si source ET cible sont visibles)
  const filteredEdges = edges.filter(edge => {
    return nodeIds.has(edge.source) && nodeIds.has(edge.target);
  });

  return [...filteredNodes, ...filteredEdges];
});

function loadArchitectureData() {
  import('@/admin/data/architecture.json').then((data) => {
    allElements.value = data.default || data;
    setTimeout(() => fitView(), 100);
  }).catch(err => {
    console.error("Échec du chargement des données", err);
  });
}

function onNodeClick({ node }) {
  selectedNode.value = node;
}

function onPaneClick() {
  if (!filters.focusMode) selectedNode.value = null;
}

function reloadMap() {
  allElements.value = [];
  selectedNode.value = null;
  loadArchitectureData();
}

function closeMap() {
  router.push('/admin');
}

onMounted(() => {
  loadArchitectureData();
});

watch(() => filters.maxDepth, () => {
  setTimeout(() => fitView(), 100);
});
</script>

<style scoped>
.architecture-map-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at center, #0d1117 0%, #010409 100%);
  color: #e6edf3;
  z-index: 20000;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background: rgba(22, 27, 34, 0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(48, 54, 61, 0.8);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  z-index: 100;
  gap: 20px;
}

.filters-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 20px;
  background: rgba(13, 17, 23, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: #8b949e;
}

.search-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(48, 54, 61, 1);
  border-radius: 6px;
  padding: 6px 12px;
  color: #e6edf3;
  width: 200px;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #58a6ff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.1);
}

.categories {
  display: flex;
  flex-wrap: wrap;
  max-width: 300px;
  gap: 4px 10px;
}

.cat-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.cat-checkbox input {
  margin: 0;
}

.depth-val {
  color: #58a6ff;
  font-weight: bold;
  min-width: 15px;
}

/* Switch UI */
.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.switch input { opacity: 0; width: 0; height: 0; }

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #30363d;
  transition: .4s;
  border-radius: 20px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px; width: 14px;
  left: 3px; bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider { background-color: #238636; }
input:checked + .slider:before { transform: translateX(16px); }

.actions {
  display: flex;
  gap: 10px;
}

.map-container {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* Panel Info Styles */
.node-info-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 320px;
  background: rgba(22, 27, 34, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  z-index: 100;
  box-shadow: -10px 0 30px rgba(0,0,0,0.5);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #58a6ff;
}

.close-panel {
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 1.5rem;
  cursor: pointer;
}

.info-item {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 0.75rem;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.path-code {
  background: rgba(0,0,0,0.3);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  word-break: break-all;
}

.category-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
  width: fit-content;
}

/* Animations */
.slide-right-enter-active, .slide-right-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-right-enter-from, .slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Vue Flow Custom */
:deep(.vue-flow__node) {
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

:deep(.vue-flow__node:hover) {
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 10px 20px rgba(0,0,0,0.5);
  z-index: 100 !important;
}

:deep(.vue-flow__edge-path) {
  stroke-width: 2;
  opacity: 0.4;
}

:deep(.vue-flow__edge:hover .vue-flow__edge-path) {
  stroke: #58a6ff;
  opacity: 1;
  stroke-width: 3;
}

:deep(.vue-flow__controls) {
  background: rgba(22, 27, 34, 0.8);
  border: 1px solid rgba(48, 54, 61, 0.5);
}

:deep(.vue-flow__background) {
  background-color: transparent !important;
}
</style>
