import { defineStore } from 'pinia';
import strapiService from '../api/strapi.js';

export const useEffectStore = defineStore('effect', {
  state: () => ({
    effects: {}, // Map<cardDocumentId, effectData>
    isLoaded: false,
    loading: false
  }),

  actions: {
    async fetchEffects(force = false) {
      if (this.isLoaded && !force) return;
      this.loading = true;
      try {
        let allEffects = [];
        let page = 1;
        let pageCount = 1;

        // Fetch all foil effects with their layers
        do {
          const result = await strapiService.find('foil-effects', {
            populate: ['layers', 'card'],
            pagination: { page, pageSize: 100 }
          });
          
          const rawEffects = Array.isArray(result) ? result : (result?.data || []);
          allEffects = [...allEffects, ...rawEffects];
          
          const meta = result?.meta?.pagination;
          pageCount = meta?.pageCount || 1;
          page++;
        } while (page <= pageCount);

        // Organize by card documentId and ID for flexible lookup
        const effectMap = {};
        allEffects.forEach(eff => {
          const docId = eff.card?.documentId || (eff.card?.data?.documentId);
          const rawId = eff.card?.id || (eff.card?.data?.id);
          
          if (docId) effectMap[String(docId)] = eff;
          if (rawId) effectMap[String(rawId)] = eff;
        });

        this.effects = effectMap;
        this.isLoaded = true;
        console.log(`[EffectStore] Loaded ${Object.keys(this.effects).length} custom holographic effects.`);
      } catch (error) {
        console.error('[EffectStore] Failed to fetch foil effects:', error);
      } finally {
        this.loading = false;
      }
    },

    getEffectForCard(cardId) {
      return this.effects[cardId] || null;
    }
  }
});
