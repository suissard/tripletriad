import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::card.card', ({ strapi }) => ({
  async getFilters(ctx) {
    try {
      // Optimized query: Use Knex (strapi.db.connection) for distinct values directly from the database.
      // This reduces memory usage and processing time by offloading uniqueness to the DB.
      const knex = strapi.db.connection;

      const [factionsResult, collectionsResult] = await Promise.all([
        knex('cards').distinct('faction').whereNotNull('faction').orderBy('faction', 'asc'),
        knex('cards').distinct('collection_name').whereNotNull('collection_name').orderBy('collection_name', 'asc'),
      ]);

      ctx.body = {
        factions: factionsResult.map((r: any) => r.faction),
        collections: collectionsResult.map((r: any) => r.collection_name),
      };
    } catch (err) {
      console.error('[Strapi] getFilters error:', err);
      ctx.throw(500, 'Failed to fetch filter values');
    }
  },
}));
