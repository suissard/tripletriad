import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::wallet.wallet",
  ({ strapi }: { strapi: any }) => ({
    async getMe(ctx) {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized("You must be logged in to access your wallet");
      }

      const wallets = await strapi.documents("api::wallet.wallet").findMany({
        filters: { user: { id: user.id } },
      });
      let wallet = wallets[0];

      if (!wallet) {
        wallet = await strapi.documents("api::wallet.wallet").create({
          data: {
            user: { id: user.id },
            coins: 100, // Initial coins
            gems: 0,
            dust: 0,
          },
        });
      }

      return { data: wallet };
    },
  }),
);
