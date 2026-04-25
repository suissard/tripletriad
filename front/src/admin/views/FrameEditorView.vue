<template>
  <div class="kinetic-ether-editor min-h-full p-8 md:p-12 lg:p-16 flex flex-col gap-12 overflow-hidden">
    
    <!-- HEADER: Technical Editorial Style -->
    <header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 z-20">
      <div class="space-y-2">
        <h2 class="text-[10px] font-bold text-primary tracking-[0.3em] uppercase">Module de Configuration</h2>
        <h1 class="text-5xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
          Holographic <span class="text-surface-tint">Atelier</span>
        </h1>
        <p class="text-on-surface-variant text-sm font-medium max-w-md">
          Précision chirurgicale pour le positionnement des métadonnées et de l'énergie visuelle des cartes.
        </p>
      </div>

      <div class="flex gap-4">
        <button 
          @click="saveChanges" 
          class="kinetic-trigger primary-trigger h-14 px-10 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-3"
          :disabled="saving || !selectedFrame"
        >
          <span>{{ saving ? 'Synchronisation...' : 'Enregistrer la matrice' }}</span>
          <span v-if="!saving" class="text-lg">⚡</span>
        </button>
      </div>
    </header>

    <div class="flex-1 flex flex-col lg:flex-row gap-8 relative min-h-0">
      
      <!-- LEFT: TOOL WELL -->
      <aside class="w-full lg:w-72 flex flex-col gap-6 z-10">
        <section class="tool-well flex flex-col gap-4">
          <div class="flex items-center justify-between px-2">
            <h3 class="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Matrices</h3>
            <button @click="isMatrixSelectorCollapsed = !isMatrixSelectorCollapsed" class="text-[10px] text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
              <span>{{ isMatrixSelectorCollapsed ? 'DÉPLOYER' : 'REPLIER' }}</span>
              <span>{{ isMatrixSelectorCollapsed ? '↓' : '↑' }}</span>
            </button>
          </div>
          
          <div v-if="!isMatrixSelectorCollapsed" class="frame-matrix custom-scrollbar overflow-y-auto max-h-[40vh] pr-2 flex flex-col gap-2">
            <button 
              v-for="frame in frames" 
              :key="frame.id"
              class="matrix-item"
              :class="{ 'is-active': selectedFrame?.id === frame.id }"
              @click="selectFrame(frame)"
            >
              <div class="matrix-thumb">
                <img :src="frame.image" />
              </div>
              <div class="matrix-info">
                <div class="name">{{ frame.name }}</div>
              </div>
            </button>
          </div>
        </section>

        <!-- QUICK ACTIONS -->
        <section v-if="selectedFrame" class="tool-well flex flex-col gap-3">
          <h3 class="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-1">Actions Rapides</h3>
          <button @click="centerStats('X')" class="kinetic-trigger secondary-trigger py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest">
            Centrer X (Haut/Bas)
          </button>
          <button @click="centerStats('Y')" class="kinetic-trigger secondary-trigger py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest">
            Centrer Y (Gauche/Droite)
          </button>
          <button @click="resetToDefault" class="kinetic-trigger py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400 hover:bg-red-500/20">
            Réinitialiser
          </button>
        </section>
      </aside>

      <!-- CENTER: THE LIGHT TABLE -->
      <main class="flex-1 flex flex-col items-center justify-center relative min-h-[600px] perspective-area">
        <div class="ambient-glow"></div>
        
        <!-- TOP CONTROL BAR (Floating) -->
        <div v-if="selectedFrame" class="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6 glass-panel px-6 py-3 rounded-2xl border border-white/5 shadow-2xl">
          <div class="flex items-center gap-3">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Aperçu</span>
            <select v-model="selectedCardId" class="bg-surface border-none text-[11px] font-bold text-primary rounded-lg px-3 py-1 outline-none">
              <option :value="null">Par défaut</option>
              <option v-for="c in availableCards" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="h-4 w-px bg-white/10"></div>
          <div class="flex items-center gap-3">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rareté</span>
            <select v-model="selectedRarity" class="bg-surface border-none text-[11px] font-bold text-primary rounded-lg px-3 py-1 outline-none">
              <option v-for="r in ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
          <div class="h-4 w-px bg-white/10"></div>
          <label class="flex items-center gap-3 cursor-pointer group">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-primary transition-colors">Symétrie Totale</span>
            <div class="relative inline-flex items-center">
              <input type="checkbox" v-model="symmetryEnabled" class="sr-only peer">
              <div class="w-10 h-5 bg-white/5 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-500 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary/50 peer-checked:after:bg-primary"></div>
            </div>
          </label>
        </div>

        <div v-if="!selectedFrame" class="placeholder-message animate-pulse text-center">
           <div class="text-4xl font-black text-white/5 uppercase tracking-widest mb-2">SÉLECTIONNER</div>
           <div class="text-sm font-bold text-white/10 uppercase tracking-[0.5em]">Une Matrice de Cadre</div>
        </div>
        
        <div v-else class="light-table-workspace" ref="workspaceRef">
          <div class="card-projection">
            <TripleTriadCard 
              :card="previewCard"
              :card-frame="selectedFrame.image"
              :override-frame-coords="editedValues"
              :size="cardPreviewSize"
              :disableZoom="true"
              :flat="true"
            />
            <div class="control-overlay" :style="overlayStyle" @mousemove="handleMouseMove" @mouseup="stopDragging" @mouseleave="stopDragging">
              <div class="illu-control-box" :style="illustrationStyle" @mousedown="startDragging('illustration', $event)">
                <div class="box-label">Zone Image</div>
                <div class="corner-resizer" @mousedown.stop="startDragging('illustration-resize', $event)"></div>
              </div>
              <div v-for="s in statAnchors" :key="s.id" class="stat-node" :class="s.id" :style="getStatAnchorStyle(s.id)" @mousedown="startDragging(s.id, $event)">
                <div class="node-ring"></div>
                <div class="node-dot"></div>
                <div class="node-tag">{{ s.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- RIGHT: PROPERTIES PANEL -->
      <aside v-if="selectedFrame" class="w-full lg:w-80 flex flex-col gap-6 z-10 animate-fade-in">
        <section class="tool-well flex flex-col gap-4 flex-1 overflow-hidden">
          <h3 class="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] px-2">Propriétés de Matrice</h3>
          
          <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
            <!-- Illustration Group -->
            <div class="space-y-3">
              <div class="text-[9px] font-black text-primary/40 uppercase tracking-widest border-b border-white/5 pb-1">Illustration</div>
              <div class="grid grid-cols-2 gap-3">
                <div v-for="key in ['illustrationX', 'illustrationY', 'illustrationWidth', 'illustrationHeight']" :key="key" class="property-input">
                  <label>{{ key.replace('illustration', '') }}</label>
                  <input type="number" step="0.1" v-model.number="editedValues[key]" @input="handleManualChange(key)" />
                </div>
              </div>
            </div>

            <!-- Stats Group -->
            <div class="space-y-4">
              <div class="text-[9px] font-black text-primary/40 uppercase tracking-widest border-b border-white/5 pb-1">Statistiques</div>
              
              <div v-for="dir in ['top', 'bottom', 'left', 'right']" :key="dir" class="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div class="text-[8px] font-bold text-gray-500 uppercase">{{ dir }}</div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="property-input">
                    <label>X</label>
                    <input type="number" step="0.1" v-model.number="editedValues[dir + 'X']" @input="handleManualChange(dir + 'X')" />
                  </div>
                  <div class="property-input">
                    <label>Y</label>
                    <input type="number" step="0.1" v-model.number="editedValues[dir + 'Y']" @input="handleManualChange(dir + 'Y')" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Element Group -->
            <div class="space-y-3">
              <div class="text-[9px] font-black text-primary/40 uppercase tracking-widest border-b border-white/5 pb-1">Élément</div>
              <div class="grid grid-cols-2 gap-3">
                <div class="property-input">
                  <label>X</label>
                  <input type="number" step="0.1" v-model.number="editedValues.elementX" @input="handleManualChange('elementX')" />
                </div>
                <div class="property-input">
                  <label>Y</label>
                  <input type="number" step="0.1" v-model.number="editedValues.elementY" @input="handleManualChange('elementY')" />
                </div>
              </div>
            </div>

            <!-- Name Group -->
            <div class="space-y-3">
              <div class="text-[9px] font-black text-primary/40 uppercase tracking-widest border-b border-white/5 pb-1">Nom</div>
              <div class="grid grid-cols-2 gap-3">
                <div class="property-input">
                  <label>X</label>
                  <input type="number" step="0.1" v-model.number="editedValues.nameX" @input="handleManualChange('nameX')" />
                </div>
                <div class="property-input">
                  <label>Y</label>
                  <input type="number" step="0.1" v-model.number="editedValues.nameY" @input="handleManualChange('nameY')" />
                </div>
              </div>
            </div>

            <!-- Skills Group -->
            <div class="space-y-3">
              <div class="text-[9px] font-black text-primary/40 uppercase tracking-widest border-b border-white/5 pb-1">Capacités</div>
              <div class="grid grid-cols-2 gap-3">
                <div class="property-input">
                  <label>X</label>
                  <input type="number" step="0.1" v-model.number="editedValues.skillsX" @input="handleManualChange('skillsX')" />
                </div>
                <div class="property-input">
                  <label>Y</label>
                  <input type="number" step="0.1" v-model.number="editedValues.skillsY" @input="handleManualChange('skillsY')" />
                </div>
              </div>
            </div>

            <!-- Rarity Variants Group -->
            <div class="space-y-4">
              <div class="text-[9px] font-black text-primary/40 uppercase tracking-widest border-b border-white/5 pb-1">Variantes de Rareté</div>
              <div class="space-y-2">
                <div v-for="rarity in ['Uncommon', 'Rare', 'Epic', 'Legendary']" :key="rarity" class="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                   <div class="text-[8px] font-bold text-gray-500 uppercase mb-2">{{ rarity }}</div>
                   <div class="flex items-center gap-4">
                     <div class="w-12 h-16 rounded border border-white/10 bg-black/20 flex items-center justify-center overflow-hidden">
                       <img v-if="selectedFrame['image' + rarity]" :src="selectedFrame['image' + rarity]" class="w-full h-full object-contain" />
                       <span v-else class="text-[8px] text-white/20">Empty</span>
                     </div>
                     <div class="flex-1 text-[9px] text-white/30 italic leading-tight">
                        Image alternative pour cette rareté.
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </aside>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { useUserStore } from '../../stores/userStore';
import strapiService from '@/api/strapi';
import TripleTriadCard from '../../components/TripleTriadCard.vue';

const userStore = useUserStore();
const frames = computed(() => userStore.cardFrames);
const availableCards = computed(() => userStore.cards || []);
const selectedCardId = ref(null);
const selectedFrame = ref(null);
const workspaceRef = ref(null);
const saving = ref(false);
const symmetryEnabled = ref(true);
const isMatrixSelectorCollapsed = ref(false);
const selectedRarity = ref('Legendary');

const editedValues = reactive({
  illustrationX: 0,
  illustrationY: 0,
  illustrationWidth: 100,
  illustrationHeight: 100,
  topX: 50,
  topY: 8,
  bottomX: 50,
  bottomY: 94,
  leftX: 6,
  leftY: 50,
  rightX: 94,
  rightY: 50,
  elementX: 4,
  elementY: 4,
  nameX: 50,
  nameY: 85,
  skillsX: 50,
  skillsY: 65
});

const previewCard = computed(() => {
  const card = availableCards.value.find(c => c.id === selectedCardId.value);
  const baseData = card ? { ...card, elements: card.elements?.length ? card.elements : ['Fire'] } : {
    id: 0,
    name: "KINETIC ETHER",
    topValue: 10,
    leftValue: 8,
    rightValue: 9,
    bottomValue: 7,
    imageUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=atelier&backgroundColor=0c0c1d",
    level: 5,
    elements: ['radiation'],
    skills: ['Berserk', 'Protect']
  };

  return {
    ...baseData,
    rarity: selectedRarity.value
  };
});

const statAnchors = [
  { id: 'top', label: 'UP' },
  { id: 'bottom', label: 'DOWN' },
  { id: 'left', label: 'LEFT' },
  { id: 'right', label: 'RIGHT' },
  { id: 'element', label: 'EL' },
  { id: 'name', label: 'NM' },
  { id: 'skills', label: 'SK' }
];

// Card preview size - large enough for precise editing
const cardPreviewSize = 400;

function formatParamName(key) {
  return key.replace(/([A-Z])/g, ' $1').toUpperCase();
}

function handleManualChange(key) {
  if (symmetryEnabled.value && !['element', 'name', 'skills'].some(s => key.startsWith(s))) {
    const dir = key.replace(/[XY]/, '');
    const isX = key.endsWith('X');
    applySymmetry(dir, isX ? editedValues[key] : editedValues[dir + 'X'], !isX);
  }
}

function centerStats(axis) {
  if (axis === 'X') {
    editedValues.topX = 50;
    editedValues.bottomX = 50;
    editedValues.nameX = 50;
    editedValues.skillsX = 50;
    if (symmetryEnabled.value) {
       editedValues.leftY = 50;
       editedValues.rightY = 50;
    }
  } else {
    editedValues.leftY = 50;
    editedValues.rightY = 50;
    if (symmetryEnabled.value) {
       editedValues.topX = 50;
       editedValues.bottomX = 50;
    }
  }
}

function resetToDefault() {
  if (!confirm('Réinitialiser toutes les coordonnées ?')) return;
  Object.assign(editedValues, {
    illustrationX: 0, illustrationY: 0, illustrationWidth: 100, illustrationHeight: 100,
    topX: 50, topY: 8, bottomX: 50, bottomY: 94,
    leftX: 6, leftY: 50, rightX: 94, rightY: 50,
    elementX: 4, elementY: 4,
    nameX: 50, nameY: 85,
    skillsX: 50, skillsY: 65
  });
}

function selectFrame(frame) {
  selectedFrame.value = frame;
  editedValues.illustrationX = frame.illustrationX ?? 0;
  editedValues.illustrationY = frame.illustrationY ?? 0;
  editedValues.illustrationWidth = frame.illustrationWidth ?? 100;
  editedValues.illustrationHeight = frame.illustrationHeight ?? 100;
  editedValues.topX = frame.topX ?? 50;
  editedValues.topY = frame.topY ?? 8;
  editedValues.bottomX = frame.bottomX ?? 50;
  editedValues.bottomY = frame.bottomY ?? 94;
  editedValues.leftX = frame.leftX ?? 6;
  editedValues.leftY = frame.leftY ?? 50;
  editedValues.rightX = frame.rightX ?? 94;
  editedValues.rightY = frame.rightY ?? 50;
  editedValues.elementX = frame.elementX ?? 4;
  editedValues.elementY = frame.elementY ?? 4;
  editedValues.nameX = frame.nameX ?? 50;
  editedValues.nameY = frame.nameY ?? 85;
  editedValues.skillsX = frame.skillsX ?? 50;
  editedValues.skillsY = frame.skillsY ?? 65;

  isMatrixSelectorCollapsed.value = true;
}

// --- DRAG LOGIC ---
const dragging = ref(null);

function startDragging(type, event) {
  dragging.value = type;
}

function stopDragging() {
  dragging.value = null;
}

function applySymmetry(type, valPct, isY = false) {
  const center = 50;

  if (type === 'top' || type === 'bottom') {
    const source = type === 'top' ? 'top' : 'bottom';
    const target = type === 'top' ? 'bottom' : 'top';
    
    // Vertical Axis Symmetry (X match)
    editedValues[target + 'X'] = editedValues[source + 'X'];
    // Opposite Mirroring (Y distance)
    editedValues[target + 'Y'] = center - (editedValues[source + 'Y'] - center);
  } 
  else if (type === 'left' || type === 'right') {
    const source = type === 'left' ? 'left' : 'right';
    const target = type === 'left' ? 'right' : 'left';
    
    // Horizontal Axis Symmetry (Y match)
    editedValues[target + 'Y'] = editedValues[source + 'Y'];
    // Opposite Mirroring (X distance)
    editedValues[target + 'X'] = center - (editedValues[source + 'X'] - center);
  }
}

function handleMouseMove(event) {
  if (!dragging.value || !workspaceRef.value) return;

  const overlayEl = workspaceRef.value.querySelector('.control-overlay');
  const rect = overlayEl.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const xPct = Math.min(Math.max((x / rect.width) * 100, 0), 100);
  const yPct = Math.min(Math.max((y / rect.height) * 100, 0), 100);

  if (dragging.value === 'illustration') {
      editedValues.illustrationX = xPct;
      editedValues.illustrationY = yPct;
  } else if (dragging.value === 'illustration-resize') {
      editedValues.illustrationWidth = Math.max(xPct - editedValues.illustrationX, 5);
      editedValues.illustrationHeight = Math.max(yPct - editedValues.illustrationY, 5);
  } else if (dragging.value === 'top') {
      editedValues.topX = xPct;
      editedValues.topY = yPct;
      if (symmetryEnabled.value) applySymmetry('top');
  } else if (dragging.value === 'bottom') {
      editedValues.bottomX = xPct;
      editedValues.bottomY = yPct;
      if (symmetryEnabled.value) applySymmetry('bottom');
  } else if (dragging.value === 'left') {
      editedValues.leftX = xPct;
      editedValues.leftY = yPct;
      if (symmetryEnabled.value) applySymmetry('left');
  } else if (dragging.value === 'right') {
      editedValues.rightX = xPct;
      editedValues.rightY = yPct;
      if (symmetryEnabled.value) applySymmetry('right');
  } else if (dragging.value === 'element') {
      editedValues.elementX = xPct;
      editedValues.elementY = yPct;
  } else if (dragging.value === 'name') {
      editedValues.nameX = xPct;
      editedValues.nameY = yPct;
  } else if (dragging.value === 'skills') {
      editedValues.skillsX = xPct;
      editedValues.skillsY = yPct;
  }
}

const illustrationStyle = computed(() => ({
  top: `${editedValues.illustrationY}%`,
  left: `${editedValues.illustrationX}%`,
  width: `${editedValues.illustrationWidth}%`,
  height: `${editedValues.illustrationHeight}%`
}));

const overlayStyle = computed(() => {
  // TripleTriadCard default size is 150, border defaults to 2px
  const scale = cardPreviewSize / 150;
  const borderWidth = 2 * scale;
  return {
    top: `${borderWidth}px`,
    left: `${borderWidth}px`,
    right: `${borderWidth}px`,
    bottom: `${borderWidth}px`
  };
});

function getStatAnchorStyle(id) {
  if (id === 'top') return { left: `${editedValues.topX}%`, top: `${editedValues.topY}%` };
  if (id === 'bottom') return { left: `${editedValues.bottomX}%`, top: `${editedValues.bottomY}%` };
  if (id === 'left') return { left: `${editedValues.leftX}%`, top: `${editedValues.leftY}%` };
  if (id === 'right') return { left: `${editedValues.rightX}%`, top: `${editedValues.rightY}%` };
  if (id === 'element') return { left: `${editedValues.elementX}%`, top: `${editedValues.elementY}%` };
  if (id === 'name') return { left: `${editedValues.nameX}%`, top: `${editedValues.nameY}%` };
  if (id === 'skills') return { left: `${editedValues.skillsX}%`, top: `${editedValues.skillsY}%` };
  return {};
}

// workspaceStyle removed — card-projection now sizes itself to its child card

async function saveChanges() {
  if (!selectedFrame.value) return;
  saving.value = true;
  try {
    const identifier = selectedFrame.value.documentId || selectedFrame.value.id;
    const res = await strapiService.request('PUT', `/card-frames/${identifier}`, {
      body: { data: editedValues }
    });
    
    if (res.error) throw new Error(res.error.message);
    
    await userStore.fetchCardFrames(true);
    // Success feedback via a small notification would be better
  } catch (err) {
    alert('Synchronization Error: ' + err.message);
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  userStore.fetchCardFrames();
});

</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

.kinetic-ether-editor {
  background-color: #121222; /* SURFACE */
  font-family: 'Inter', sans-serif;
}

h1, h2, h3 {
  font-family: 'Space Grotesk', sans-serif;
}

/* --- COLORS & TOKENS --- */
.text-primary { color: #a5e7ff; }
.text-surface-tint { color: #47d6ff; }
.text-on-surface-variant { color: #bbc9cf; }

/* --- BUTTONS: KINETIC TRIGGERS --- */
.kinetic-trigger {
  transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
  position: relative;
  overflow: hidden;
  border: none;
  cursor: pointer;
}

.primary-trigger {
  background: linear-gradient(135deg, #a5e7ff 0%, #00d2ff 100%);
  color: #003543;
  box-shadow: 0 4px 20px rgba(0, 210, 255, 0.2);
}

.primary-trigger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 210, 255, 0.4);
}

.primary-trigger:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  filter: grayscale(1);
}

/* --- TOOL WELLS --- */
.tool-well {
  background: #0c0c1d; /* SURFACE CONTAINER LOWEST */
  padding: 1.5rem;
  border-radius: 1rem;
}

.frame-matrix {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.matrix-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #1a1a2b; /* SURFACE CONTAINER LOW */
  border: none;
  border-radius: 0.75rem;
  transition: all 0.2s;
  cursor: pointer;
  position: relative;
  text-align: left;
}

.matrix-item:hover {
  background: #1e1e2f;
}

.matrix-item.is-active {
  background: #29283a; /* SURFACE CONTAINER HIGH */
  box-shadow: inset 0 0 0 1px rgba(165, 231, 255, 0.2);
}

.matrix-thumb {
  width: 40px;
  height: 40px;
  background: #0c0c1d;
  border-radius: 0.5rem;
  overflow: hidden;
  flex-shrink: 0;
}

.matrix-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.matrix-info .name {
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
}

.active-dot {
  position: absolute;
  right: 12px;
  width: 6px;
  height: 6px;
  background: #a5e7ff;
  border-radius: 50%;
  box-shadow: 0 0 10px #a5e7ff;
}

/* --- PARAMETER GRID --- */
.parameter-grid {
  display: grid;
  grid-cols: 1;
  gap: 0.5rem;
}

.parameter-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #1a1a2b;
  border-radius: 0.5rem;
}

.parameter-card .label {
  font-size: 9px;
  font-weight: 800;
  color: #bbc9cf;
  letter-spacing: 0.1em;
}

.parameter-card .value {
  font-size: 11px;
  font-weight: 600;
  color: #a5e7ff;
}

/* --- LIGHT TABLE --- */
.perspective-area {
  background: radial-gradient(circle at center, #1a1a2b 0%, #121222 100%);
  border-radius: 2rem;
}

.ambient-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(71, 214, 255, 0.03) 0%, transparent 70%);
  pointer-events: none;
}

.light-table-workspace {
  position: relative;
  z-index: 10;
}

.card-projection {
  position: relative;
  display: inline-block; /* Shrink-wrap to card dimensions */
  transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1);
}

