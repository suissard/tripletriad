import { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async openPack(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('You must be logged in to open a pack.');
      }

      const userWithWallet = await strapi.entityService.findOne(
        'plugin::users-permissions.user',
        user.id,
        { populate: ['wallet'] }
      ) as any;

      const wallet = userWithWallet?.wallet;

      if (!wallet) {
        return ctx.badRequest('Wallet not found. Please contact support.');
      }

      const PACK_COST = 100;
      if (wallet.gems < PACK_COST) {
        return ctx.badRequest('Not enough gems to open a pack.');
      }

      // Deduct gems early to prevent double spending
      await strapi.entityService.update('api::wallet.wallet', wallet.id, {
        data: {
          gems: wallet.gems - PACK_COST,
        },
      });

      const commonCards = await strapi.entityService.findMany('api::card.card', { filters: { rarity: 'Common' } });
      const rareCards = await strapi.entityService.findMany('api::card.card', { filters: { rarity: 'Rare' } });
      const epicCards = await strapi.entityService.findMany('api::card.card', { filters: { rarity: 'Epic' } });
      const legendaryCards = await strapi.entityService.findMany('api::card.card', { filters: { rarity: 'Legendary' } });

      // Fallback: If no cards exist for a rarity, use all cards as a failsafe
      const allCardsEntities = await strapi.entityService.findMany('api::card.card');

      if (allCardsEntities.length === 0) {
        // Refund
        await strapi.entityService.update('api::wallet.wallet', wallet.id, {
          data: { gems: wallet.gems },
        });
        return ctx.internalServerError('No cards available in the database.');
      }

      const allCards = {
        Common: commonCards.length > 0 ? commonCards : allCardsEntities,
        Rare: rareCards.length > 0 ? rareCards : allCardsEntities,
        Epic: epicCards.length > 0 ? epicCards : allCardsEntities,
        Legendary: legendaryCards.length > 0 ? legendaryCards : allCardsEntities,
      };

      const drawnCards = [];

      for (let i = 0; i < 4; i++) {
        const rand = Math.random();
        const rarityToDraw = rand < 0.7 ? 'Common' : 'Rare';
        const pool = allCards[rarityToDraw] as any[];
        const randomCard = pool[Math.floor(Math.random() * pool.length)];
        drawnCards.push(randomCard);
      }

      const rand5 = Math.random();
      const rarity5 = rand5 < 0.9 ? 'Epic' : 'Legendary';
      const pool5 = allCards[rarity5] as any[];
      const randomCard5 = pool5[Math.floor(Math.random() * pool5.length)];
      drawnCards.push(randomCard5);

      // Batch existence check to avoid N+1 queries
      const cardCounts = new Map<number, number>();
      for (const card of drawnCards) {
        cardCounts.set(card.id, (cardCounts.get(card.id) || 0) + 1);
      }

      const cardIds = Array.from(cardCounts.keys());
      const existingUserCards = await strapi.entityService.findMany('api::user-card.user-card', {
        filters: {
          user: user.id,
          card: {
            id: {
              $in: cardIds,
            },
          },
        },
        populate: ['card'],
      }) as any[];

      const existingUserCardMap = new Map<number, any>();
      for (const uc of existingUserCards) {
        if (uc.card && uc.card.id) {
          existingUserCardMap.set(uc.card.id, uc);
        }
      }

      for (const [cardId, count] of cardCounts) {
        const existingUserCard = existingUserCardMap.get(cardId);

        if (existingUserCard) {
          await strapi.entityService.update('api::user-card.user-card', existingUserCard.id, {
            data: {
              quantity: existingUserCard.quantity + count,
            },
          });
        } else {
          await strapi.entityService.create('api::user-card.user-card', {
            data: {
              user: user.id,
              card: cardId,
              quantity: count,
              isPremium: false,
            },
          });
        }
      }

      return ctx.send({
        message: 'Pack opened successfully',
        cards: drawnCards,
        wallet: { gems: wallet.gems - PACK_COST, dust: wallet.dust }
      });

    } catch (err) {
      console.error('Error opening pack:', err);
      return ctx.internalServerError('An error occurred while opening the pack.');
    }

      }
});
