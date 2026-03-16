<template>
  <div class="test-page">
    <div class="header">
      <h2>🧪 Testeur de Flip de Pièce</h2>
      <AppButton variant="secondary"  class="glass-panel" @click="router.push('/')">RETOUR</AppButton>
    </div>

    <div class="test-controls">
      <div class="control-group glass-panel">
        <h3>Lancer local (Math.random)</h3>
        <AppButton variant="primary"  class="glass-panel" @click="triggerToss('local')">LANCER !</AppButton>
      </div>

      <div class="control-group glass-panel">
        <h3>Lancer Serveur (Simulé)</h3>
        <p class="hint">Utilise la logique du match controller</p>
        <AppButton variant="primary"  class="glass-panel" @click="triggerToss('server')">LANCER VIA SERVEUR !</AppButton>
      </div>
      
      <div class="control-group glass-panel">
        <h3>Forcer Résultat</h3>
        <div class="force-buttons flex gap-2">
          <AppButton variant="secondary"  class="glass-panel" @click="triggerToss('player')">FORCE PLAYER (Skull)</AppButton>
          <AppButton variant="secondary"  class="glass-panel" @click="triggerToss('ai')">FORCE AI (Octopus)</AppButton>
        </div>
      </div>
    </div>

    <div class="history">
      <h3>Derniers Lancements</h3>
      <ul>
        <li v-for="(h, i) in history" :key="i" :class="h.result">
          {{ h.source.toUpperCase() }} : <strong>{{ h.result === 'player' ? 'Skull (Joueur)' : 'Octopus (IA)' }}</strong>
        </li>
      </ul>
    </div>

    <!-- The Coin Toss Component -->
    <CoinToss 
      v-if="showToss" 
      :result="tossResult" 
      @finished="onTossFinished" 
    />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import CoinToss from './CoinToss.vue';

const router = useRouter();

const showToss = ref(false);
const tossResult = ref(null);
const currentSource = ref('');
const history = reactive([]);

async function triggerToss(source) {
  currentSource.value = source;
  
  if (source === 'local') {
    tossResult.value = Math.random() < 0.5 ? 'player' : 'ai';
  } else if (source === 'server') {
    // Simulating server call delay
    tossResult.value = Math.random() < 0.5 ? 'player' : 'ai';
  } else {
    tossResult.value = source; // 'player' or 'ai'
  }
  
  showToss.value = true;
}

function onTossFinished() {
  history.unshift({
    source: currentSource.value,
    result: tossResult.value
  });
  if (history.length > 10) history.pop();
  
  showToss.value = false;
}
</script>

<style scoped>
.test-page {
  padding: 40px;
  background-color: #0f1115;
  min-height: 100vh;
  color: white;
  font-family: 'Segoe UI', sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  border-bottom: 1px solid #333;
  padding-bottom: 20px;
}

.test-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 60px;
}

.control-group {
  background: rgba(255, 255, 255, 0.05);
  padding: 25px;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.control-group h3 {
  margin-top: 0;
  color: #00d2ff;
}

.hint {
  font-size: 0.8rem;
  color: #888;
  margin: -5px 0 10px 0;
}

.force-buttons {
  display: flex;
  gap: 10px;
}

.history {
  max-width: 600px;
  margin: 0 auto;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  padding: 10px 20px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  border-left: 4px solid #333;
}

li.player { border-left-color: #ffd700; }
li.ai { border-left-color: #c0c0c0; }
</style>
