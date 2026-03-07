import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::user-card.user-card', ({ strapi }) => ({
  async disenchant(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('You must be logged in.');

      const { cardId } = ctx.request.body;
      if (!cardId) return ctx.badRequest('cardId is required.');

      const gameConfigs = await strapi.entityService.findMany('api::game-config.game-config');
      const gameConfig = Array.isArray(gameConfigs) ? gameConfigs[0] : gameConfigs;

      const craftingRatios = gameConfig?.craftingRatios || {
        "common": { "disenchant": 10, "craft": 40 },
        "uncommon": { "disenchant": 20, "craft": 80 },
        "rare": { "disenchant": 50, "craft": 200 },
        "epic": { "disenchant": 100, "craft": 400 },
        "legendary": { "disenchant": 400, "craft": 1600 }
      };

      const card = await strapi.entityService.findOne('api::card.card', cardId);
      if (!card) return ctx.notFound('Card not found.');

      let rarity = 'common';
      if (card.level <= 2) rarity = 'common';
      else if (card.level <= 4) rarity = 'uncommon';
      else if (card.level <= 6) rarity = 'rare';
      else if (card.level <= 8) rarity = 'epic';
      else rarity = 'legendary';

      const dustGained = craftingRatios[rarity]?.disenchant || 10;

      const userCards = await strapi.entityService.findMany('api::user-card.user-card', {
        filters: { user: user.id, card: cardId },
      });

      const userCard = userCards[0];
      if (!userCard || userCard.quantity <= 0) return ctx.badRequest('You do not own this card.');

      const updatedQuantity = userCard.quantity - 1;
      if (updatedQuantity === 0) {
        await strapi.entityService.delete('api::user-card.user-card', userCard.id);
      } else {
        await strapi.entityService.update('api::user-card.user-card', userCard.id, {
          data: { quantity: updatedQuantity }
        });
      }

      const currentUserData = await strapi.entityService.findOne('plugin::users-permissions.user', user.id);
      const newDust = ((currentUserData as any).dust || 0) + dustGained;
      await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: { dust: newDust } as any
      });

      return ctx.send({ message: 'Disenchanted successfully', dustGained, newDustTotal: newDust, newQuantity: updatedQuantity });
    } catch (err) {
      console.error(err);
      return ctx.internalServerError('An error occurred during disenchanting.');
    }
  },

  async craft(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('You must be logged in.');

      const { cardId } = ctx.request.body;
      if (!cardId) return ctx.badRequest('cardId is required.');

      const gameConfigs = await strapi.entityService.findMany('api::game-config.game-config');
      const gameConfig = Array.isArray(gameConfigs) ? gameConfigs[0] : gameConfigs;

      const craftingRatios = gameConfig?.craftingRatios || {
        "common": { "disenchant": 10, "craft": 40 },
        "uncommon": { "disenchant": 20, "craft": 80 },
        "rare": { "disenchant": 50, "craft": 200 },
        "epic": { "disenchant": 100, "craft": 400 },
        "legendary": { "disenchant": 400, "craft": 1600 }
      };

      const card = await strapi.entityService.findOne('api::card.card', cardId);
      if (!card) return ctx.notFound('Card not found.');

      let rarity = 'common';
      if (card.level <= 2) rarity = 'common';
      else if (card.level <= 4) rarity = 'uncommon';
      else if (card.level <= 6) rarity = 'rare';
      else if (card.level <= 8) rarity = 'epic';
      else rarity = 'legendary';

      const dustCost = craftingRatios[rarity]?.craft || 40;

      const currentUserData = await strapi.entityService.findOne('plugin::users-permissions.user', user.id);
      const currentDust = (currentUserData as any).dust || 0;

      if (currentDust < dustCost) return ctx.badRequest('Not enough dust.');

      const newDust = currentDust - dustCost;
      await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: { dust: newDust } as any
      });

      const userCards = await strapi.entityService.findMany('api::user-card.user-card', {
        filters: { user: user.id, card: cardId },
      });

      let updatedQuantity = 1;
      const userCard = userCards[0];
      if (!userCard) {
        await strapi.entityService.create('api::user-card.user-card', {
          data: { user: user.id, card: cardId, quantity: 1 }
        });
      } else {
        updatedQuantity = userCard.quantity + 1;
        await strapi.entityService.update('api::user-card.user-card', userCard.id, {
          data: { quantity: updatedQuantity }
        });
      }

      return ctx.send({ message: 'Crafted successfully', dustCost, newDustTotal: newDust, newQuantity: updatedQuantity });
    } catch (err) {
      console.error(err);
      return ctx.internalServerError('An error occurred during crafting.');
    }
  },

  async massDisenchant(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('You must be logged in.');

      const gameConfigs = await strapi.entityService.findMany('api::game-config.game-config');
      const gameConfig = Array.isArray(gameConfigs) ? gameConfigs[0] : gameConfigs;

      const playableLimit = gameConfig?.playableLimit || 2;
      const craftingRatios = gameConfig?.craftingRatios || {
        "common": { "disenchant": 10, "craft": 40 },
        "uncommon": { "disenchant": 20, "craft": 80 },
        "rare": { "disenchant": 50, "craft": 200 },
        "epic": { "disenchant": 100, "craft": 400 },
        "legendary": { "disenchant": 400, "craft": 1600 }
      };

      const userCards = await strapi.entityService.findMany('api::user-card.user-card', {
        filters: { user: user.id, quantity: { $gt: playableLimit } },
        populate: ['card']
      });

      if (!userCards || userCards.length === 0) {
        return ctx.send({ message: 'No surplus cards to disenchant', totalDustGained: 0, cardsDestroyed: 0 });
      }

      let totalDustGained = 0;
      let cardsDestroyed = 0;

      for (const userCard of userCards) {
        const surplusQuantity = userCard.quantity - playableLimit;
        if (surplusQuantity <= 0) continue;

        const cardLevel = (userCard as any).card?.level || 1;
        let rarity = 'common';
        if (cardLevel <= 2) rarity = 'common';
        else if (cardLevel <= 4) rarity = 'uncommon';
        else if (cardLevel <= 6) rarity = 'rare';
        else if (cardLevel <= 8) rarity = 'epic';
        else rarity = 'legendary';

        const dustPerCard = craftingRatios[rarity]?.disenchant || 10;

        totalDustGained += dustPerCard * surplusQuantity;
        cardsDestroyed += surplusQuantity;

        await strapi.entityService.update('api::user-card.user-card', userCard.id, {
          data: { quantity: playableLimit }
        });
      }

      const currentUserData = await strapi.entityService.findOne('plugin::users-permissions.user', user.id);
      const newDust = ((currentUserData as any).dust || 0) + totalDustGained;

      await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: { dust: newDust } as any
      });

      return ctx.send({ message: 'Mass disenchant successful', totalDustGained, newDustTotal: newDust, cardsDestroyed });

    } catch (err) {
      console.error(err);
      return ctx.internalServerError('An error occurred during mass disenchanting.');
    }
  }
}));
