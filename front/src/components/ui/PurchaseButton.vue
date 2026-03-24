<template>
  <div class="purchase-button-wrapper" :class="{ 'insufficient-funds': !hasEnough }">
    <AppButton
      ref="buttonRef"
      :variant="hasEnough ? variant : 'ghost'"
      :disabled="disabled || (blockIfInsufficient && !hasEnough) || isLoading"
      :loading="isLoading"
      class="purchase-btn"
      @click="handlePurchase"
    >
      <div class="purchase-btn-content">
        <span v-if="label" class="label">{{ label }}</span>
        <span class="price">
          <span class="amount">{{ amount }}</span>
          <span class="icon">{{ currencyIcon }}</span>
        </span>
      </div>
    </AppButton>
    
    <Transition name="fade-slide">
      <div v-if="!hasEnough && showBlockingMessage" class="blocking-message">
        <span class="warning-icon">⚠️</span>
        Pas assez de {{ typeLabel }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUserStore } from '../../stores/userStore.js';
import AppButton from './AppButton.vue';

const props = defineProps({
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    default: 'coins',
    validator: (value) => ['coins', 'gems', 'dust'].includes(value)
  },
  label: {
    type: String,
    default: 'Acheter'
  },
  variant: {
    type: String,
    default: 'primary'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  blockIfInsufficient: {
    type: Boolean,
    default: true
  },
  showBlockingMessage: {
    type: Boolean,
    default: true
  },
  // If provided, the button will handle the loading state automatically
  action: {
    type: Function,
    default: null
  }
});

const emit = defineEmits(['click', 'success', 'error', 'loading-start', 'loading-end']);

const userStore = useUserStore();
const isLoading = ref(false);
const buttonRef = ref(null);

const userBalance = computed(() => {
  if (!userStore.user) return 0;
  return userStore.user[props.type] || 0;
});

const hasEnough = computed(() => {
  return userBalance.value >= props.amount;
});

const currencyIcon = computed(() => {
  const icons = {
    coins: '🪙',
    gems: '💎',
    dust: '✨'
  };
  return icons[props.type] || '🪙';
});

const typeLabel = computed(() => {
  const labels = {
    coins: 'pièces',
    gems: 'gemmes',
    dust: 'poussière'
  };
  return labels[props.type] || 'pièces';
});

const handlePurchase = async (event) => {
  if (!hasEnough.value && props.blockIfInsufficient) {
    // Shake animation or feedback
    return;
  }

  emit('click', event);

  if (props.action) {
    isLoading.value = true;
    emit('loading-start');
    try {
      const result = await props.action();
      emit('success', result);
    } catch (error) {
      console.error('Purchase error:', error);
      emit('error', error);
    } finally {
      isLoading.value = false;
      emit('loading-end');
    }
  }
};
</script>

<style scoped>
.purchase-button-wrapper {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.purchase-btn {
  min-width: 140px;
}

.purchase-btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: bold;
}

.price {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.9em;
}

.insufficient-funds .amount {
  color: #ff4444;
}

.blocking-message {
  position: absolute;
  bottom: 0%;
  left: 50%;
  transform: translateX(-50%) translateY(120%);
  background: rgba(220, 53, 69, 0.9);
  color: white;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.2);
}

.blocking-message::after {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid rgba(220, 53, 69, 0.9);
}

.warning-icon {
  margin-right: 4px;
}

/* Animations */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(100%);
}

/* Shake effect for insufficient funds is handled by AppButton's impact if we want, 
   but here we just block the click if insufficient. */
</style>
