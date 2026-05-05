<template>
  <AppModal
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    title="Éditeur de Compétences"
    maxWidth="lg"
    @close="$emit('update:modelValue', false)"
  >
    <div class="skill-editor" v-if="card">
      <div class="card-info mb-6 flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
        <div class="w-16 h-20 bg-black/40 rounded-lg overflow-hidden border border-white/20">
          <img :src="card.imageUrl" class="w-full h-full object-cover" />
        </div>
        <div>
          <h4 class="text-white font-bold text-lg">{{ card.name }}</h4>
          <p class="text-gray-400 text-xs uppercase tracking-widest">ID: {{ card.id }}</p>
        </div>
      </div>

      <!-- Skills List -->
      <div class="skills-list space-y-4">
        <div v-for="(skill, index) in card.skills" :key="index" class="skill-item p-5 bg-black/40 rounded-2xl border border-white/10 relative group">
          <button @click="removeSkill(index)" class="absolute top-4 right-4 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
            <span class="text-xl">🗑️</span>
          </button>

          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="label-text">Type de Compétence</label>
              <select v-model="skill.type" class="admin-input w-full">
                <option v-for="handler in availableSkills" :key="handler.id" :value="handler.id">
                  {{ handler.name }} ({{ handler.id }})
                </option>
              </select>
            </div>

            <div>
              <label class="label-text">Valeur (value)</label>
              <input type="number" v-model.number="skill.value" class="admin-input w-full" />
            </div>

            <div>
              <label class="label-text">Compteur (counter)</label>
              <input type="number" v-model.number="skill.counter" class="admin-input w-full" placeholder="0 = infini" />
            </div>

            <div>
              <label class="label-text">Portée (range)</label>
              <input type="number" v-model.number="skill.range" class="admin-input w-full" />
            </div>

            <div>
              <label class="label-text">Filtre (filter)</label>
              <select v-model="skill.filter" class="admin-input w-full">
                <option value="none">Aucun</option>
                <option value="allies">Alliés</option>
                <option value="enemies">Ennemis</option>
                <option value="empty">Cases Vides</option>
                <option value="self">Soi-même</option>
              </select>
            </div>

            <div>
              <label class="label-text">Déclencheur (trigger)</label>
              <select v-model="skill.trigger" class="admin-input w-full">
                <option value="onEnterPlay">Au placement</option>
                <option value="onEndOfTurn">Fin de tour</option>
                <option value="onStartOfTurn">Début de tour</option>
                <option value="onCapture">Lors d'une capture</option>
                <option value="onCaptured">Lors d'une capture subie</option>
                <option value="onDeath">Lors de la mort</option>
                <option value="passive">Passif</option>
              </select>
            </div>

            <div>
              <label class="label-text">Origine (origin_type)</label>
              <select v-model="skill.origin_type" class="admin-input w-full">
                <option value="self">Self (Carte jouée)</option>
                <option value="fixed">Fixed (Coordonnées fixes)</option>
                <option value="manual">Manual (Choix utilisateur)</option>
              </select>
            </div>

            <div>
              <label class="label-text">Portée Origine (origin_reach)</label>
              <input type="number" v-model.number="skill.origin_reach" class="admin-input w-full" />
            </div>
            
            <div class="col-span-2">
                <label class="label-text mb-2">Patterns (Zones d'effet)</label>
                <div class="flex flex-wrap gap-2">
                  <button 
                    v-for="pat in AVAILABLE_PATTERNS" 
                    :key="pat.value"
                    @click="togglePattern(skill, pat.value)"
                    class="px-3 py-1.5 rounded-full text-[0.75rem] font-bold transition-all border"
                    :class="hasPattern(skill, pat.value) 
                      ? 'bg-[#00d2ff]/30 text-[#00d2ff] border-[#00d2ff] shadow-[0_0_10px_rgba(0,210,255,0.4)] opacity-100' 
                      : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/30 opacity-70'"
                  >
                    {{ pat.label }}
                  </button>
                </div>
            </div>

            <!-- Preview Grid -->
            <div class="col-span-2 mt-4 p-4 bg-black/50 rounded-xl border border-white/5 flex flex-col items-center">
              <label class="label-text mb-4 text-center">Aperçu de la zone d'effet (Portée max affichée: 3)</label>
              
              <div class="grid gap-1 p-2 bg-white/5 rounded-lg border border-white/10" style="grid-template-columns: repeat(7, 1fr);">
                <template v-for="y in 7" :key="'row-'+y">
                  <div 
                    v-for="x in 7" 
                    :key="'cell-'+x+'-'+y"
                    class="w-6 h-6 rounded-sm border transition-all duration-300 flex items-center justify-center relative"
                    :class="[
                       previewSets[index] && previewSets[index].has(`${x-1},${y-1}`) ? 'bg-[#00d2ff]/40 border-[#00d2ff] shadow-[0_0_8px_rgba(0,210,255,0.5)]' : 'bg-black/60 border-white/5',
                       (x-1 === 3 && y-1 === 3) ? 'ring-2 ring-white z-10' : ''
                    ]"
                  >
                    <!-- Center icon -->
                    <span v-if="x-1 === 3 && y-1 === 3" class="text-[10px]">👤</span>
                    <!-- Origin indicator for fixed -->
                    <span v-else-if="getOriginCell(skill).x === x-1 && getOriginCell(skill).y === y-1" class="text-[8px] text-red-400 font-bold absolute">X</span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <AppButton variant="secondary" fullWidth @click="addSkill" class="mt-4 border-dashed border-white/20">
          + Ajouter une compétence
        </AppButton>
      </div>
    </div>

    <template #footer>
      <AppButton variant="primary" @click="$emit('update:modelValue', false)">Fermer & Appliquer</AppButton>
    </template>
  </AppModal>
