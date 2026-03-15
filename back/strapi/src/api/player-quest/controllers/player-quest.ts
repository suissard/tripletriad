/**
 * player-quest controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::player-quest.player-quest', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    const result = await strapi.db.query('api::player-quest.player-quest').findMany({
        where: { user: user.id },
        populate: ['quest_template']
    });

    return { data: result };
  },
}));
