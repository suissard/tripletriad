<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Configuration du Jeu</h1>
      <button @click="saveConfig" :disabled="saving" class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50">
        {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
      </button>
    </div>

    <div v-if="loading" class="text-gray-500">Chargement de la configuration...</div>
    <div v-else-if="error" class="text-red-500 mb-4 bg-red-100 p-4 rounded border border-red-300">Erreur: {{ error }}</div>
    <div v-if="successMsg" class="text-green-600 mb-4 bg-green-100 p-4 rounded border border-green-300">{{ successMsg }}</div>

    <div v-if="!loading && config" class="bg-white rounded-lg shadow p-6 max-w-4xl">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Section Gameplay -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold text-gray-700 border-b pb-2">Gameplay</h2>

          <div class="flex flex-col">
            <label for="cardsPerDeck" class="text-sm font-semibold text-gray-600 mb-1">Cartes par Deck</label>
            <input type="number" id="cardsPerDeck" v-model.number="config.cardsPerDeck" class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
          </div>

          <div class="flex flex-col">
            <label for="maxDecksPerUser" class="text-sm font-semibold text-gray-600 mb-1">Decks max par Utilisateur</label>
            <input type="number" id="maxDecksPerUser" v-model.number="config.maxDecksPerUser" class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
          </div>

          <div class="flex flex-col">
            <label for="turnTimeSeconds" class="text-sm font-semibold text-gray-600 mb-1">Temps par Tour (secondes)</label>
            <input type="number" id="turnTimeSeconds" v-model.number="config.turnTimeSeconds" class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
          </div>

          <div class="flex flex-col">
            <label for="maxQuestsPerUser" class="text-sm font-semibold text-gray-600 mb-1">Quêtes max par Utilisateur</label>
            <input type="number" id="maxQuestsPerUser" v-model.number="config.maxQuestsPerUser" class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
          </div>

          <div class="flex flex-col">
            <label for="playableLimit" class="text-sm font-semibold text-gray-600 mb-1">Limite Jouable (par ID de carte)</label>
            <input type="number" id="playableLimit" v-model.number="config.playableLimit" class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
          </div>
        </div>

        <!-- Section Boutique & Probabilités -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold text-gray-700 border-b pb-2">Boutique & Boosters</h2>

          <div class="flex flex-col">
            <label for="boosterCost" class="text-sm font-semibold text-gray-600 mb-1">Coût d'un Booster (Coins)</label>
            <input type="number" id="boosterCost" v-model.number="config.boosterCost" class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col">
              <label for="probCommon" class="text-sm font-semibold text-gray-600 mb-1">Prob. Commune (%)</label>
              <input type="number" id="probCommon" v-model.number="config.probCommon" class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div class="flex flex-col">
              <label for="probUncommon" class="text-sm font-semibold text-gray-600 mb-1">Prob. Peu Commune (%)</label>
              <input type="number" id="probUncommon" v-model.number="config.probUncommon" class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div class="flex flex-col">
              <label for="probRare" class="text-sm font-semibold text-gray-600 mb-1">Prob. Rare (%)</label>
              <input type="number" id="probRare" v-model.number="config.probRare" class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div class="flex flex-col">
              <label for="probEpic" class="text-sm font-semibold text-gray-600 mb-1">Prob. Épique (%)</label>
              <input type="number" id="probEpic" v-model.number="config.probEpic" class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div class="flex flex-col">
              <label for="probLegendary" class="text-sm font-semibold text-gray-600 mb-1">Prob. Légendaire (%)</label>
              <input type="number" id="probLegendary" v-model.number="config.probLegendary" class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div class="flex flex-col">
              <label for="probPremium" class="text-sm font-semibold text-gray-600 mb-1">Prob. Premium (%)</label>
              <input type="number" id="probPremium" v-model.number="config.probPremium" class="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500">
            </div>
          </div>
        </div>

        <!-- Section JSON (Crafting Ratios) -->
        <div class="md:col-span-2 space-y-4">
          <h2 class="text-xl font-semibold text-gray-700 border-b pb-2">Ratios de Craft (JSON)</h2>
          <div class="flex flex-col">
            <textarea id="craftingRatios" v-model="craftingRatiosString" rows="8" class="p-2 font-mono text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"></textarea>
            <p v-if="jsonError" class="text-red-500 text-sm mt-1">Format JSON invalide</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import strapiService from '../api/strapi';

const config = ref(null);
const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const successMsg = ref('');
const craftingRatiosString = ref('');
const jsonError = ref(false);

const loadConfig = async () => {
  loading.value = true;
  error.value = null;
  successMsg.value = '';

  try {
    const res = await strapiService.request('GET', '/game-config');
    if (res.error && res.error.status !== 404) {
      throw new Error(res.error.message || 'Erreur lors du chargement de la configuration');
    }

    // Strapi might return { data: null } or an error 404 if it's not created yet
    let loadedConfig = null;
    if (!res.error && res.data !== null) {
      loadedConfig = res.data?.attributes ? { id: res.data.id, ...res.data.attributes } : res.data;
    }

    if (!loadedConfig) {
      // Not created yet, that's fine, we'll initialize empty object
      config.value = {
          cardsPerDeck: 15,
          maxDecksPerUser: 5,
          turnTimeSeconds: 60,
          maxQuestsPerUser: 5,
          playableLimit: 2,
          boosterCost: 100,
          probCommon: 39,
          probUncommon: 30,
          probRare: 20,
          probEpic: 10,
          probLegendary: 1,
          probPremium: 5,
          craftingRatios: {
              common: { disenchant: 10, craft: 40 },
              uncommon: { disenchant: 20, craft: 80 },
              rare: { disenchant: 50, craft: 200 },
              epic: { disenchant: 100, craft: 400 },
              legendary: { disenchant: 400, craft: 1600 }
          }
      };
    } else {
      config.value = loadedConfig;
    }

    if (config.value && config.value.craftingRatios) {
      craftingRatiosString.value = JSON.stringify(config.value.craftingRatios, null, 2);
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

watch(craftingRatiosString, (newVal) => {
  try {
    JSON.parse(newVal);
    jsonError.value = false;
  } catch (e) {
    jsonError.value = true;
  }
});

const saveConfig = async () => {
  if (jsonError.value) {
    error.value = "Corrigez l'erreur JSON avant d'enregistrer.";
    return;
  }

  saving.value = true;
  error.value = null;
  successMsg.value = '';

  try {
    const payload = { ...config.value };
    payload.craftingRatios = JSON.parse(craftingRatiosString.value);

    // Remove metadata fields before sending
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.publishedAt;
    delete payload.documentId;

    // Single types are usually updated via PUT to the base endpoint in v4/v5
    const res = await strapiService.request('PUT', '/game-config', { data: payload });

    if (res && res.error) {
       throw new Error(res.error.message || "Erreur lors de l'enregistrement");
    }

    successMsg.value = "Configuration enregistrée avec succès !";
    setTimeout(() => { successMsg.value = ''; }, 3000);

    // Update local state with any changes from server
    const savedData = res.data?.attributes ? { id: res.data.id, ...res.data.attributes } : res.data;
    if (savedData) {
        config.value = { ...config.value, ...savedData };
    }

  } catch (err) {
    error.value = err.message;
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadConfig();
});
</script>
