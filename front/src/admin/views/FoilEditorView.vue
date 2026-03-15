<template>
  <div class="h-full bg-[#0a0a1a] text-white relative overflow-hidden font-sans">
    
    <!-- Ambient Background Glows -->
    <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full pointer-events-none"></div>

    <!-- Floating Toolbar -->
    <div class="absolute top-8 left-1/2 -translate-x-1/2 glass-panel p-2 rounded-2xl flex items-center gap-2 z-20 shadow-2xl">
      <button @click="setTool('rotate')" :class="['px-6 py-2 rounded-xl text-xs font-bold transition-all', currentTool === 'rotate' ? 'bg-primary text-[#0a0a1a]' : 'text-gray-400 hover:text-white hover:bg-white/5']">🔄 3D VIEW</button>
      <button @click="setTool('draw')" :class="['px-6 py-2 rounded-xl text-xs font-bold transition-all', currentTool === 'draw' ? 'bg-primary text-[#0a0a1a]' : 'text-gray-400 hover:text-white hover:bg-white/5']">🖌️ PAINT</button>
      <button @click="setTool('erase')" :class="['px-6 py-2 rounded-xl text-xs font-bold transition-all', currentTool === 'erase' ? 'bg-primary text-[#0a0a1a]' : 'text-gray-400 hover:text-white hover:bg-white/5']">🧽 ERASE</button>

      <div v-show="currentTool !== 'rotate'" class="flex items-center gap-4 border-l border-white/5 pl-4 ml-2">
        <label class="text-[10px] uppercase font-black text-gray-500 tracking-widest">Brush Size</label>
        <input type="range" v-model="brushSize" min="5" max="150" class="w-32 accent-primary h-1 bg-white/10 rounded-full appearance-none">
        <div class="flex gap-1">
          <button @click="fillMask('white')" class="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-[10px] font-bold transition-all">FILL ALL</button>
          <button @click="fillMask('black')" class="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-[10px] font-bold transition-all">CLEAR ALL</button>
        </div>
      </div>
    </div>

    <!-- Right Side Panel (Controls) -->
    <div class="absolute top-8 right-8 glass-panel p-8 rounded-[40px] w-96 z-10 max-h-[calc(100vh-64px)] overflow-y-auto shadow-2xl custom-scrollbar flex flex-col">
      <div class="mb-10 text-center">
        <h2 class="text-2xl font-black text-white tracking-tighter uppercase italic">HoloEditor <span class="text-primary italic">Pro</span></h2>
        <p class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-1 pl-1">Visual FX Engine</p>
      </div>

      <!-- Card Selection -->
      <div class="mb-8">
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
        <div v-if="loadingCards" class="text-[10px] text-primary/50 font-bold uppercase tracking-widest mt-2 animate-pulse">Synchronisation des cartes...</div>
      </div>

      <div class="space-y-8">
        <!-- Layers Management -->
        <div class="setting-group">
          <div class="flex justify-between items-center mb-4">
            <label class="text-[10px] uppercase font-black text-gray-500 tracking-widest pl-1">Calques de rendu ({{ layers.length }}/5)</label>
            <button v-if="layers.length < 5" @click="addLayer" class="text-[10px] font-bold text-primary hover:text-white transition-colors">AJOUTER +</button>
          </div>

          <div class="flex flex-col gap-2">
            <div v-for="(layer, i) in layers" :key="i"
                 :class="['flex items-center p-3 rounded-2xl transition-all border border-transparent', i === activeLayerIndex ? 'bg-white/10 border-primary/20 scale-[1.02] shadow-lg' : 'bg-white/5 opacity-60 hover:opacity-100']">
              <button @click="selectLayer(i)" :class="['flex-1 text-left text-xs font-bold uppercase tracking-wider', i === activeLayerIndex ? 'text-white' : 'text-gray-400']">
                Layer {{ i + 1 }}
              </button>
              <div class="flex items-center gap-1">
                <button @click="toggleLayer(i)" class="p-2 hover:bg-white/10 rounded-lg transition-all text-xs">
                  {{ layer.enabled ? '👁️' : '❌' }}
                </button>
                <button v-if="layers.length > 1" @click="deleteLayer(i)" class="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all text-xs">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="layers.length > 0" class="space-y-6 pt-6 border-t border-white/5">
          <!-- Selection & Sensitivity -->
          <div class="grid grid-cols-2 gap-4">
            <div class="setting-group">
              <label>Target Color</label>
              <div class="flex items-center gap-3">
                <input type="color" v-model="activeLayer.targetColor" @input="syncUniforms" class="h-10 w-full bg-transparent border-0 cursor-pointer p-0 rounded-xl overflow-hidden shadow-inner">
                <button @click="pickColor" class="bg-white/5 hover:bg-white/10 p-2.5 rounded-xl transition-all" title="Pipette">💧</button>
              </div>
            </div>
            <div class="setting-group">
              <label>Foil Mode</label>
              <PremiumSelect
                v-model="activeLayer.foilMode"
                :options="foilModes"
                @change="syncUniforms"
              />
            </div>
          </div>

          <div class="setting-group">
            <div class="flex justify-between items-center">
              <label>Sensibilité</label>
              <span class="text-[10px] text-gray-500 font-bold">{{ Math.round(activeLayer.sensitivity * 100) }}%</span>
            </div>
            <input type="range" v-model.number="activeLayer.sensitivity" min="0.01" max="1.0" step="0.01" @input="syncUniforms" class="w-full h-1 bg-white/10 rounded-full appearance-none accent-primary">
          </div>

          <!-- Foil Params -->
          <div class="setting-group">
            <label>Teinte Holographique</label>
            <input type="color" v-model="activeLayer.foilColor" @input="syncUniforms" class="h-10 w-full bg-transparent border-0 cursor-pointer p-0 rounded-xl overflow-hidden shadow-inner">
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div class="setting-group">
              <label>Intensité</label>
              <input type="range" v-model.number="activeLayer.holoIntensity" min="0" max="3" step="0.1" @input="syncUniforms" class="w-full h-1 bg-white/10 rounded-full appearance-none accent-primary">
            </div>
            <div class="setting-group">
              <label>Vitesse</label>
              <input type="range" v-model.number="activeLayer.foilSpeed" min="0" max="5" step="0.1" @input="syncUniforms" class="w-full h-1 bg-white/10 rounded-full appearance-none accent-primary">
            </div>
          </div>

          <div class="setting-group">
            <label>Orientation (α)</label>
            <div class="flex items-center gap-4">
              <input type="range" v-model.number="activeLayer.foilAngle" min="0" max="360" step="1" @input="syncUniforms" class="flex-1 h-1 bg-white/10 rounded-full appearance-none accent-primary">
              <span class="text-xs font-bold text-gray-400 min-w-[3ch]">{{ activeLayer.foilAngle }}°</span>
            </div>
          </div>
        </div>

        <button @click="saveEffect" :disabled="!selectedCardId || saving" class="btn btn-primary w-full h-14 mt-4 shadow-xl shadow-primary/20 flex items-center justify-center gap-3 text-sm">
          <span v-if="saving" class="animate-spin">⏳</span>
          <span class="tracking-widest font-black uppercase italic">{{ saving ? 'SAVING...' : 'SAVE FX CONFIG' }}</span>
        </button>
      </div>
    </div>

    <!-- 3D Canvas Container -->
    <div ref="canvasContainer" class="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"></div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import * as THREE from 'three';
