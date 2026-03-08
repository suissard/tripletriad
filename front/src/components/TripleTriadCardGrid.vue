<template>
  <div class="tt-card-grid-container" ref="gridContainer">
    <div class="tt-card-grid" :style="gridStyle">
      <TripleTriadCard
        v-for="card in paginatedCards"
        :key="card.id || card.name"
        :card="card"
        :size="cardSize"
        :quantity="showOwnNum && card.quantity !== undefined ? card.quantity : 0"
        :selected="selectedCards.has(card.id || card.name)"
        :unowned="card.quantity === 0"
        :disableZoom="true"
        @left-click="handleCardAction('left-click', card)"
        @right-click="handleCardAction('right-click', card)"
        @long-left-click="handleCardAction('long-left-click', card)"
        @long-right-click="handleCardAction('long-right-click', card)"
      />
    </div>

    <!-- Pagination controls -->
    <div v-if="totalPages > 1" class="pagination-controls">
      <button @click="prevPage" :disabled="currentPage === 1" class="page-btn">← Précédent</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button @click="nextPage" :disabled="currentPage === totalPages" class="page-btn">Suivant →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import TripleTriadCard from './TripleTriadCard.vue';

const props = defineProps({
  cards: { type: Array, required: true },
  cardsPerRow: { type: Number, default: null },
  cardsPerColumn: { type: Number, default: null },
  fitOnRow: { type: Boolean, default: false },
  fitOnColumn: { type: Boolean, default: false },
  showOwnNum: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  maxSelection: { type: Number, default: null } // Optional: limit selection
});

const emit = defineEmits([
  'update:selected-cards',
  'left-click',
  'right-click',
  'long-left-click',
  'long-right-click'
]);

// Selection state
// Storing IDs to make matching easier
const selectedCards = ref(new Set());

const toggleSelection = (card) => {
  if (!props.selectable) return;

  const cardId = card.id || card.name;
  const newSelection = new Set(selectedCards.value);

  if (newSelection.has(cardId)) {
    newSelection.delete(cardId);
  } else {
    if (props.maxSelection && newSelection.size >= props.maxSelection) {
      // Optional: Alert user or just ignore
      return;
    }
    newSelection.add(cardId);
  }

  selectedCards.value = newSelection;

  // Emit the full card objects for the selected ones
  const selectedObjects = props.cards.filter(c => newSelection.has(c.id || c.name));
  emit('update:selected-cards', selectedObjects);
};

const handleCardAction = (action, card) => {
  // If we left-click and selection is enabled, handle selection
  if (action === 'left-click' && props.selectable) {
    toggleSelection(card);
  }

  // Always forward the specific event
  emit(action, card);
};

// --- Pagination ---
const currentPage = ref(1);

const cardsPerPage = computed(() => {
  if (props.cardsPerRow && props.cardsPerColumn) {
    return props.cardsPerRow * props.cardsPerColumn;
  }
  return Infinity; // No limit if dimensions aren't both specified
});

const totalPages = computed(() => {
  if (cardsPerPage.value === Infinity) return 1;
  return Math.ceil(props.cards.length / cardsPerPage.value);
});

const paginatedCards = computed(() => {
  if (cardsPerPage.value === Infinity) return props.cards;
  const start = (currentPage.value - 1) * cardsPerPage.value;
  const end = start + cardsPerPage.value;
  return props.cards.slice(start, end);
});

const prevPage = () => { if (currentPage.value > 1) currentPage.value--; };
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };

// Reset page if cards change drastically
watch(() => props.cards.length, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = Math.max(1, totalPages.value);
  }
});

// --- Responsive Sizing & Grid Layout ---
const gridContainer = ref(null);
const containerWidth = ref(0);
const containerHeight = ref(0);
let resizeObserver = null;

onMounted(() => {
  if (gridContainer.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        containerWidth.value = entry.contentRect.width;
        containerHeight.value = entry.contentRect.height;
      }
    });
    resizeObserver.observe(gridContainer.value);

    // Initial measure
    containerWidth.value = gridContainer.value.clientWidth;
    containerHeight.value = gridContainer.value.clientHeight;
  }
});

onUnmounted(() => {
  if (resizeObserver && gridContainer.value) {
    resizeObserver.unobserve(gridContainer.value);
    resizeObserver.disconnect();
  }
});

const gridStyle = computed(() => {
  const style = {};

  if (props.cardsPerRow) {
    style.gridTemplateColumns = `repeat(${props.cardsPerRow}, 1fr)`;
  } else {
    // Adaptive columns based on card size if rows not specified
    style.gridTemplateColumns = `repeat(auto-fill, minmax(var(--tt-grid-card-min-width, 100px), 1fr))`;
  }

  // Define gap
  style.gap = '15px';

  return style;
});

// Calculate the appropriate TripleTriadCard size prop based on fit options and container size
// Card sizes typically map to something like:
// xs: ~40px width, sm: ~70px width, md: ~100px width, lg: ~150px width, xl: ~200px width
// We'll estimate the required width and map it.
const cardSize = computed(() => {
  if (!props.fitOnRow && !props.fitOnColumn) {
    return 'md'; // Default fallback
  }

  let targetWidthByRow = Infinity;
  let targetWidthByCol = Infinity;

  const gap = 15; // Gap from gridStyle

  if (props.fitOnRow && props.cardsPerRow && containerWidth.value > 0) {
    // Total gaps: cardsPerRow - 1
    const totalGapWidth = (props.cardsPerRow - 1) * gap;
    targetWidthByRow = (containerWidth.value - totalGapWidth) / props.cardsPerRow;
  }

  if (props.fitOnColumn && props.cardsPerColumn && containerHeight.value > 0) {
    // Need to consider height. Card aspect ratio is roughly 2.5/3.5 (1:1.4)
    // height = width * 1.4 => width = height / 1.4
    const totalGapHeight = (props.cardsPerColumn - 1) * gap;
    const paginationHeight = totalPages.value > 1 ? 50 : 0; // rough estimate for pagination controls
    const availableHeight = containerHeight.value - totalGapHeight - paginationHeight;
    const targetHeight = availableHeight / props.cardsPerColumn;
    targetWidthByCol = targetHeight / 1.4;
  }

  // Take the most restrictive constraint
  const targetWidth = Math.min(targetWidthByRow, targetWidthByCol);

  if (targetWidth === Infinity) return 'md'; // No restrictions calculated

  // Map target pixel width to standard TripleTriadCard size strings
  if (targetWidth >= 200) return 'xl';
  if (targetWidth >= 150) return 'lg';
  if (targetWidth >= 100) return 'md';
  if (targetWidth >= 70) return 'sm';
  return 'xs';
});
</script>

<style scoped>
.tt-card-grid-container {
  width: 100%;
  height: 100%; /* Important for fitOnColumn to work */
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden; /* Prevent scroll if we are fitting, otherwise parent can handle it */
}

.tt-card-grid {
  display: grid;
  width: 100%;
  justify-content: center;
  align-content: start;
}

.pagination-controls {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  justify-content: center;
}

.page-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: white;
  font-weight: bold;
}
</style>