</template>

<script setup>
import { computed } from 'vue';
import AppModal from '../../components/ui/AppModal.vue';
import AppButton from '../../components/ui/AppButton.vue';
import { skillRegistry } from '../../../../shared/skills';
import { getTargetCells } from '../../../../shared/skills/helpers';

const props = defineProps({
  modelValue: Boolean,
  card: Object
});

const emit = defineEmits(['update:modelValue']);

const availableSkills = computed(() => {
  return skillRegistry.getAllHandlers().sort((a, b) => a.name.localeCompare(b.name));
});

function addSkill() {
  if (!props.card.skills) props.card.skills = [];
  props.card.skills.push({
    type: 'growing',
    value: 1,
    filter: 'none',
    trigger: 'onEnterPlay',
    origin_type: 'self'
  });
}

function removeSkill(index) {
  props.card.skills.splice(index, 1);
}

const AVAILABLE_PATTERNS = [
  { value: 'adjacent', label: 'Croix (adjacent)' },
  { value: 'diagonals', label: 'Diagonales' },
  { value: 'cross', label: 'Étoile (cross)' },
  { value: 'row', label: 'Ligne' },
  { value: 'column', label: 'Colonne' },
  { value: 'all', label: 'Tout' },
  { value: 'top', label: 'Haut' },
  { value: 'bottom', label: 'Bas' },
  { value: 'left', label: 'Gauche' },
  { value: 'right', label: 'Droite' },
  { value: 'self', label: 'Soi-même' }
];

function hasPattern(skill, patternValue) {
  if (!skill.patterns || !Array.isArray(skill.patterns)) return false;
  return skill.patterns.some(p => (p.value || p) === patternValue);
}

function togglePattern(skill, patternValue) {
  if (!skill.patterns) skill.patterns = [];
  const index = skill.patterns.findIndex(p => (p.value || p) === patternValue);
  if (index !== -1) {
    skill.patterns.splice(index, 1);
  } else {
    skill.patterns.push({ value: patternValue });
  }
}

function getPreviewCells(skill) {
  const w = 7, h = 7, cx = 3, cy = 3;
  const board = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) row.push({ owner: 'dummy' });
    board.push(row);
  }
  
  const skillCopy = { ...skill, filter: 'none' };
  const ctx = {
    board, x: cx, y: cy,
    card: { owner: 'player' },
    owner: 'player',
    skill: skillCopy
  };
  
  const targets = getTargetCells(ctx);
  const set = new Set();
  for (const t of targets) {
    set.add(`${t.x},${t.y}`);
  }
  return set;
}

const previewSets = computed(() => {
  if (!props.card || !props.card.skills) return [];
  return props.card.skills.map(skill => getPreviewCells(skill));
});

function getOriginCell(skill) {
  const cx = 3, cy = 3;
  if (skill.origin_type === 'fixed') {
    const dirMap = {
      top: {dx: 0, dy: -1}, bottom: {dx: 0, dy: 1}, left: {dx: -1, dy: 0}, right: {dx: 1, dy: 0},
      top_left: {dx: -1, dy: -1}, top_right: {dx: 1, dy: -1}, bottom_left: {dx: -1, dy: 1}, bottom_right: {dx: 1, dy: 1}
    };
    const dir = dirMap[skill.origin_direction || 'top'];
    const reach = skill.origin_reach || 1;
    if (dir) {
      return { x: cx + dir.dx * reach, y: cy + dir.dy * reach };
    }
  }
  return { x: cx, y: cy };
}
</script>

<style scoped>
.label-text {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 0.5rem;
}

.admin-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.admin-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(0, 0, 0, 0.5);
}

select.admin-input {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='flex' /%3E%3Cpath d='M19 9l-7 7-7-7' /%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-size: 1rem;
    padding-right: 2.5rem;
}
</style>