.control-overlay {
  position: absolute;
  z-index: 100;
  cursor: crosshair;
}

/* --- ILLU CONTROL BOX --- */
.illu-control-box {
  position: absolute;
  border: 1px solid rgba(165, 231, 255, 0.5);
  background: rgba(165, 231, 255, 0.05);
  cursor: move;
  backdrop-filter: blur(2px);
}

.illu-control-box .box-label {
  position: absolute;
  top: -20px;
  left: 0;
  font-size: 8px;
  font-weight: 900;
  text-transform: uppercase;
  color: #a5e7ff;
  letter-spacing: 0.2em;
}

.corner-resizer {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 10px;
  height: 10px;
  background: #a5e7ff;
  border-radius: 1px;
  cursor: nwse-resize;
  box-shadow: 0 0 10px rgba(165, 231, 255, 0.5);
}

/* --- STAT NODES --- */
.stat-node {
  position: absolute;
  width: 32px;
  height: 32px;
  transform: translate(-50%, -50%);
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-node:active { cursor: grabbing; }

.node-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 1px solid rgba(255, 216, 137, 0.2); /* TERTIARY GOLD */
  border-radius: 50%;
  animation: nodePulse 2s infinite;
}

.node-dot {
  width: 8px;
  height: 8px;
  background: #ffd889;
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(255, 216, 137, 0.6);
  z-index: 2;
}

