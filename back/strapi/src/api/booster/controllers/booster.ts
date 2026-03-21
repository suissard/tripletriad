import { factories } from '@strapi/strapi';

export default {
  async buyBooster(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('You must be logged in to buy a booster.');
      }

      const { type = 'classic', collection = 'base' } = ctx.request.body; // 'classic' (coins) or 'premium' (gems)
      const isPremium = type === 'premium';

      // 1. Fetch user with wallet
      const userWithWallet = await strapi.entityService.findOne(
        'plugin::users-permissions.user',
        user.id,
        { populate: ['wallet'] }
      ) as any;

      const wallet = userWithWallet?.wallet;
      if (!wallet) {
        return ctx.badRequest('Wallet not found.');
      }

      const COST = 100; // Hardcoded for now, can be moved to config later
      const currency = isPremium ? 'gems' : 'coins';

      if (wallet[currency] < COST) {
        return ctx.badRequest(`Not enough ${currency} to buy a ${type} booster.`);
      }

      // 2. Deduct currency and add booster
      const currentBoosters = wallet.boosters || [];
      const boosterIndex = currentBoosters.findIndex(b => b.collection === collection && b.isPremium === isPremium);

      if (boosterIndex !== -1) {
        currentBoosters[boosterIndex].quantity += 1;
      } else {
        currentBoosters.push({ collection, isPremium, quantity: 1 });
      }

      await strapi.entityService.update('api::wallet.wallet', wallet.id, {
        data: {
          [currency]: wallet[currency] - COST,
          boosters: currentBoosters
        },
      });

      return {
        message: 'Booster added to wallet successfully',
        wallet: {
          coins: currency === 'coins' ? wallet.coins - COST : wallet.coins,
          gems: currency === 'gems' ? wallet.gems - COST : wallet.gems,
          dust: wallet.dust,
          boosters: currentBoosters
        }
      };
    } catch (err) {
      console.error("Error buying booster:", err);
      return ctx.internalServerError('An error occurred while buying the booster.');
    }
  },

  async openBooster(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('You must be logged in to open a booster.');
      }

      const { collection = 'base', isPremium = false } = ctx.request.body;

      // 1. Fetch user with wallet
      const userWithWallet = await strapi.entityService.findOne(
        'plugin::users-permissions.user',
        user.id,
        { populate: ['wallet'] }
      ) as any;

      const wallet = userWithWallet?.wallet;
      if (!wallet) {
        return ctx.badRequest('Wallet not found.');
      }

      const currentBoosters = wallet.boosters || [];
      const boosterIndex = currentBoosters.findIndex(b => b.collection === collection && b.isPremium === isPremium);

      if (boosterIndex === -1 || currentBoosters[boosterIndex].quantity <= 0) {
        return ctx.badRequest('Booster not found in wallet.');
      }

      // 2. Fetch game config
      const gameConfigs = await strapi.entityService.findMany('api::game-config.game-config', {});
      const gameConfig: any = gameConfigs || {};

      // 3. Fetch all available cards from collection
      const allCards = await strapi.entityService.findMany('api::card.card', {
        filters: { collectionName: collection },
        populate: { image: true },
        limit: 1000
      }) as any[];

      if (!allCards || allCards.length === 0) {
        // Fallback to all cards if no cards with collectionName exist
        const anyCards = await strapi.entityService.findMany('api::card.card', {
          populate: { image: true },
          limit: 1000
        }) as any[];
        if (!anyCards || anyCards.length === 0) {
           return ctx.internalServerError('No cards available in the game.');
        }
        allCards.push(...anyCards);
      }

      // 4. Update wallet booster quantity
      currentBoosters[boosterIndex].quantity -= 1;
      if (currentBoosters[boosterIndex].quantity <= 0) {
        currentBoosters.splice(boosterIndex, 1);
      }

      await strapi.entityService.update('api::wallet.wallet', wallet.id, {
        data: {
          boosters: currentBoosters
        },
      });

      // 5. Categorize cards by rarity
      const categorizeRarity = (card) => {
        const getVal = (v) => v === 'A' ? 10 : parseInt(v, 10) || 0;
        const sum = getVal(card.topValue) + getVal(card.rightValue) + getVal(card.bottomValue) + getVal(card.leftValue);

        if (sum < 20) return 'common';
        if (sum < 26) return 'uncommon';
        if (sum < 32) return 'rare';
        if (sum < 36) return 'epic';
        return 'legendary';
      };

      const pools = {
        common: [],
        uncommon: [],
        rare: [],
        epic: [],
        legendary: []
      };

      allCards.forEach(card => {
        const rarity = categorizeRarity(card);
        pools[rarity].push(card);
      });

      // Probabilities (Premium packs could have better rates, but keeping it simple for now as requested)
      const probs = {
        common: gameConfig.probCommon ?? 39,
        uncommon: gameConfig.probUncommon ?? 30,
        rare: gameConfig.probRare ?? 20,
        epic: gameConfig.probEpic ?? 10,
        legendary: gameConfig.probLegendary ?? 1,
      };

      const probPremium = gameConfig.probPremium ?? 5;

      const cumProbs = {
        legendary: probs.legendary,
        epic: probs.legendary + probs.epic,
        rare: probs.legendary + probs.epic + probs.rare,
        uncommon: probs.legendary + probs.epic + probs.rare + probs.uncommon,
      };

      const getRandomCardFromPool = (poolName) => {
        let pool = pools[poolName];
        if (!pool || pool.length === 0) pool = allCards;
        return pool[Math.floor(Math.random() * pool.length)];
      };

      const drawnCards = [];
      const userCardsToCreateOrUpdate: Record<string, number> = {};

      // 6. Draw 5 cards
      const strapiBaseUrl = process.env.STRAPI_BASE_URL || 'http://localhost:1337';
      
      for (let i = 0; i < 5; i++) {
        const rand = Math.random() * 100;
        let selectedRarity = 'common';

        if (rand < cumProbs.legendary) selectedRarity = 'legendary';
        else if (rand < cumProbs.epic) selectedRarity = 'epic';
        else if (rand < cumProbs.rare) selectedRarity = 'rare';
        else if (rand < cumProbs.uncommon) selectedRarity = 'uncommon';

        const card: any = getRandomCardFromPool(selectedRarity);
        const isDrawnPremium = isPremium ? true : Math.random() * 100 < probPremium;

        // Normalize image for frontend
        let imgUrl = card.image?.url ? `${strapiBaseUrl}${card.image.url}` : null;
        if (!imgUrl) {
          imgUrl = `https://api.dicebear.com/9.x/bottts/png?seed=${card.id * 42}&backgroundColor=transparent`;
        }

        drawnCards.push({
          ...card,
          img: imgUrl,
          drawnRarity: selectedRarity,
          isDrawnPremium: isDrawnPremium
        });

        const cardKey = `${card.id}_${isDrawnPremium}`;
        userCardsToCreateOrUpdate[cardKey] = (userCardsToCreateOrUpdate[cardKey] || 0) + 1;
      }

      // 7. Add to user collection
      const existingUserCards: any[] = (await strapi.entityService.findMany('api::user-card.user-card', {
        filters: { user: user.id },
        populate: { card: true }
      })) as any[];

      for (const [cardKey, quantityToAdd] of Object.entries(userCardsToCreateOrUpdate)) {
        const [cardIdStr, isPremiumStr] = cardKey.split('_');
        const cardId = parseInt(cardIdStr, 10);
        const pStr = isPremiumStr === 'true';

        const existingUserCard = existingUserCards.find(uc => uc.card && uc.card.id === cardId && !!uc.isPremium === pStr);

        if (existingUserCard) {
          await strapi.entityService.update('api::user-card.user-card', existingUserCard.id, {
            data: { quantity: existingUserCard.quantity + quantityToAdd }
          });
        } else {
          await strapi.entityService.create('api::user-card.user-card', {
            data: {
              user: user.id,
              card: cardId,
              quantity: quantityToAdd,
              isPremium: pStr
            }
          });
        }
      }

      return {
        message: 'Booster opened successfully',
        cards: drawnCards,
        wallet: {
          coins: wallet.coins,
          gems: wallet.gems,
          dust: wallet.dust,
          boosters: currentBoosters
        }
      };

    } catch (err) {
      console.error("Error opening booster:", err);
      return ctx.internalServerError('An error occurred while opening the booster.');
    }
  }
};
