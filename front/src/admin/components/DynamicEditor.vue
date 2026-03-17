<template>
  <div class="min-h-full pb-10">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
      <div>
        <h1 v-if="!isEditing" class="text-4xl font-extrabold text-white tracking-tight mb-2 capitalize">Gestion des {{ collectionName }}</h1>
        <h1 v-else class="text-4xl font-extrabold text-white tracking-tight mb-2 capitalize">
          {{ currentItem.id || currentItem.documentId ? 'Éditer' : 'Créer' }} {{ collectionName.slice(0, -1) }}
        </h1>
        <p v-if="!isEditing" class="text-gray-400 text-sm">Consultez, ajoutez ou modifiez les entrées de la collection {{ collectionName }}.</p>
      </div>
      <button v-if="!isEditing" @click="openEditor()" class="btn btn-primary min-w-[160px] h-12 shadow-lg shadow-primary/20">
        <span class="mr-2 text-xl">+</span> Nouveau
      </button>
      <button v-else @click="closeEditor" class="btn btn-secondary min-w-[160px] h-12 shadow-lg">
        <span class="mr-2 text-xl">←</span> Retour
      </button>
    </div>

    <transition name="fade" mode="out-in">
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p class="text-gray-500 font-medium">Chargement des données...</p>
      </div>
      <div v-else-if="error" class="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
        <span>⚠️</span> {{ error }}
      </div>

      <!-- Table View -->
      <div v-else-if="!isEditing" class="glass-panel rounded-3xl overflow-hidden">
        <div class="overflow-x-auto custom-scrollbar">
          <table class="min-w-full border-collapse">
            <thead>
              <tr class="border-b border-white/5 bg-white/2">
                <th v-for="col in columns" :key="col" class="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {{ col }}
                </th>
                <th class="px-8 py-5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr v-for="item in items" :key="item.id || item.documentId" class="group hover:bg-white/[0.03] transition-colors">
                <td v-for="col in columns" :key="col" class="px-8 py-5 text-sm">
                  <span class="text-gray-300 font-medium">{{ formatValue(item[col]) }}</span>
                </td>
                <td class="px-8 py-5 text-right space-x-3">
                  <button @click="openEditor(item)" class="text-primary hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Éditer</button>
                  <button @click="deleteItem(item)" class="text-red-500/50 hover:text-red-500 text-xs font-bold uppercase tracking-widest transition-colors">Supprimer</button>
                </td>
              </tr>
              <tr v-if="items.length === 0">
                <td :colspan="columns.length + 1" class="px-8 py-10 text-center text-gray-500 italic">
                  Aucun élément trouvé dans cette collection.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Editor View (Inline instead of Modal) -->
      <div v-else class="glass-panel w-full rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col md:flex-row">
        
        <!-- Editor Body -->
        <div class="flex-1 p-10 overflow-y-auto custom-scrollbar">
          <div class="space-y-6">
              <div v-for="field in formFields" :key="field.name" class="setting-group">
                <label :for="field.name">{{ field.name }}</label>

                <template v-if="field.type === 'select'">
                  <PremiumSelect
                    v-model="formData[field.name]"
                    :options="field.options"
                    :placeholder="'Choisir ' + field.name + '...'"
                  />
                </template>

                <template v-else-if="field.type === 'string' || field.type === 'email' || field.type === 'password'">
                  <input :type="field.type === 'password' ? 'password' : (field.type === 'email' ? 'email' : 'text')"
                        v-model="formData[field.name]"
                        :id="field.name"
                        class="focus:ring-2 focus:ring-primary/20 outline-none">
                </template>

                <template v-else-if="field.type === 'number'">
                  <input type="number"
                        v-model.number="formData[field.name]"
                        :id="field.name"
                        class="focus:ring-2 focus:ring-primary/20 outline-none">
                </template>

                <template v-else-if="field.type === 'text'">
                  <textarea v-model="formData[field.name]"
                            :id="field.name"
                            rows="4"
                            class="focus:ring-2 focus:ring-primary/20 outline-none"></textarea>
                </template>


                <template v-else-if="field.type === 'boolean'">
                  <div class="flex items-center pt-2">
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" v-model="formData[field.name]" class="sr-only peer">
                      <div class="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      <span class="ml-3 text-sm font-medium text-gray-400 capitalize">{{ formData[field.name] ? 'Activé' : 'Désactivé' }}</span>
                    </label>
                  </div>
                </template>

                <template v-else>
                  <input type="text"
                        v-model="formData[field.name]"
                        :id="field.name"
                        placeholder="Valeur complexe (JSON)">
                </template>
              </div>
            </div>

          <div class="flex justify-end gap-4 mt-12 pt-8 border-t border-white/5">
            <button @click="closeEditor" class="btn btn-secondary px-8">Annuler</button>
            <button @click="saveItem" class="btn btn-primary px-8">Enregistrer</button>
          </div>
        </div>

        <!-- Dynamic Sidebar Preview (Only for Cards) -->
        <div v-if="collectionName === 'cards'" class="w-full md:w-80 bg-white/[0.02] border-l border-white/5 p-10 flex flex-col items-center justify-center gap-6">
          <h3 class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Aperçu de la Carte</h3>
          <div class="scale-110">
            <TripleTriadCard
              :card="{
                ...formData,
                imageUrl: formData.imageUrl || `https://api.dicebear.com/9.x/bottts/png?seed=${(formData.id || 0) * 42}&backgroundColor=transparent`
              }"
              size="md"
              :disableZoom="true"
              class="shadow-2xl shadow-primary/10"
            />
          </div>
          <p class="text-[10px] text-gray-500 text-center italic mt-4 px-4">L'aperçu se met à jour en temps réel lors de la modification des champs.</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import strapiService from '@/api/strapi';
