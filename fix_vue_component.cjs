const fs = require('fs');
const path = 'front/src/components/SeedTesterPage.vue';
let content = fs.readFileSync(path, 'utf8');

// Le script de génération bash précédent n'a pas inclus la balise script correctement en entier.
// Modifions le composant pour qu'il soit bien formé.
const newScriptContent = `
<script setup>
import { ref, computed } from 'vue';
import PageLayout from './PageLayout.vue';
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
`;

content = content.replace(/<script setup>[\s\S]*?<\/script>/, newScriptContent);
fs.writeFileSync(path, content, 'utf8');
console.log('SeedTesterPage fixed successfully.');
