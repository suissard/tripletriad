<template>
  <div class="min-h-full w-full bg-[#0a0a1a] text-white relative font-sans flex flex-col lg:flex-row gap-6 p-6">
    
    <!-- Central Layout: Mask Editor & Live Preview Preview -->
    <div class="flex-1 flex flex-col min-h-screen">
      <!-- Toolbar -->
      <AppPanel class="p-2 mb-4 flex items-center justify-center gap-2 max-w-fit mx-auto sticky top-0 z-20" :padding="false">
        <AppButton
          variant="ghost"
          :class="['px-6 py-2 text-xs font-bold transition-all', currentTool === 'rotate' ? 'bg-primary/20 text-white' : 'text-gray-400']"
          @click="setTool('rotate')"
        >🔄 3D VIEW</AppButton>

        <!-- Paint button -->
        <AppButton
          variant="ghost"
          :class="['px-6 py-2 text-xs font-bold transition-all', currentTool === 'draw' ? 'bg-primary/20 text-white' : 'text-gray-400']"
          @click="setTool('draw')"
        >🖌️ PAINT</AppButton>

        <!-- Erase button -->
        <AppButton
          variant="ghost"
          :class="['px-6 py-2 text-xs font-bold transition-all', currentTool === 'erase' ? 'bg-primary/20 text-white' : 'text-gray-400']"
          @click="setTool('erase')"
        >🧽 ERASE</AppButton>

        <!-- Brush params -->
        <template v-if="currentTool === 'draw' || currentTool === 'erase'">
          <div class="w-px h-6 bg-white/20 mx-1"></div>
          <div class="flex items-center gap-3 px-2">
            <div class="flex items-center gap-1.5">
              <span class="text-[9px] font-bold text-gray-500 uppercase">Taille</span>
              <input type="range" v-model="brushSize" min="5" max="150" class="w-20 accent-primary h-1 bg-white/20 rounded-full appearance-none">
              <span class="text-[9px] text-gray-400 font-bold min-w-[2.5ch]">{{ brushSize }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[9px] font-bold text-gray-500 uppercase">Douceur</span>
              <input type="range" v-model="brushSoftness" min="0" max="1" step="0.01" class="w-20 accent-primary h-1 bg-white/20 rounded-full appearance-none">
            </div>
          </div>
        </template>
      </AppPanel>

      <div class="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-0">
        <!-- 1. Mask Editor (Fixed Image) -->
        <div class="relative flex flex-col gap-3">
          <div class="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] px-2 flex items-center justify-between">
            <span>Éditeur de Masque (Fixe)</span>
            <span class="text-[8px] bg-white/5 border border-white/10 px-2 py-0.5 rounded opacity-40">CALQUE : {{ activeLayerIndex + 1 }}</span>
          </div>
          <div 
            class="relative flex-1 min-h-[400px] rounded-2xl overflow-hidden glass-panel border border-white/10 shadow-2xl flex items-center justify-center bg-black/40"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"
          >
            <!-- Flexible Card Container based on Aspect Ratio -->
              <div 
                v-if="selectedCardData"
                ref="cardContainerRef"
                class="relative rounded-lg overflow-hidden shadow-2xl"
                :style="{ 
                  width: '450px', 
                  height: '450px',
                  aspectRatio: '1/1'
                }"
              >
              <!-- Static Card Base -->
              <img 
                :src="selectedCardData.imageUrl" 
                class="w-full h-full object-cover pointer-events-none select-none transition-all duration-300" 
                :class="{ 'brightness-50 grayscale-50': currentTool !== 'rotate', 'opacity-20': showFullMask }"
              />

              <!-- Active Canvas (For drawing) -->
              <canvas 
                v-show="currentTool !== 'rotate'"
                ref="activeCanvasRef" 
                :width="canvasDimensions.width" 
                :height="canvasDimensions.height"
                class="absolute inset-0 w-full h-full pointer-events-none z-10"
                :style="{ 
                  opacity: showFullMask ? 1.0 : maskVisibility,
                  mixBlendMode: showFullMask ? 'normal' : 'screen',
                  filter: showFullMask ? 'none' : 'drop-shadow(0 0 2px white)'
                }"
              ></canvas>

              <!-- Custom Brush Cursor -->
              <div 
                v-if="selectedCardData && (currentTool === 'draw' || currentTool === 'erase')"
                class="absolute pointer-events-none rounded-full border-2 border-primary shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.5)] z-[100]"
                :style="{
                  left: `${mouseUV.x * 100}%`,
                  top: `${(1 - mouseUV.y) * 100}%`,
                  width: `${(brushSize / 512) * cardDimensions.width}px`,
                  height: `${(brushSize / 512) * cardDimensions.width}px`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: currentTool === 'draw' ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.2)'
                }"
              ></div>
            </div>
            <div v-else class="text-gray-500 font-bold uppercase tracking-widest text-xs">Sélectionnez une carte...</div>
          </div>
        </div>

        <!-- 2. Live 3D Preview (TripleTriadCard) -->
        <div class="relative flex flex-col gap-3">
          <div class="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] px-2">Rendu Final (Interactif)</div>
          <div class="relative flex-1 min-h-[400px] rounded-2xl overflow-hidden glass-panel border border-white/10 shadow-2xl flex items-center justify-center bg-black/60 shadow-[inset_0_0_50px_rgba(var(--color-primary-rgb),0.05)]">
            <div v-if="selectedCardData" class="transform scale-125">
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
            <div v-else class="text-gray-500 font-bold uppercase tracking-widest text-xs">Aperçu en attente...</div>
          </div>
        </div>
      </div>
    </div>


    <!-- Right Side: Control Panel -->
    <AppPanel class="w-full lg:flex-1 lg:min-w-[340px] flex-shrink-0 flex flex-col z-10 lg:h-full lg:max-h-full overflow-y-auto custom-scrollbar shadow-2xl border border-white/10 bg-black/60 backdrop-blur-md">
      <div class="my-4 text-center">
        <h2 class="text-2xl font-black text-white tracking-tighter uppercase italic">HoloEditor <span class="text-primary italic">Pro</span></h2>
        <p class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-1 pl-1">Visual FX Engine</p>
      </div>

      <div class="foil-sections-grid pb-4">

        <!-- 1. Carte & Calques -->
        <section class="foil-section space-y-4">
          <div class="border-b border-white/10 pb-2">
            <h3 class="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.5)]"></span>
              CARTE & CALQUES
            </h3>
          </div>
          
          <div class="space-y-4">
            <!-- Card selection box -->
            <PremiumSelect
              v-model="selectedCardId"
              :options="cardOptions"
              label="Sélectionner un modèle"
              placeholder="Choisir une carte..."
              searchable
              @change="onCardSelected"
            >
              <template #icon>🎴</template>
            </PremiumSelect>

            <!-- Layers (compact) -->
            <div class="flex flex-col gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/10 group hover:border-primary/20 transition-all duration-300">
              <div class="flex justify-between items-center px-1">
                <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Gérer les calques ({{ layers.length }}/5)</label>
                <button v-if="layers.length < 5" @click="addLayer" class="text-[9px] font-black text-primary hover:text-primary-light transition-all cursor-pointer uppercase flex items-center gap-1">
                  <span>AJOUTER</span> <span class="text-xs">+</span>
                </button>
              </div>
              <div class="flex flex-wrap gap-1.5 pt-1">
                <div v-for="(layer, i) in layers" :key="i"
                     :class="['flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border cursor-pointer select-none group/item', i === activeLayerIndex ? 'bg-primary/20 border-primary/40 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.1)]' : 'bg-white/5 border-transparent opacity-60 hover:opacity-100']"
                     @click="selectLayer(i)"
                >
                  <span :class="['text-[10px] font-black tracking-wider transition-colors', i === activeLayerIndex ? 'text-white' : 'text-gray-400']">{{ i + 1 }}</span>
                  <button @click.stop="toggleLayer(i)" class="text-[10px] hover:scale-110 transition-transform cursor-pointer outline-none opacity-40 hover:opacity-100" :title="layer.enabled ? 'Cacher' : 'Afficher'">
                    {{ layer.enabled ? '👁️' : '❌' }}
                  </button>
                  <button v-if="layers.length > 1" @click.stop="deleteLayer(i)" class="text-[10px] hover:scale-110 text-red-500/60 hover:text-red-500 transition-all cursor-pointer outline-none ml-1" title="Supprimer">
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="loadingCards" class="text-[9px] text-primary/50 font-black uppercase tracking-[0.2em] mt-1 animate-pulse px-2">Synchronisation...</div>
        </section>

        <!-- Only show settings if there is at least 1 layer -->
        <template v-if="layers.length > 0">

          <!-- 2. Configuration du Masque -->
          <section class="foil-section space-y-4 pt-2">
            <h3 class="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 border-b border-white/10 pb-2">
              <span class="w-2 h-2 rounded-full bg-primary/40"></span>
              MASQUE & SÉLECTION
            </h3>
            
            <div class="grid grid-cols-1 gap-4">
              <!-- Basic Tools -->
              <div class="flex gap-2">
                <AppButton variant="ghost" size="sm" class="flex-1 h-10 border border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/20 text-[9px] font-black uppercase tracking-widest transition-all" @click="triggerSvgImport">
                  📥 SVG
                  <input type="file" ref="svgInputRef" accept=".svg" class="hidden" @change="handleSvgImport">
                </AppButton>

                <AppButton variant="ghost" size="sm" class="flex-1 h-10 border border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/20 text-[9px] font-black uppercase tracking-widest transition-all" @click="triggerImageImport">
                  🖼️ IMAGE
                  <input type="file" ref="imageInputRef" accept="image/*" class="hidden" @change="handleImageImport">
                </AppButton>
                
                <AppButton variant="ghost" size="sm" class="flex-1 h-10 border border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/20 text-[9px] font-black uppercase tracking-widest transition-all" @click="generateMaskFromColor">
                  🪄 BAGUETTE
                </AppButton>
              </div>

              <!-- Mask Visibility and Advanced Settings -->
              <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
                <div class="flex flex-col gap-3">
                  <div class="flex justify-between items-center">
                    <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Visibilité du masque (Vue Blanche)</label>
                    <div class="flex items-center gap-2">
                      <button @click="showFullMask = !showFullMask" 
                              :class="['text-[8px] font-black px-2 py-0.5 rounded transition-all flex items-center gap-1.5', showFullMask ? 'bg-primary text-black' : 'bg-white/10 text-gray-400']">
                        <span :class="['w-1.5 h-1.5 rounded-full', showFullMask ? 'bg-black' : 'bg-white/20']"></span>
                        OVERLAY
                      </button>
                      <span class="text-[9px] text-white/50 font-black">{{ Math.round(maskVisibility * 100) }}%</span>
                    </div>
                  </div>
                  <input type="range" v-model.number="maskVisibility" min="0.0" max="1.0" step="0.01" class="w-full h-1 bg-white/10 rounded-full appearance-none accent-primary">
                </div>

                <!-- Advanced auto-selection tweak -->
                <div class="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                   <div>
                    <div class="flex justify-between items-center mb-2">
                      <label class="text-[8px] font-bold text-gray-600 uppercase">Tolérance</label>
                      <span class="text-[8px] text-primary">{{ Math.round(activeLayer.tolerance * 100) }}%</span>
                    </div>
                    <input type="range" v-model.number="activeLayer.tolerance" min="0.0" max="1.0" step="0.01" class="w-full h-0.5 bg-white/5 rounded-full appearance-none accent-primary/60">
                  </div>
                  <div>
                    <div class="flex justify-between items-center mb-2">
                      <label class="text-[8px] font-bold text-gray-600 uppercase">Sensibilité</label>
                      <span class="text-[8px] text-primary">{{ Math.round(activeLayer.sensitivity * 100) }}%</span>
                    </div>
                    <input type="range" v-model.number="activeLayer.sensitivity" min="0.01" max="1.0" step="0.01" class="w-full h-0.5 bg-white/5 rounded-full appearance-none accent-primary/60">
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 3. Style Holographique -->
          <section class="foil-section space-y-4 pt-2 mb-6">
            <h3 class="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 border-b border-white/10 pb-2">
              <span class="w-2 h-2 rounded-full bg-primary/20"></span>
              STYLE HOLOGRAPHIQUE
            </h3>

            <!-- Visual Style Selector -->
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
              >
                <div :class="[
                  'text-lg transition-transform duration-500 group-hover:scale-125',
                  activeLayer.foilMode === mode.value ? 'scale-110' : 'opacity-60'
                ]">
                  {{ mode.icon }}
                </div>
                <span :class="[
                  'text-[7px] font-black uppercase tracking-tighter text-center leading-none',
                  activeLayer.foilMode === mode.value ? 'text-primary' : 'text-gray-500 group-hover:text-gray-300'
                ]">
                  {{ mode.label }}
                </span>
              </button>
            </div>

            <!-- Effect Customization Controls -->
            <div class="space-y-6 pt-2">
              <!-- Color & Intensity -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-3">
                  <div class="flex justify-between items-center px-1">
                    <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Teinte</label>
                    <button 
                      @click="activeLayer.useRainbow = !activeLayer.useRainbow" 
                      :class="['text-[8px] font-black px-2 py-0.5 rounded transition-all', activeLayer.useRainbow ? 'bg-primary text-black' : 'bg-white/10 text-gray-500 px-1 border border-white/10']"
                    >🌈 RAINBOW</button>
                  </div>
                  <div class="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/5">
                    <input type="color" v-model="activeLayer.foilColor" :disabled="activeLayer.useRainbow" 
                           class="h-8 w-12 bg-transparent border-0 cursor-pointer p-0 rounded-lg overflow-hidden disabled:opacity-20 transition-all">
                    <span class="text-[9px] font-black text-white/40 uppercase tracking-widest">{{ activeLayer.useRainbow ? 'Dynamique' : activeLayer.foilColor }}</span>
                  </div>
                </div>

                <div class="space-y-3">
                  <div class="flex justify-between items-center px-1">
                    <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Intensité</label>
                    <span class="text-[9px] font-bold text-primary">{{ activeLayer.holoIntensity.toFixed(1) }}</span>
                  </div>
                  <div class="flex flex-col justify-center h-12">
                    <input type="range" v-model.number="activeLayer.holoIntensity" min="0" max="3" step="0.1" class="w-full h-1 bg-white/10 rounded-full appearance-none accent-primary">
                  </div>
                </div>
              </div>

              <!-- Movement & Scale Tabs / Grid -->
              <div class="grid grid-cols-2 gap-6">
                <!-- Scale & Speed -->
                <div class="space-y-4">
                  <div>
                    <div class="flex justify-between items-center mb-1.5 px-1">
                      <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Échelle</label>
                      <span class="text-[9px] font-bold text-white/50">{{ activeLayer.foilScale.toFixed(1) }}</span>
                    </div>
                    <input type="range" v-model.number="activeLayer.foilScale" min="0.1" max="10.0" step="0.1" class="w-full h-0.5 bg-white/10 rounded-full appearance-none accent-primary">
                  </div>
                  <div>
                    <div class="flex justify-between items-center mb-1.5 px-1">
                      <label class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Vitesse</label>
                      <span class="text-[9px] font-bold text-white/50">{{ activeLayer.foilSpeed.toFixed(1) }}</span>
                    </div>
                    <input type="range" v-model.number="activeLayer.foilSpeed" min="0" max="5" step="0.1" class="w-full h-0.5 bg-white/10 rounded-full appearance-none accent-primary/70">
                  </div>
                </div>

                <!-- Direction & Rotation Pickers -->
                <div class="flex justify-around items-center pt-2">
                   <div class="flex flex-col items-center gap-2 group/picker">
                    <div class="angle-picker-container !w-16 !h-16 relative"
                         @mousedown="startAngleDrag($event, 'foilAngle')"
                    >
                      <svg viewBox="0 0 80 80" class="angle-picker-svg">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-primary)" stroke-width="2"
                          :stroke-dasharray="`${(activeLayer.foilAngle / 360) * 213.6} 213.6`"
                          transform="rotate(-90 40 40)"
                          stroke-linecap="round"
                        />
                        <line x1="40" y1="40"
                          :x2="40 + 20 * Math.cos((activeLayer.foilAngle - 90) * Math.PI / 180)"
                          :y2="40 + 20 * Math.sin((activeLayer.foilAngle - 90) * Math.PI / 180)"
                          stroke="white" stroke-width="2" stroke-linecap="round"
                        />
                      </svg>
                    </div>
                    <span class="text-[8px] font-black text-gray-500 uppercase tracking-tight">Motif</span>
                  </div>

                  <div class="flex flex-col items-center gap-2 group/picker">
                    <div class="angle-picker-container !w-16 !h-16 relative"
                         @mousedown="startAngleDrag($event, 'foilDirection')"
                    >
                      <svg viewBox="0 0 80 80" class="angle-picker-svg">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#22c55e" stroke-width="2"
                          :stroke-dasharray="`${(activeLayer.foilDirection / 360) * 213.6} 213.6`"
                          transform="rotate(-90 40 40)"
                          stroke-linecap="round"
                        />
                        <line x1="40" y1="40"
                          :x2="40 + 20 * Math.cos((activeLayer.foilDirection - 90) * Math.PI / 180)"
                          :y2="40 + 20 * Math.sin((activeLayer.foilDirection - 90) * Math.PI / 180)"
                          stroke="#22c55e" stroke-width="2" stroke-linecap="round"
                        />
                      </svg>
                    </div>
                    <span class="text-[8px] font-black text-gray-500 uppercase tracking-tight">Flux</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </template>

        <!-- 5. Export Action -->
        <AppButton
          variant="primary"
          fullWidth
          @click="saveEffect"
          :disabled="!selectedCardId || saving"
          class="h-14 mt-4 shadow-xl shadow-primary/20"
        >
          <span v-if="saving" class="animate-spin mr-2">⏳</span>
          <span class="tracking-widest font-black uppercase italic">{{ saving ? 'SAUVEGARDE...' : 'EXPORTER L\'EFFET' }}</span>
        </AppButton>
      </div>
    </AppPanel>

  </div>