import TripleTriadCard from '../../components/TripleTriadCard.vue';
import PremiumSelect from './PremiumSelect.vue';

const route = useRoute();
const collectionName = ref('');
const loading = ref(true);
const error = ref(null);
const items = ref([]);
const columns = ref([]);
const isEditing = ref(false);
const currentItem = ref({});
const formData = ref({});
const formFields = ref([]);

const ignoredFields = ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'provider', 'resetPasswordToken', 'confirmationToken'];

const loadData = async () => {
  loading.value = true;
  error.value = null;
  collectionName.value = route.params.collection;

  try {
    const res = await strapiService.request('GET', `/${collectionName.value}`);
    if (res.error) throw new Error(res.error.message || `Failed to fetch ${collectionName.value}`);

    const dataArray = Array.isArray(res) ? res : (res.data || []);
    items.value = dataArray.map(item => {
        if (item.attributes) {
            return { id: item.id, ...item.attributes };
        }
        return item;
    });

    if (items.value.length > 0) {
      const sample = items.value[0];
      columns.value = Object.keys(sample).filter(k =>
        typeof sample[k] !== 'object' &&
        k !== 'password' &&
        !ignoredFields.includes(k)
      ).slice(0, 5);
    } else {
        columns.value = [];
    }
  } catch (err) {
    error.value = err.message;
    items.value = [];
  } finally {
    loading.value = false;
  }
};

const formatValue = (val) => {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
  if (typeof val === 'string' && val.length > 30) return val.substring(0, 30) + '...';
  return val;
};

const inferType = (key, value) => {
    const lKey = key.toLowerCase();
    if (lKey === 'rarity' || lKey === 'rareté') return 'select';
    if (lKey === 'element' || lKey === 'élément') return 'select';
    if (lKey.includes('password')) return 'password';
    if (lKey.includes('email')) return 'email';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string' && value.length > 100) return 'text';
    if (lKey.includes('description') || lKey.includes('content')) return 'text';
    return 'string';
};

