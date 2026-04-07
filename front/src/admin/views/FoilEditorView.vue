<template>
  <div class="min-h-full w-full bg-[#0a0a1a] text-white relative font-sans flex flex-col lg:flex-row gap-6 p-6">
    
    <!-- Left / Central Side: 3D Preview Window & Toolbar -->
    <div class="flex-1 flex flex-col items-center justify-center relative z-10 min-h-[400px] lg:h-full">

      <!-- Toolbar -->
      <AppPanel class="p-2 mb-4 flex items-center justify-center gap-2 max-w-fit mx-auto" :padding="false">
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

        <!-- Brush params: only visible in paint/erase mode -->
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

      <div 
        class="relative w-full max-w-[500px] flex-1 min-h-[400px] max-h-[700px] rounded-2xl overflow-hidden glass-panel border border-white/10 shadow-2xl flex items-center justify-center bg-black/40"
        @mousemove="trackMouseUV"
      >
        <!-- SIMPLE IMAGE PAINTING AREA -->
        <div 
          v-if="selectedCardData"
          class="relative rounded-lg overflow-hidden shadow-2xl transition-transform duration-100 ease-out"
          :style="{ 
            width: '400px', 
            height: '400px', 
            transform: `rotateX(${previewTilt.x}deg) rotateY(${previewTilt.y}deg)` 
          }"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUp"
          @mouseleave="onMouseUp"
        >
          <!-- Card Image -->
          <img 
            :src="selectedCardData.imageUrl || 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=1000&auto=format&fit=crop'" 
            class="w-full h-full object-cover pointer-events-none select-none transition-all duration-300" 
            :class="{ 'brightness-50 grayscale-50': currentTool !== 'rotate', 'opacity-20': showFullMask }"
          />

          <!-- Real-time Painting Overlay (Direct Canvas DOM) -->
          <canvas 
            v-show="currentTool !== 'rotate'"
            ref="activeCanvasRef" 
            width="512" 
            height="512"
            class="absolute inset-0 w-full h-full pointer-events-none z-10"
            :style="{ 
              opacity: showFullMask ? 1.0 : maskVisibility,
              mixBlendMode: showFullMask ? 'normal' : 'screen',
              filter: showFullMask ? 'none' : 'drop-shadow(0 0 2px white)'
            }"
          ></canvas>

          <!-- Holo overlays (Centralized Component) -->
          <HoloOverlay
            :layers="layers"
            :seed="premiumSeed"
            :tiltX="previewTilt.x"
            :tiltY="previewTilt.y"
            :always-visible="true"
          />
        </div>

        <div v-else class="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Sélectionnez une carte...</div>

        <!-- Custom Brush Cursor -->
        <div 
          v-if="selectedCardData && (currentTool === 'draw' || currentTool === 'erase')"
          class="absolute pointer-events-none rounded-full border-2 border-primary shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.5)] z-[100]"
          :style="{
            left: `${mouseUV.x * 100}%`,
            top: `${(1 - mouseUV.y) * 100}%`,
            width: `${(brushSize / 512) * 400}px`,
            height: `${(brushSize / 512) * 400}px`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: currentTool === 'draw' ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.2)'
          }"
        ></div>
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
            <h3 class="text-xs font-bold uppercase tracking-widest text-primary">1. Carte & Calques</h3>
          </div>
          
          <div class="flex flex-wrap gap-6 items-start">
            <!-- Card selection box -->
            <div class="flex-1 min-w-[240px]">
              <PremiumSelect
                v-model="selectedCardId"
                :options="cardOptions"
                label="Sélectionner une carte"
                placeholder="Choisir un modèle..."
                searchable
                @change="onCardSelected"
              >
                <template #icon>🎴</template>
              </PremiumSelect>
            </div>

            <!-- Layers (horizontal) -->
            <div class="flex-1 min-w-[240px] flex flex-col gap-2">
              <div class="flex justify-between items-center">
                <label class="setting-label">Calques ({{ layers.length }}/5)</label>
                <button v-if="layers.length < 5" @click="addLayer" class="text-[9px] font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer uppercase">Ajouter +</button>
              </div>
              <div class="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/5 border border-white/5">
                <div v-for="(layer, i) in layers" :key="i"
                     :class="['flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border cursor-pointer select-none', i === activeLayerIndex ? 'bg-white/15 border-primary/40 shadow-lg' : 'bg-white/5 border-transparent opacity-60 hover:opacity-100']"
                     @click="selectLayer(i)"
                >
                  <span :class="['text-[10px] font-bold uppercase tracking-wider', i === activeLayerIndex ? 'text-white' : 'text-gray-400']">L{{ i + 1 }}</span>
                  <button @click.stop="toggleLayer(i)" class="text-[10px] hover:scale-110 transition-transform cursor-pointer outline-none" :title="layer.enabled ? 'Cacher' : 'Afficher'">
                    {{ layer.enabled ? '👁️' : '❌' }}
                  </button>
                  <button v-if="layers.length > 1" @click.stop="deleteLayer(i)" class="text-[10px] hover:scale-110 text-red-400 transition-transform cursor-pointer outline-none" title="Supprimer">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="loadingCards" class="text-[10px] text-primary/50 font-bold uppercase tracking-widest mt-1 animate-pulse">Synchronisation...</div>
        </section>

        <!-- Only show settings if there is at least 1 layer -->
        <template v-if="layers.length > 0">

          <!-- 2. Sélecteur & Masque -->
          <section class="foil-section space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-widest text-primary border-b border-white/10 pb-2">2. Sélecteur & Masque</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <!-- Left: SVG Import -->
              <div class="space-y-2">
                <label class="setting-label">Import Vectoriel</label>
                <div class="flex items-center gap-2">
                  <input type="file" ref="svgInputRef" accept=".svg" class="hidden" @change="handleSvgImport">
                  <AppButton variant="ghost" size="sm" fullWidth class="h-9 border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest !p-0" @click="triggerSvgImport">
                    📥 Importer SVG
                  </AppButton>
                </div>
              </div>

              <!-- Right: Sensitivity + Tolerance -->
              <div class="space-y-2">
                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="setting-label">Sensibilité</label>
                    <span class="text-[9px] text-gray-400 font-bold">{{ Math.round(activeLayer.sensitivity * 100) }}%</span>
                  </div>
                  <input type="range" v-model.number="activeLayer.sensitivity" min="0.01" max="1.0" step="0.01" class="w-full h-1 bg-white/20 rounded-full appearance-none accent-primary">
                </div>
                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="setting-label">Tolérance</label>
                    <span class="text-[9px] text-gray-400 font-bold">{{ Math.round(activeLayer.tolerance * 100) }}%</span>
                  </div>
                  <input type="range" v-model.number="activeLayer.tolerance" min="0.0" max="1.0" step="0.01" class="w-full h-1 bg-white/20 rounded-full appearance-none accent-primary">
                </div>
              </div>
            </div>

            <!-- Target Color -->
            <div class="mt-4 pt-4 border-t border-white/5">
               <div class="flex justify-between items-center mb-2">
                  <label class="setting-label">Couleur de référence (Optionnel)</label>
                  <div class="flex items-center gap-2">
                   <input type="color" v-model="activeLayer.targetColor" class="h-6 w-10 bg-transparent border-0 cursor-pointer p-0 rounded overflow-hidden">
                   <button @click="pickColor" class="bg-white/10 hover:bg-white/20 p-1.5 rounded transition-all border border-white/5 cursor-pointer text-xs" title="Pipette">💧</button>
                   <AppButton variant="ghost" size="xs" class="ml-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-[9px] font-black uppercase" @click="generateMaskFromColor">🪄 Générer</AppButton>
                 </div>
              </div>
            </div>

            <!-- Mask visibility slider -->
            <div class="mt-4 pt-4 border-t border-white/5">
              <div class="flex justify-between items-center mb-1">
                <label class="setting-label">Aperçu de la sélection</label>
                <div class="flex items-center gap-2">
                   <button @click="showFullMask = !showFullMask" :class="['text-[9px] font-bold px-2 py-0.5 rounded transition-all', showFullMask ? 'bg-primary text-black' : 'bg-white/10 text-gray-400']">MODÈLE BLANC</button>
                   <span class="text-[9px] text-gray-400 font-bold">{{ Math.round(maskVisibility * 100) }}%</span>
                </div>
              </div>
              <input type="range" v-model.number="maskVisibility" min="0.0" max="1.0" step="0.01" class="w-full h-1 bg-white/20 rounded-full appearance-none accent-primary">
              <p class="text-[8px] text-gray-500 mt-1 uppercase tracking-tighter italic">Contrôle la visibilité du masque blanc en surimpression</p>
            </div>
          </section>

          <!-- 3. Holographic Effect -->
          <section class="foil-section space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-widest text-primary border-b border-white/10 pb-2">3. Effet Holographique</h3>
            
            <div class="flex flex-wrap gap-4">
              <div class="setting-group flex-1 min-w-[120px]">
                <label>Type</label>
                <PremiumSelect
                  v-model="activeLayer.foilMode"
                  :options="foilModes"
                />
              </div>
              <div class="setting-group w-32">
                <label>Teinte / Rainbow</label>
                <div class="flex items-center gap-2">
                  <input type="color" v-model="activeLayer.foilColor" :disabled="activeLayer.useRainbow" class="h-9 w-12 bg-transparent border-0 cursor-pointer p-0 rounded-lg overflow-hidden shadow-inner disabled:opacity-30">
                  <button 
                    @click="activeLayer.useRainbow = !activeLayer.useRainbow" 
                    :class="['h-9 flex-1 rounded-lg border flex items-center justify-center transition-all', activeLayer.useRainbow ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-gray-500']"
                    title="Mode Arc-en-ciel"
                  >
                    🌈 <span class="text-[9px] font-bold ml-1 uppercase">Rainbow</span>
                  </button>
                </div>
              </div>
              <div class="setting-group flex-1 min-w-[120px]">
                <div class="flex justify-between items-center">
                  <label>Intensité</label>
                  <span class="text-[9px] text-gray-400 font-bold">{{ activeLayer.holoIntensity.toFixed(1) }}</span>
                </div>
                <input type="range" v-model.number="activeLayer.holoIntensity" min="0" max="3" step="0.1" class="w-full h-1 bg-white/20 rounded-full appearance-none accent-primary mt-2">
              </div>
              <div class="setting-group flex-1 min-w-[120px]">
                <div class="flex justify-between items-center text-primary-light">
                  <label>Grain (Noise)</label>
                  <span class="text-[9px] font-bold">{{ Math.round(activeLayer.noiseIntensity * 100) }}%</span>
                </div>
                <input type="range" v-model.number="activeLayer.noiseIntensity" min="0" max="1" step="0.05" class="w-full h-1 bg-white/20 rounded-full appearance-none accent-primary mt-2">
              </div>
            </div>
          </section>

          <!-- 4. Paramètres Holographiques -->
          <section class="foil-section space-y-4">
            <h3 class="text-xs font-bold uppercase tracking-widest text-primary border-b border-white/10 pb-2">4. Paramètres Holographiques</h3>
            
            <div class="flex flex-wrap gap-6">
              <!-- Speed & Scale group -->
              <div class="flex-1 min-w-[200px] space-y-4">
                <div class="setting-group">
                  <div class="flex justify-between items-center">
                    <label>Vitesse</label>
                    <span class="text-[9px] text-gray-400 font-bold">{{ activeLayer.foilSpeed.toFixed(1) }}</span>
                  </div>
                  <input type="range" v-model.number="activeLayer.foilSpeed" min="0" max="5" step="0.1" class="w-full h-1 bg-white/20 rounded-full appearance-none accent-primary">
                </div>
                <div class="setting-group">
                  <div class="flex justify-between items-center">
                    <label>Échelle</label>
                    <span class="text-[9px] text-gray-400 font-bold">{{ activeLayer.foilScale.toFixed(1) }}</span>
                  </div>
                  <input type="range" v-model.number="activeLayer.foilScale" min="0.1" max="10.0" step="0.1" class="w-full h-1 bg-white/20 rounded-full appearance-none accent-primary">
                </div>
              </div>

              <!-- Orientation group -->
              <div class="flex-1 min-w-[300px] flex gap-4">
                <!-- Motif Rotation -->
                <div class="flex-1 setting-group">
                  <label>Rotation Motif (α)</label>
                  <div class="flex items-center gap-4">
                    <div class="angle-picker-container" ref="anglePickerRef"
                         @mousedown="startAngleDrag($event, 'foilAngle')"
                         @touchstart.prevent="startAngleDrag($event, 'foilAngle')"
                    >
                      <svg viewBox="0 0 80 80" class="angle-picker-svg">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-primary)" stroke-width="3"
                          :stroke-dasharray="`${(activeLayer.foilAngle / 360) * 213.6} 213.6`"
                          stroke-dashoffset="0"
                          transform="rotate(-90 40 40)"
                          stroke-linecap="round"
                          class="transition-all duration-75"
                        />
                        <line x1="40" y1="40"
                          :x2="40 + 28 * Math.cos((activeLayer.foilAngle - 90) * Math.PI / 180)"
                          :y2="40 + 28 * Math.sin((activeLayer.foilAngle - 90) * Math.PI / 180)"
                          stroke="white" stroke-width="2" stroke-linecap="round"
                        />
                      </svg>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-xs font-black italic">{{ activeLayer.foilAngle }}°</span>
                      <span class="text-[8px] text-gray-600 uppercase font-bold">Orientation</span>
                    </div>
                  </div>
                </div>

                <!-- Direction -->
                <div class="flex-1 setting-group">
                  <label>Direction Flux (β)</label>
                  <div class="flex items-center gap-4">
                    <div class="angle-picker-container"
                         @mousedown="startAngleDrag($event, 'foilDirection')"
                         @touchstart.prevent="startAngleDrag($event, 'foilDirection')"
                    >
                      <svg viewBox="0 0 80 80" class="angle-picker-svg">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#22c55e" stroke-width="3"
                          :stroke-dasharray="`${(activeLayer.foilDirection / 360) * 213.6} 213.6`"
                          stroke-dashoffset="0"
                          transform="rotate(-90 40 40)"
                          stroke-linecap="round"
                          class="transition-all duration-75"
                        />
                        <line x1="40" y1="40"
                          :x2="40 + 28 * Math.cos((activeLayer.foilDirection - 90) * Math.PI / 180)"
                          :y2="40 + 28 * Math.sin((activeLayer.foilDirection - 90) * Math.PI / 180)"
                          stroke="#22c55e" stroke-width="2" stroke-linecap="round"
                        />
                      </svg>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-xs font-black italic text-green-400">{{ activeLayer.foilDirection }}°</span>
                      <span class="text-[8px] text-gray-600 uppercase font-bold">Flux 3D</span>
                    </div>
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
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import HoloOverlay from '../../components/HoloOverlay.vue';
import { useUserStore } from '../../stores/userStore.js';
import strapiService from '@/api/strapi';
import { getStrapiMediaUrl } from '@/utils/url';
import PremiumSelect from '../components/PremiumSelect.vue';

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
const activeCanvasRef = ref(null);
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
  { label: '0: Arc-en-ciel (Défaut)', value: 0 },
  { label: '1: Pulsation', value: 1 },
  { label: '2: Électrique', value: 2 },
  { label: '3: Scintillement', value: 3 },
  { label: '4: Halo (Flare)', value: 4 },
  { label: '5: Prisme / Verre', value: 5 },
  { label: '6: Fluide / Eau', value: 6 },
  { label: '7: Digital / Matrix', value: 7 },
  { label: '8: Étoiles', value: 8 },
  { label: '9: Nébuleuse', value: 9 },
  { label: '10: Rare Holo (Classique)', value: 10 },
  { label: '11: Radiant / V (Stries)', value: 11 },
  { label: '12: Galaxy / Cosmos', value: 12 },
  { label: '13: Gold / Secret Rare', value: 13 }
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
              newLayer.ctx.drawImage(img, 0, 0);
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
  overlayCtx.clearRect(0, 0, 512, 512);
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
  img.onload = () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 512;
    tempCanvas.height = 512;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0, 512, 512);

    const imageData = tempCtx.getImageData(0, 0, 512, 512);
    const pixels = imageData.data;
    
    // Target mask context
    const maskCtx = layer.ctx;
    maskCtx.clearRect(0, 0, 512, 512);
    const maskImageData = maskCtx.createImageData(512, 512);
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
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  // New default: Empty mask (Black). Draw with White to reveal effect.
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, 512, 512);

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
    canvas: canvas,
    ctx: ctx,
    drawData: canvas.toDataURL('image/png')
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