</template>

<script setup>
import AppPanel from '../../components/ui/AppPanel.vue';
import AppButton from '../../components/ui/AppButton.vue';
import { ref, reactive, computed, onMounted, onBeforeUnmount, markRaw } from 'vue';
import HoloOverlay from '../../components/HoloOverlay.vue';
import { useUserStore } from '../../stores/userStore.js';
import strapiService from '@/api/strapi';
import { getStrapiMediaUrl } from '@/utils/url';
import PremiumSelect from '../components/PremiumSelect.vue';
import TripleTriadCard from '../../components/TripleTriadCard.vue';

const MAX_LAYERS = 5;

// Refs & State
const cards = ref([]);
const selectedCardId = ref('');
const selectedCardData = computed(() => cards.value.find(c => (c.documentId || c.id) === selectedCardId.value));
const loadingCards = ref(false);
const saving = ref(false);
const currentExistingEffectId = ref(null);

const layers = ref([]);
const activeLayerIndex = ref(0);
const activeLayer = computed(() => layers.value[activeLayerIndex.value] || {});

const currentTool = ref('rotate');
const brushSize = ref(30);
const brushSoftness = ref(0.2);

const userStore = useUserStore();
const previewTilt = ref({ x: 0, y: 0 });
const mouseUV = ref({ x: 0.5, y: 0.5 });
const svgInputRef = ref(null);
const imageInputRef = ref(null);
const activeCanvasRef = ref(null);
const cardContainerRef = ref(null);
const cardDimensions = reactive({ width: 450, height: 450, aspectRatio: 1 });
const canvasDimensions = reactive({ width: 1024, height: 1024 });
const maskVisibility = ref(0.4);
const showFullMask = ref(false);

