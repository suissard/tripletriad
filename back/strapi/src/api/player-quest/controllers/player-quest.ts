/**
 * player-quest controller
 */

import { factories } from "@strapi/strapi";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export default factories.createCoreController(
  "api::player-quest.player-quest",
  ({ strapi }: { strapi: any }) => ({
    async find(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");

      const result = await strapi.documents("api::player-quest.player-quest").findMany({
        filters: { user: { id: user.id } },
        populate: ["quest_template"],
        limit: 100,
      });

      return { data: result };
    },

    async claimReward(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");

      const { id } = ctx.params;

      try {
        const playerQuest = (await strapi.documents("api::player-quest.player-quest").findOne({
          documentId: id,
          populate: ["quest_template", "user"],
        })) as any;

        if (!playerQuest) {
          return ctx.notFound("Quest not found.");
        }

        if (playerQuest.user?.id !== user.id) {
          return ctx.forbidden("This is not your quest.");
        }

        const template = playerQuest.quest_template;
        if (!template) {
          return ctx.badRequest("Quest template not found.");
        }

        const userWallets = await strapi.documents("api::wallet.wallet").findMany({
          filters: { user: { id: user.id } },
          limit: 1,
        });
        const wallet = userWallets?.[0];

        const updatedQuest = await strapi.db.transaction(async ({ trx }) => {
          const lockedQuest = await trx("player_quests").where("id", playerQuest.id).forUpdate().first();
          if (!lockedQuest) throw new HttpError(404, "Quest not found.");
          if (lockedQuest.status !== "completed") {
            throw new HttpError(400, "Quest is not completed.");
          }
          if (lockedQuest.reward_claimed) {
            throw new HttpError(400, "Reward already claimed.");
          }

          // Mark as claimed first inside transaction
          const updated = await strapi.documents("api::player-quest.player-quest").update({
            documentId: id,
            data: { rewardClaimed: true },
            populate: ["quest_template"],
          });

          if (wallet) {
            const lockedWallet = await trx("wallets").where("id", wallet.id).forUpdate().first();
            await strapi.documents("api::wallet.wallet").update({
              documentId: wallet.documentId,
              data: {
                coins: Number(lockedWallet?.coins || 0) + (template.rewardCoins || 0),
                gems: Number(lockedWallet?.gems || 0) + (template.rewardGems || 0),
              },
            });
          }

          return updated;
        });

        if (template.type === "daily") {
          try {
            const weeklyService = strapi.service(
              "api::weekly-quest-progress.weekly-quest-progress",
            );
            if (weeklyService && weeklyService.incrementProgress) {
              await weeklyService.incrementProgress(user.id);
            }
          } catch (err) {
            strapi.log.error("Error incrementing weekly quest progress", err);
          }
        }

        return {
          success: true,
          reward: {
            coins: template.rewardCoins || 0,
            gems: template.rewardGems || 0,
          },
          playerQuest: updatedQuest,
        };
      } catch (err: any) {
        if (err instanceof HttpError) {
          if (err.status === 404) return ctx.notFound(err.message);
          return ctx.badRequest(err.message);
        }
        strapi.log.error("Error claiming quest reward:", err);
        return ctx.internalServerError("Failed to claim quest reward.");
      }
    },
  }),
);
