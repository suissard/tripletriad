import { factories } from '@strapi/strapi';
import { GameEngine } from '../../../shared/GameEngine';

export default factories.createCoreController('api::user-card.user-card', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    // Ensure we only see our own cards
    ctx.query.filters = {
      ...(ctx.query.filters as any || {}),
      user: user.id
    };

    // Use the default find implementation but with our filter forced
    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

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

      const cardLevel = GameEngine.calculateCardLevel({
        top: card.topValue,
        right: card.rightValue,
        bottom: card.bottomValue,
        left: card.leftValue
      });

      let rarity = 'common';
      if (cardLevel <= 2) rarity = 'common';
      else if (cardLevel <= 4) rarity = 'uncommon';
      else if (cardLevel <= 6) rarity = 'rare';
      else if (cardLevel <= 8) rarity = 'epic';
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

      const cardLevel = GameEngine.calculateCardLevel({
        top: card.topValue,
        right: card.rightValue,
        bottom: card.bottomValue,
        left: card.leftValue
      });

      let rarity = 'common';
      if (cardLevel <= 2) rarity = 'common';
      else if (cardLevel <= 4) rarity = 'uncommon';
      else if (cardLevel <= 6) rarity = 'rare';
      else if (cardLevel <= 8) rarity = 'epic';
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

        const cardData = (userCard as any).card;
        const cardLevel = GameEngine.calculateCardLevel({
          top: cardData.topValue,
          right: cardData.rightValue,
          bottom: cardData.bottomValue,
          left: cardData.leftValue
        });

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
  },
  async addDevCurrencies(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('You must be logged in.');

      const { coins, gems, dust } = ctx.request.body;
      
      // Find the wallet for this user
      const wallets = await strapi.entityService.findMany('api::wallet.wallet', {
        filters: { user: user.id }
      });
      
      let wallet = wallets[0];
      if (!wallet) {
        // Create wallet if it doesn't exist for some reason
        wallet = await strapi.entityService.create('api::wallet.wallet', {
          data: { user: user.id, coins: 0, gems: 0, dust: 0 }
        });
      }

      const updateData: any = {};
      if (typeof coins === 'number') updateData.coins = (wallet.coins || 0) + coins;
      if (typeof gems === 'number') updateData.gems = (wallet.gems || 0) + gems;
      if (typeof dust === 'number') updateData.dust = (wallet.dust || 0) + dust;

      const updatedWallet = await strapi.entityService.update('api::wallet.wallet', wallet.id, {
        data: updateData
      });

      return ctx.send({ 
        message: 'Currencies added successfully', 
        coins: updatedWallet.coins, 
        gems: updatedWallet.gems,
        dust: updatedWallet.dust 
      });
    } catch (err) {
      console.error(err);
      return ctx.internalServerError('An error occurred while adding currencies.');
    }
  }
}));