// --- HOLO SEED ---
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash);
}

const premiumSeed = computed(() => {
  const cardPart = selectedCardData.value?.id || selectedCardData.value?.name || '0';
  const userPart = userStore.user?.id || 'anon';
  return hashCode(`${cardPart}-${userPart}`);
});

const foilModes = [
  { label: 'Nébuleuse', value: 9, icon: '🌌' },
  { label: 'Rare Holo', value: 10, icon: '✨' },
  { label: 'Radiant', value: 11, icon: '☀️' },
  { label: 'Galaxy', value: 12, icon: '💠' },
  { label: 'Gold', value: 13, icon: '🏆' }
];

const cardOptions = computed(() => {
  return cards.value.map(c => ({
    label: `${c.name} (${c.rarity})`,
    value: c.documentId || c.id
  }));
});

// Angle picker logic
const anglePickerRef = ref(null);
let angleDragging = false;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let draggingProp = 'foilAngle';

onMounted(async () => {
  await loadCards();
  layers.value.push(createDefaultLayer());

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onGlobalAngleMove);
  window.addEventListener('mouseup', stopAngleDrag);
  window.addEventListener('touchmove', onGlobalAngleMove);
  window.addEventListener('touchend', stopAngleDrag);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('mousemove', onGlobalAngleMove);
  window.removeEventListener('mouseup', stopAngleDrag);
  window.removeEventListener('touchmove', onGlobalAngleMove);
  window.removeEventListener('touchend', stopAngleDrag);
});

