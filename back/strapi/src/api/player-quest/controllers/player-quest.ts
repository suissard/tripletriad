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

  async claimReward(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    const { id } = ctx.params;

    const playerQuest = await strapi.entityService.findOne('api::player-quest.player-quest', id, {
      populate: ['quest_template', 'user'],
    });

    if (!playerQuest) {
      return ctx.notFound('Quest not found.');
    }

    if (playerQuest.user.id !== user.id) {
      return ctx.forbidden('This is not your quest.');
    }

    if (playerQuest.status !== 'completed') {
      return ctx.badRequest('Quest is not completed.');
    }

    if (playerQuest.rewardClaimed) {
      return ctx.badRequest('Reward already claimed.');
    }

    const template = playerQuest.quest_template;
    if (!template) {
      return ctx.badRequest('Quest template not found.');
    }

    // Grant rewards
    const userWallets = await strapi.entityService.findMany('api::wallet.wallet', {
      filters: { user: user.id }
    });

    let wallet;
    if (userWallets && userWallets.length > 0) {
      wallet = userWallets[0];
      await strapi.entityService.update('api::wallet.wallet', wallet.id, {
        data: {
          coins: (wallet.coins || 0) + (template.rewardCoins || 0),
          gems: (wallet.gems || 0) + (template.rewardGems || 0)
        }
      });
    }

    // Mark as claimed
    const updatedQuest = await strapi.entityService.update('api::player-quest.player-quest', id, {
      data: {
        rewardClaimed: true
      },
      populate: ['quest_template']
    });

    return {
      success: true,
      reward: {
        coins: template.rewardCoins || 0,
        gems: template.rewardGems || 0
      },
      playerQuest: updatedQuest
    };
  }
}));
