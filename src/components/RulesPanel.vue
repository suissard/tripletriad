<template>
  <div id="rules-panel" class="ui-layer">
      <h3>Règles Spéciales</h3>
      <div class="rule-item" v-for="rule in rulesRegistry" :key="rule.id">
          <label>
              <input type="checkbox" v-model="state.rules[rule.id]"> 
              {{ rule.name }}
          </label>
          <div class="rule-desc">{{ rule.description }}</div>
      </div>
  </div>
</template>

<script setup>
import { state } from '../game/state.js';
import { rulesRegistry } from '../game/rules.js';
</script>

<style scoped>
#rules-panel {
    position: absolute; right: 20px; top: 120px; width: 280px;
    background: rgba(15, 15, 30, 0.85); border: 1px solid #333;
    padding: 20px; border-radius: 12px; pointer-events: auto;
    backdrop-filter: blur(10px);
}
#rules-panel h3 { margin: 0 0 15px 0; color: #fff; font-size: 1.2rem; border-bottom: 1px solid #444; padding-bottom: 10px; }
.rule-item { margin-bottom: 15px; }
.rule-item label { font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; color: #00d2ff; }
.rule-item input { transform: scale(1.2); cursor: pointer; }
.rule-desc { font-size: 0.8rem; color: #aaa; margin: 4px 0 0 24px; line-height: 1.3; }
</style>