import strapiService from '../api/strapi';
import PremiumSelect from '../components/PremiumSelect.vue';

const MAX_LAYERS = 5;

const vertexShaderStr = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShaderStr = `
  #define MAX_LAYERS 5
  uniform sampler2D tDiffuse;
  uniform sampler2D uDrawMask0;
  uniform sampler2D uDrawMask1;
  uniform sampler2D uDrawMask2;
  uniform sampler2D uDrawMask3;
  uniform sampler2D uDrawMask4;
  uniform int uLayerCount;
  uniform int uActiveLayer;
  uniform bool uShowMask;
  uniform float uTime;
  uniform bool uLayerEnabled[MAX_LAYERS];
  uniform vec3 uTargetColors[MAX_LAYERS];
  uniform float uSensitivities[MAX_LAYERS];
  uniform float uTolerances[MAX_LAYERS];
  uniform float uHoloIntensities[MAX_LAYERS];
  uniform float uFoilScales[MAX_LAYERS];
  uniform float uFoilAngles[MAX_LAYERS];
  uniform vec3 uFoilColors[MAX_LAYERS];
  uniform float uFoilSpeeds[MAX_LAYERS];
  uniform int uFoilModes[MAX_LAYERS];
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  vec3 spectral(float x) {
      vec3 c = vec3(0.0);
      c.r = smoothstep(0.4, 0.2, x) + smoothstep(0.7, 1.0, x);
      c.g = smoothstep(0.1, 0.4, x) * smoothstep(0.7, 0.4, x);
      c.b = smoothstep(0.4, 0.7, x) * smoothstep(1.0, 0.7, x);
      return c;
  }

  mat2 rotate2d(float angle) {
      return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  }

  void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = dot(viewDir, vNormal);
      vec3 totalHolo = vec3(0.0);
      float totalShine = 0.0;

      for(int i = 0; i < MAX_LAYERS; i++) {
          if (i >= uLayerCount) break;
          float colorDist = distance(tex.rgb, uTargetColors[i]);
          float mask = 1.0 - smoothstep(uSensitivities[i], uSensitivities[i] + uTolerances[i], colorDist);
          float drawnMask = 1.0;
          if (i == 0) drawnMask = texture2D(uDrawMask0, vUv).r;
          else if (i == 1) drawnMask = texture2D(uDrawMask1, vUv).r;
          else if (i == 2) drawnMask = texture2D(uDrawMask2, vUv).r;
          else if (i == 3) drawnMask = texture2D(uDrawMask3, vUv).r;
          else if (i == 4) drawnMask = texture2D(uDrawMask4, vUv).r;

          mask *= drawnMask;

          if (uShowMask && i == uActiveLayer) {
              vec3 oppositeColor = vec3(1.0) - uTargetColors[i];
              gl_FragColor = vec4(mix(tex.rgb, oppositeColor, mask), 1.0);
              return;
          }

          if (!uLayerEnabled[i]) continue;

          int mode = uFoilModes[i];
          float speed = uFoilSpeeds[i];
          float t = uTime * speed;
          vec2 rotatedUv = rotate2d(uFoilAngles[i]) * vUv;
          vec3 rainbow = vec3(0.0);

          if (mode == 2) {
              float e1 = sin(rotatedUv.x * uFoilScales[i] * 8.0 + t * 15.0);
              float e2 = cos(rotatedUv.y * uFoilScales[i] * 8.0 - t * 12.0);
              float elec = pow(max(0.0, sin(e1 + e2)), 15.0);
              rainbow = uFoilColors[i] * elec * 5.0;
          } else {
              float noise = sin(rotatedUv.x * uFoilScales[i] + rotatedUv.y * uFoilScales[i] + (1.0 - fresnel) * 4.0 + t * 0.4) * 0.5 + 0.5;
              rainbow = spectral(noise) * uFoilColors[i];
          }

          if (mode == 1) {
              mask *= (sin(t * 3.0) * 0.5 + 0.5);
          } else if (mode == 3) {
              float inner = 1.0 - smoothstep(max(0.0, uSensitivities[i] - 0.05), uSensitivities[i], colorDist);
              mask = max(0.0, mask - inner) * drawnMask;
          }

          totalHolo += rainbow * uHoloIntensities[i] * mask * (1.1 - fresnel);
          totalShine += pow(1.0 - fresnel, 5.0) * 0.4 * uHoloIntensities[i] * mask;
      }
      gl_FragColor = vec4(tex.rgb + totalHolo + totalShine, 1.0);
  }
`;


