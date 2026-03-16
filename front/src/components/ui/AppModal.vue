<template>
  <div v-if="modelValue" class="modal-overlay z-[1000] fixed inset-0 flex items-center justify-center p-4" @click.self="closeOnBackdropClick">
    <div class="modal-wrapper w-full max-w-lg" :class="[maxWidthClass]">
      <AppPanel :padding="false" variant="secondary" class="shadow-2xl overflow-hidden relative border border-white/20">
        <!-- Close Button (Top Right) -->
        <button v-if="showCloseButton" @click="close" class="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center z-10">✕</button>

        <!-- Header -->
        <div v-if="$slots.header || title" class="modal-header p-6 border-b border-white/10 bg-black/20">
          <slot name="header">
            <h3 class="text-xl font-bold text-white uppercase tracking-wider m-0">{{ title }}</h3>
          </slot>
        </div>

        <!-- Body -->
        <div class="modal-body p-6 text-gray-200">
          <slot></slot>
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="modal-footer p-6 border-t border-white/10 bg-black/20 flex items-center justify-end gap-3">
          <slot name="footer"></slot>
        </div>
      </AppPanel>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed } from 'vue';

const props = defineProps({
  modelValue: { // v-model
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  showCloseButton: {
    type: Boolean,
    default: true,
  },
  dismissible: {
    type: Boolean,
    default: true, // Click outside or ESC to close
  },
  maxWidth: {
    type: String,
    default: 'md', // sm, md, lg, xl, 2xl, full
  }
});

const emit = defineEmits(['update:modelValue', 'close']);

const maxWidthClass = computed(() => {
  const map = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    'full': 'max-w-full',
  };
  return map[props.maxWidth] || 'max-w-md';
});

const close = () => {
  emit('update:modelValue', false);
  emit('close');
};

const closeOnBackdropClick = () => {
  if (props.dismissible) {
    close();
  }
};

const handleKeydown = (e) => {
  if (props.dismissible && props.modelValue && e.key === 'Escape') {
    close();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.modal-overlay {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  animation: fadeIn 0.2s ease-out;
}

.modal-wrapper {
  animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
