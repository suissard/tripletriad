<template>
  <div class="min-h-screen">
    <div class="mb-10">
      <h1 class="text-4xl font-extrabold text-white tracking-tight mb-2">Tableau de Bord</h1>
      <p class="text-gray-400 text-sm">Vue d'ensemble des statistiques et de l'activité de Terra Nullius.</p>
    </div>

    <transition name="fade">
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p class="text-gray-500 font-medium">Analyse des données en cours...</p>
      </div>
      
      <div v-else-if="error" class="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
        <span>⚠️</span> {{ error }}
      </div>

      <div v-else class="space-y-8">
        <!-- Chiffres clés -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="glass-panel p-8 rounded-[32px] relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full group-hover:bg-blue-500/10 transition-colors"></div>
            <h2 class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Utilisateurs Inscrits</h2>
            <div class="flex items-end gap-3">
              <span class="text-5xl font-black text-white leading-none">{{ stats.users }}</span>
              <span class="text-blue-400 text-xs font-bold mb-1 uppercase">Joueurs</span>
            </div>
          </div>

          <div class="glass-panel p-8 rounded-[32px] relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full group-hover:bg-primary/10 transition-colors"></div>
            <h2 class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Total Cartes (DB)</h2>
            <div class="flex items-end gap-3">
              <span class="text-5xl font-black text-white leading-none">{{ stats.cards }}</span>
              <span class="text-primary text-xs font-bold mb-1 uppercase">Modèles</span>
            </div>
          </div>

          <div class="glass-panel p-8 rounded-[32px] relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[60px] rounded-full group-hover:bg-purple-500/10 transition-colors"></div>
            <h2 class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Modèles de Quêtes</h2>
            <div class="flex items-end gap-3">
              <span class="text-5xl font-black text-white leading-none">{{ stats.questTemplates }}</span>
              <span class="text-purple-400 text-xs font-bold mb-1 uppercase">Quêtes</span>
            </div>
          </div>
        </div>

        <!-- Graphiques -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="glass-panel p-10 rounded-[40px] lg:col-span-2">
            <div class="flex items-center justify-between mb-8">
              <div>
                <h2 class="text-xl font-bold text-white tracking-tight">Répartition des Raretés</h2>
                <p class="text-gray-500 text-xs mt-1">Analyse de l'équilibre de la collection de cartes.</p>
              </div>
            </div>
            <div class="h-80 w-full flex items-center justify-center">
              <Pie v-if="chartData.labels && chartData.labels.length > 0" :data="chartData" :options="chartOptions" />
              <div v-else class="text-gray-500 italic text-sm">Données insuffisantes pour générer le graphique.</div>
            </div>
          </div>

          <div class="glass-panel p-10 rounded-[40px] flex flex-col justify-center">
             <div class="text-center">
                <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-6">
                  <span class="text-3xl">🚀</span>
                </div>
                <h3 class="text-lg font-bold text-white mb-2">Projets de Santé</h3>
                <p class="text-gray-400 text-sm px-4">Le système d'analyse pourra bientôt prédire les tendances de l'économie de jeu.</p>
                <div class="mt-8 space-y-4 text-left">
                  <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full bg-primary w-2/3 shadow-[0_0_10px_rgba(255,191,0,0.5)]"></div>
                  </div>
                  <div class="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Performance API</span>
                    <span>Stable</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </transition>
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
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: '#94a3b8',
        padding: 20,
        font: {
          family: "'Outfit', sans-serif",
          size: 12,
          weight: '600'
        },
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(7, 7, 21, 0.9)',
      titleColor: '#fff',
      bodyColor: '#94a3b8',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      cornerRadius: 12,
      titleFont: {
        family: "'Outfit', sans-serif",
        size: 14,
        weight: 'bold'
      }
    }
  }
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

    const usersData = Array.isArray(usersRes) ? usersRes : (usersRes.data || []);
    const cardsData = Array.isArray(cardsRes) ? cardsRes : (cardsRes.data || []);
    const questsData = Array.isArray(questsRes) ? questsRes : (questsRes.data || []);

    stats.value.users = usersData.length;
    stats.value.cards = cardsData.length;
    stats.value.questTemplates = questsData.length;

    if (cardsData.length > 0) {
      const rarities = {};
      cardsData.forEach(item => {
        const rarity = item.attributes?.rarity || item.rarity || 'Inconnue';
        rarities[rarity] = (rarities[rarity] || 0) + 1;
      });

      // Colors from our premium palette
      const colorMap = {
        'Common': '#94a3b8',
        'Commune': '#94a3b8',
        'Uncommon': '#10B981',
        'Peu Commmune': '#10B981',
        'Rare': '#3B82F6',
        'Epic': '#8B5CF6',
        'Épique': '#8B5CF6',
        'Legendary': '#FFBF00',
        'Légendaire': '#FFBF00'
      };

      const labels = Object.keys(rarities);
      const bgColors = labels.map(l => colorMap[l] || '#475569');

      chartData.value = {
        labels: labels,
        datasets: [
          {
            backgroundColor: bgColors,
            borderColor: 'transparent',
            hoverOffset: 20,
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

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: all 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
