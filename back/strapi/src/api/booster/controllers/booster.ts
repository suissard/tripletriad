import { factories } from "@strapi/strapi";
import { logPlayerEvent } from "../../player-event-log/services/event-logger";

export default {
  async buyBooster(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized("You must be logged in to buy a booster.");
      }

      const { type = "classic", collection = "base", quantity = 1 } = ctx.request.body; // 'classic' (coins) or 'premium' (gems)
      const isPremium = type === "premium";
      const parsedQuantity = Math.max(1, parseInt(quantity, 10) || 1);

      // 1. Fetch user with wallet
      const userWithWallet = (await strapi.documents("plugin::users-permissions.user").findOne({
        documentId: user.documentId || (await strapi.documents("plugin::users-permissions.user").findMany({ filters: { id: user.id }, limit: 1 }).then(r => r[0]?.documentId)),
        populate: ["wallet"]
      })) as any;

      const wallet = userWithWallet?.wallet;
      if (!wallet) {
        return ctx.badRequest("Wallet not found.");
      }

      // 1b. Fetch game config for costs
      const gameConfig = await strapi.documents("api::game-config.game-config").findFirst({}) as any;
      const classicBaseCost = gameConfig?.defaultBoosterCost ?? 100;
      const premiumBaseCost = gameConfig?.defaultPremiumBoosterCost ?? 50;

      // 1c. Fetch collection for multiplier and active status
      const collections = await strapi.documents("api::collection.collection").findMany({
        filters: { code: collection }
      });
      const targetCollection = collections?.[0] as any;
      
      if (!targetCollection || targetCollection.isActive === false) {
        return ctx.badRequest("This collection is not currently active for purchase.");
      }

      const multiplier = isPremium 
        ? (targetCollection?.premiumBoosterCostMultiplier ?? 1.0)
        : (targetCollection?.boosterCostMultiplier ?? 1.0);

      const UNIT_COST = Math.floor((isPremium ? premiumBaseCost : classicBaseCost) * multiplier);
      const COST = UNIT_COST * parsedQuantity;
      const currency = isPremium ? "gems" : "coins";

      if (wallet[currency] < COST) {
        return ctx.badRequest(
          `Not enough ${currency} to buy ${parsedQuantity} ${type} booster(s). Final cost: ${COST} ${currency}.`,
        );
      }

      // 2. Deduct currency and add booster
      const currentBoosters = wallet.boosters || [];
      const boosterIndex = currentBoosters.findIndex(
        (b) => b.collection === collection && b.isPremium === isPremium,
      );

      if (boosterIndex !== -1) {
        currentBoosters[boosterIndex].quantity += parsedQuantity;
      } else {
        currentBoosters.push({ collection, isPremium, quantity: parsedQuantity });
      }

      await strapi.documents("api::wallet.wallet").update({
        documentId: wallet.documentId,
        data: {
          [currency]: wallet[currency] - COST,
          boosters: currentBoosters,
        },
      });

      return {
        message: "Booster added to wallet successfully",
        wallet: {
          coins: currency === "coins" ? wallet.coins - COST : wallet.coins,
          gems: currency === "gems" ? wallet.gems - COST : wallet.gems,
          dust: wallet.dust,
          boosters: currentBoosters,
        },
      };
    } catch (err) {
      console.error("Error buying booster:", err);
      return ctx.internalServerError(
        "An error occurred while buying the booster.",
      );
    }
  },

  async openBooster(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized("You must be logged in to open a booster.");
      }

      const { collection = "base", isPremium = false } = ctx.request.body;

      // 1. Fetch collection to check startDate
      const collections = await strapi.documents("api::collection.collection").findMany({
        filters: { code: collection }
      });
      const targetCollection = collections?.[0] as any;

      if (targetCollection?.startDate) {
        const openingDate = new Date(targetCollection.startDate);
        const now = new Date();
        if (now < openingDate) {
          return ctx.badRequest(`Cette collection ne peut être ouverte qu'à partir du ${openingDate.toLocaleString()}.`);
        }
      }

      // 1. Fetch user with wallet
      const userWithWallet = (await strapi.documents("plugin::users-permissions.user").findOne({
        documentId: user.documentId || (await strapi.documents("plugin::users-permissions.user").findMany({ filters: { id: user.id }, limit: 1 }).then(r => r[0]?.documentId)),
        populate: ["wallet"]
      })) as any;

      const wallet = userWithWallet?.wallet;
      if (!wallet) {
        return ctx.badRequest("Wallet not found.");
      }

      const currentBoosters = wallet.boosters || [];
      const boosterIndex = currentBoosters.findIndex(
        (b) => b.collection === collection && b.isPremium === isPremium,
      );

      if (boosterIndex === -1 || currentBoosters[boosterIndex].quantity <= 0) {
        return ctx.badRequest("Booster not found in wallet.");
      }

      // 2. Fetch game config
      const gameConfig = await strapi.documents("api::game-config.game-config").findFirst({}) as any;

      // 3. Fetch all available cards from collection
      const allCards = (await strapi.documents("api::card.card").findMany({
        filters: { collections: { code: collection } },
        populate: { image: true },
        limit: 1000,
      })) as any[];

      if (!allCards || allCards.length === 0) {
        // Fallback to all cards if no cards in the specified collection exist
        const anyCards = (await strapi.documents("api::card.card").findMany({
          populate: { image: true },
          limit: 1000,
        })) as any[];
        if (!anyCards || anyCards.length === 0) {
          return ctx.internalServerError("No cards available in the game.");
        }
        allCards.push(...anyCards);
      }

      // 4. Update wallet booster quantity
      currentBoosters[boosterIndex].quantity -= 1;
      if (currentBoosters[boosterIndex].quantity <= 0) {
        currentBoosters.splice(boosterIndex, 1);
      }

      await strapi.documents("api::wallet.wallet").update({
        documentId: wallet.documentId,
        data: {
          boosters: currentBoosters,
        },
      });

      // 5. Categorize cards by rarity
      const categorizeRarity = (card) => {
        const getVal = (v) => (v === "A" ? 10 : parseInt(v, 10) || 0);
        const sum =
          getVal(card.topValue) +
          getVal(card.rightValue) +
          getVal(card.bottomValue) +
          getVal(card.leftValue);

        if (sum < 20) return "common";
        if (sum < 26) return "uncommon";
        if (sum < 32) return "rare";
        if (sum < 36) return "epic";
        return "legendary";
      };

      const pools = {
        common: [],
        uncommon: [],
        rare: [],
        epic: [],
        legendary: [],
      };

      allCards.forEach((card) => {
        const rarity = categorizeRarity(card);
        pools[rarity].push(card);
      });

      // Probabilities (Premium packs could have better rates, but keeping it simple for now as requested)
      const probs = {
        common: gameConfig?.probCommon ?? 39,
        uncommon: gameConfig?.probUncommon ?? 30,
        rare: gameConfig?.probRare ?? 20,
        epic: gameConfig?.probEpic ?? 10,
        legendary: gameConfig?.probLegendary ?? 1,
      };

      const probPremium = gameConfig?.probPremium ?? 5;

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
      const strapiBaseUrl =
        process.env.STRAPI_BASE_URL || "http://localhost:1337";

      for (let i = 0; i < 5; i++) {
        const rand = Math.random() * 100;
        let selectedRarity = "common";

        if (rand < cumProbs.legendary) selectedRarity = "legendary";
        else if (rand < cumProbs.epic) selectedRarity = "epic";
        else if (rand < cumProbs.rare) selectedRarity = "rare";
        else if (rand < cumProbs.uncommon) selectedRarity = "uncommon";

        const card: any = getRandomCardFromPool(selectedRarity);
        const isDrawnPremium = isPremium
          ? true
          : Math.random() * 100 < probPremium;

        // Normalize image for frontend
        let imgUrl = card.image?.url
          ? `${strapiBaseUrl}${card.image.url}`
          : null;
        if (!imgUrl) {
          imgUrl = `https://api.dicebear.com/9.x/bottts/png?seed=${card.id * 42}&backgroundColor=transparent`;
        }

        drawnCards.push({
          ...card,
          img: imgUrl,
          drawnRarity: selectedRarity,
          isDrawnPremium: isDrawnPremium,
        });

        const cardKey = `${card.documentId || card.id}_${isDrawnPremium}`;
        userCardsToCreateOrUpdate[cardKey] =
          (userCardsToCreateOrUpdate[cardKey] || 0) + 1;
      }

      // 7. Add to user collection
      const existingUserCards: any[] = (await strapi.documents("api::user-card.user-card").findMany({
        filters: { user: { id: user.id } },
        populate: { card: true },
      })) as any[];

      for (const [cardKey, quantityToAdd] of Object.entries(
        userCardsToCreateOrUpdate,
      )) {
        const [cardIdStr, isPremiumStr] = cardKey.split("_");
        const isPStr = isPremiumStr === "true";

        const existingUserCard = existingUserCards.find(
          (uc) => uc.card && (uc.card.documentId === cardIdStr || String(uc.card.id) === cardIdStr) && !!uc.isPremium === isPStr,
        );

        if (existingUserCard) {
          await strapi.documents("api::user-card.user-card").update({
            documentId: existingUserCard.documentId,
            data: { quantity: existingUserCard.quantity + quantityToAdd },
          });
        } else {
          await strapi.documents("api::user-card.user-card").create({
            data: {
              user: { id: user.id },
              card: cardIdStr,
              quantity: quantityToAdd,
              isPremium: isPStr,
            },
          });
        }
      }

      // 8. Track event for quest (Server-side for security)
      try {
        await logPlayerEvent(strapi, {
          userId: user.id,
          eventType: "open_booster",
          value: 1,
        });
      } catch (trackErr) {
        console.error("Error tracking booster opening event:", trackErr);
      }

      return {
        message: "Booster opened successfully",
        cards: drawnCards,
        wallet: {
          coins: wallet.coins,
          gems: wallet.gems,
          dust: wallet.dust,
          boosters: currentBoosters,
        },
      };
    } catch (err) {
      console.error("Error opening booster:", err);
      return ctx.internalServerError(
        "An error occurred while opening the booster.",
      );
    }
  },
};
