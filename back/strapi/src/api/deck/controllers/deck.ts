import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::deck.deck', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    const result = await strapi.documents('api::deck.deck').findMany({
        filters: { user: { id: user.id } },
        populate: ['cards']
    });

    return { data: result };
  },
}));
