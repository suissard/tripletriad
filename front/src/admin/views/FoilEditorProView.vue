<template>
  <div class="h-screen w-full bg-background text-on-surface dark flex flex-col font-body">
    <!-- Header: Match Stitch prototype -->
    <header class="h-14 border-b border-outline-variant/10 bg-surface-container-lowest flex items-center justify-between px-6 z-50">
      <div class="flex items-center gap-8">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,210,255,0.3)]">
            <span class="material-symbols-outlined text-on-primary text-sm font-bold">layers</span>
          </div>
          <h1 class="font-headline font-bold text-lg tracking-tight text-on-surface">HoloEditor <span class="text-primary italic">Pro</span></h1>
        </div>

        <!-- Extracted Card Selection Dropdown to Header -->
        <nav class="hidden md:flex gap-6 relative" style="width: 300px;">
          <PremiumSelect
            v-model="selectedCardId"
            :options="cardOptions"
            label="Sélectionner un modèle"
            placeholder="Choisir une carte..."
            searchable
          >
            <template #icon>🎴</template>
          </PremiumSelect>
        </nav>
      </div>
      <div class="flex items-center gap-4">
        <!-- Optional: search/notifications as from design -->
        <button class="gradient-primary text-on-primary px-5 py-1.5 rounded-xl font-headline font-bold text-sm uppercase tracking-wider active:scale-95 transition-transform duration-150" @click="saveEffect" :disabled="!selectedCardId || saving">
          <span v-if="saving" class="animate-spin mr-2">⏳</span>
          {{ saving ? 'SAUVEGARDE...' : 'EXPORT' }}
        </button>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- SideNavBar: Persistent Layers from desktop_final -->
      <aside class="w-80 border-r border-outline-variant/10 bg-surface-container-lowest flex flex-col z-40 relative">
        <div class="flex justify-around items-center py-6 border-b border-outline-variant/5">
           <!-- Basic Tools Header (Info or generic icons from design) -->
          <button class="flex flex-col items-center gap-1 group">
            <div class="p-2 rounded-lg text-[#00d2ff] transition-all bg-[#29283a]">
              <span class="material-symbols-outlined" data-icon="draw">draw</span>
            </div>
            <span class="font-['Space_Grotesk'] text-[10px] font-medium uppercase text-slate-500">Mask</span>
          </button>
          <button class="flex flex-col items-center gap-1 group">
            <div class="p-2 rounded-lg text-slate-500 hover:bg-[#29283a] hover:text-[#00d2ff] transition-all">
              <span class="material-symbols-outlined" data-icon="rocket_launch">rocket_launch</span>
            </div>
            <span class="font-['Space_Grotesk'] text-[10px] font-medium uppercase text-slate-500">Render</span>
          </button>
        </div>

        <div class="flex-1 overflow-hidden flex flex-col">
          <div class="px-6 py-4 flex justify-between items-center bg-surface-container-lowest/50">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-sm">layers</span>
              <h3 class="font-headline font-bold text-xs uppercase tracking-wider text-on-surface">Layers ({{ layers.length }}/5)</h3>
            </div>
            <button @click="addLayer" v-if="layers.length < 5" class="text-[10px] font-headline font-bold text-primary flex items-center gap-1 hover:opacity-80 uppercase">
              <span class="material-symbols-outlined text-sm">add_circle</span> ADD
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
            <div v-for="(layer, i) in layers" :key="i"
                :class="['flex items-center gap-3 p-3 rounded-xl transition-colors group cursor-pointer', i === activeLayerIndex ? 'bg-surface-container-high border border-primary/20 shadow-[0_0_15px_rgba(71,214,255,0.05)]' : 'hover:bg-surface-container-low']"
                @click="selectLayer(i)"
            >
              <button @click.stop="toggleLayer(i)">
                <span :class="['material-symbols-outlined text-sm', i === activeLayerIndex ? 'text-primary' : (layer.enabled ? 'text-slate-500 group-hover:text-primary' : 'text-slate-500')]">{{ layer.enabled ? 'visibility' : 'visibility_off' }}</span>
              </button>
              <div class="flex-1 flex flex-col">
                <span :class="['text-xs font-medium', i === activeLayerIndex ? 'text-on-surface' : (layer.enabled ? 'text-slate-400' : 'text-slate-500 line-through')]">Calque {{ i + 1 }}</span>
                <span :class="['text-[9px]', i === activeLayerIndex ? 'text-primary/60' : 'text-slate-600']">{{ layer.enabled ? 'ACTIVE' : 'HIDDEN' }}</span>
              </div>
              <button v-if="layers.length > 1" @click.stop="deleteLayer(i)" class="text-[10px] hover:scale-110 text-red-500/60 hover:text-red-500 transition-all cursor-pointer outline-none ml-1" title="Supprimer">
                <span class="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        </div>

        <div class="p-6 border-t border-outline-variant/10 flex items-center justify-between">
            <div class="text-[10px] text-primary/50 font-black uppercase tracking-[0.2em] mt-1" v-if="loadingCards">Synchronisation...</div>
            <div v-else class="text-[10px] text-slate-500 font-bold uppercase">{{ cards.length }} Cards loaded</div>
        </div>
      </aside>

      <!-- Main Workspace -->
      <main class="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-surface-container-lowest editor-grid">
        <!-- Loading Overlay -->
        <div v-if="loadingEffect" class="absolute inset-0 z-[110] bg-[#0a0a1a]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
            <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <div class="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Synchronisation...</div>
        </div>

        <div class="absolute top-8 left-8 flex items-center gap-4 z-20">
          <div class="flex flex-col">
            <span class="font-headline text-lg font-bold tracking-tight text-on-surface">Card Canvas</span>
            <span class="font-label text-[10px] uppercase tracking-[0.2em] text-primary">Workspace</span>
          </div>
        </div>

        <!-- 1. Mask Editor (Left) & Live 3D Preview (Right) container -->
        <div class="flex w-full h-full p-8 pt-24 gap-8 justify-center items-center">

            <!-- Left: Square Viewport Container (Editor) -->
            <div class="relative w-[450px] h-[450px] bg-black rounded-xl overflow-hidden border-2 border-primary/30 shadow-[0_0_50px_rgba(0,210,255,0.15)] group flex-shrink-0"
                 @mousedown="onMouseDown"
                 @mousemove="onMouseMove"
                 @mouseup="onMouseUp"
                 @mouseleave="onMouseUp"
                 ref="cardContainerRef">
              <div class="absolute inset-0 z-0">
                <div class="w-full h-full bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-screen pointer-events-none"></div>
              </div>

              <!-- Static Card Base -->
              <img v-if="selectedCardData"
                :src="selectedCardData.imageUrl"
                class="absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-all duration-300 z-10"
                :class="{ 'brightness-50 grayscale-50': true, 'opacity-20': showFullMask }"
              />

              <!-- Active Canvas (For drawing) -->
              <canvas v-if="selectedCardData"
                ref="activeCanvasRef"
                :width="canvasDimensions.width"
                :height="canvasDimensions.height"
                class="absolute inset-0 w-full h-full pointer-events-none z-20"
                :style="{
                  opacity: showFullMask ? 1.0 : maskVisibility,
                  mixBlendMode: showFullMask ? 'normal' : 'screen',
                  filter: showFullMask ? 'none' : 'drop-shadow(0 0 2px white)'
                }"
              ></canvas>

              <!-- Custom Brush Cursor -->
              <div
                v-if="selectedCardData"
                class="absolute pointer-events-none rounded-full border-2 border-primary shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.5)] z-[100]"
                :style="{
                  left: `${mouseUV.x * 100}%`,
                  top: `${(1 - mouseUV.y) * 100}%`,
                  width: `${(brushSize / 512) * cardDimensions.width}px`,
                  height: `${(brushSize / 512) * cardDimensions.width}px`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: currentTool === 'draw' ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.2)',
                  display: isDragging ? 'block' : 'none'
                }"
              ></div>

              <div v-if="!selectedCardData" class="absolute inset-0 flex items-center justify-center z-10">
                <div class="w-64 h-64 border border-primary/20 rounded-lg flex items-center justify-center relative bg-primary/5 backdrop-blur-[2px]">
                   <span class="material-symbols-outlined text-primary text-5xl opacity-80">add_photo_alternate</span>
                </div>
              </div>
            </div>

            <!-- Right: 3D Preview Container -->
            <div class="relative w-[450px] h-[450px] rounded-xl overflow-visible flex items-center justify-center z-10">
                <div v-if="selectedCardData" class="transform scale-125 z-10">
                    <TripleTriadCard
                        :card="selectedCardData"
                        :override-effect="{ layers: layers }"
                        size="zoom"
                        :ratio="cardDimensions.aspectRatio"
                        :interactive="true"
                        :is-premium="true"
                        :always-visible="true"
                    />
                </div>
            </div>
        </div>

        <div class="absolute bottom-6 left-8 flex items-center gap-4 glass-panel p-2 rounded-2xl border border-outline-variant/20 z-20">
            <div class="flex gap-1 p-1 bg-surface-container-lowest rounded-xl">
                <button @click="invertMask" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors" title="Invert Mask"><span class="material-symbols-outlined">contrast</span></button>
                <button @click="triggerImageImport" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors" title="Import Image"><span class="material-symbols-outlined">image</span></button>
                <input type="file" ref="imageInputRef" accept="image/*" class="hidden" @change="handleImageImport">
                <button @click="triggerPatternImport" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors" title="Import Pattern"><span class="material-symbols-outlined">texture</span></button>
                <input type="file" ref="patternInputRef" accept="image/*" class="hidden" @change="handlePatternImport">
            </div>
        </div>

      </main>

      <!-- Right Property Panel -->
      <aside class="w-80 glass-panel border-l border-outline-variant/10 flex flex-col p-6 overflow-y-auto custom-scrollbar z-30">

        <!-- Section 1: Mask Tools -->
        <section class="mb-8" v-if="layers.length > 0">
          <h3 class="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-4">Masking Tools</h3>

          <div class="grid grid-cols-2 gap-2 mb-6">
            <button @click="setTool('draw')" :class="['border rounded-xl py-3 flex flex-col items-center gap-1 group transition-colors', currentTool === 'draw' ? 'bg-primary/10 border-primary/30' : 'bg-surface-container-highest/30 border-outline-variant/10 hover:border-primary/50']">
              <span :class="['material-symbols-outlined', currentTool === 'draw' ? 'text-primary' : 'text-slate-400 group-hover:text-primary']" style="font-variation-settings: 'FILL' 1;">brush</span>
              <span :class="['text-[10px] font-headline font-bold uppercase', currentTool === 'draw' ? 'text-primary' : 'text-slate-400 group-hover:text-primary']">BRUSH</span>
            </button>
            <button @click="setTool('erase')" :class="['border rounded-xl py-3 flex flex-col items-center gap-1 group transition-colors', currentTool === 'erase' ? 'bg-primary/10 border-primary/30' : 'bg-surface-container-highest/30 border-outline-variant/10 hover:border-primary/50']">
              <span :class="['material-symbols-outlined', currentTool === 'erase' ? 'text-primary' : 'text-slate-400 group-hover:text-primary']">ink_eraser</span>
              <span :class="['text-[10px] font-headline font-bold uppercase', currentTool === 'erase' ? 'text-primary' : 'text-slate-400 group-hover:text-primary']">ERASE</span>
            </button>
          </div>

          <div class="space-y-5">
            <div class="space-y-2">
              <div class="flex justify-between text-[10px] font-headline text-on-surface-variant">
                <span>BRUSH SIZE</span>
                <span class="text-primary font-bold">{{ brushSize }} PX</span>
              </div>
              <input type="range" v-model="brushSize" min="5" max="150" class="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none accent-tertiary">
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-[10px] font-headline text-on-surface-variant">
                <span>SOFTNESS</span>
                <span class="text-primary font-bold">{{ Math.round(brushSoftness * 100) }}%</span>
              </div>
              <input type="range" v-model="brushSoftness" min="0" max="1" step="0.01" class="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none accent-tertiary">
            </div>

            <div class="space-y-2 mt-4 pt-4 border-t border-outline-variant/10">
              <div class="flex justify-between items-center text-[10px] font-headline text-on-surface-variant mb-2">
                <span>MASK VISIBILITY (OVERLAY)</span>
                <button @click="showFullMask = !showFullMask" class="bg-surface-container-highest px-2 py-1 rounded text-[9px] hover:text-primary transition-colors">
                  {{ showFullMask ? 'ON' : 'OFF' }}
                </button>
              </div>
              <input v-if="!showFullMask" type="range" v-model.number="maskVisibility" min="0.0" max="1.0" step="0.01" class="w-full h-1 bg-surface-container-highest rounded-full appearance-none accent-primary">
            </div>
          </div>
        </section>

        <!-- Section 2: Effect Settings -->
        <section class="mb-4 flex-1" v-if="layers.length > 0">
          <h3 class="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-4">Effect Synthesis</h3>

          <div class="grid grid-cols-4 gap-2 mb-6">
              <button
                v-for="mode in foilModes"
                :key="mode.value"
                @click="activeLayer.foilMode = mode.value"
                :class="[
                  'group flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-300 gap-1.5',
                  activeLayer.foilMode === mode.value
                    ? 'bg-primary/10 border-primary/40 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.15)]'
                    : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08] hover:border-white/10'
                ]"
                :title="mode.label"
              >
                <div :class="[
                  'text-lg transition-transform duration-500 group-hover:scale-125',
                  activeLayer.foilMode === mode.value ? 'scale-110' : 'opacity-60'
                ]">
                  {{ mode.icon }}
                </div>
              </button>
          </div>

          <div class="space-y-6">
            <div class="space-y-2">
              <div class="flex justify-between text-[10px] font-headline text-on-surface-variant">
                <span>INTENSITY</span>
                <span class="text-tertiary font-bold">{{ (activeLayer.holoIntensity ?? 0).toFixed(1) }}</span>
              </div>
              <input type="range" v-model.number="activeLayer.holoIntensity" min="0" max="3" step="0.1" class="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none accent-tertiary">
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-[10px] font-headline text-on-surface-variant">
                <span>PARALLAX</span>
                <span class="text-tertiary font-bold">{{ (activeLayer.parallaxDepth ?? 0).toFixed(1) }}</span>
              </div>
              <input type="range" v-model.number="activeLayer.parallaxDepth" min="0" max="2.1" step="0.1" class="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none accent-tertiary">
            </div>

            <div v-if="activeLayer.patternData" class="p-2 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between mt-4">
                <span class="text-[8px] font-black text-primary uppercase">Texture Active</span>
                <button @click="activeLayer.patternData = null" class="text-red-500 text-[10px] font-bold hover:scale-110 transition-transform">×</button>
            </div>
          </div>
        </section>

      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, markRaw, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore.js';
