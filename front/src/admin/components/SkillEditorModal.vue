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
              <label class="label-text">Durée (duration)</label>
              <input type="number" v-model.number="skill.duration" class="admin-input w-full" placeholder="0 = permanent" />
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
                <label class="label-text">Patterns (Séparez par des virgules : "0,-1", "1,0")</label>
                <input 
                    type="text" 
                    :value="patternsToString(skill.patterns)" 
                    @input="e => skill.patterns = stringToPatterns(e.target.value)"
                    class="admin-input w-full" 
                    placeholder="ex: 0,-1, 0,1, -1,0, 1,0"
                />
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
    origin_type: 'self'
  });
}

function removeSkill(index) {
  props.card.skills.splice(index, 1);
}

function patternsToString(patterns) {
    if (!patterns || !Array.isArray(patterns)) return '';
    return patterns.map(p => {
        if (typeof p === 'string') return p;
        if (p.value) return p.value;
        return '';
    }).filter(Boolean).join(', ');
}

function stringToPatterns(str) {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ value: s }));
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
