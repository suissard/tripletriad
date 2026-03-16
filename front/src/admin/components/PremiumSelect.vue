<template>
  <div class="relative premium-select-container" ref="selectRef">
    <label v-if="label" class="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-2 block">
      {{ label }}
    </label>
    
    <button 
      @click="toggleDropdown"
      type="button"
      class="w-full flex items-center justify-between gap-3 bg-white/5 border border-white/5 rounded-2xl p-4 text-white font-medium hover:bg-white/10 focus:border-primary/50 transition-all outline-none group"
      :class="{ 'border-primary/50 bg-white/10': isOpen }"
    >
      <div class="flex items-center gap-3 overflow-hidden">
        <slot name="icon"></slot>
        <span class="truncate">{{ selectedOptionLabel || placeholder }}</span>
      </div>
      <span class="text-gray-500 transition-transform duration-300" :class="{ 'rotate-180': isOpen }">▼</span>
    </button>

    <transition name="dropdown">
      <div 
        v-if="isOpen"
        class="absolute z-[100] mt-3 w-full glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10"
      >
        <div v-if="searchable" class="p-4 border-b border-white/5">
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="searchPlaceholder"
            class="w-full bg-white/5 border-white/5 text-white text-sm rounded-xl px-4 py-2 focus:border-primary/30 outline-none transition-all"
            @click.stop
          >
        </div>
        
        <ul class="max-h-60 overflow-y-auto custom-scrollbar py-2">
          <li 
            v-for="option in filteredOptions" 
            :key="option.value"
            @click="selectOption(option)"
            class="px-6 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors flex items-center justify-between group"
            :class="{ 'bg-white/10 text-primary font-bold': option.value === modelValue }"
          >
            <div class="flex items-center gap-3">
              <slot name="option-icon" :option="option"></slot>
              <span>{{ option.label }}</span>
            </div>
            <span v-if="option.value === modelValue" class="text-primary text-xs">✓</span>
          </li>
          <li v-if="filteredOptions.length === 0" class="px-6 py-4 text-sm text-gray-500 italic text-center">
            Aucun résultat trouvé
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  modelValue: [String, Number, Object],
  options: {
    type: Array,
    default: () => []
  },
  label: String,
  placeholder: {
    type: String,
    default: 'Sélectionner...'
  },
  searchable: {
    type: Boolean,
    default: false
  },
  searchPlaceholder: {
    type: String,
    default: 'Rechercher...'
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const searchQuery = ref('');
const selectRef = ref(null);

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) searchQuery.value = '';
};

const selectOption = (option) => {
  emit('update:modelValue', option.value);
  emit('change', option);
  isOpen.value = false;
};

const selectedOptionLabel = computed(() => {
  const option = props.options.find(o => o.value === props.modelValue);
  return option ? option.label : '';
});

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value) return props.options;
  const q = searchQuery.value.toLowerCase();
  return props.options.filter(o => o.label.toLowerCase().includes(q));
});

const handleClickOutside = (e) => {
  if (selectRef.value && !selectRef.value.contains(e.target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.dropdown-enter-active, .dropdown-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>