import strapiService from '@/api/strapi';
import { getStrapiMediaUrl } from '@/utils/url';
import PremiumSelect from '../components/PremiumSelect.vue';
import TripleTriadCard from '../../components/TripleTriadCard.vue';
import { normalizeCard } from '../../game/state.js';
import '../../assets/foil-editor-pro.css'; // Import specific CSS

const MAX_LAYERS = 5;

// Refs & State
const cards = ref([]);
const selectedCardId = ref('');
const selectedCardData = computed(() => cards.value.find(c => String(c.documentId || c.id) === String(selectedCardId.value)));
const loadingCards = ref(false);
const loadingEffect = ref(false);
const saving = ref(false);
const currentExistingEffectId = ref(null);

const layers = ref([]);
const activeLayerIndex = ref(0);
const activeLayer = computed(() => layers.value[activeLayerIndex.value] || {});

const currentTool = ref('draw');
const brushSize = ref(30);
const brushSoftness = ref(0.2);

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const previewTilt = ref({ x: 0, y: 0 });
const mouseUV = ref({ x: 0.5, y: 0.5 });
const activeCanvasRef = ref(null);
const cardContainerRef = ref(null);
const imageInputRef = ref(null);
const patternInputRef = ref(null);
const cardDimensions = reactive({ width: 450, height: 450, aspectRatio: 1 });
const canvasDimensions = reactive({ width: 1024, height: 1024 });
const maskVisibility = ref(0.4);
const showFullMask = ref(false);