// Refs & State
const canvasContainer = ref(null);
const cards = ref([]);
const selectedCardId = ref('');
const loadingCards = ref(false);
const saving = ref(false);
const currentExistingEffectId = ref(null);

const layers = ref([]);
const activeLayerIndex = ref(0);
const activeLayer = computed(() => layers.value[activeLayerIndex.value] || {});

const currentTool = ref('rotate');
const brushSize = ref(30);

const foilModes = [
  { label: 'Défaut (Holographique)', value: 0 },
  { label: 'Pulsation', value: 1 },
  { label: 'Électrique', value: 2 },
  { label: 'Bords uniquement', value: 3 }
];

const cardOptions = computed(() => {
  return cards.value.map(c => ({
    label: `${c.name} (${c.rarity})`,
    value: c.id
  }));
});

// Three.js instances
const scene = shallowRef(null);
const camera = shallowRef(null);
const renderer = shallowRef(null);
const mesh = shallowRef(null);
const material = shallowRef(null);
const textureLoader = shallowRef(null);
const brushCursor = shallowRef(null);
const dummyTexture = shallowRef(null);

let animationFrameId = null;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let targetRotation = { x: 0, y: 0 };
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

let maskTimeout = null;

onMounted(async () => {
  await loadCards();
  initThreeJS();
  layers.value.push(createDefaultLayer());
  syncUniforms();

  window.addEventListener('resize', onWindowResize);

  if (canvasContainer.value) {
    canvasContainer.value.addEventListener('mousedown', onMouseDown);
    canvasContainer.value.addEventListener('mousemove', onMouseMove);
    canvasContainer.value.addEventListener('mouseup', onMouseUp);
    canvasContainer.value.addEventListener('mouseleave', onMouseUp);
  }
});

