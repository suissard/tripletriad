import { z } from "zod";
import { logPlayerEvent } from "../../player-event-log/services/event-logger";

const buyBoosterSchema = z.object({
  type: z.enum(["classic", "premium"]).default("classic"),
  collection: z.string().trim().min(1).max(64).default("base"),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
});

const openBoosterSchema = z.object({
  collection: z.string().trim().min(1).max(64).default("base"),
  isPremium: z.boolean().default(false),
});

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function resolveUserDocumentId(strapi: any, user: any): Promise<string | null> {
  if (user.documentId) return user.documentId;
  const rows = await strapi.documents("plugin::users-permissions.user").findMany({
    filters: { id: user.id },
    limit: 1,
  });
  return rows?.[0]?.documentId || null;
}

export default {
  async buyBooster(ctx: any) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized("You must be logged in to buy a booster.");
      }

      const parsed = buyBoosterSchema.safeParse(ctx.request.body || {});
      if (!parsed.success) {
        return ctx.badRequest("Invalid booster purchase request.", parsed.error.flatten());
      }

      const { type, collection, quantity } = parsed.data;
      const isPremium = type === "premium";

      const [gameConfig, collections, userDocId] = await Promise.all([
        strapi.documents("api::game-config.game-config").findFirst({}) as Promise<any>,
        strapi.documents("api::collection.collection").findMany({
          filters: { code: collection },
          limit: 1,
        }),
        resolveUserDocumentId(strapi, user),
      ]);

      const targetCollection = collections?.[0] as any;
      if (!targetCollection || targetCollection.isActive === false) {
        return ctx.badRequest("This collection is not currently active for purchase.");
      }

      const classicBaseCost = gameConfig?.defaultBoosterCost ?? 100;
      const premiumBaseCost = gameConfig?.defaultPremiumBoosterCost ?? 50;
      const multiplier = isPremium
        ? (targetCollection?.premiumBoosterCostMultiplier ?? 1.0)
        : (targetCollection?.boosterCostMultiplier ?? 1.0);

      const UNIT_COST = Math.max(0, Math.floor((isPremium ? premiumBaseCost : classicBaseCost) * multiplier));
      const COST = UNIT_COST * quantity;
      const currency = isPremium ? "gems" : "coins";

      if (!userDocId) {
        return ctx.badRequest("User record not found.");
      }

      const userWithWallet = (await strapi.documents("plugin::users-permissions.user").findOne({
        documentId: userDocId,
        populate: ["wallet"],
      })) as any;

      const initialWallet = userWithWallet?.wallet;
      if (!initialWallet) {
        return ctx.badRequest("Wallet not found.");
      }

      const updatedResult = await strapi.db.transaction(async ({ trx }) => {
        const lockedRow = await trx("wallets").where("id", initialWallet.id).forUpdate().first();
        if (!lockedRow) {
          throw new HttpError(400, "Wallet not found.");
        }

        const currentBalance = Number(lockedRow[currency] || 0);
        if (currentBalance < COST) {
          throw new HttpError(
            400,
            `Not enough ${currency} to buy ${quantity} ${type} booster(s). Final cost: ${COST} ${currency}.`,
          );
        }

        const freshWallet = (await strapi.documents("api::wallet.wallet").findOne({
          documentId: initialWallet.documentId,
        })) as any;

        const currentBoosters = Array.isArray(freshWallet?.boosters)
          ? freshWallet.boosters.map((b: any) => ({ ...b }))
          : [];

        const boosterIndex = currentBoosters.findIndex(
          (b: any) => b.collection === collection && Boolean(b.isPremium) === isPremium,
        );

        if (boosterIndex !== -1) {
          currentBoosters[boosterIndex].quantity += quantity;
        } else {
          currentBoosters.push({ collection, isPremium, quantity });
        }

        const nextBalance = currentBalance - COST;
        await strapi.documents("api::wallet.wallet").update({
          documentId: initialWallet.documentId,
          data: {
            [currency]: nextBalance,
            boosters: currentBoosters,
          } as any,
        });

        return {
          coins: currency === "coins" ? nextBalance : Number(lockedRow.coins || 0),
          gems: currency === "gems" ? nextBalance : Number(lockedRow.gems || 0),
          dust: Number(lockedRow.dust || 0),
          boosters: currentBoosters,
        };
      });

      return {
        message: "Booster added to wallet successfully",
        wallet: updatedResult,
      };
    } catch (err: any) {
      if (err instanceof HttpError) {
        return ctx.badRequest(err.message);
      }
      console.error("Error buying booster:", err);
      return ctx.internalServerError("An error occurred while buying the booster.");
    }
  },

  async openBooster(ctx: any) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized("You must be logged in to open a booster.");
      }

      const parsed = openBoosterSchema.safeParse(ctx.request.body || {});
      if (!parsed.success) {
        return ctx.badRequest("Invalid open booster request.", parsed.error.flatten());
      }

      const { collection, isPremium } = parsed.data;

      const [collections, gameConfig, userDocId] = await Promise.all([
        strapi.documents("api::collection.collection").findMany({
          filters: { code: collection },
          limit: 1,
        }),
        strapi.documents("api::game-config.game-config").findFirst({}) as Promise<any>,
        resolveUserDocumentId(strapi, user),
      ]);

      const targetCollection = collections?.[0] as any;
      if (targetCollection?.startDate) {
        const openingDate = new Date(targetCollection.startDate);
        if (new Date() < openingDate) {
          return ctx.badRequest(
            `Cette collection ne peut être ouverte qu'à partir du ${openingDate.toLocaleString()}.`,
          );
        }
      }

      if (!userDocId) {
        return ctx.badRequest("User record not found.");
      }

      const userWithWallet = (await strapi.documents("plugin::users-permissions.user").findOne({
        documentId: userDocId,
        populate: ["wallet"],
      })) as any;

      const initialWallet = userWithWallet?.wallet;
      if (!initialWallet) {
        return ctx.badRequest("Wallet not found.");
      }

      // Fetch card pool outside row lock
      let allCards = (await strapi.documents("api::card.card").findMany({
        filters: { collections: { code: collection } },
        populate: { image: true },
        limit: 1000,
      })) as any[];

      if (!allCards || allCards.length === 0) {
        allCards = (await strapi.documents("api::card.card").findMany({
          populate: { image: true },
          limit: 1000,
        })) as any[];
        if (!allCards || allCards.length === 0) {
          return ctx.internalServerError("No cards available in the game.");
        }
      }

      const categorizeRarity = (card: any) => {
        const getVal = (v: any) => (v === "A" ? 10 : parseInt(v, 10) || 0);
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

      const pools: Record<string, any[]> = {
        common: [],
        uncommon: [],
        rare: [],
        epic: [],
        legendary: [],
      };
      allCards.forEach((card) => {
        pools[categorizeRarity(card)].push(card);
      });

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

      const getRandomCardFromPool = (poolName: string) => {
        let pool = pools[poolName];
        if (!pool || pool.length === 0) pool = allCards;
        return pool[Math.floor(Math.random() * pool.length)];
      };

      const strapiBaseUrl = process.env.STRAPI_BASE_URL || "http://localhost:1337";

      const txResult = await strapi.db.transaction(async ({ trx }) => {
        const lockedRow = await trx("wallets").where("id", initialWallet.id).forUpdate().first();
        if (!lockedRow) {
          throw new HttpError(400, "Wallet not found.");
        }

        const freshWallet = (await strapi.documents("api::wallet.wallet").findOne({
          documentId: initialWallet.documentId,
        })) as any;

        const currentBoosters = Array.isArray(freshWallet?.boosters)
          ? freshWallet.boosters.map((b: any) => ({ ...b }))
          : [];
        const boosterIndex = currentBoosters.findIndex(
          (b: any) => b.collection === collection && Boolean(b.isPremium) === isPremium,
        );

        if (boosterIndex === -1 || currentBoosters[boosterIndex].quantity <= 0) {
          throw new HttpError(400, "Booster not found in wallet.");
        }

        currentBoosters[boosterIndex].quantity -= 1;
        if (currentBoosters[boosterIndex].quantity <= 0) {
          currentBoosters.splice(boosterIndex, 1);
        }

        await strapi.documents("api::wallet.wallet").update({
          documentId: initialWallet.documentId,
          data: { boosters: currentBoosters } as any,
        });

        const drawnCards: any[] = [];
        const userCardsToCreateOrUpdate: Record<string, { card: any; isPremium: boolean; count: number }> = {};

        for (let i = 0; i < 5; i++) {
          const rand = Math.random() * 100;
          let selectedRarity = "common";
          if (rand < cumProbs.legendary) selectedRarity = "legendary";
          else if (rand < cumProbs.epic) selectedRarity = "epic";
          else if (rand < cumProbs.rare) selectedRarity = "rare";
          else if (rand < cumProbs.uncommon) selectedRarity = "uncommon";

          const card = getRandomCardFromPool(selectedRarity);
          const isDrawnPremium = isPremium ? true : Math.random() * 100 < probPremium;

          const imgUrl = card.image?.url
            ? `${strapiBaseUrl}${card.image.url}`
            : `https://api.dicebear.com/9.x/bottts/png?seed=${card.id * 42}&backgroundColor=transparent`;

          drawnCards.push({
            ...card,
            img: imgUrl,
            drawnRarity: selectedRarity,
            isDrawnPremium,
          });

          const cardKey = `${card.documentId || card.id}_${isDrawnPremium}`;
          if (!userCardsToCreateOrUpdate[cardKey]) {
            userCardsToCreateOrUpdate[cardKey] = { card, isPremium: isDrawnPremium, count: 0 };
          }
          userCardsToCreateOrUpdate[cardKey].count += 1;
        }

        const drawnCardIds = Array.from(new Set(drawnCards.map((c) => c.id)));
        const existingUserCards: any[] = (await strapi.documents("api::user-card.user-card").findMany({
          filters: {
            user: { id: user.id },
            card: { id: { $in: drawnCardIds } },
          },
          populate: { card: true },
          limit: drawnCardIds.length * 2,
        })) as any[];

        for (const entry of Object.values(userCardsToCreateOrUpdate)) {
          const existingUserCard = existingUserCards.find(
            (uc) =>
              uc.card &&
              (uc.card.documentId === entry.card.documentId || uc.card.id === entry.card.id) &&
              Boolean(uc.isPremium) === entry.isPremium,
          );

          if (existingUserCard) {
            await strapi.documents("api::user-card.user-card").update({
              documentId: existingUserCard.documentId,
              data: { quantity: existingUserCard.quantity + entry.count },
            });
          } else {
            await strapi.documents("api::user-card.user-card").create({
              data: {
                user: { id: user.id },
                card: entry.card.documentId || entry.card.id,
                quantity: entry.count,
                isPremium: entry.isPremium,
              } as any,
            });
          }
        }

        return {
          cards: drawnCards,
          wallet: {
            coins: freshWallet.coins,
            gems: freshWallet.gems,
            dust: freshWallet.dust,
            boosters: currentBoosters,
          },
        };
      });

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
        cards: txResult.cards,
        wallet: txResult.wallet,
      };
    } catch (err: any) {
      if (err instanceof HttpError) {
        return ctx.badRequest(err.message);
      }
      console.error("Error opening booster:", err);
      return ctx.internalServerError("An error occurred while opening the booster.");
    }
  },
};
