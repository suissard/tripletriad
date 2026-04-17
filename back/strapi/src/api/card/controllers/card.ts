import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::card.card",
  ({ strapi }) => ({
    async getFilters(ctx) {
      try {
        // Optimized query: Use Knex (strapi.db.connection) for distinct values directly from the database.
        // This reduces memory usage and processing time by offloading uniqueness to the DB.
        const knex = strapi.db.connection;

        const [factionsResult, collectionsResult] = await Promise.all([
          knex("cards")
            .distinct("faction")
            .whereNotNull("faction")
            .orderBy("faction", "asc"),
          knex("collections")
            .distinct("code")
            .where("is_active", true)
            .orderBy("code", "asc"),
        ]);

        ctx.body = {
          factions: factionsResult.map((r: any) => r.faction),
          collections: collectionsResult.map((r: any) => r.code),
        };
      } catch (err) {
        console.error("[Strapi] getFilters error:", err);
        ctx.throw(500, "Failed to fetch filter values");
      }
    },
  }),
);
