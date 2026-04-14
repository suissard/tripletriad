import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::weekly-quest-config.weekly-quest-config",
  ({ strapi }) => ({
    async getConfig(ctx) {
      const config = await strapi.entityService.findMany(
        "api::weekly-quest-config.weekly-quest-config",
        {
          populate: ["tiers"],
        },
      );
      return { data: config || null };
    },
  }),
);
