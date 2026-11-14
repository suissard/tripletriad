import { factories } from "@strapi/strapi";
import { z } from "zod";

const buyFrameSchema = z.object({
  frameId: z.union([z.number().int().positive(), z.string().trim().min(1).max(64)]),
  currency: z.enum(["gems", "coins"]).default("gems"),
});

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export default factories.createCoreController("api::card-frame.card-frame", ({ strapi }) => ({
  async buy(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized("You must be logged in to buy a frame.");
      }

      const parsed = buyFrameSchema.safeParse(ctx.request.body || {});
      if (!parsed.success) {
        return ctx.badRequest("Invalid request parameters.", parsed.error.flatten());
      }

      const { frameId, currency } = parsed.data;
      const isNumeric = typeof frameId === "number" || /^\d+$/.test(String(frameId));
      const frame = isNumeric
        ? (await strapi.documents("api::card-frame.card-frame").findMany({
            filters: { id: Number(frameId) },
            limit: 1,
          }))?.[0]
        : await strapi.documents("api::card-frame.card-frame").findOne({
            documentId: String(frameId),
          });

      if (!frame) {
        return ctx.notFound("Frame not found.");
      }

      const cost =
        currency === "gems"
          ? Number((frame as any).priceGems ?? 250)
          : Number((frame as any).priceCoins ?? 2500);

      if (cost < 0 || !Number.isFinite(cost)) {
        return ctx.badRequest("Invalid item price.");
      }

      const [populatedUser, gameConfig] = await Promise.all([
        strapi.documents("plugin::users-permissions.user").findOne({
          documentId: user.documentId,
          populate: ["wallet", "unlockedCardFrames"],
        }) as Promise<any>,
        strapi.documents("api::game-config.game-config").findFirst({
          populate: ["defaultCardFrame"],
        }) as Promise<any>,
      ]);

      const globalDefaultFrame = gameConfig?.defaultCardFrame;
      if (
        globalDefaultFrame &&
        (frame.id === globalDefaultFrame.id || (frame as any).documentId === globalDefaultFrame.documentId)
      ) {
        return ctx.badRequest("This frame is already available for free as the global default.");
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
          populate: ["unlockedCardFrames"],
        })) as any;

        if (
          freshUser?.unlockedCardFrames?.some(
            (f: any) => f.id === frame.id || f.documentId === (frame as any).documentId,
          )
        ) {
          throw new HttpError(400, "You already own this frame.");
        }

        const currentBalance = Number(lockedWallet[currency] || 0);
        if (currentBalance < cost) {
          throw new HttpError(400, `Not enough ${currency} to buy this frame. Cost: ${cost} ${currency}.`);
        }

        const nextBalance = currentBalance - cost;
        await strapi.documents("api::wallet.wallet").update({
          documentId: wallet.documentId,
          data: { [currency]: nextBalance },
        });

        const currentFrameIds = (freshUser?.unlockedCardFrames || []).map(
          (f: any) => f.documentId || f.id,
        );

        await strapi.documents("plugin::users-permissions.user").update({
          documentId: user.documentId,
          data: {
            unlockedCardFrames: [...currentFrameIds, (frame as any).documentId || frame.id],
          } as any,
        });

        return {
          ...wallet,
          [currency]: nextBalance,
        };
      });

      return {
        success: true,
        message: "Frame purchased successfully.",
        wallet: txWallet,
      };
    } catch (err: any) {
      if (err instanceof HttpError) return ctx.badRequest(err.message);
      console.error("Error buying frame:", err);
      return ctx.internalServerError("An error occurred while buying the frame.");
    }
  },
}));
