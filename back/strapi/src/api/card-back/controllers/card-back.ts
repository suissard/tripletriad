import { factories } from "@strapi/strapi";
import { z } from "zod";

const buyBackSchema = z.object({
  backId: z.union([z.number().int().positive(), z.string().trim().min(1).max(64)]),
  currency: z.enum(["gems", "coins"]).default("gems"),
});

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export default factories.createCoreController("api::card-back.card-back", ({ strapi }: { strapi: any }) => ({
  async buy(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized("You must be logged in to buy a card back.");
      }

      const parsed = buyBackSchema.safeParse(ctx.request.body || {});
      if (!parsed.success) {
        return ctx.badRequest("Invalid request parameters.", parsed.error.flatten());
      }

      const { backId, currency } = parsed.data;
      const isNumeric = typeof backId === "number" || /^\d+$/.test(String(backId));
      const cardBack = isNumeric
        ? (await strapi.documents("api::card-back.card-back").findMany({
            filters: { id: Number(backId) },
            limit: 1,
          }))?.[0]
        : await strapi.documents("api::card-back.card-back").findOne({
            documentId: String(backId),
          });

      if (!cardBack) {
        return ctx.notFound("Card back not found.");
      }

      const cost =
        currency === "gems"
          ? Number((cardBack as any).priceGems ?? 250)
          : Number((cardBack as any).priceCoins ?? 2500);

      if (cost < 0 || !Number.isFinite(cost)) {
        return ctx.badRequest("Invalid item price.");
      }

      const [populatedUser, gameConfig] = await Promise.all([
        strapi.documents("plugin::users-permissions.user").findOne({
          documentId: user.documentId,
          populate: ["wallet", "unlockedCardBacks"],
        }) as Promise<any>,
        strapi.documents("api::game-config.game-config").findFirst({
          populate: ["defaultCardBack"],
        }) as Promise<any>,
      ]);

      const globalDefaultBack = gameConfig?.defaultCardBack;
      if (
        globalDefaultBack &&
        (cardBack.id === globalDefaultBack.id ||
          (cardBack as any).documentId === globalDefaultBack.documentId)
      ) {
        return ctx.badRequest("This card back is already available for free as the global default.");
      }

      const wallet = populatedUser?.wallet;
      if (!wallet) {
        return ctx.badRequest("Wallet not found.");
      }

      const txWallet = await strapi.db.transaction(async ({ trx }) => {
        const lockedWallet = await trx("wallets").where("id", wallet.id).forUpdate().first();
        if (!lockedWallet) throw new HttpError(400, "Wallet not found.");

        const freshUser = (await strapi.documents("plugin::users-permissions.user").findOne({
          documentId: user.documentId,
          populate: ["unlockedCardBacks"],
        })) as any;

        if (
          freshUser?.unlockedCardBacks?.some(
            (b: any) => b.id === cardBack.id || b.documentId === (cardBack as any).documentId,
          )
        ) {
          throw new HttpError(400, "You already own this card back.");
        }

        const currentBalance = Number(lockedWallet[currency] || 0);
        if (currentBalance < cost) {
          throw new HttpError(
            400,
            `Not enough ${currency} to buy this card back. Cost: ${cost} ${currency}. Current: ${currentBalance}`,
          );
        }

        const nextBalance = currentBalance - cost;
        await strapi.documents("api::wallet.wallet").update({
          documentId: wallet.documentId,
          data: { [currency]: nextBalance },
        });

        const currentBackIds = (freshUser?.unlockedCardBacks || []).map(
          (b: any) => b.documentId || b.id,
        );

        await strapi.documents("plugin::users-permissions.user").update({
          documentId: user.documentId,
          data: {
            unlockedCardBacks: [...currentBackIds, (cardBack as any).documentId || cardBack.id],
          } as any,
        });

        return {
          ...wallet,
          [currency]: nextBalance,
        };
      });

      return {
        success: true,
        message: "Card back purchased successfully.",
        wallet: txWallet,
      };
    } catch (err: any) {
      if (err instanceof HttpError) return ctx.badRequest(err.message);
      console.error("Error buying card back:", err);
      return ctx.internalServerError("An error occurred while buying the card back.");
    }
  },
}));
