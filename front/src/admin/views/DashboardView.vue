<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <h1 class="text-3xl font-bold mb-6 text-gray-800">Tableau de bord - Statistiques</h1>

    <div v-if="loading" class="text-gray-500">Chargement des statistiques...</div>
    <div v-else-if="error" class="text-red-500">Erreur: {{ error }}</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

      <!-- Chiffres clés -->
      <div class="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
        <h2 class="text-xl font-semibold text-gray-700">Utilisateurs Inscrits</h2>
        <p class="text-4xl font-bold text-blue-600 mt-4">{{ stats.users }}</p>
      </div>

      <div class="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
        <h2 class="text-xl font-semibold text-gray-700">Total Cartes (DB)</h2>
        <p class="text-4xl font-bold text-green-600 mt-4">{{ stats.cards }}</p>
      </div>

      <div class="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
        <h2 class="text-xl font-semibold text-gray-700">Modèles de Quêtes</h2>
        <p class="text-4xl font-bold text-purple-600 mt-4">{{ stats.questTemplates }}</p>
      </div>

      <!-- Graphiques -->
      <div class="bg-white rounded-lg shadow p-6 md:col-span-2 lg:col-span-3 h-96 flex flex-col items-center">
        <h2 class="text-xl font-semibold text-gray-700 mb-4 w-full text-left">Répartition des cartes par rareté</h2>
        <div class="w-full h-full flex items-center justify-center max-h-64">
           <Pie v-if="chartData.labels" :data="chartData" :options="chartOptions" />
           <p v-else class="text-gray-400">Pas assez de données de cartes.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import strapiService from '../api/strapi';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'vue-chartjs'

ChartJS.register(ArcElement, Tooltip, Legend)

const loading = ref(true);
const error = ref(null);

const stats = ref({
  users: 0,
  cards: 0,
  questTemplates: 0
});

const chartData = ref({
  labels: [],
  datasets: []
});

const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false
});

onMounted(async () => {
  try {
    const [usersRes, cardsRes, questsRes] = await Promise.all([
      strapiService.request('GET', '/users'),
      strapiService.request('GET', '/cards'),
      strapiService.request('GET', '/quest-templates')
    ]);

    if (usersRes.error) throw new Error(usersRes.error.message || 'Failed to fetch users');
    if (cardsRes.error) throw new Error(cardsRes.error.message || 'Failed to fetch cards');

    stats.value.users = Array.isArray(usersRes) ? usersRes.length : 0;
    stats.value.cards = cardsRes.data ? cardsRes.data.length : 0;
    stats.value.questTemplates = questsRes.data ? questsRes.data.length : 0;

    // Process card rarities
    if (cardsRes.data && cardsRes.data.length > 0) {
      const rarities = {};
      cardsRes.data.forEach(item => {
        const rarity = item.attributes?.rarity || item.rarity || 'Inconnue'; // Handle v4/v5 structure
        rarities[rarity] = (rarities[rarity] || 0) + 1;
      });

      chartData.value = {
        labels: Object.keys(rarities),
        datasets: [
          {
            backgroundColor: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'],
            data: Object.values(rarities)
          }
        ]
      };
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>
