const fs = require('fs');
const file = 'front/src/components/CardDetailModal.vue';
let content = fs.readFileSync(file, 'utf8');

const findScriptStart = `import { ref, computed, watch } from 'vue';`;
const replaceScriptStart = `import { ref, computed, watch, onUnmounted } from 'vue';`;

content = content.replace(findScriptStart, replaceScriptStart);

const findWatch = `watch(() => props.show, (newVal) => {
  if (newVal) {
    if (userStore.isLoggedIn && props.card.id) {
      const uc = userStore.collection.find(c => c.cardId === props.card.id);
      if (uc && uc.selectedVariantIndex !== undefined) {
        initialVariantIndex.value = uc.selectedVariantIndex;
        currentVariantIndex.value = uc.selectedVariantIndex;
        return;
      }
    }
    initialVariantIndex.value = 0;
    currentVariantIndex.value = 0;
  } else {
    // Modal closing, save if changed
    if (currentVariantIndex.value !== initialVariantIndex.value && userCardDocId.value) {
      userStore.updateCardVariant(userCardDocId.value, currentVariantIndex.value);
    }
  }
});`;

const replaceWatch = `watch(() => props.show, (newVal) => {
  if (newVal) {
    if (userStore.isLoggedIn && props.card.id) {
      const uc = userStore.collection.find(c => c.cardId === props.card.id);
      if (uc && uc.selectedVariantIndex !== undefined) {
        initialVariantIndex.value = uc.selectedVariantIndex;
        currentVariantIndex.value = uc.selectedVariantIndex;
        return;
      }
    }
    initialVariantIndex.value = 0;
    currentVariantIndex.value = 0;
  } else {
    // Modal closing, save if changed
    saveVariantIfNeeded();
  }
});

function saveVariantIfNeeded() {
  if (currentVariantIndex.value !== initialVariantIndex.value && userCardDocId.value) {
    userStore.updateCardVariant(userCardDocId.value, currentVariantIndex.value);
    // update initial to prevent double saving
    initialVariantIndex.value = currentVariantIndex.value;
  }
}

onUnmounted(() => {
  saveVariantIfNeeded();
});`;

content = content.replace(findWatch, replaceWatch);

fs.writeFileSync(file, content);
