import { factories } from '@strapi/strapi';

export default {
  async openBooster(ctx) {
    try {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('You must be logged in to open a booster.');
      }

      // 1. Fetch game config
      const gameConfigs = await strapi.entityService.findMany('api::game-config.game-config', {});
      const gameConfig = gameConfigs ? gameConfigs : {}; // Ensure it's not null

      const boosterCost = gameConfig.boosterCost || 100;

      // 2. Check if user has enough coins
      if (user.coins === undefined || user.coins === null) {
          user.coins = 100; // Give some initial coins if undefined for testing
      }

      if (user.coins < boosterCost) {
        return ctx.badRequest('Not enough coins to open a booster.');
      }

      // 4. Fetch all available cards
      const allCards = await strapi.entityService.findMany('api::card.card', {
        populate: { image: true },
        limit: 1000 // Get a good chunk of cards
      });

      if (!allCards || allCards.length === 0) {
          return ctx.internalServerError('No cards available in the game.');
      }

      // 3. Deduct coins (do this after verifying cards exist)
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: {
          coins: user.coins - boosterCost,
        },
      });

      // 5. Categorize cards by rarity
      const categorizeRarity = (card) => {
          // Parse values correctly, handling 'A' as 10
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

      // Probabilities from config
      const probs = {
          common: gameConfig.probCommon !== undefined ? gameConfig.probCommon : 39,
          uncommon: gameConfig.probUncommon !== undefined ? gameConfig.probUncommon : 30,
          rare: gameConfig.probRare !== undefined ? gameConfig.probRare : 20,
          epic: gameConfig.probEpic !== undefined ? gameConfig.probEpic : 10,
          legendary: gameConfig.probLegendary !== undefined ? gameConfig.probLegendary : 1,
      };

      const probPremium = gameConfig.probPremium !== undefined ? gameConfig.probPremium : 5;

      // Calculate cumulative probabilities
      const cumProbs = {
          legendary: probs.legendary,
          epic: probs.legendary + probs.epic,
          rare: probs.legendary + probs.epic + probs.rare,
          uncommon: probs.legendary + probs.epic + probs.rare + probs.uncommon,
      };

      const getRandomCardFromPool = (poolName) => {
          let pool = pools[poolName];
          if (!pool || pool.length === 0) {
              // Fallback to any card if specific rarity pool is empty
              pool = allCards;
          }
          const randomIndex = Math.floor(Math.random() * pool.length);
          return pool[randomIndex];
      };

      const drawnCards = [];
      const userCardsToCreateOrUpdate = {}; // Map of cardId to quantity

      // 6. Draw 5 cards
      for (let i = 0; i < 5; i++) {
          const rand = Math.random() * 100;
          let selectedRarity = 'common';

          if (rand < cumProbs.legendary) {
              selectedRarity = 'legendary';
          } else if (rand < cumProbs.epic) {
              selectedRarity = 'epic';
          } else if (rand < cumProbs.rare) {
              selectedRarity = 'rare';
          } else if (rand < cumProbs.uncommon) {
              selectedRarity = 'uncommon';
          }

          const card = getRandomCardFromPool(selectedRarity);

          // Determine if it gets a premium upgrade
          const isDrawnPremium = Math.random() * 100 < probPremium;

          drawnCards.push({
              ...card,
              drawnRarity: selectedRarity,
              isDrawnPremium: isDrawnPremium
          });

          if (userCardsToCreateOrUpdate[card.id]) {
              userCardsToCreateOrUpdate[card.id]++;
          } else {
              userCardsToCreateOrUpdate[card.id] = 1;
          }
      }

      // 7. Add to user collection
      const existingUserCards = await strapi.entityService.findMany('api::user-card.user-card', {
          filters: { user: user.id },
          populate: { card: true }
      });

      for (const [cardIdStr, quantityToAdd] of Object.entries(userCardsToCreateOrUpdate)) {
          const cardId = parseInt(cardIdStr, 10);
          const existingUserCard = existingUserCards.find(uc => uc.card && uc.card.id === cardId);

          if (existingUserCard) {
              // Update quantity
              await strapi.entityService.update('api::user-card.user-card', existingUserCard.id, {
                  data: {
                      quantity: existingUserCard.quantity + quantityToAdd
                  }
              });
          } else {
              // Create new user-card entry
              await strapi.entityService.create('api::user-card.user-card', {
                  data: {
                      user: user.id,
                      card: cardId,
                      quantity: quantityToAdd
                  }
              });
          }
      }

      // Fetch user again to get final coins, just in case
      const finalUser = await strapi.entityService.findOne('plugin::users-permissions.user', user.id);

      return {
        message: 'Booster opened successfully',
        cards: drawnCards,
        coins: finalUser.coins
      };

    } catch (err) {
      console.error("Error opening booster:", err);
      return ctx.internalServerError('An error occurred while opening the booster.');
    }
  }
};
