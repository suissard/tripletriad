const fs = require('fs');
const file = 'front/src/components/TripleTriadCard.vue';
let content = fs.readFileSync(file, 'utf8');

// 1. Add userStore import
const findStoreImport = `import { computed, ref, onMounted, onBeforeUnmount } from 'vue';`;
const replaceStoreImport = `import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useUserStore } from '../stores/userStore.js';`;

content = content.replace(findStoreImport, replaceStoreImport);


// 2. Add variant logic to displayCard
const findComputed = `const displayCard = computed(() => {
  const card = { ...normalizedCardData.value };`;

const replaceComputed = `const userStore = useUserStore();

const displayCard = computed(() => {
  const card = { ...normalizedCardData.value };

  // Handle variant
  // Prefer direct variant index if passed or already populated
  let variantIndex = card.selectedVariantIndex || 0;

  // If not provided in the card object, try to find it in the user's collection
  if (!card.selectedVariantIndex && userStore.isLoggedIn && card.id) {
    const userCard = userStore.collection.find(c => c.cardId === card.id);
    if (userCard && userCard.selectedVariantIndex) {
      variantIndex = userCard.selectedVariantIndex;
    }
  }

  if (variantIndex > 0 && card.variantUrls && card.variantUrls.length > variantIndex) {
    card.imageUrl = card.variantUrls[variantIndex];
  }`;

content = content.replace(findComputed, replaceComputed);

fs.writeFileSync(file, content);
