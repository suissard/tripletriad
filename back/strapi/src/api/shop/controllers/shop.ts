import { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async openPack(ctx) {
    return ctx.send(
      {
        error: {
          status: 410,
          name: "GoneError",
          message:
            "Endpoint déprécié. Utilisez /api/booster/buy et /api/booster/open qui appliquent la configuration GameConfig.",
        },
      },
      410,
    );
  },
});
