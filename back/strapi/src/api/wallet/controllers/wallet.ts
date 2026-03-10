import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::wallet.wallet', ({ strapi }) => ({
  async getMe(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in to access your wallet');
    }

    const wallet = await strapi.db.query('api::wallet.wallet').findOne({
      where: { user: user.id },
    });

    if (!wallet) {
      return ctx.notFound('Wallet not found for this user');
    }

    return { data: wallet };
  },
}));
