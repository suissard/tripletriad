const fs = require('fs');
const file = 'front/src/components/CardDetailModal.vue';
let content = fs.readFileSync(file, 'utf8');

// 1. Template: add the variant carousel
const findCarouselInsert = `<div class="zoom-ownership">`;
const replaceCarouselInsert = `<!-- Variant Selector -->
              <div v-if="card.variantUrls && card.variantUrls.length > 1 && quantity > 0" class="zoom-variants">
                <p class="variants-title">Choisir l'illustration :</p>
                <div class="variants-list">
                  <div
                    v-for="(vUrl, idx) in card.variantUrls"
                    :key="idx"
                    class="variant-thumb"
                    :class="{ 'is-active': currentVariantIndex === idx }"
                    @click="setVariant(idx)"
                  >
                    <img :src="vUrl" />
                  </div>
                </div>
              </div>

              <div class="zoom-ownership">`;

content = content.replace(findCarouselInsert, replaceCarouselInsert);

// 2. Template: change the main card image based on variant
const findCardImg = `<img :src="card.imageUrl" class="card-img" :alt="card.name" />`;
const replaceCardImg = `<img :src="currentImageUrl" class="card-img" :alt="card.name" />`;
content = content.replace(findCardImg, replaceCardImg);

// 3. Script: Add state and logic
const findScriptStart = `const userStore = useUserStore();`;
const replaceScriptStart = `const userStore = useUserStore();

// Variant Logic
const initialVariantIndex = ref(0);
const currentVariantIndex = ref(0);

const currentImageUrl = computed(() => {
  if (props.card.variantUrls && props.card.variantUrls.length > currentVariantIndex.value) {
    return props.card.variantUrls[currentVariantIndex.value];
  }
  return props.card.imageUrl;
});

const userCardDocId = computed(() => {
  if (!userStore.isLoggedIn || !props.card.id) return null;
  const uc = userStore.collection.find(c => c.cardId === props.card.id);
  return uc ? uc.userCardDocumentId || uc.id : null;
});

function setVariant(idx) {
  currentVariantIndex.value = idx;
}

watch(() => props.show, (newVal) => {
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

// Need to add `watch` to vue imports
content = content.replace(`import { ref, computed } from 'vue';`, `import { ref, computed, watch } from 'vue';`);
content = content.replace(findScriptStart, replaceScriptStart);

// 4. Styles: Add styles for carousel
const styleToAppend = `
.zoom-variants {
  margin: 1rem 0;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}
.variants-title {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: #bbb;
}
.variants-list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.variant-thumb {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.variant-thumb:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.5);
}
.variant-thumb.is-active {
  border-color: #ffd700;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
}
.variant-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
`;

content += styleToAppend;

fs.writeFileSync(file, content);