function triggerSvgImport() {
  if (svgInputRef.value) svgInputRef.value.click();
}

function handleSvgImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const layer = layers.value[activeLayerIndex.value];
      if (!layer) return;

      layer.ctx.clearRect(0, 0, 512, 512);
      const ctx = layer.ctx;
      const canvasSize = 512;
      const ratio = Math.min(canvasSize / img.width, canvasSize / img.height);
      const nw = img.width * ratio, nh = img.height * ratio;
      const nx = (canvasSize - nw) / 2, ny = (canvasSize - nh) / 2;

      ctx.save();
      ctx.drawImage(img, nx, ny, nw, nh);
      ctx.restore();

      layer.drawData = layer.canvas.toDataURL('image/png');
      e.target.value = '';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function paint(uv) {
  const layer = layers.value[activeLayerIndex.value];
  const cx = uv.x * 512;
  const cy = (1 - uv.y) * 512;
  const r = (brushSize.value / 1024) * 512;

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
  
  // Real-time visual update on the preview overlay ONLY
  syncCanvasToOverlay();
}

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function onMouseDown(e) {
  isDragging = true;
  previousMousePosition = { x: e.clientX, y: e.clientY };

  if (currentTool.value !== 'rotate') {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - (e.clientY - rect.top) / rect.height;
    mouseUV.value = { x, y };
    paint({ x, y });
  }
}

function trackMouseUV(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  mouseUV.value = {
    x: (e.clientX - rect.left) / rect.width,
    y: 1.0 - (e.clientY - rect.top) / rect.height
  };
}

function onMouseMove(e) {
  if (!isDragging) return;

  const rect = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = 1.0 - (e.clientY - rect.top) / rect.height;
  mouseUV.value = { x, y };

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
    // Only convert to heavy Base64 string at the end of the stroke
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