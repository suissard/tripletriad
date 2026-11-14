import { factories } from "@strapi/strapi";
import { z } from "zod";
import { GameEngine } from "../../../shared/GameEngine";

const DEFAULT_CRAFTING_RATIOS: Record<string, { disenchant: number; craft: number }> = {
  common: { disenchant: 10, craft: 40 },
  uncommon: { disenchant: 20, craft: 80 },
  rare: { disenchant: 50, craft: 200 },
  epic: { disenchant: 100, craft: 400 },
  legendary: { disenchant: 400, craft: 1600 },
};

const cardActionSchema = z.object({
  cardId: z.union([z.number().int().positive(), z.string().trim().min(1).max(64)]),
  isPremium: z.boolean().optional().default(false),
});

const updateVariantSchema = z.object({
  variantIndex: z.number().int().min(0).max(50),
});

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getRarityFromCard(card: any): string {
  const cardLevel = GameEngine.calculateCardLevel({
    top: card.topValue,
    right: card.rightValue,
    bottom: card.bottomValue,
    left: card.leftValue,
  });
  if (cardLevel <= 2) return "common";
  if (cardLevel <= 4) return "uncommon";
  if (cardLevel <= 6) return "rare";
  if (cardLevel <= 8) return "epic";
  return "legendary";
}

async function resolveCard(strapi: any, cardId: string | number) {
  const isNumeric = typeof cardId === "number" || /^\d+$/.test(String(cardId));
  if (!isNumeric) {
    return strapi.documents("api::card.card").findOne({
      documentId: String(cardId),
    });
  }
  const cards = await strapi.documents("api::card.card").findMany({
    filters: { id: Number(cardId) },
    limit: 1,
  });
  return cards?.[0] || null;
}

async function ensureWalletRow(strapi: any, userId: number) {
  const wallets = await strapi.documents("api::wallet.wallet").findMany({
    filters: { user: { id: userId } },
    limit: 1,
  });
  if (wallets?.[0]) return wallets[0];
  return strapi.documents("api::wallet.wallet").create({
    data: { user: userId, coins: 0, gems: 0, dust: 0 },
  });
}

function sanitizePopulate(rawPopulate: unknown): any {
  const allowed = new Set([
    "card",
    "card.image",
    "card.faction",
    "card.skills",
    "card.collections",
    "card.variants",
  ]);
  if (Array.isArray(rawPopulate)) {
    const filtered = rawPopulate.filter((p) => typeof p === "string" && allowed.has(p));
    return filtered.length > 0 ? filtered : ["card"];
  }
  if (typeof rawPopulate === "string") {
    if (rawPopulate === "*") return ["card", "card.image", "card.faction", "card.skills", "card.variants"];
    if (allowed.has(rawPopulate)) return [rawPopulate];
  }
  return ["card"];
}