async function loadCards() {
  loadingCards.value = true;
  try {
    const res = await strapiService.fetchAll('cards', { populate: 'image' });
    if (!res.error) {
      const data = Array.isArray(res) ? res : (res.data || []);
      cards.value = data.map(c => {
        const attrs = c.attributes || c;
        const imageUrl = attrs.image?.url ? getStrapiMediaUrl(attrs.image.url) : null;
        return { 
          id: c.id, 
          documentId: c.documentId || c.id,
          ...attrs,
          imageUrl
        };
      });
    }
  } catch (err) {
    console.error("Failed to load cards", err);
  } finally {
    loadingCards.value = false;
  }
}

async function onCardSelected() {
  const card = selectedCardData.value;
  if (!card) return;

  // 1. Load image to determine natural proportions
  const imageLoader = new Image();
  imageLoader.crossOrigin = "Anonymous";
  imageLoader.src = card.imageUrl;
  
  await new Promise((resolve) => {
    imageLoader.onload = () => {
      const ratio = imageLoader.naturalWidth / imageLoader.naturalHeight;
      cardDimensions.aspectRatio = 1;
      cardDimensions.width = 450;
      cardDimensions.height = 450;

      // Force Square High-Res Canvas
      canvasDimensions.width = 1024;
      canvasDimensions.height = 1024;
      
      resolve();
    };
    imageLoader.onerror = () => resolve(); // Fallback to default square
  });

  const cardIdentifier = card.documentId || card.id;

  try {
    const res = await strapiService.find('foil-effects', {
      filters: { card: { documentId: { $eq: cardIdentifier } } },
      populate: 'layers'
    });

    const data = Array.isArray(res) ? res : (res.data || []);

    if (data.length > 0) {
      const effect = data[0].attributes ? { id: data[0].id, documentId: data[0].documentId, ...data[0].attributes } : data[0];
      currentExistingEffectId.value = effect.documentId || effect.id;

      if (effect.layers && effect.layers.length > 0) {
        layers.value = [];

        effect.layers.forEach(lData => {
          const newLayer = createDefaultLayer();
          Object.keys(lData).forEach(k => {
            if (k === 'id') {
              newLayer.id = lData[k];
            } else if (k !== 'drawData' && k in newLayer) {
              newLayer[k] = lData[k];
            }
          });

          if (lData.drawData) {
            const img = new Image();
            img.onload = () => {
              // Ensure we draw the existing mask onto the new canvas dimensions
              newLayer.ctx.drawImage(img, 0, 0, canvasDimensions.width, canvasDimensions.height);
              newLayer.drawData = lData.drawData;
            };
            img.src = lData.drawData;
          }

          layers.value.push(newLayer);
        });
      } else {
        resetToDefaultLayer();
      }
    } else {
      currentExistingEffectId.value = null;
      resetToDefaultLayer();
    }
    activeLayerIndex.value = 0;
    syncCanvasToOverlay();
  } catch(err) {
    console.error("Failed to load foil effect", err);
    resetToDefaultLayer();
  }
}