onBeforeUnmount(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', onWindowResize);

  if (canvasContainer.value) {
    canvasContainer.value.removeEventListener('mousedown', onMouseDown);
    canvasContainer.value.removeEventListener('mousemove', onMouseMove);
    canvasContainer.value.removeEventListener('mouseup', onMouseUp);
    canvasContainer.value.removeEventListener('mouseleave', onMouseUp);
  }

  if (renderer.value) {
    renderer.value.dispose();
  }
});

async function loadCards() {
  loadingCards.value = true;
  try {
    const res = await strapiService.find('cards', { populate: 'image' });
    if (!res.error) {
      const data = Array.isArray(res) ? res : (res.data || []);
      cards.value = data.map(c => c.attributes ? { id: c.id, ...c.attributes } : c);
    }
  } catch (err) {
    console.error("Failed to load cards", err);
  } finally {
    loadingCards.value = false;
  }
}

async function onCardSelected() {
  const card = cards.value.find(c => c.id === selectedCardId.value);
  if (!card) return;

  const imgUrl = card.image?.url
    ? `http://localhost:1337${card.image.url}`
    : 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=1000&auto=format&fit=crop';

  loadTexture(imgUrl);

  try {
    const res = await strapiService.find('foil-effects', {
      filters: { card: card.id },
      populate: 'layers'
    });

    const data = Array.isArray(res) ? res : (res.data || []);

    if (data.length > 0) {
      const effect = data[0].attributes ? { id: data[0].id, ...data[0].attributes } : data[0];
      currentExistingEffectId.value = effect.id || effect.documentId;

      if (effect.layers && effect.layers.length > 0) {
        layers.value.forEach(l => l.texture?.dispose());
        layers.value = [];

        effect.layers.forEach(lData => {
          const newLayer = createDefaultLayer();
          Object.keys(lData).forEach(k => {
            if (k !== 'id' && k !== 'drawData' && k in newLayer) {
              newLayer[k] = lData[k];
            }
          });

          if (lData.drawData) {
            const img = new Image();
            img.onload = () => {
              newLayer.ctx.drawImage(img, 0, 0);
              newLayer.texture.needsUpdate = true;
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
    syncUniforms();
  } catch(err) {
    console.error("Failed to load foil effect", err);
    currentExistingEffectId.value = null;
    resetToDefaultLayer();
  }
}

function resetToDefaultLayer() {
  layers.value.forEach(l => l.texture?.dispose());
  layers.value = [createDefaultLayer()];
  activeLayerIndex.value = 0;
  syncUniforms();
}

async function saveEffect() {
  if (!selectedCardId.value) return;
  saving.value = true;

  try {
    const exportedLayers = layers.value.map(l => {
      return {
        enabled: l.enabled,
        targetColor: l.targetColor,
        sensitivity: l.sensitivity,
        tolerance: l.tolerance,
        foilColor: l.foilColor,
        holoIntensity: l.holoIntensity,
        foilScale: l.foilScale,
        foilAngle: l.foilAngle,
        foilMode: l.foilMode,
        foilSpeed: l.foilSpeed,
        drawData: l.canvas.toDataURL('image/png')
      };
    });

    const payload = {
      card: selectedCardId.value,
      layers: exportedLayers
    };

    let res;
    if (currentExistingEffectId.value) {
      res = await strapiService.request('PUT', `/foil-effects/${currentExistingEffectId.value}`, { body: { data: payload } });
    } else {
      res = await strapiService.request('POST', `/foil-effects`, { body: { data: payload } });
    }

    if (res && res.error) throw new Error(res.error.message || "Save failed");

    const savedData = res.data || res;
    currentExistingEffectId.value = savedData.id || savedData.documentId;

    alert("Effet sauvegardé avec succès !");
  } catch (err) {
    alert("Erreur lors de la sauvegarde : " + err.message);
  } finally {
    saving.value = false;
  }
}

// ------------------------ THREE.JS LOGIC ------------------------

function initThreeJS() {
  const dcv = document.createElement('canvas');
  dcv.width = 1; dcv.height = 1;
  dummyTexture.value = new THREE.CanvasTexture(dcv);

  const container = canvasContainer.value;
  scene.value = new THREE.Scene();

  const aspect = container.clientWidth / container.clientHeight;
  camera.value = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  camera.value.position.z = 5;
  camera.value.position.x = -1.5;

  renderer.value = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.value.setPixelRatio(window.devicePixelRatio);
  renderer.value.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.value.domElement);

  textureLoader.value = new THREE.TextureLoader();

  animate();
}

function createDefaultLayer() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 1024, 1024);

  return reactive({
    enabled: true,
    targetColor: '#cc3333',
    sensitivity: 0.3,
    tolerance: 0.2,
    foilColor: '#ffffff',
    holoIntensity: 1.2,
    foilScale: 4.0,
    foilAngle: 0,
    foilMode: 0,
    foilSpeed: 1.0,
    canvas: canvas,
    ctx: ctx,
    texture: new THREE.CanvasTexture(canvas)
  });
}

function loadTexture(url) {
  textureLoader.value.load(url, (tex) => {
    if (mesh.value) scene.value.remove(mesh.value);

    const aspect = tex.image.width / tex.image.height;
    const geometry = new THREE.PlaneGeometry(3 * aspect, 3, 64, 64);

    material.value = new THREE.ShaderMaterial({
      vertexShader: vertexShaderStr,
      fragmentShader: fragmentShaderStr,
      uniforms: {
        tDiffuse: { value: tex },
        uLayerCount: { value: 0 },
        uActiveLayer: { value: 0 },
        uShowMask: { value: false },
        uTime: { value: 0 },
        uLayerEnabled: { value: new Array(MAX_LAYERS).fill(true) },
        uTargetColors: { value: new Array(MAX_LAYERS).fill(0).map(()=>new THREE.Color()) },
        uSensitivities: { value: new Array(MAX_LAYERS).fill(0) },
        uTolerances: { value: new Array(MAX_LAYERS).fill(0) },
        uHoloIntensities: { value: new Array(MAX_LAYERS).fill(0) },
        uFoilScales: { value: new Array(MAX_LAYERS).fill(0) },
        uFoilAngles: { value: new Array(MAX_LAYERS).fill(0) },
        uFoilColors: { value: new Array(MAX_LAYERS).fill(0).map(()=>new THREE.Color()) },
        uFoilSpeeds: { value: new Array(MAX_LAYERS).fill(0) },
        uFoilModes: { value: new Array(MAX_LAYERS).fill(0) },
        uDrawMask0: { value: dummyTexture.value },
        uDrawMask1: { value: dummyTexture.value },
        uDrawMask2: { value: dummyTexture.value },
        uDrawMask3: { value: dummyTexture.value },
        uDrawMask4: { value: dummyTexture.value }
      }
    });

    mesh.value = new THREE.Mesh(geometry, material.value);
    scene.value.add(mesh.value);

    const ringGeo = new THREE.RingGeometry(0.92, 1.0, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: layers.value[activeLayerIndex.value]?.targetColor || 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false });
    brushCursor.value = new THREE.Mesh(ringGeo, ringMat);
    brushCursor.value.visible = false;
    mesh.value.add(brushCursor.value);

    syncUniforms();
  }, undefined, (e) => console.error("Error loading texture", e));
}

function syncUniforms() {
  if (!material.value) return;
  const uniforms = material.value.uniforms;

  uniforms.uLayerCount.value = layers.value.length;
  uniforms.uActiveLayer.value = activeLayerIndex.value;

  for (let i = 0; i < MAX_LAYERS; i++) {
    if (i < layers.value.length) {
      const l = layers.value[i];
      uniforms.uLayerEnabled.value[i] = l.enabled;
      uniforms.uTargetColors.value[i].set(l.targetColor);
      uniforms.uSensitivities.value[i] = l.sensitivity;
      uniforms.uTolerances.value[i] = l.tolerance;
      uniforms.uHoloIntensities.value[i] = l.holoIntensity;
      uniforms.uFoilScales.value[i] = l.foilScale;
      uniforms.uFoilAngles.value[i] = l.foilAngle * Math.PI / 180;
      uniforms.uFoilColors.value[i].set(l.foilColor);
      uniforms.uFoilSpeeds.value[i] = l.foilSpeed;
      uniforms.uFoilModes.value[i] = l.foilMode;
      uniforms['uDrawMask'+i].value = l.texture;
    } else {
      uniforms.uLayerEnabled.value[i] = false;
      uniforms['uDrawMask'+i].value = dummyTexture.value;
    }
  }

  if (brushCursor.value && layers.value[activeLayerIndex.value]) {
    brushCursor.value.material.color.set(layers.value[activeLayerIndex.value].targetColor);
  }

  triggerTemporaryMask();
}

function triggerTemporaryMask() {
  if (!material.value || currentTool.value !== 'rotate') return;
  material.value.uniforms.uShowMask.value = true;
  clearTimeout(maskTimeout);
  maskTimeout = setTimeout(() => {
    if (material.value && currentTool.value === 'rotate') {
      material.value.uniforms.uShowMask.value = false;
    }
  }, 800);
}

// ------------------------ UI ACTIONS ------------------------

function setTool(tool) {
  currentTool.value = tool;
  if (material.value) {
    material.value.uniforms.uShowMask.value = (tool !== 'rotate');
  }
  if (brushCursor.value) {
    brushCursor.value.visible = (tool !== 'rotate');
  }
}

function selectLayer(index) {
  activeLayerIndex.value = index;
  syncUniforms();
}

function toggleLayer(index) {
  layers.value[index].enabled = !layers.value[index].enabled;
  syncUniforms();
}

function addLayer() {
  if (layers.value.length < MAX_LAYERS) {
    layers.value.push(createDefaultLayer());
    activeLayerIndex.value = layers.value.length - 1;
    syncUniforms();
  }
}

function deleteLayer(index) {
  if (layers.value.length > 1) {
    layers.value[index].texture.dispose();
    layers.value.splice(index, 1);
    if (activeLayerIndex.value >= layers.value.length) {
      activeLayerIndex.value = layers.value.length - 1;
    } else if (activeLayerIndex.value > index) {
      activeLayerIndex.value--;
    }
    syncUniforms();
  }
}

function fillMask(colorStr) {
  const layer = layers.value[activeLayerIndex.value];
  layer.ctx.fillStyle = colorStr;
  layer.ctx.fillRect(0, 0, 1024, 1024);
  layer.texture.needsUpdate = true;
}

async function pickColor() {
  if ('EyeDropper' in window) {
    try {
      const result = await new window.EyeDropper().open();
      layers.value[activeLayerIndex.value].targetColor = result.sRGBHex;
      syncUniforms();
    } catch (e) {}
  }
}

// ------------------------ MOUSE / DRAWING ------------------------

function paint(uv) {
  const layer = layers.value[activeLayerIndex.value];
  layer.ctx.beginPath();
  layer.ctx.arc(uv.x * 1024, (1 - uv.y) * 1024, brushSize.value, 0, Math.PI * 2);
  layer.ctx.fillStyle = currentTool.value === 'draw' ? 'white' : 'black';
  layer.ctx.fill();
  layer.texture.needsUpdate = true;
}

function onMouseDown(e) {
  isDragging = true;
  previousMousePosition = { x: e.clientX, y: e.clientY };

  if (currentTool.value !== 'rotate' && mesh.value) {
    const rect = canvasContainer.value.getBoundingClientRect();
    mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseNDC, camera.value);
    const intersects = raycaster.intersectObject(mesh.value);
    if (intersects.length > 0) paint(intersects[0].uv);
  }
}

function onMouseMove(e) {
  if (!canvasContainer.value) return;
  const rect = canvasContainer.value.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  if (currentTool.value !== 'rotate' && mesh.value && brushCursor.value) {
    raycaster.setFromCamera(mouseNDC, camera.value);
    const intersects = raycaster.intersectObject(mesh.value);

    if (intersects.length > 0) {
      brushCursor.value.visible = true;
      const uv = intersects[0].uv;
      const width = mesh.value.geometry.parameters.width;
      const height = mesh.value.geometry.parameters.height;

      brushCursor.value.position.set((uv.x - 0.5) * width, (uv.y - 0.5) * height, 0.01);
      brushCursor.value.scale.set((brushSize.value / 1024) * width, (brushSize.value / 1024) * height, 1);

      if (isDragging) paint(uv);
    } else {
      brushCursor.value.visible = false;
    }
  }

  if (isDragging && currentTool.value === 'rotate') {
    targetRotation.y += (e.clientX - previousMousePosition.x) * 0.01;
    targetRotation.x += (e.clientY - previousMousePosition.y) * 0.01;
    targetRotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, targetRotation.x));
    targetRotation.y = Math.max(-Math.PI/3, Math.min(Math.PI/3, targetRotation.y));
    previousMousePosition = { x: e.clientX, y: e.clientY };
  }
}

function onMouseUp() {
  isDragging = false;
}

function onWindowResize() {
  if (!canvasContainer.value || !camera.value || !renderer.value) return;
  const width = canvasContainer.value.clientWidth;
  const height = canvasContainer.value.clientHeight;
  camera.value.aspect = width / height;
  camera.value.updateProjectionMatrix();
  renderer.value.setSize(width, height);
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  if (mesh.value) {
    mesh.value.rotation.x += (targetRotation.x - mesh.value.rotation.x) * 0.1;
    mesh.value.rotation.y += (targetRotation.y - mesh.value.rotation.y) * 0.1;
    if (material.value) material.value.uniforms.uTime.value += 0.05;
  }
  if (renderer.value && scene.value && camera.value) {
    renderer.value.render(scene.value, camera.value);
  }
}
</script>

<style scoped>
.setting-group {
  @apply flex flex-col gap-2;
}

.setting-group label {
  @apply text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>