const foilModes = [
  { label: 'Standard', value: 0, icon: '🃏' },
  { label: 'Radiant', value: 11, icon: '☀️' },
  { label: 'Galaxy', value: 12, icon: '💠' },
  { label: 'Gold', value: 13, icon: '🏆' },
  { label: 'Ultra', value: 14, icon: '💎' },
  { label: 'Holo V', value: 16, icon: '⚡' },
  { label: 'V-Max', value: 17, icon: '🔥' },
  { label: 'V-Star', value: 18, icon: '⭐' },
  { label: 'Rainbow', value: 19, icon: '🌈' }
];

const cardOptions = computed(() => {
  return cards.value.map(c => ({
    label: `${c.name} (${c.rarity})`,
    value: c.documentId || c.id
  }));
});

onMounted(async () => {
  if (layers.value.length === 0) {
    resetToDefaultLayer();
  }
  await loadCards();
  if (route.query.id) {
    selectedCardId.value = String(route.query.id);
  }
});

watch(selectedCardId, (newId) => {
  if (newId) {
    onCardSelected();
  } else {
    resetToDefaultLayer();
  }
});

async function loadCards() {
  loadingCards.value = true;
  try {
    const res = await strapiService.fetchAll('cards', { populate: 'image' });
    if (!res.error) {
      const data = Array.isArray(res) ? res : (res.data || []);
      cards.value = data.map(c => {
        const rawData = c.attributes ? { id: c.id, ...c.attributes } : c;
        return normalizeCard(rawData);
      });
    }
  } catch (err) {
    console.error("Failed to load cards", err);
  } finally {
    loadingCards.value = false;
  }
}