const getOptionsForField = (key) => {
  const lKey = key.toLowerCase();
  if (lKey === 'rarity' || lKey === 'rareté') {
    return [
      { label: 'Commune', value: 'Common' },
      { label: 'Peu Commune', value: 'Uncommon' },
      { label: 'Rare', value: 'Rare' },
      { label: 'Épique', value: 'Epic' },
      { label: 'Légendaire', value: 'Legendary' }
    ];
  }
  if (lKey === 'element' || lKey === 'élément') {
    return [
      { label: 'Aucun', value: 'None' },
      { label: 'Eau', value: 'eau' },
      { label: 'Faille Dimensionnelle', value: 'faille_dimensionnelle' },
      { label: 'Furtif', value: 'furtif' },
      { label: 'Hacking', value: 'hacking' },
      { label: 'Longue Portée', value: 'longue_portee' },
      { label: 'Obsidienne', value: 'obsidienne' },
      { label: 'Radiation', value: 'radiation' },
      { label: 'Réseau', value: 'reseau' },
      { label: 'Spore', value: 'spore' }
    ];
  }
  return [];
};

const openEditor = (item = null) => {
  currentItem.value = item || {};
  formData.value = { ...currentItem.value };

  let sourceObj = item || (items.value.length > 0 ? items.value[0] : { name: '' });

  formFields.value = Object.keys(sourceObj)
    .filter(k => !ignoredFields.includes(k) && typeof sourceObj[k] !== 'object')
    .map(k => {
      let defaultValue = '';
      if (typeof sourceObj[k] === 'number') defaultValue = 0;
      if (typeof sourceObj[k] === 'boolean') defaultValue = false;
      const type = inferType(k, sourceObj[k]);
      return {
        name: k,
        type: type,
        defaultValue: defaultValue,
        options: type === 'select' ? getOptionsForField(k) : []
      };
    });

  if (!item) {
      formFields.value.forEach(f => {
          if (formData.value[f.name] === undefined) {
            formData.value[f.name] = f.defaultValue;
          }
      });
  }

  isEditing.value = true;
};

const closeEditor = () => {
  isEditing.value = false;
  currentItem.value = {};
  formData.value = {};
};

const saveItem = async () => {
  try {
    const isUpdate = !!(currentItem.value.id || currentItem.value.documentId);
    const identifier = currentItem.value.documentId || currentItem.value.id;

    let payload = { ...formData.value };
    
    // Clean up payload by removing restricted fields that Strapi doesn't allow in the body
    const fieldsToExclude = ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt'];
    fieldsToExclude.forEach(field => delete payload[field]);

    const isUserPlugin = collectionName.value === 'users';

    let res;
    if (isUpdate) {
      const finalBody = isUserPlugin ? payload : { data: payload };
      res = await strapiService.request('PUT', `/${collectionName.value}/${identifier}`, { body: finalBody });
    } else {
      const finalBody = isUserPlugin ? payload : { data: payload };
      res = await strapiService.request('POST', `/${collectionName.value}`, { body: finalBody });
    }

    if (res && res.error) {
       throw new Error(res.error.message || "Erreur d'enregistrement");
    }

    closeEditor();
    loadData();
  } catch (err) {
    alert("Erreur: " + err.message);
  }
};

const deleteItem = async (item) => {
  if (confirm(`Êtes-vous sûr de vouloir supprimer cet élément ?`)) {
    try {
      const identifier = item.documentId || item.id;
      const res = await strapiService.request('DELETE', `/${collectionName.value}/${identifier}`);
      if (res && res.error) throw new Error(res.error.message || "Erreur de suppression");
      loadData();
    } catch (err) {
      alert("Erreur: " + err.message);
    }
  }
};

onMounted(loadData);
watch(() => route.params.collection, loadData);

</script>

<style scoped>
.setting-group {
  @apply flex flex-col gap-2;
}

.setting-group label {
  @apply text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1;
}

.setting-group input, .setting-group textarea {
  @apply bg-white/5 border-white/5 text-white font-medium focus:border-primary/50 transition-all rounded-2xl p-4;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

</style>
