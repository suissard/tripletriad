<template>
  <div class="architecture-map-page">
    <div class="header">
      <h2>🗺️ Architecture Dynamique (Terra Nullius)</h2>
      <AppButton variant="secondary" class="glass-panel" @click="closeMap">Fermer</AppButton>
    </div>

    <div class="controls-panel">
      <AppButton variant="primary" size="small" @click="reloadMap">Recharger les données</AppButton>
    </div>

    <div class="map-container">
      <VueFlow v-model="elements" :default-zoom="0.5" :min-zoom="0.1" :max-zoom="4" fit-view-on-init class="vue-flow-custom">
        <Background pattern-color="#30363d" />
        <Controls />
      </VueFlow>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import AppButton from '@/components/ui/AppButton.vue';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';

const router = useRouter();
const elements = ref([]);

function loadArchitectureData() {
  // In a real scenario, this could fetch from a local endpoint that triggers the script
  // For now we load the statically generated JSON by the dev script
  import('@/admin/data/architecture.json').then((data) => {
    // Vite resolves JSON imports as default exports
    elements.value = data.default || data;
  }).catch(err => {
    console.error("Failed to load architecture data", err);
  });
}

function reloadMap() {
  elements.value = [];
  setTimeout(loadArchitectureData, 100);
}

function closeMap() {
  router.push('/admin');
}

onMounted(() => {
  loadArchitectureData();
});
</script>

<style scoped>
.architecture-map-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #0d1117;
  color: #e6edf3;
  z-index: 20000;
  display: flex;
  flex-direction: column;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 25px;
  background-color: #161b22;
  border-bottom: 1px solid #30363d;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  z-index: 10;
}

.header h2 {
  margin: 0;
  font-size: 1.4rem;
  color: #a371f7;
  text-shadow: 0 0 10px rgba(163, 113, 247, 0.3);
}

.controls-panel {
  padding: 10px 25px;
  background-color: #0d1117;
  border-bottom: 1px solid #30363d;
  display: flex;
  gap: 10px;
}

.map-container {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
}

:deep(.vue-flow__node) {
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  transition: transform 0.1s;
  cursor: grab;
  text-align: center;
  font-family: monospace;
  font-size: 0.8rem;
  line-height: 1.4;
  white-space: pre-wrap;
  min-width: 150px;
  word-wrap: break-word;
}

:deep(.vue-flow__node:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.5);
}

:deep(.vue-flow__node:active) {
  cursor: grabbing;
}

:deep(.vue-flow__edge-path) {
  stroke-width: 2;
  opacity: 0.6;
}

:deep(.vue-flow__edge.animated .vue-flow__edge-path) {
  stroke-dasharray: 5;
  animation: dashdraw 1s linear infinite;
}

@keyframes dashdraw {
  from { stroke-dashoffset: 10; }
  to { stroke-dashoffset: 0; }
}

:deep(.vue-flow__edge-textbg) {
  fill: #161b22;
}

:deep(.vue-flow__edge-text) {
  fill: #8b949e;
  font-size: 0.7rem;
}
</style>