.node-tag {
  position: absolute;
  bottom: -18px;
  font-size: 8px;
  font-weight: 900;
  color: #ffd889;
  background: rgba(12, 12, 29, 0.8);
  padding: 2px 6px;
  border-radius: 100px;
  white-space: nowrap;
  backdrop-filter: blur(4px);
}

.property-input {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.property-input label {
  font-size: 8px;
  font-weight: 800;
  color: #bbc9cf;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.property-input input {
  background: #0c0c1d;
  border: 1px solid rgba(165, 231, 255, 0.05);
  border-radius: 0.5rem;
  padding: 0.5rem;
  color: #a5e7ff;
  font-family: 'Space Grotesk', monospace;
  font-size: 11px;
  width: 100%;
  outline: none;
  transition: all 0.2s;
}

.property-input input:focus {
  border-color: #a5e7ff;
  background: #121222;
}

.secondary-trigger {
  background: rgba(165, 231, 255, 0.05);
  color: #a5e7ff;
  border: 1px solid rgba(165, 231, 255, 0.1);
}

.secondary-trigger:hover {
  background: rgba(165, 231, 255, 0.1);
  border-color: rgba(165, 231, 255, 0.2);
}

@keyframes nodePulse {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

/* --- ANIMATIONS --- */
.animate-fade-in {
  animation: fadeIn 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- SCROLLBAR --- */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(165, 231, 255, 0.1);
  border-radius: 10px;
}
</style>