let lastLoadId = 0;
async function onCardSelected() {
  const currentLoadId = ++lastLoadId;
  loadingEffect.value = true;
  resetToDefaultLayer();

  try {
    await nextTick();
    let card = selectedCardData.value;
    if (!card && selectedCardId.value) {
      card = cards.value.find(c => String(c.documentId || c.id) === String(selectedCardId.value));
    }

    if (!card) {
      loadingEffect.value = false;
      return;
    }

    const imageLoader = new Image();
    imageLoader.crossOrigin = "Anonymous";
    imageLoader.src = card.imageUrl;
    await new Promise((resolve) => {
      imageLoader.onload = () => resolve();
      imageLoader.onerror = () => resolve();
    });

    cardDimensions.width = 450;
    cardDimensions.height = 450;
    canvasDimensions.width = 1024;
    canvasDimensions.height = 1024;

    const cardIdentifier = card.documentId || card.id;
    if (String(route.query.id) !== String(cardIdentifier)) {
       router.replace({ query: { ...route.query, id: cardIdentifier } });
    }

    const res = await strapiService.find('foil-effects', {
      filters: { card: { documentId: { $eq: cardIdentifier } } },
      populate: 'layers'
    });

    if (currentLoadId !== lastLoadId) return;

    const dataArray = Array.isArray(res) ? res : (res.data || []);
    if (dataArray.length > 0) {
      const rawEffect = dataArray[0];
      const effectData = rawEffect.attributes || rawEffect;
      currentExistingEffectId.value = rawEffect.documentId || rawEffect.id;

      const rawLayers = effectData.layers || [];
      if (Array.isArray(rawLayers) && rawLayers.length > 0) {
        const layerPromises = rawLayers.map(async (lData) => {
          const newLayer = createDefaultLayer();
          Object.keys(lData).forEach(k => {
            if (k === 'id') newLayer.id = lData[k];
            else if (k === 'patternData') newLayer.patternData = lData[k];
            else if (k !== 'drawData' && k in newLayer) newLayer[k] = lData[k];
          });

          if (lData.drawData) {
            await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                newLayer.ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
                newLayer.ctx.drawImage(img, 0, 0, canvasDimensions.width, canvasDimensions.height);
                newLayer.drawData = lData.drawData;
                resolve();
              };
              img.onerror = () => resolve();
              img.src = lData.drawData;
            });
          }
          return newLayer;
        });

        const results = await Promise.all(layerPromises);
        if (currentLoadId === lastLoadId) layers.value = results;
      } else {
        resetToDefaultLayer();
      }
    } else {
      currentExistingEffectId.value = null;
      resetToDefaultLayer();
    }

    if (currentLoadId === lastLoadId) {
      activeLayerIndex.value = 0;
      syncCanvasToOverlay();
    }
  } catch(err) {
    console.error("FoilEditor: Error in onCardSelected", err);
    resetToDefaultLayer();
  } finally {
    if (currentLoadId === lastLoadId) loadingEffect.value = false;
  }
}

