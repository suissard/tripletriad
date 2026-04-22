const fs = require('fs');
const file = 'front/src/stores/userStore.js';
let content = fs.readFileSync(file, 'utf8');

const findCollectionMap = `this.collection = items.map(item => {
          const card = item.card?.data || item.card;
          return {
            id: item.id,
            cardId: card?.id || null,
            cardDocumentId: card?.documentId || null,
            quantity: item.quantity,
            isPremium: !!item.isPremium
          };
        });`;

const replaceCollectionMap = `this.collection = items.map(item => {
          const card = item.card?.data || item.card;
          return {
            id: item.id,
            userCardDocumentId: item.documentId,
            cardId: card?.id || null,
            cardDocumentId: card?.documentId || null,
            quantity: item.quantity,
            isPremium: !!item.isPremium,
            selectedVariantIndex: item.selectedVariantIndex || 0
          };
        });`;

content = content.replace(findCollectionMap, replaceCollectionMap);

const findUpdateVariant = `async saveDeck(deck, overrideUser = null) {`;

const replaceUpdateVariant = `async updateCardVariant(userCardDocumentId, variantIndex) {
      if (!this.strapiConnected || !this.isLoggedIn) return false;
      try {
        const res = await strapiService.request('PUT', \`/user-cards/\${userCardDocumentId}/variant\`, {
          body: { variantIndex }
        });
        if (!res.error) {
          // Update local collection cache
          const item = this.collection.find(c => c.userCardDocumentId === userCardDocumentId || c.id === userCardDocumentId);
          if (item) {
            item.selectedVariantIndex = variantIndex;
          }
          return true;
        }
        return false;
      } catch (e) {
        console.error('Failed to update card variant', e);
        return false;
      }
    },

    async saveDeck(deck, overrideUser = null) {`;

content = content.replace(findUpdateVariant, replaceUpdateVariant);

fs.writeFileSync(file, content);