function syncCanvasToOverlay() {
  if (!activeCanvasRef.value || !activeLayer.value?.canvas) return;
  const overlayCtx = activeCanvasRef.value.getContext('2d');
  overlayCtx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
  overlayCtx.drawImage(activeLayer.value.canvas, 0, 0);
}

// Implement Magic Wand logic
async function generateMaskFromColor() {
  const layer = activeLayer.value;
  const card = selectedCardData.value;
  if (!layer || !card?.imageUrl) return;

  const targetHex = layer.targetColor || '#ffffff';
  const rT = parseInt(targetHex.slice(1, 3), 16);
  const gT = parseInt(targetHex.slice(3, 5), 16);
  const bT = parseInt(targetHex.slice(5, 7), 16);

  const sensitivity = layer.sensitivity || 0.3;
  const tolerance = (layer.tolerance || 0.2) * 255;

  const img = new Image();
  img.crossOrigin = "Anonymous"; // Crucial for multi-domain Strapi
  img.onload = async () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasDimensions.width;
    tempCanvas.height = canvasDimensions.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0, canvasDimensions.width, canvasDimensions.height);

    const imageData = tempCtx.getImageData(0, 0, canvasDimensions.width, canvasDimensions.height);
    const pixels = imageData.data;
    
    // Target mask context
    const maskCtx = layer.ctx;
    maskCtx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
    const maskImageData = maskCtx.createImageData(canvasDimensions.width, canvasDimensions.height);
    const maskPixels = maskImageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i+1];
      const b = pixels[i+2];

      const diff = Math.sqrt(
        Math.pow(r - rT, 2) +
        Math.pow(g - gT, 2) + 
        Math.pow(b - bT, 2)
      );

      // Simple thresholding logic: higher sensitivity = easier match
      const threshold = (1 - sensitivity) * 441; // 441 is max distance in RGB space
      const isMatch = diff < threshold + tolerance;

      const alpha = isMatch ? 255 : 0;
      maskPixels[i] = 255;   // White
      maskPixels[i+1] = 255;
      maskPixels[i+2] = 255;
      maskPixels[i+3] = alpha;
    }

    maskCtx.putImageData(maskImageData, 0, 0);
    layer.drawData = layer.canvas.toDataURL('image/png');
    syncCanvasToOverlay();
    alert("Masque généré par couleur avec succès !");
  };
  img.src = card.imageUrl;
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
        noiseIntensity: l.noiseIntensity,
        drawData: l.canvas.toDataURL('image/png')
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

