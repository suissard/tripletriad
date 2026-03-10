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

      for (const card of drawnCards) {
        const existingUserCards = await strapi.entityService.findMany('api::user-card.user-card', {
          filters: {
            user: user.id,
            card: card.id,
          },
        }) as any[];

        if (existingUserCards && existingUserCards.length > 0) {
          const userCard = existingUserCards[0];
          await strapi.entityService.update('api::user-card.user-card', userCard.id, {
            data: {
              quantity: userCard.quantity + 1,
            },
          });
        } else {
          await strapi.entityService.create('api::user-card.user-card', {
            data: {
              user: user.id,
              card: card.id,
              quantity: 1,
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

    // Fetch user's current coins/gems
    const userData = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['cards'] as any,
    }) as any;

    if (userData.coins < pack.price) {
      return ctx.badRequest('Not enough coins.');
    }

    // Deduct coins
    const newCoins = userData.coins - pack.price;

    // Simulate opening the pack: Randomly select 5 cards based on rarity
    // For simplicity, let's just pick 5 random cards from the database
    // In a real game, you'd use a weighted pool based on the pack's rules

    const allCards = await strapi.entityService.findMany('api::card.card') as any[];

    if (!allCards || allCards.length < 5) {
        return ctx.internalServerError('Not enough cards in database to open a pack.');
    }

    // Basic logic: 4 common/uncommon/rare, 1 guaranteed rare/epic/legendary
    const pulledCards = [];

    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * allCards.length);
        pulledCards.push(allCards[randomIndex]);
    }

    // Filter for higher rarity for the 5th card (assuming rarities 3, 4, 5 are higher)
    const highRarityCards = allCards.filter((c: any) => c.rarity >= 3);
    if (highRarityCards.length > 0) {
        const randomIndex = Math.floor(Math.random() * highRarityCards.length);
        pulledCards.push(highRarityCards[randomIndex]);
    } else {
        // Fallback if no high rarity cards exist
        const randomIndex = Math.floor(Math.random() * allCards.length);
        pulledCards.push(allCards[randomIndex]);
    }

    // Add cards to user's collection
    // We need to keep existing cards and add the new ones
    const currentCardIds = userData.cards ? userData.cards.map((c: any) => c.id) : [];
    const newCardIds = pulledCards.map(c => c.id);
    const updatedCardIds = [...currentCardIds, ...newCardIds];

    await strapi.entityService.update('plugin::users-permissions.user', user.id, {
      data: {
        coins: newCoins,
        cards: updatedCardIds as any,
      },
    });

    return ctx.send({
      message: 'Pack opened successfully!',
      cards: pulledCards,
      newCoinBalance: newCoins
    });
  }
};
