import { factories } from "@strapi/strapi";
import { z } from "zod";

const claimTierSchema = z.object({
  requiredCount: z.coerce.number().int().positive(),
});

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getCardRarityName(c: any): string {
  const getVal = (v: any) => (v === "A" ? 10 : parseInt(v, 10) || 0);
  const sum =
    getVal(c.topValue) +
    getVal(c.rightValue) +
    getVal(c.bottomValue) +
    getVal(c.leftValue);

  if (sum < 20) return "Commun";
  if (sum < 26) return "Peu Commun";
  if (sum < 32) return "Rare";
  if (sum < 36) return "Épique";
  return "Légendaire";
}

export default factories.createCoreController(
  "api::weekly-quest-progress.weekly-quest-progress",
  ({ strapi }) => ({
    async getProgress(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");

      const service = strapi.service("api::weekly-quest-progress.weekly-quest-progress");
      const progress = await service.getProgress(user.id);
      return { data: progress };
    },

    async claimTier(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");

      const parsed = claimTierSchema.safeParse(ctx.request.body || {});
      if (!parsed.success) {
        return ctx.badRequest("requiredCount is required and must be a positive integer.");
      }

      const { requiredCount } = parsed.data;

      try {
        const config = (await strapi
          .documents("api::weekly-quest-config.weekly-quest-config")
          .findFirst({ populate: ["tiers"] })) as any;

        if (!config || !config.tiers) {
          return ctx.badRequest("Weekly quest configuration not found.");
        }

        const tier = config.tiers.find((t: any) => Number(t.requiredCount) === requiredCount);
        if (!tier) {
          return ctx.badRequest("Invalid tier.");
        }

        const service = strapi.service("api::weekly-quest-progress.weekly-quest-progress");
        const initialProgress = await service.getProgress(user.id);

        const userWallets = await strapi.documents("api::wallet.wallet").findMany({
          filters: { user: { id: user.id } },
          limit: 1,
        });
        const wallet = userWallets?.[0];

        // Pre-fetch candidate cards outside transaction lock if card reward is configured
        let candidateCards: any[] = [];
        if (tier.cardRarity && tier.cardRarity !== "None") {
          const allCards = (await strapi.documents("api::card.card").findMany({
            limit: 1000,
          })) as any[];
          candidateCards = allCards.filter((c) => getCardRarityName(c) === tier.cardRarity);
        }

        const txResult = await strapi.db.transaction(async ({ trx }) => {
          const lockedProgress = await trx("weekly_quest_progresses")
            .where("id", initialProgress.id)
            .forUpdate()
            .first();

          if (!lockedProgress) throw new HttpError(404, "Weekly progress not found.");

          const freshProgress = (await strapi
            .documents("api::weekly-quest-progress.weekly-quest-progress")
            .findOne({ documentId: initialProgress.documentId })) as any;

          if ((freshProgress?.completedCount || 0) < requiredCount) {
            throw new HttpError(400, "Tier requirements not met.");
          }

          const claimedTiers: number[] = Array.isArray(freshProgress?.claimedTiers)
            ? [...freshProgress.claimedTiers]
            : [];
          if (claimedTiers.includes(requiredCount)) {
            throw new HttpError(400, "Tier already claimed.");
          }

          claimedTiers.push(requiredCount);
          const updatedProgress = await strapi
            .documents("api::weekly-quest-progress.weekly-quest-progress")
            .update({
              documentId: initialProgress.documentId,
              data: { claimedTiers } as any,
            });

          if (wallet) {
            const lockedWallet = await trx("wallets").where("id", wallet.id).forUpdate().first();
            await strapi.documents("api::wallet.wallet").update({
              documentId: wallet.documentId,
              data: {
                coins: Number(lockedWallet?.coins || 0) + (tier.coins || 0),
                gems: Number(lockedWallet?.gems || 0) + (tier.gems || 0),
              },
            });
          }

          let grantedCard = null;
          if (candidateCards.length > 0) {
            const randomCard = candidateCards[Math.floor(Math.random() * candidateCards.length)];
            const existing = (await strapi.documents("api::user-card.user-card").findMany({
              filters: {
                user: { id: user.id },
                card: { id: randomCard.id },
                isPremium: false,
              },
              limit: 1,
            })) as any[];

            if (existing?.[0]) {
              await strapi.documents("api::user-card.user-card").update({
                documentId: existing[0].documentId,
                data: { quantity: existing[0].quantity + 1 },
              });
            } else {
              await strapi.documents("api::user-card.user-card").create({
                data: {
                  user: user.id,
                  card: randomCard.documentId || randomCard.id,
                  quantity: 1,
                  isPremium: false,
                } as any,
              });
            }
            grantedCard = randomCard;
          }

          return { updatedProgress, grantedCard };
        });

        return {
          success: true,
          reward: { coins: tier.coins, gems: tier.gems, card: txResult.grantedCard },
          progress: txResult.updatedProgress,
        };
      } catch (err: any) {
        if (err instanceof HttpError) return ctx.badRequest(err.message);
        strapi.log.error("Error claiming weekly tier:", err);
        return ctx.internalServerError("Failed to claim weekly tier.");
      }
    },
  }),
);
