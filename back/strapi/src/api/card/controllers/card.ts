import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::card.card",
  ({ strapi }) => ({
    async getFilters(ctx) {
      try {
        // Optimized query: Use Knex (strapi.db.connection) for distinct values directly from the database.
        // This reduces memory usage and processing time by offloading uniqueness to the DB.
        const knex = strapi.db.connection;
        const [hasFactions, hasCollections] = await Promise.all([
          knex.schema.hasTable("factions"),
          knex.schema.hasTable("collections"),
        ]);

        const [factionsResult, collectionsResult] = await Promise.all([
          hasFactions 
            ? knex("factions").select("name").orderBy("name", "asc")
            : Promise.resolve([]),
          hasCollections
            ? knex("collections").distinct("code").where("is_active", true).orderBy("code", "asc")
            : Promise.resolve([]),
        ]);

        ctx.body = {
          factions: factionsResult.map((r: any) => r.name),
          collections: collectionsResult.map((r: any) => r.code),
        };
      } catch (err) {
        console.error("[Strapi] getFilters error:", err);
        ctx.throw(500, "Failed to fetch filter values");
      }
    },
  }),
);