function syncCanvasToOverlay() {
  if (!activeCanvasRef.value || !activeLayer.value?.canvas) return;
  const overlayCtx = activeCanvasRef.value.getContext('2d');
  overlayCtx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
  overlayCtx.drawImage(activeLayer.value.canvas, 0, 0);
}

function resetToDefaultLayer() {
  layers.value = [createDefaultLayer()];
  activeLayerIndex.value = 0;
}

async function saveEffect() {
  if (!selectedCardId.value) return;
  saving.value = true;

  try {
    const exportedLayers = layers.value.map(l => {
      const layerPayload = {
        enabled: l.enabled,
        targetColor: l.targetColor,
        sensitivity: l.sensitivity,
        tolerance: l.tolerance,
        foilColor: l.foilColor,
        holoIntensity: l.holoIntensity,
        foilScale: l.foilScale,
        foilAngle: l.foilAngle,
        foilDirection: l.foilDirection,
        useRainbow: l.useRainbow,
        foilMode: l.foilMode,
        foilSpeed: l.foilSpeed,
        parallaxDepth: l.parallaxDepth,
        noiseIntensity: l.noiseIntensity,
        drawData: l.canvas.toDataURL('image/png'),
        patternData: l.patternData
      };
      if (l.id) layerPayload.id = l.id;
      return layerPayload;
    });

    const payload = {
      card: selectedCardId.value,
      layers: exportedLayers
    };

    let res;
    if (currentExistingEffectId.value) {
      res = await strapiService.update('foil-effects', currentExistingEffectId.value, payload);
    } else {
      res = await strapiService.create('foil-effects', payload);
    }

    if (res && res.error) throw new Error(res.error.message || "Save failed");

    const savedData = res.data || res;
    currentExistingEffectId.value = savedData.documentId || savedData.id;

    alert("Effet sauvegardé avec succès !");
  } catch (err) {
    alert("Erreur lors de la sauvegarde : " + err.message);
  } finally {
    saving.value = false;
  }
}

