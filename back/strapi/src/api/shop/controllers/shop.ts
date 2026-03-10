import { factories } from '@strapi/strapi';

export default {
  async openPack(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in to buy a pack.');
    }

    const { packId } = ctx.request.body;

    // Fetch the pack details
    const pack = await strapi.entityService.findOne('api::pack.pack' as any, packId, {
      populate: ['cards'] as any,
    }) as any;

    if (!pack) {
      return ctx.badRequest('Pack not found.');
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
