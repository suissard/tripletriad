<template>
  <div class="test-page">
    <div class="header">
      <h2>🧪 Testeur de Flip de Pièce</h2>
      <AppButton variant="secondary" class="glass-panel" @click="router.push('/')">RETOUR</AppButton>
    </div>

    <div class="test-controls">
      <div class="control-group glass-panel">
        <h3>Configuration des Factions</h3>
        <div class="faction-selectors">
          <div class="selector-field">
            <label>Faction Joueur (Face) :</label>
            <select v-model="forcedPlayerFaction" class="glass-select">
              <option value="random">🎲 Aléatoire</option>
              <option v-for="f in factions" :key="f.id" :value="f.id">{{ f.name }}</option>
            </select>
          </div>
          <div class="selector-field">
            <label>Faction AI (Pile) :</label>
            <select v-model="forcedAiFaction" class="glass-select">
              <option value="random">🎲 Aléatoire</option>
              <option v-for="f in factions" :key="f.id" :value="f.id">{{ f.name }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="control-group glass-panel">
        <h3>Lancer local (Math.random)</h3>
        <AppButton variant="primary" class="glass-panel" @click="triggerToss('local')">LANCER !</AppButton>
      </div>

      <div class="control-group glass-panel">
        <h3>Lancer Serveur (Simulé)</h3>
        <p class="hint">Utilise la logique du match controller</p>
        <AppButton variant="primary" class="glass-panel" @click="triggerToss('server')">LANCER VIA SERVEUR !</AppButton>
      </div>
      
      <div class="control-group glass-panel">
        <h3>Forcer Résultat</h3>
        <div class="force-buttons flex gap-2">
          <AppButton variant="secondary" class="glass-panel" @click="triggerToss('player')">FORCE PLAYER</AppButton>
          <AppButton variant="secondary" class="glass-panel" @click="triggerToss('ai')">FORCE AI</AppButton>
        </div>
      </div>
    </div>

    <div class="history">
      <h3>Derniers Lancements</h3>
      <ul>
        <li v-for="(h, i) in history" :key="i" :class="h.result">
          <span>{{ h.source.toUpperCase() }} : <strong>{{ h.result === 'player' ? 'Joueur' : 'IA' }}</strong></span>
          <span class="history-factions">{{ h.playerFaction }} VS {{ h.aiFaction }}</span>
        </li>
      </ul>
    </div>

    <!-- The Coin Toss Component -->
    <CoinToss 
      v-if="showToss" 
      :result="tossResult" 
      :forcePlayerFactionId="forcedPlayerFaction"
      :forceAiFactionId="forcedAiFaction"
      @finished="onTossFinished" 
    />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import CoinToss from '../../components/CoinToss.vue';
import { factions } from '../../data/factions';

const router = useRouter();

const showToss = ref(false);
const tossResult = ref(null);
const currentSource = ref('');
const history = reactive([]);

const forcedPlayerFaction = ref('random');
const forcedAiFaction = ref('random');

// Store displayed factions for history
const activePlayerFaction = ref('');
const activeAiFaction = ref('');

async function triggerToss(source) {
  currentSource.value = source;
  
  if (source === 'local') {
    tossResult.value = Math.random() < 0.5 ? 'player' : 'ai';
  } else if (source === 'server') {
    tossResult.value = Math.random() < 0.5 ? 'player' : 'ai';
  } else {
    tossResult.value = source; // 'player' or 'ai'
  }
  
  showToss.value = true;
}

function onTossFinished() {
  // Try to find the actual factions that were picked (this is a bit tricky since CoinToss picks them)
  // For simplicity, we just log what we chose or '?'
  history.unshift({
    source: currentSource.value,
    result: tossResult.value,
    playerFaction: forcedPlayerFaction.value === 'random' ? 'Random' : factions.find(f => f.id === forcedPlayerFaction.value)?.name,
    aiFaction: forcedAiFaction.value === 'random' ? 'Random' : factions.find(f => f.id === forcedAiFaction.value)?.name
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

.faction-selectors {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.selector-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.selector-field label {
  font-size: 0.9rem;
  color: #888;
}

.glass-select {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 10px;
  border-radius: 8px;
  outline: none;
  cursor: pointer;
}

.glass-select option {
  background: #1a1b20;
}

.force-buttons {
  display: flex;
  gap: 10px;
}

.history {
  max-width: 800px;
  margin: 0 auto;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  padding: 12px 20px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 4px solid #333;
}

.history-factions {
  font-size: 0.85rem;
  color: #666;
}

li.player { border-left-color: #00d2ff; }
li.ai { border-left-color: #ff0055; }
</style>