function createDefaultLayer() {
  const canvas = document.createElement('canvas');
  canvas.width = canvasDimensions.width;
  canvas.height = canvasDimensions.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);

  return reactive({
    enabled: true,
    targetColor: '#cc3333',
    sensitivity: 0.3,
    tolerance: 0.2,
    foilColor: '#ffffff',
    holoIntensity: 0.6,
    foilScale: 4.0,
    foilAngle: 0,
    foilDirection: 0,
    useRainbow: false,
    foilMode: 0,
    foilSpeed: 1.0,
    parallaxDepth: 1.0,
    noiseIntensity: 0,
    drawData: canvas.toDataURL('image/png'),
    patternData: null,
    canvas: markRaw(canvas),
    ctx: markRaw(ctx)
  });
}

function setTool(tool) { currentTool.value = tool; }

function invertMask() {
  if (!activeLayer.value?.ctx) return;
  const { width, height } = canvasDimensions;
  const ctx = activeLayer.value.ctx;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i+1] = 255 - data[i+1];
    data[i+2] = 255 - data[i+2];
  }

  ctx.putImageData(imageData, 0, 0);
  activeLayer.value.drawData = activeLayer.value.canvas.toDataURL();
  syncCanvasToOverlay();
}

function selectLayer(index) {
  activeLayerIndex.value = index;
  syncCanvasToOverlay();
}

function toggleLayer(index) {
  layers.value[index].enabled = !layers.value[index].enabled;
}

function addLayer() {
  if (layers.value.length < MAX_LAYERS) {
    layers.value.push(createDefaultLayer());
    activeLayerIndex.value = layers.value.length - 1;
    syncCanvasToOverlay();
  }
}

function deleteLayer(index) {
  if (layers.value.length > 1) {
    layers.value.splice(index, 1);
    if (activeLayerIndex.value >= layers.value.length) {
      activeLayerIndex.value = layers.value.length - 1;
    } else if (activeLayerIndex.value > index) {
      activeLayerIndex.value--;
    }
    syncCanvasToOverlay();
  }
}

