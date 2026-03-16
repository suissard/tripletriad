<template>
  <div class="h-full">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
      <div>
        <h1 class="text-4xl font-extrabold text-white tracking-tight mb-2">Configuration du Jeu</h1>
        <p class="text-gray-400 text-sm">Ajustez les paramètres fondamentaux de l'univers Terra Nullius.</p>
      </div>
      <button 
        @click="saveConfig" 
        :disabled="saving" 
        class="btn btn-primary min-w-[160px] h-12"
      >
        <span v-if="saving" class="flex items-center gap-2">
          <svg class="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Enregistrement...
        </span>
        <span v-else>Enregistrer les modifications</span>
      </button>
    </div>

    <transition name="fade">
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p class="text-gray-500 font-medium">Initialisation des paramètres...</p>
      </div>
      <div v-else-if="error" class="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
        <span>⚠️</span> {{ error }}
      </div>
    </transition>

    <transition name="fade">
      <div v-if="successMsg" class="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
        <span>✅</span> {{ successMsg }}
      </div>
    </transition>

    <div v-if="!loading && config" class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Left Column: Settings -->
      <div class="lg:col-span-8 space-y-8">
        
        <!-- Gameplay Section -->
        <section class="glass-panel rounded-3xl p-8">
          <div class="flex items-center gap-4 mb-8">
            <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">⚔️</div>
            <div>
              <h2 class="text-xl font-bold text-white">Mécaniques de Jeu</h2>
              <p class="text-xs text-gray-500">Règles de base et limites des sessions.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div class="setting-group">
              <label for="cardsPerDeck">Cartes par Deck</label>
              <input type="number" id="cardsPerDeck" v-model.number="config.cardsPerDeck">
              <span class="help-text">Nombre de cartes requis pour valider un deck.</span>
            </div>

            <div class="setting-group">
              <label for="maxDecksPerUser">Decks Max</label>
              <input type="number" id="maxDecksPerUser" v-model.number="config.maxDecksPerUser">
              <span class="help-text">Limite d'emplacements de deck par joueur.</span>
            </div>

            <div class="setting-group">
              <label for="turnTimeSeconds">Temps par Tour</label>
              <div class="relative">
                <input type="number" id="turnTimeSeconds" v-model.number="config.turnTimeSeconds" class="pr-12">
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 uppercase">sec</span>
              </div>
            </div>

            <div class="setting-group">
              <label for="maxQuestsPerUser">Quêtes Actives Max</label>
              <input type="number" id="maxQuestsPerUser" v-model.number="config.maxQuestsPerUser">
            </div>

            <div class="setting-group md:col-span-2">
              <label for="playableLimit">Limite d'Exemplaires (Mêmes IDs)</label>
              <input type="number" id="playableLimit" v-model.number="config.playableLimit">
            </div>
          </div>
        </section>

        <!-- JSON Section -->
        <section class="glass-panel rounded-3xl p-8">
          <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-[#00e5ff]/10 flex items-center justify-center text-2xl">💎</div>
              <div>
                <h2 class="text-xl font-bold text-white">Économie & Craft</h2>
                <p class="text-xs text-gray-500">Ratios de désenchantement et coût de fabrication.</p>
              </div>
            </div>
            <div :class="['px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border', jsonError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400']">
              {{ jsonError ? 'JSON Invalide' : 'JSON Valide' }}
            </div>
          </div>
          
          <div class="relative group">
            <div class="absolute -inset-[1px] bg-gradient-to-r from-primary/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
            <textarea 
              id="craftingRatios" 
              v-model="craftingRatiosString" 
              rows="12" 
              class="w-full font-mono text-sm bg-black/40 border-white/5 rounded-2xl p-6 focus:ring-0 focus:border-white/10 relative z-10"
              placeholder='{ "common": { "disenchant": 10, "craft": 40 } ... }'
            ></textarea>
          </div>
        </section>
      </div>

      <!-- Right Column: Boosters & Stats -->
      <div class="lg:col-span-4 space-y-8">
        <section class="glass-panel rounded-3xl p-8 border-primary/20 bg-primary/5">
          <div class="flex items-center gap-4 mb-8">
            <div class="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl">📦</div>
            <div>
              <h2 class="text-xl font-bold text-white">Boosters</h2>
              <p class="text-xs text-gray-400">Tarification et algorithme de loot.</p>
            </div>
          </div>

          <div class="space-y-6">
            <div class="setting-group">
              <label for="boosterCost">Coût du Booster</label>
              <div class="relative">
                <input type="number" id="boosterCost" v-model.number="config.boosterCost" class="pr-16 text-primary font-bold">
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary uppercase">Coins</span>
              </div>
            </div>

            <div class="setting-group mt-4">
              <label for="boosterHits">Clics pour ouvrir</label>
              <div class="relative">
                <input type="number" id="boosterHits" v-model.number="config.boosterHits" class="pr-16 text-primary font-bold" min="1">
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary uppercase">Clics</span>
              </div>
            </div>

            <hr class="border-white/5">

            <div class="space-y-4">
              <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest flex justify-between">
                <span>Probabilités de Tirage</span>
                <span :class="['text-[10px]', totalProb !== 100 ? 'text-red-400' : 'text-emerald-400']">Total: {{ totalProb }}%</span>
              </h3>
              
              <div class="grid grid-cols-2 gap-4">
                <div class="prob-item">
                  <label>Commune</label>
                  <input type="number" v-model.number="config.probCommon">
                </div>
                <div class="prob-item">
                  <label>Peu Comm.</label>
                  <input type="number" v-model.number="config.probUncommon">
                </div>
                <div class="prob-item">
                  <label>Rare</label>
                  <input type="number" v-model.number="config.probRare">
                </div>
                <div class="prob-item">
                  <label>Épique</label>
                  <input type="number" v-model.number="config.probEpic">
                </div>
                <div class="prob-item col-span-2">
                  <label>Légendaire</label>
                  <input type="number" v-model.number="config.probLegendary" class="text-orange-400">
                </div>
              </div>

              <div class="pt-4 mt-4 border-t border-white/5 prob-item">
                <label>Chance Premium (Foil)</label>
                <input type="number" v-model.number="config.probPremium" class="text-emerald-400 font-bold">
              </div>

              <div v-if="totalProb !== 100" class="text-[10px] text-red-500 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                Attention: La somme des probabilités doit être égale à 100%. Actuellement {{ totalProb }}%.
              </div>
            </div>
          </div>
        </section>
        
        <!-- Interface UI Settings -->
        <section class="glass-panel rounded-3xl p-8 border-accent/20 bg-accent/5 mt-8">
          <div class="flex items-center gap-4 mb-8">
            <div class="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-2xl">✨</div>
            <div>
              <h2 class="text-xl font-bold text-white">Interface</h2>
              <p class="text-xs text-gray-400">Effets visuels et boutons.</p>
            </div>
          </div>

          <div class="space-y-6">
            <div class="setting-group">
              <label for="uiButtonHole">Taille de l'impact (Boutons)</label>
              <div class="relative">
                <input type="number" id="uiButtonHole" v-model.number="config.uiButtonHole" class="pr-16 text-white font-bold" min="0" max="60">
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 uppercase">px</span>
              </div>
            </div>

            <div class="setting-group">
              <label for="uiButtonSpeed">Vitesse de réparation</label>
              <div class="relative">
                <input type="number" id="uiButtonSpeed" v-model.number="config.uiButtonSpeed" class="pr-16 text-white font-bold" min="0.1" max="5.0" step="0.1">
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 uppercase">x</span>
              </div>
            </div>

            <div class="setting-group">
              <label for="uiButtonOpacity">Opacité du verre brisé</label>
              <div class="relative">
                <input type="number" id="uiButtonOpacity" v-model.number="config.uiButtonOpacity" class="pr-16 text-white font-bold" min="0" max="1" step="0.05">
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 uppercase">alpha</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Summary Stats Card -->
        <div class="glass-card rounded-3xl p-6 border-white/5 mt-8">
          <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Aperçu Économique</h3>
          <div class="space-y-3">
             <div class="flex justify-between text-sm">
                <span class="text-gray-400">Rentabilité Désench.</span>
                <span class="text-white font-medium">~25%</span>
             </div>
             <div class="flex justify-between text-sm">
                <span class="text-gray-400">Rareté Moyenne</span>
                <span class="text-white font-medium">Commune</span>
             </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import strapiService from '../api/strapi';

const config = ref(null);
const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const successMsg = ref('');
const craftingRatiosString = ref('');
const jsonError = ref(false);

const totalProb = computed(() => {
  if (!config.value) return 0;
  return (config.value.probCommon || 0) + 
         (config.value.probUncommon || 0) + 
         (config.value.probRare || 0) + 
         (config.value.probEpic || 0) + 
         (config.value.probLegendary || 0);
});

const loadConfig = async () => {
  loading.value = true;
  error.value = null;
  successMsg.value = '';

  try {
    const res = await strapiService.request('GET', '/game-config');
    if (res.error && res.error.status !== 404) {
      throw new Error(res.error.message || 'Erreur lors du chargement de la configuration');
    }

    let loadedConfig = null;
    if (!res.error && res.data !== null) {
      loadedConfig = res.data?.attributes ? { id: res.data.id, ...res.data.attributes } : res.data;
    }

    if (!loadedConfig) {
      config.value = {
          cardsPerDeck: 15,
          maxDecksPerUser: 5,
          turnTimeSeconds: 60,
          maxQuestsPerUser: 5,
          playableLimit: 2,
          boosterCost: 100,
            boosterHits: 5,
          probCommon: 39,
          probUncommon: 30,
          probRare: 20,
          probEpic: 10,
          probLegendary: 1,
          probPremium: 5,
          uiButtonHole: 30,
          uiButtonSpeed: 1.0,
          uiButtonOpacity: 0.25,
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  
  if (totalProb.value !== 100) {
    error.value = "La somme des probabilités de rareté doit être exactement 100%.";
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  saving.value = true;
  error.value = null;
  successMsg.value = '';

  try {
    const payload = { ...config.value };
    payload.craftingRatios = JSON.parse(craftingRatiosString.value);

    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.publishedAt;
    delete payload.documentId;

    const res = await strapiService.request('PUT', '/game-config', { data: payload });

    if (res && res.error) {
       throw new Error(res.error.message || "Erreur lors de l'enregistrement");
    }

    successMsg.value = "Configuration sauvegardée dans l'éther avec succès.";
    setTimeout(() => { successMsg.value = ''; }, 4000);

    const savedData = res.data?.attributes ? { id: res.data.id, ...res.data.attributes } : res.data;
    if (savedData) {
        config.value = { ...config.value, ...savedData };
    }

  } catch (err) {
    error.value = err.message;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.setting-group {
  @apply flex flex-col gap-2;
}

.setting-group label {
  @apply text-xs font-bold text-gray-500 uppercase tracking-widest pl-1;
}

.setting-group input {
  @apply bg-black/40 border-white/5 text-white font-medium focus:border-primary/50 transition-all rounded-xl p-3;
}

.prob-item {
  @apply flex flex-col gap-1;
}

.prob-item label {
  @apply text-[10px] font-bold text-gray-500 uppercase tracking-tight pl-1;
}

.prob-item input {
  @apply bg-black/40 border-white/5 text-sm font-bold text-white focus:border-primary/50 transition-all rounded-lg p-2;
}

.help-text {
  @apply text-[10px] text-gray-600 italic pl-1;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
