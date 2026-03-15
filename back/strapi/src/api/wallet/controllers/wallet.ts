import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::wallet.wallet', ({ strapi }) => ({
  async getMe(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in to access your wallet');
    }

    let wallet = await strapi.db.query('api::wallet.wallet').findOne({
      where: { user: user.id },
    });
    
    if (!wallet) {
      wallet = await strapi.entityService.create('api::wallet.wallet', {
        data: {
          user: user.id,
          coins: 100, // Initial coins
          gems: 0,
          dust: 0
        }
      });
    }

    return { data: wallet };
  },
}));
