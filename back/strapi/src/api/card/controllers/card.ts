import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::card.card', ({ strapi }) => ({
  async getFilters(ctx) {
    try {
      // Query all cards for distinct faction and collectionName values
      // Using Query Engine (strapi.db) is better for 'get all unique' scenarios
      const cards = await strapi.db.query('api::card.card').findMany({
        select: ['faction', 'collectionName'],
      });

      const factionSet = new Set<string>();
      const collectionSet = new Set<string>();

      for (const card of (cards as any[])) {
        if (card.faction) factionSet.add(card.faction);
        if (card.collectionName) collectionSet.add(card.collectionName);
      }

      ctx.body = {
        factions: [...factionSet].sort(),
        collections: [...collectionSet].sort(),
      };
    } catch (err) {
      console.error('[Strapi] getFilters error:', err);
      ctx.throw(500, 'Failed to fetch filter values');
    }
  },
}));
