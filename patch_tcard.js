const fs = require('fs');
const file = 'front/src/components/TripleTriadCard.vue';
let content = fs.readFileSync(file, 'utf8');

const detailVariantReplacement = `
    <!-- VARIANT: DETAIL (The big overlay view) -->
    <template v-if="variant === 'detail'">
      <h3 class="detail-name">{{ card.name }}</h3>
      <div class="detail-level">Niveau {{ card.level }}</div>
      <div class="detail-element" v-if="card.element && card.element !== 'None'">Élément : {{ card.element }}</div>
      <div class="detail-img-container">
        <img :src="card.img" class="detail-img" alt="Card Art" />
        <div class="detail-stats-cross">
          <div class="stat top">{{ card.topValue }}</div>
          <div class="stat right">{{ card.rightValue }}</div>
          <div class="stat bottom">{{ card.bottomValue }}</div>
          <div class="stat left">{{ card.leftValue }}</div>
        </div>
      </div>
      <p class="detail-desc">{{ card.description }}</p>
      <div class="detail-status" v-if="isLocked">
        🔒 Non possédée
      </div>
      <div class="detail-status owned" v-else>
        ✅ Possédée ({{ quantity }})
      </div>

      <!-- Crafting UI -->
      <div class="crafting-controls">
        <button
          class="craft-btn"
          @click.stop="handleCraft"
          :disabled="!canCraft"
        >
          Créer (-{{ craftCost }} ✨)
        </button>
        <button
          class="disenchant-btn"
          @click.stop="handleDisenchant"
          v-if="!isLocked && quantity > 0"
        >
          Désenchanter (+{{ disenchantGain }} ✨)
        </button>
      </div>
    </template>
`;

content = content.replace(/<!-- VARIANT: DETAIL \(The big overlay view\) -->[\s\S]*?✅ Possédée \(\{\{ quantity \}\}\)\s*<\/div>\s*<\/template>/m, detailVariantReplacement);

const scriptSetupReplacement = `
<script setup>
import { computed, ref } from 'vue';
import { state, craftCard, disenchantCard } from '../game/state.js';

const props = defineProps({
  card: {
    type: Object,
    required: true
  },
  variant: {
    type: String,
    default: 'large',
    validator: (val) => ['mini', 'large', 'detail'].includes(val)
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  quantity: {
    type: Number,
    default: 0
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  isCover: {
    type: Boolean,
    default: false
  }
});

defineEmits(['click', 'set-cover']);

// CRAFTING LOGIC
const getRarity = (level) => {
  if (level <= 2) return 'common';
  if (level <= 4) return 'uncommon';
  if (level <= 6) return 'rare';
  if (level <= 8) return 'epic';
  return 'legendary';
};

const craftingRatios = {
  "common": { "disenchant": 10, "craft": 40 },
  "uncommon": { "disenchant": 20, "craft": 80 },
  "rare": { "disenchant": 50, "craft": 200 },
  "epic": { "disenchant": 100, "craft": 400 },
  "legendary": { "disenchant": 400, "craft": 1600 }
};

const craftCost = computed(() => {
  const level = props.card.level || 1;
  return craftingRatios[getRarity(level)].craft;
});

const disenchantGain = computed(() => {
  const level = props.card.level || 1;
  return craftingRatios[getRarity(level)].disenchant;
});

const canCraft = computed(() => {
  return state.user.dust >= craftCost.value;
});

async function handleCraft() {
  if (canCraft.value) {
    await craftCard(props.card.id);
  }
}

async function handleDisenchant() {
  if (props.quantity > 0) {
    await disenchantCard(props.card.id);
  }
}
`;

content = content.replace(/<script setup>[\s\S]*?defineEmits\(\['click', 'set-cover'\]\);/m, scriptSetupReplacement);

const styleReplacement = `
.detail-status.owned {
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid #4caf50;
  color: #4caf50;
}

/* CRAFTING STYLES */
.crafting-controls {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.craft-btn, .disenchant-btn {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.craft-btn {
  background: #2196f3;
}
.craft-btn:hover:not(:disabled) {
  background: #1976d2;
}
.craft-btn:disabled {
  background: #555;
  color: #888;
  cursor: not-allowed;
}

.disenchant-btn {
  background: #f44336;
}
.disenchant-btn:hover {
  background: #d32f2f;
}
`;

content = content.replace(/\.detail-status\.owned \{[\s\S]*?color: #4caf50;\s*\}/m, styleReplacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched TripleTriadCard.vue');
