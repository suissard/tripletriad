<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800 capitalize">Gestion des {{ collectionName }}</h1>
      <button @click="openModal()" class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
        + Nouveau
      </button>
    </div>

    <div v-if="loading" class="text-gray-500">Chargement...</div>
    <div v-else-if="error" class="text-red-500">Erreur: {{ error }}</div>

    <div v-else class="bg-white rounded-lg shadow overflow-x-auto">
      <table class="min-w-full leading-normal">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col" class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {{ col }}
            </th>
            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id || item.documentId" class="hover:bg-gray-50">
            <td v-for="col in columns" :key="col" class="px-5 py-5 border-b border-gray-200 text-sm max-w-xs truncate">
              {{ formatValue(item[col]) }}
            </td>
            <td class="px-5 py-5 border-b border-gray-200 text-sm">
              <button @click="openModal(item)" class="text-blue-600 hover:text-blue-900 mr-4 font-semibold">Éditer</button>
              <button @click="deleteItem(item)" class="text-red-600 hover:text-red-900 font-semibold">Supprimer</button>
            </td>
          </tr>
          <tr v-if="items.length === 0">
            <td :colspan="columns.length + 1" class="px-5 py-5 border-b border-gray-200 text-sm text-center text-gray-500">
              Aucun élément trouvé.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal pour Création / Édition -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl relative">
        <h2 class="text-2xl font-bold mb-4">{{ currentItem.id || currentItem.documentId ? 'Éditer' : 'Créer' }} {{ collectionName }}</h2>

        <div class="flex gap-6">
          <div class="flex-1 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
            <div v-for="field in formFields" :key="field.name" class="flex flex-col mb-4">
            <label :for="field.name" class="text-sm font-semibold text-gray-600 capitalize mb-1">{{ field.name }}</label>

            <template v-if="field.type === 'string' || field.type === 'email' || field.type === 'password'">
              <input :type="field.type === 'password' ? 'password' : (field.type === 'email' ? 'email' : 'text')"
                     v-model="formData[field.name]"
                     :id="field.name"
                     class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
            </template>

            <template v-else-if="field.type === 'number'">
              <input type="number"
                     v-model.number="formData[field.name]"
                     :id="field.name"
                     class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
            </template>

            <template v-else-if="field.type === 'text'">
              <textarea v-model="formData[field.name]"
                        :id="field.name"
                        class="p-2 border border-gray-300 rounded h-24 focus:ring-blue-500 focus:border-blue-500"></textarea>
            </template>

            <template v-else-if="field.type === 'boolean'">
              <div class="flex items-center">
                <input type="checkbox" v-model="formData[field.name]" :id="field.name" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
              </div>
            </template>

              <!-- Fallback pour les types complexes / relations simples -->
              <template v-else>
                <input type="text"
                       v-model="formData[field.name]"
                       :id="field.name"
                       placeholder="Valeur (relation ou json)"
                       class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
              </template>
            </div>
          </div>

          <!-- Dynamic Card Preview -->
          <div v-if="collectionName === 'cards'" class="w-64 flex-shrink-0 flex flex-col items-center justify-start border-l border-gray-200 pl-6">
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Aperçu</h3>
            <TripleTriadCard
              :card="{
                ...formData,
                imageUrl: formData.imageUrl || `https://api.dicebear.com/9.x/bottts/png?seed=${(formData.id || 0) * 42}&backgroundColor=transparent`
              }"
              size="lg"
              :disableZoom="true"
              class="shadow-xl"
            />
          </div>
        </div>

        <div class="flex justify-end space-x-4 mt-6 border-t pt-4">
          <button type="button" @click="closeModal" class="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Annuler</button>
          <button type="button" @click="saveItem" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Enregistrer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import strapiService from '../api/strapi';
import TripleTriadCard from '../../components/TripleTriadCard.vue';

const route = useRoute();
const collectionName = ref('');
const loading = ref(true);
const error = ref(null);
const items = ref([]);
const columns = ref([]);
const isModalOpen = ref(false);
const currentItem = ref({});
const formData = ref({});
const formFields = ref([]);

// Liste des champs à ignorer lors de l'édition automatique
const ignoredFields = ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'provider', 'resetPasswordToken', 'confirmationToken'];

const loadData = async () => {
  loading.value = true;
  error.value = null;
  collectionName.value = route.params.collection;

  try {
    const res = await strapiService.request('GET', `/${collectionName.value}`);
    if (res.error) throw new Error(res.error.message || `Failed to fetch ${collectionName.value}`);

    // Support Strapi v4/v5 format
    const dataArray = Array.isArray(res) ? res : (res.data || []);
    items.value = dataArray.map(item => {
        // Flatten attributes for v4/v5 if they exist
        if (item.attributes) {
            return { id: item.id, ...item.attributes };
        }
        return item;
    });

    if (items.value.length > 0) {
      // Déterminer les colonnes basées sur le premier objet
      const sample = items.value[0];
      columns.value = Object.keys(sample).filter(k =>
        typeof sample[k] !== 'object' &&
        k !== 'password' &&
        !ignoredFields.includes(k)
      ).slice(0, 5); // Max 5 colonnes pour la lisibilité
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

// Inférer le type de champ basé sur la clé
const inferType = (key, value) => {
    const lKey = key.toLowerCase();
    if (lKey.includes('password')) return 'password';
    if (lKey.includes('email')) return 'email';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string' && value.length > 100) return 'text'; // textarea
    if (lKey.includes('description') || lKey.includes('content')) return 'text';
    return 'string';
};

const openModal = (item = null) => {
  currentItem.value = item || {};
  formData.value = { ...currentItem.value };

  // Si c'est un nouvel élément, essayer de déduire les champs du premier élément de la liste
  // Si la liste est vide, on va devoir au moins afficher un champ "name" ou "username"
  let sourceObj = item || (items.value.length > 0 ? items.value[0] : { name: '' });

  formFields.value = Object.keys(sourceObj)
    .filter(k => !ignoredFields.includes(k) && typeof sourceObj[k] !== 'object')
    .map(k => {
      let defaultValue = '';
      if (typeof sourceObj[k] === 'number') defaultValue = 0;
      if (typeof sourceObj[k] === 'boolean') defaultValue = false;
      return {
        name: k,
        type: inferType(k, sourceObj[k]),
        defaultValue: defaultValue
      };
    });

  // Initialiser les valeurs par défaut pour un nouvel élément
  if (!item) {
      formFields.value.forEach(f => {
          formData.value[f.name] = f.defaultValue;
      });
  }

  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  currentItem.value = {};
  formData.value = {};
};

const saveItem = async () => {
  try {
    const isUpdate = !!(currentItem.value.id || currentItem.value.documentId);
    const identifier = currentItem.value.documentId || currentItem.value.id;

    // Create payload and clean empty/null values that are not supposed to be strings
    let payload = { ...formData.value };

    // For users, Strapi v4/v5 expects flat data. For other collections, it expects data: {} wrapper in some API versions,
    // but REST API v5 usually accepts { data: payload } for everything except Users-Permissions
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

    closeModal();
    loadData(); // Recharger les données
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
