<template>
  <div class="admin-lab-page p-8" :style="{ '--loader-speed': loaderSpeed + 'ms' }">
    <div class="header mb-8 flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-black text-primary tracking-widest uppercase">Laboratoire d'Effets - Loading Premium</h1>
        <p class="text-gray-400 mt-2">Cliquez sur les composants pour tester l'effet "Halo" (balayage ouvert + ombre pulsée).</p>
      </div>
      
      <div class="speed-control glass-panel p-4 rounded-xl flex flex-col gap-2 min-w-[250px]">
        <div class="flex justify-between text-xs font-bold uppercase tracking-widest">
          <span>Vitesse de l'effet</span>
          <span class="text-primary">{{ loaderSpeed }}ms</span>
        </div>
        <input 
          type="range" 
          v-model="loaderSpeed" 
          min="200" 
          max="5000" 
          step="50"
          class="w-full accent-primary mt-1"
        />
      </div>
    </div>

    <div class="test-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
      <!-- Section Button -->
      <section class="test-section">
        <h3 class="section-title mb-4 opacity-50 text-xs font-bold tracking-widest uppercase">Boutons UI</h3>
        <div class="flex flex-col gap-4 items-start">
          <AppButton 
            class="transition-all" 
            :class="{ 'is-loading-premium': activeLoaders.button1 }"
            @click="testEffect('button1')"
            variant="primary"
          >
            Bouton Primaire
          </AppButton>
          
          <AppButton 
            class="transition-all" 
            :class="{ 'is-loading-premium': activeLoaders.button2 }"
            @click="testEffect('button2')"
            variant="secondary"
          >
            Bouton Secondaire
          </AppButton>
        </div>
      </section>

      <!-- Section Card -->
      <section class="test-section">
        <h3 class="section-title mb-4 opacity-50 text-xs font-bold tracking-widest uppercase">Cartes & Panels</h3>
        <AppCard 
          class="p-6 cursor-pointer" 
          :class="{ 'is-loading-premium': activeLoaders.card1 }"
          @click="testEffect('card1')"
        >
          <h4 class="text-xl font-bold mb-2">Carte Triple Triad</h4>
          <p class="text-sm text-gray-400">La lumière baigne le composant et s'étend au-delà de ses contours.</p>
        </AppCard>
        
        <div 
          class="glass-panel p-8 mt-6 rounded-2xl cursor-pointer text-center"
          :class="{ 'is-loading-premium': activeLoaders.panel1 }"
          @click="testEffect('panel1')"
        >
          <span class="text-xs uppercase tracking-widest">Panel Glassmorphism</span>
        </div>
      </section>

      <!-- Section Custom Shapes -->
      <section class="test-section">
        <h3 class="section-title mb-4 opacity-50 text-xs font-bold tracking-widest uppercase">Formes Personnalisées</h3>
        <div 
          class="w-32 h-32 rounded-full border border-white/10 flex items-center justify-center cursor-pointer mx-auto"
          :class="{ 'is-loading-premium': activeLoaders.circle1 }"
          @click="testEffect('circle1')"
        >
          <div class="text-center">
            <div class="text-2xl">🔮</div>
            <div class="text-[10px] uppercase font-bold mt-1">Cercle</div>
          </div>
        </div>
        
        <div 
          class="w-full h-16 bg-white/5 border border-white/10 mt-8 flex items-center justify-center cursor-pointer rounded-sm"
          :class="{ 'is-loading-premium': activeLoaders.rect1 }"
          @click="testEffect('rect1')"
        >
          Ligne fine
        </div>
      </section>
    </div>

    <div class="usage-note mt-12 p-6 bg-primary/5 border border-primary/20 rounded-xl">
      <h5 class="text-primary font-bold mb-2">Effet Halo Premium :</h5>
      <p class="text-sm text-gray-300">
        Allie un balayage lumineux <code class="text-dim">mix-blend-mode: screen</code> et une ombre pulsée <code class="text-dim">box-shadow</code>. L'absence de restriction de débordement permet à l'effet de rayonner de manière organique autour du composant.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';

const loaderSpeed = ref(800);

const activeLoaders = reactive({
  button1: false,
  button2: false,
  card1: false,
  panel1: false,
  circle1: false,
  rect1: false
});

function testEffect(id) {
  if (activeLoaders[id]) return;
  activeLoaders[id] = true;
  setTimeout(() => {
    activeLoaders[id] = false;
  }, 3000);
}
</script>

<style scoped>
.admin-lab-page {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* On force le border-radius hérité pour les composants complexes si nécessaire */
/* Mais .is-loading-premium a déjà border-radius: inherit */
</style>