export default factories.createCoreController(
  "api::user-card.user-card",
  ({ strapi }: { strapi: any }) => ({
    async find(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");

      const { query } = ctx as any;
      const page = Math.max(1, parseInt(query.pagination?.page, 10) || 1);
      const pageSize = Math.min(500, Math.max(1, parseInt(query.pagination?.pageSize, 10) || 100));

      const filters = {
        user: { id: user.id },
      };

      const [results, total] = await Promise.all([
        strapi.documents("api::user-card.user-card").findMany({
          filters,
          populate: sanitizePopulate(query.populate),
          sort: query.sort,
          page,
          pageSize,
        }),
        strapi.documents("api::user-card.user-card").count({ filters }),
      ]);

      return {
        data: results,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: Math.max(1, Math.ceil(total / pageSize)),
            total,
          },
        },
      };
    },

    async disenchant(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized("You must be logged in.");

        const parsed = cardActionSchema.safeParse(ctx.request.body || {});
        if (!parsed.success) {
          return ctx.badRequest("cardId is required.", parsed.error.flatten());
        }

        const { cardId, isPremium } = parsed.data;
        const [gameConfig, card] = await Promise.all([
          strapi.documents("api::game-config.game-config").findFirst({}),
          resolveCard(strapi, cardId),
        ]);

        if (!card) return ctx.notFound("Card not found.");

        const craftingRatios = gameConfig?.craftingRatios || DEFAULT_CRAFTING_RATIOS;
        const rarity = getRarityFromCard(card);
        const dustGained = craftingRatios[rarity]?.disenchant || 10;

        const baseWallet = await ensureWalletRow(strapi, user.id);

        const result = await strapi.db.transaction(async ({ trx }) => {
          const lockedWallet = await trx("wallets").where("id", baseWallet.id).forUpdate().first();
          if (!lockedWallet) throw new HttpError(400, "Wallet not found.");

          const userCards = await strapi.documents("api::user-card.user-card").findMany({
            filters: {
              user: { id: user.id },
              card: { id: card.id },
              isPremium: Boolean(isPremium),
            },
            limit: 1,
          });

          const userCard = userCards?.[0];
          if (!userCard || userCard.quantity <= 0) {
            throw new HttpError(400, "You do not own this card.");
          }

          const updatedQuantity = userCard.quantity - 1;
          if (updatedQuantity === 0) {
            await strapi.documents("api::user-card.user-card").delete({
              documentId: userCard.documentId,
            });
          } else {
            await strapi.documents("api::user-card.user-card").update({
              documentId: userCard.documentId,
              data: { quantity: updatedQuantity },
            });
          }

          const newDust = Number(lockedWallet.dust || 0) + dustGained;
          await strapi.documents("api::wallet.wallet").update({
            documentId: baseWallet.documentId,
            data: { dust: newDust },
          });

          return { newDust, updatedQuantity };
        });

        return ctx.send({
          message: "Disenchanted successfully",
          dustGained,
          newDustTotal: result.newDust,
          newQuantity: result.updatedQuantity,
        });
      } catch (err: any) {
        if (err instanceof HttpError) return ctx.badRequest(err.message);
        console.error(err);
        return ctx.internalServerError("An error occurred during disenchanting.");
      }
    },

    async craft(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized("You must be logged in.");

        const parsed = cardActionSchema.safeParse(ctx.request.body || {});
        if (!parsed.success) {
          return ctx.badRequest("cardId is required.", parsed.error.flatten());
        }

        const { cardId, isPremium } = parsed.data;
        const [gameConfig, card] = await Promise.all([
          strapi.documents("api::game-config.game-config").findFirst({}),
          resolveCard(strapi, cardId),
        ]);

        if (!card) return ctx.notFound("Card not found.");

        const craftingRatios = gameConfig?.craftingRatios || DEFAULT_CRAFTING_RATIOS;
        const rarity = getRarityFromCard(card);
        const dustCost = craftingRatios[rarity]?.craft || 40;

        const baseWallet = await ensureWalletRow(strapi, user.id);

        const result = await strapi.db.transaction(async ({ trx }) => {
          const lockedWallet = await trx("wallets").where("id", baseWallet.id).forUpdate().first();
          if (!lockedWallet) throw new HttpError(400, "Wallet not found.");

          const currentDust = Number(lockedWallet.dust || 0);
          if (currentDust < dustCost) {
            throw new HttpError(400, "Not enough dust.");
          }

          const newDust = currentDust - dustCost;
          await strapi.documents("api::wallet.wallet").update({
            documentId: baseWallet.documentId,
            data: { dust: newDust },
          });

          const userCards = await strapi.documents("api::user-card.user-card").findMany({
            filters: {
              user: { id: user.id },
              card: { id: card.id },
              isPremium: Boolean(isPremium),
            },
            limit: 1,
          });

          let updatedQuantity = 1;
          const userCard = userCards?.[0];
          if (!userCard) {
            await strapi.documents("api::user-card.user-card").create({
              data: {
                user: user.id,
                card: card.documentId || card.id,
                quantity: 1,
                isPremium: Boolean(isPremium),
              } as any,
            });
          } else {
            updatedQuantity = userCard.quantity + 1;
            await strapi.documents("api::user-card.user-card").update({
              documentId: userCard.documentId,
              data: { quantity: updatedQuantity },
            });
          }

          return { newDust, updatedQuantity };
        });

        return ctx.send({
          message: "Crafted successfully",
          dustCost,
          newDustTotal: result.newDust,
          newQuantity: result.updatedQuantity,
        });
      } catch (err: any) {
        if (err instanceof HttpError) return ctx.badRequest(err.message);
        console.error(err);
        return ctx.internalServerError("An error occurred during crafting.");
      }
    },

    async massDisenchant(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized("You must be logged in.");

        const gameConfig = await strapi.documents("api::game-config.game-config").findFirst({});
        const playableLimit = gameConfig?.playableLimit || 2;
        const craftingRatios = gameConfig?.craftingRatios || DEFAULT_CRAFTING_RATIOS;

        const baseWallet = await ensureWalletRow(strapi, user.id);

        const txResult = await strapi.db.transaction(async ({ trx }) => {
          const lockedWallet = await trx("wallets").where("id", baseWallet.id).forUpdate().first();
          if (!lockedWallet) throw new HttpError(400, "Wallet not found.");

          const userCards = await strapi.documents("api::user-card.user-card").findMany({
            filters: { user: { id: user.id }, quantity: { $gt: playableLimit } },
            populate: ["card"],
            limit: 1000,
          });

          if (!userCards || userCards.length === 0) {
            return { totalDustGained: 0, cardsDestroyed: 0, newDust: Number(lockedWallet.dust || 0) };
          }

          let totalDustGained = 0;
          let cardsDestroyed = 0;
          const updates: Promise<any>[] = [];

          for (const userCard of userCards as any[]) {
            const surplusQuantity = userCard.quantity - playableLimit;
            if (surplusQuantity <= 0 || !userCard.card) continue;

            const rarity = getRarityFromCard(userCard.card);
            const dustPerCard = craftingRatios[rarity]?.disenchant || 10;

            totalDustGained += dustPerCard * surplusQuantity;
            cardsDestroyed += surplusQuantity;

            updates.push(
              strapi.documents("api::user-card.user-card").update({
                documentId: userCard.documentId,
                data: { quantity: playableLimit },
              }),
            );
          }

          await Promise.all(updates);

          const newDust = Number(lockedWallet.dust || 0) + totalDustGained;
          await strapi.documents("api::wallet.wallet").update({
            documentId: baseWallet.documentId,
            data: { dust: newDust },
          });

          return { totalDustGained, cardsDestroyed, newDust };
        });

        return ctx.send({
          message: txResult.cardsDestroyed > 0 ? "Mass disenchant successful" : "No surplus cards to disenchant",
          totalDustGained: txResult.totalDustGained,
          newDustTotal: txResult.newDust,
          cardsDestroyed: txResult.cardsDestroyed,
          totalCardsDisenchanted: txResult.cardsDestroyed,
        });
      } catch (err: any) {
        if (err instanceof HttpError) return ctx.badRequest(err.message);
        console.error(err);
        return ctx.internalServerError("An error occurred during mass disenchanting.");
      }
    },

    async updateVariant(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized("You must be logged in.");

        const { id } = ctx.params;
        const parsed = updateVariantSchema.safeParse(ctx.request.body || {});
        if (!parsed.success) {
          return ctx.badRequest("variantIndex must be a non-negative integer.", parsed.error.flatten());
        }

        const { variantIndex } = parsed.data;
        const userCards = await strapi.documents("api::user-card.user-card").findMany({
          filters: { documentId: id, user: { id: user.id } },
          populate: ["card.variants"],
          limit: 1,
        });

        const userCard = userCards?.[0] as any;
        if (!userCard) {
          return ctx.notFound("User card not found or does not belong to you.");
        }

        const variantsCount = Array.isArray(userCard.card?.variants) ? userCard.card.variants.length : 0;
        if (variantIndex > 0 && variantsCount > 0 && variantIndex >= variantsCount) {
          return ctx.badRequest("Variant index out of bounds.");
        }

        const updatedUserCard = await strapi.documents("api::user-card.user-card").update({
          documentId: userCard.documentId,
          data: { selectedVariantIndex: variantIndex },
        });

        return ctx.send({
          message: "Variant updated successfully",
          selectedVariantIndex: (updatedUserCard as any).selectedVariantIndex,
        });
      } catch (err) {
        console.error("[updateVariant] Error:", err);
        return ctx.internalServerError("An error occurred while updating the variant.");
      }
    },
  }),
);