let draggingRect = null;

function startAngleDrag(e, prop) {
  angleDragging = true;
  draggingProp = prop;
  // Capture the rect of the EXACT picker we started dragging on
  draggingRect = e.currentTarget.getBoundingClientRect();
  updateAngleFromEvent(e);
}

function onGlobalAngleMove(e) {
  if (!angleDragging) return;
  updateAngleFromEvent(e);
}

function stopAngleDrag() {
  angleDragging = false;
  draggingRect = null;
}

function updateAngleFromEvent(e) {
  const rect = draggingRect || anglePickerRef.value?.getBoundingClientRect();
  if (!rect || !layers.value[activeLayerIndex.value]) return;

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
  if (angle < 0) angle += 360;
  angle = Math.round(angle) % 360;

  layers.value[activeLayerIndex.value][draggingProp] = angle;
}

function createDefaultLayer() {
  const canvas = document.createElement('canvas');
  canvas.width = canvasDimensions.width;
  canvas.height = canvasDimensions.height;
  const ctx = canvas.getContext('2d');
  // New default: Empty mask (Black). Draw with White to reveal effect.
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);

  return reactive({
    enabled: true,
    targetColor: '#cc3333',
    sensitivity: 0.3,
    tolerance: 0.2,
    foilColor: '#ffffff',
    holoIntensity: 0.5,
    foilScale: 4.0,
    foilAngle: 0,
    foilDirection: 0,
    useRainbow: false,
    foilMode: 0,
    foilSpeed: 1.0,
    noiseIntensity: 0,
    drawData: canvas.toDataURL('image/png'),
    // Avoid proxying the context and canvas DOM elements as it can break native methods
    canvas: markRaw(canvas),
    ctx: markRaw(ctx)
  });
}