function triggerImageImport() { imageInputRef.value?.click(); }

async function handleImageImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const layer = layers.value[activeLayerIndex.value];
      if (!layer) return;
      const ctx = layer.ctx;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);
      const ratio = Math.max(canvasDimensions.width / img.width, canvasDimensions.height / img.height);
      const nw = img.width * ratio;
      const nh = img.height * ratio;
      const nx = (canvasDimensions.width - nw) / 2;
      const ny = (canvasDimensions.height - nh) / 2;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasDimensions.width;
      tempCanvas.height = canvasDimensions.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(img, nx, ny, nw, nh);
      const imageData = tempCtx.getImageData(0, 0, canvasDimensions.width, canvasDimensions.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const grayscale = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        const alpha = data[i+3] / 255;
        const finalVal = grayscale * alpha;
        data[i] = finalVal; data[i+1] = finalVal; data[i+2] = finalVal; data[i+3] = 255;
      }
      tempCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0);
      layer.drawData = layer.canvas.toDataURL('image/png');
      syncCanvasToOverlay();
      e.target.value = '';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function triggerPatternImport() { patternInputRef.value?.click(); }

async function handlePatternImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const layer = layers.value[activeLayerIndex.value];
      if (!layer) return;
      const tempCanvas = document.createElement('canvas');
      const maxDim = 512;
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      tempCanvas.width = img.width * ratio;
      tempCanvas.height = img.height * ratio;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
      layer.patternData = tempCanvas.toDataURL('image/png');
      alert("Motif de texture mis à jour !");
      e.target.value = '';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function paint(uv) {
  const layer = layers.value[activeLayerIndex.value];
  if (!layer) return;
  const cx = uv.x * canvasDimensions.width;
  const cy = (1 - uv.y) * canvasDimensions.height;
  const r = (brushSize.value / 1024) * canvasDimensions.width;
  layer.ctx.beginPath();
  layer.ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (brushSoftness.value > 0) {
    const gradient = layer.ctx.createRadialGradient(cx, cy, r * (1 - brushSoftness.value), cx, cy, r);
    const color = currentTool.value === 'draw' ? '255, 255, 255' : '0, 0, 0';
    gradient.addColorStop(0, `rgba(${color}, 1)`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    layer.ctx.fillStyle = gradient;
  } else {
    layer.ctx.fillStyle = currentTool.value === 'draw' ? 'white' : 'black';
  }
  layer.ctx.fill();
  syncCanvasToOverlay();
}

function onMouseDown(e) {
  isDragging = true;
  previousMousePosition = { x: e.clientX, y: e.clientY };
  const rect = cardContainerRef.value?.getBoundingClientRect();
  if (!rect) return;
  const x = (e.clientX - rect.left) / rect.width;
  const y = 1.0 - (e.clientY - rect.top) / rect.height;
  mouseUV.value = { x, y };
  if (currentTool.value !== 'rotate') paint({ x, y });
}

function onMouseMove(e) {
  const rect = cardContainerRef.value?.getBoundingClientRect();
  if (!rect) return;
  const x = (e.clientX - rect.left) / rect.width;
  const y = 1.0 - (e.clientY - rect.top) / rect.height;
  mouseUV.value = { x, y };
  if (!isDragging) return;
  if (currentTool.value !== 'rotate') {
    paint({ x, y });
  } else {
    previewTilt.value.y += (e.clientX - previousMousePosition.x) * 0.5;
    previewTilt.value.x -= (e.clientY - previousMousePosition.y) * 0.5;
    previewTilt.value.x = Math.max(-30, Math.min(30, previewTilt.value.x));
    previewTilt.value.y = Math.max(-30, Math.min(30, previewTilt.value.y));
    previousMousePosition = { x: e.clientX, y: e.clientY };
  }
}

function onMouseUp() {
  if (isDragging && currentTool.value !== 'rotate') {
    const layer = activeLayer.value;
    if (layer && layer.canvas) {
      layer.drawData = layer.canvas.toDataURL('image/png');
    }
  }
  isDragging = false;
}

</script>
