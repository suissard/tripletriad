<template>
  <PageLayout title="Seed Tester">
    <div class="seed-tester">
      <div class="test-controls">
        <h2>Tester l'aléatoire de la Seed</h2>
        <label>
          Nombre de simulations :
          <input type="number" v-model.number="simulationCount" min="10" max="100000" />
        </label>
        <AppButton variant="primary"  class="test-btn" @click="runSimulation">▶ Lancer la simulation</AppButton>
      </div>

      <div class="results-summary" v-if="results.total > 0">
        <div class="result-box">
          <span class="label">Total</span>
          <span class="value">{{ results.total }}</span>
        </div>
        <div class="result-box">
          <span class="label">Joueur 1 (P1)</span>
          <span class="value">{{ results.p1 }} ({{ ((results.p1 / results.total) * 100).toFixed(2) }}%)</span>
        </div>
        <div class="result-box">
          <span class="label">Joueur 2 (P2)</span>
          <span class="value">{{ results.p2 }} ({{ ((results.p2 / results.total) * 100).toFixed(2) }}%)</span>
        </div>
      </div>

      <div class="distribution-chart" v-if="results.total > 0">
        <h3>Distribution des résultats (0 à 1)</h3>
        <p class="chart-desc">Les barres montrent combien de fois la valeur générée est tombée dans chaque tranche de 0.05. Plus les barres sont de taille équivalente, plus l'algorithme distribue uniformément.</p>

        <div class="chart-container">
          <div
            v-for="(count, index) in results.distribution"
            :key="index"
            class="chart-bar-wrapper"
            :title="`Tranche [${(index * 0.05).toFixed(2)}, ${((index + 1) * 0.05).toFixed(2)}[ : ${count} résultats`"
          >
            <div
              class="chart-bar"
              :style="{ height: `${(count / maxDistributionCount) * 100}%` }"
            ></div>
            <div class="chart-label">{{ (index * 0.05).toFixed(2) }}</div>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>


<script setup>
import { ref, computed } from 'vue';
import PageLayout from '../components/PageLayout.vue';
import { GameEngine } from '../../../shared/GameEngine.ts';

const simulationCount = ref(10000);

const results = ref({
  total: 0,
  p1: 0,
  p2: 0,
  distribution: Array(20).fill(0) // 20 buckets for 0 to 1 (every 0.05)
});

// A simple UUID v4 generator for pure frontend test usage
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function runSimulation() {
  const count = simulationCount.value;
  let p1Count = 0;
  let p2Count = 0;

  // 20 buckets of width 0.05
  const dist = Array(20).fill(0);

  for (let i = 0; i < count; i++) {
    const p1Id = generateUUID();
    const p2Id = generateUUID();
    const matchId = generateUUID();

    const randomValue = GameEngine.generateDeterministicRandom(p1Id, p2Id, matchId);

    // Bucket assignment
    let bucketIndex = Math.floor(randomValue * 20);
    // Safety check just in case randomValue is exactly 1
    if (bucketIndex >= 20) bucketIndex = 19;

    dist[bucketIndex]++;

    if (randomValue < 0.5) {
      p1Count++;
    } else {
      p2Count++;
    }
  }

  results.value = {
    total: count,
    p1: p1Count,
    p2: p2Count,
    distribution: dist
  };
}

const maxDistributionCount = computed(() => {
  if (results.value.total === 0) return 1;
  return Math.max(...results.value.distribution);
});
</script>


<style scoped>
.seed-tester {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  color: white;
  background: rgba(20, 20, 30, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.test-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.test-controls h2 {
  margin: 0;
  color: #00d2ff;
}

.test-controls label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
}

.test-controls input {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #444;
  color: white;
  padding: 8px;
  border-radius: 6px;
  width: 120px;
  font-size: 1.1rem;
}

.test-btn {
  background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 1.2rem;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  align-self: flex-start;
  transition: transform 0.2s, box-shadow 0.2s;
}

.test-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 210, 255, 0.4);
}

.results-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 40px;
}

.result-box {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #333;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.result-box .label {
  font-size: 1.1rem;
  color: #aaa;
}

.result-box .value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #fff;
}

.result-box:nth-child(2) .value {
  color: #ff3366; /* Couleur P1 (rouge) */
}

.result-box:nth-child(3) .value {
  color: #33ccff; /* Couleur P2 (bleu) */
}

.distribution-chart {
  background: rgba(0, 0, 0, 0.4);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #333;
}

.distribution-chart h3 {
  margin-top: 0;
  color: #fff;
}

.chart-desc {
  font-size: 0.9rem;
  color: #aaa;
  margin-bottom: 20px;
}

.chart-container {
  display: flex;
  align-items: flex-end;
  height: 250px;
  gap: 4px;
  padding-bottom: 30px; /* Space for labels */
  border-bottom: 1px solid #444;
  position: relative;
}

.chart-bar-wrapper {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  cursor: pointer;
}

.chart-bar-wrapper:hover .chart-bar {
  background: #33ccff;
}

.chart-bar {
  width: 100%;
  background: #00d2ff;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
  min-height: 2px; /* Always visible */
}

.chart-label {
  position: absolute;
  bottom: -25px;
  left: 50%;
  transform: translateX(-50%) rotate(-45deg);
  font-size: 0.7rem;
  color: #888;
  white-space: nowrap;
}
</style>