function setTool(tool) {
  currentTool.value = tool;
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

async function pickColor() {
  if ('EyeDropper' in window) {
    try {
      const result = await new window.EyeDropper().open();
      layers.value[activeLayerIndex.value].targetColor = result.sRGBHex;
    } catch (e) {}
  }
}

function triggerImageImport() {
  imageInputRef.value?.click();
}

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
      
      // Clear with black (standard baseline)
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);

      // Cover logic: Fill entire canvas, cropping excess
      const ratio = Math.max(canvasDimensions.width / img.width, canvasDimensions.height / img.height);
      const nw = img.width * ratio;
      const nh = img.height * ratio;
      const nx = (canvasDimensions.width - nw) / 2;
      const ny = (canvasDimensions.height - nh) / 2;

      // Draw image to a temp canvas to process grayscale
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasDimensions.width;
      tempCanvas.height = canvasDimensions.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(img, nx, ny, nw, nh);

      const imageData = tempCtx.getImageData(0, 0, canvasDimensions.width, canvasDimensions.height);
      const data = imageData.data;

      // Convert to White/Black mask
      for (let i = 0; i < data.length; i += 4) {
        const grayscale = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        const alpha = data[i+3] / 255;
        const finalVal = grayscale * alpha;
        
        data[i] = finalVal;
        data[i+1] = finalVal;
        data[i+2] = finalVal;
        data[i+3] = 255; // Solid in editor
      }
      tempCtx.putImageData(imageData, 0, 0);
      
      // BAKE into the user's paint canvas
      ctx.drawImage(tempCanvas, 0, 0);
      layer.drawData = layer.canvas.toDataURL('image/png');
      syncCanvasToOverlay();
      e.target.value = '';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function triggerSvgImport() {
  if (svgInputRef.value) svgInputRef.value.click();
}

