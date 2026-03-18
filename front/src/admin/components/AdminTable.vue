<template>
  <div class="glass-panel rounded-3xl overflow-hidden w-full">
    <div class="overflow-x-auto custom-scrollbar">
      <table class="min-w-full border-collapse">
        <thead>
          <tr class="border-b border-light/5 bg-light/2">
            <th 
              v-for="col in columns" 
              :key="col.key || col" 
              class="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest"
            >
              {{ col.label || col }}
            </th>
            <th class="px-8 py-5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest w-40">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-light/5 relative">
          
          <!-- Loading State -->
          <tr v-if="loading">
            <td :colspan="columns.length + 1" class="px-8 py-20 text-center">
              <div class="flex flex-col items-center justify-center">
                <div class="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                <p class="text-gray-500 font-medium text-sm">Chargement des données...</p>
              </div>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-else-if="items.length === 0">
            <td :colspan="columns.length + 1" class="px-8 py-16 text-center text-gray-500 italic">
              <div class="flex flex-col items-center justify-center gap-2">
                <span class="text-4xl opacity-50 mb-2">📭</span>
                <p>{{ emptyMessage }}</p>
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <tr 
            v-else
            v-for="item in items" 
            :key="item.id || item.documentId || Math.random()" 
            class="group hover:bg-light/[0.03] transition-colors duration-300 cursor-default"
          >
            <td v-for="col in columns" :key="col.key || col" class="px-8 py-5 text-sm">
              <span class="text-gray-300 font-medium group-hover:text-white transition-colors">
                <slot :name="`cell-${col.key || col}`" :item="item" :value="item[col.key || col]">
                  {{ formatValue(item[col.key || col]) }}
                </slot>
              </span>
            </td>
            <td class="px-8 py-5 text-right space-x-4 opacity-50 group-hover:opacity-100 transition-opacity flex justify-end items-center h-full">
              <slot name="actions" :item="item">
                <button 
                  @click.stop="$emit('edit', item)" 
                  class="text-primary hover:text-white hover:scale-105 text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Éditer
                </button>
                <button 
                  @click.stop="$emit('delete', item)" 
                  class="text-red-500/50 hover:text-red-500 hover:scale-105 text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Supprimer
                </button>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  columns: {
    type: Array,
    required: true,
    // Format: ['name', 'email'] OR [{ key: 'name', label: 'Nom' }, ...]
  },
  items: {
    type: Array,
    required: true,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  emptyMessage: {
    type: String,
    default: 'Aucun élément trouvé dans cette collection.'
  }
});

defineEmits(['edit', 'delete']);

const formatValue = (val) => {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
  if (typeof val === 'string' && val.length > 40) return val.substring(0, 40) + '...';
  // Handle nested objects slightly better if they sneak in
  if (typeof val === 'object') return '[Objet]'; 
  return String(val);
};

</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.border-light\/5 {
  border-color: rgba(255, 255, 255, 0.05);
}
.bg-light\/2 {
  background-color: rgba(255, 255, 255, 0.02);
}
.divide-light\/5 > :not([hidden]) ~ :not([hidden]) {
  border-color: rgba(255, 255, 255, 0.05);
}
.hover\:bg-light\/\[0\.03\]:hover {
  background-color: rgba(255, 255, 255, 0.03);
}
</style>