async function handleSvgImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const layer = layers.value[activeLayerIndex.value];
      if (!layer) return;

      const ctx = layer.ctx;
      
      // Clear with black
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);

      // Cover logic
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

      // SVG: Convert shapes to white
      for (let i = 0; i < data.length; i += 4) {
        if (data[i+3] > 0) {
          const alpha = data[i+3] / 255;
          data[i] = 255 * alpha;
          data[i+1] = 255 * alpha;
          data[i+2] = 255 * alpha;
          data[i+3] = 255;
        }
      }
      tempCtx.putImageData(imageData, 0, 0);

      // BAKE into the user's paint canvas
      ctx.drawImage(tempCanvas, 0, 0);
      layer.drawData = layer.canvas.toDataURL('image/png');
      syncCanvasToOverlay();
      e.target.value = '';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

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
  
  // Real-time visual update on the workspace overlay
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

  if (currentTool.value !== 'rotate') {
    paint({ x, y });
  }
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

function onWindowResize() {}
</script>

<style scoped>
.foil-sections-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.foil-section {
  flex: 1 1 280px;
  min-width: 0;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.setting-group label,
.setting-label {
  font-size: 9px;
  font-weight: 900;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding-left: 0.15rem;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.angle-picker-container {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.angle-picker-container:active {
  cursor: grabbing;
}

.angle-picker-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 6px rgba(var(--color-primary-rgb, 99, 102, 241), 0.3));
}

.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
}
</style>