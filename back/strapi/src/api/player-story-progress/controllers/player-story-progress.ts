import { factories } from "@strapi/strapi";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isAdminUser(user: any): boolean {
  return user?.role?.type === "admin" || user?.role?.name === "Admin";
}

function buildStoryFilter(storyId: string | number) {
  const isNum = typeof storyId === "number" || /^\d+$/.test(String(storyId));
  return isNum
    ? { $or: [{ id: Number(storyId) }, { documentId: String(storyId) }] }
    : { documentId: String(storyId) };
}

export default factories.createCoreController(
  "api::player-story-progress.player-story-progress",
  ({ strapi }) => ({
    async find(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");

      const isAdmin = isAdminUser(user);
      const query = { ...ctx.query } as any;
      if (query.pagination) {
        if (query.pagination.page) query.page = Math.max(1, parseInt(query.pagination.page, 10) || 1);
        if (query.pagination.pageSize) {
          query.pageSize = Math.min(200, Math.max(1, parseInt(query.pagination.pageSize, 10) || 25));
        }
      }

      query.filters = { ...(query.filters || {}) };
      if (!isAdmin) {
        query.filters.user = { id: user.id };
      }

      const results = await strapi
        .documents("api::player-story-progress.player-story-progress")
        .findMany(query);

      if (results && "data" in (results as any)) {
        return results;
      }
      return { data: results };
    },

    async findOne(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");

      const { id } = ctx.params;
      const progress = (await strapi
        .documents("api::player-story-progress.player-story-progress")
        .findOne({
          documentId: id,
          populate: ["user", "story", "currentStep"],
        })) as any;

      if (!progress) return ctx.notFound("Progress not found.");
      if (!isAdminUser(user) && progress.user?.id !== user.id) {
        return ctx.forbidden("Accès refusé à cette progression.");
      }

      return { data: progress };
    },

    async claimStepReward(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");
      const userId = user.id;

      const { storyId, stepId, situationId } = ctx.request.body || {};
      if (!storyId || !stepId) {
        return ctx.badRequest("storyId and stepId are required");
      }

      const stories = (await strapi.documents("api::story.story").findMany({
        filters: buildStoryFilter(storyId),
        populate: {
          steps: {
            populate: {
              situations: {
                on: {
                  "story.situation-reward": {
                    populate: { rewardCards: { populate: ["image"] } },
                  },
                },
              },
            },
          },
        } as any,
        limit: 1,
      })) as any[];

      const story = stories?.[0];
      if (!story) return ctx.notFound("Story not found");

      const step = (story.steps || []).find(
        (s: any) => String(s.id) === String(stepId) || String(s.documentId) === String(stepId),
      );
      if (!step) return ctx.notFound("Step not found in this story");

      const progresses = (await strapi
        .documents("api::player-story-progress.player-story-progress")
        .findMany({
          filters: {
            user: { id: userId },
            story: buildStoryFilter(storyId),
          },
          limit: 1,
        })) as any[];

      const initialProgress = progresses?.[0];
      if (!initialProgress) {
        return ctx.badRequest(`Story progress not found for claim. StoryId: ${storyId}`);
      }

      try {
        if (!situationId) {
          const updatedProgress = await strapi.db.transaction(async ({ trx }) => {
            await trx("player_story_progresses").where("id", initialProgress.id).forUpdate().first();
            const fresh = (await strapi
              .documents("api::player-story-progress.player-story-progress")
              .findOne({ documentId: initialProgress.documentId })) as any;

            const completedSteps = Array.isArray(fresh?.completedSteps) ? [...fresh.completedSteps] : [];
            const isStepAlreadyCompleted = completedSteps.some(
              (id: any) =>
                String(id) === String(stepId) ||
                String(id) === String(step.id) ||
                String(id) === String(step.documentId),
            );
            if (isStepAlreadyCompleted) {
              throw new HttpError(400, "Step already completed");
            }

            const updatedSteps = [...completedSteps, stepId];
            const newStatus =
              updatedSteps.length >= (story.steps || []).length ? "completed" : fresh.progressStatus;

            return strapi.documents("api::player-story-progress.player-story-progress").update({
              documentId: initialProgress.documentId,
              data: {
                completedSteps: updatedSteps,
                progressStatus: newStatus,
                currentStep: null,
                currentSituationId: null,
                stepHistory: [],
              } as any,
            });
          });

          return { progress: updatedProgress };
        }

        const rewardSituation = (step.situations || []).find(
          (s: any) => s.situationId === situationId && s.__component === "story.situation-reward",
        );
        if (!rewardSituation) {
          return ctx.badRequest("Reward situation not found");
        }

        const rewardKey = `${step.documentId || step.id}:${situationId}`;

        // Ensure wallet exists before lock
        const existingWallets = (await strapi.documents("api::wallet.wallet").findMany({
          filters: { user: { id: userId } },
          limit: 1,
        })) as any[];
        const wallet =
          existingWallets?.[0] ||
          (await strapi.documents("api::wallet.wallet").create({
            data: { user: userId, coins: 100, gems: 0, dust: 0 },
          }));

        const txResult = await strapi.db.transaction(async ({ trx }) => {
          await trx("player_story_progresses").where("id", initialProgress.id).forUpdate().first();
          const lockedWallet = await trx("wallets").where("id", wallet.id).forUpdate().first();

          const fresh = (await strapi
            .documents("api::player-story-progress.player-story-progress")
            .findOne({ documentId: initialProgress.documentId })) as any;

          const stepHistory = Array.isArray(fresh?.stepHistory) ? [...fresh.stepHistory] : [];
          const claimedRewards: string[] = Array.isArray(fresh?.claimedRewards)
            ? [...fresh.claimedRewards]
            : [];

          const alreadyClaimed =
            claimedRewards.includes(rewardKey) ||
            stepHistory.some((h: any) => h.situationId === situationId && h.action === "claim_reward");
          if (alreadyClaimed) {
            throw new HttpError(400, "Reward already claimed");
          }

          const stepRewardCards = rewardSituation.rewardCards || [];
          const rewardCoins = Number(rewardSituation.rewardCoins || 0);

          let rewardedCard = null;
          let coinsRewarded = 0;

          if (rewardCoins > 0) {
            await strapi.documents("api::wallet.wallet").update({
              documentId: wallet.documentId,
              data: { coins: Number(lockedWallet?.coins || 0) + rewardCoins },
            });
            coinsRewarded = rewardCoins;
          }

          if (stepRewardCards.length > 0) {
            const randomCard = stepRewardCards[Math.floor(Math.random() * stepRewardCards.length)];
            const existingUserCards = (await strapi.documents("api::user-card.user-card").findMany({
              filters: { user: { id: userId }, card: { id: randomCard.id }, isPremium: false },
              limit: 1,
            })) as any[];

            if (existingUserCards.length > 0) {
              await strapi.documents("api::user-card.user-card").update({
                documentId: existingUserCards[0].documentId,
                data: { quantity: existingUserCards[0].quantity + 1 },
              });
            } else {
              await strapi.documents("api::user-card.user-card").create({
                data: {
                  user: userId,
                  card: randomCard.documentId || randomCard.id,
                  quantity: 1,
                  isPremium: false,
                } as any,
              });
            }
            rewardedCard = randomCard;
          }

          stepHistory.push({
            situationId,
            action: "claim_reward",
            timestamp: new Date().toISOString(),
          });
          claimedRewards.push(rewardKey);

          const updatedProgress = await strapi
            .documents("api::player-story-progress.player-story-progress")
            .update({
              documentId: initialProgress.documentId,
              data: { stepHistory, claimedRewards } as any,
            });

          return { updatedProgress, rewardedCard, coinsRewarded };
        });

        return {
          progress: txResult.updatedProgress,
          reward: txResult.rewardedCard,
          coins: txResult.coinsRewarded,
        };
      } catch (err: any) {
        if (err instanceof HttpError) return ctx.badRequest(err.message);
        console.error("Error in claimStepReward:", err);
        return ctx.internalServerError("Failed to claim step reward");
      }
    },

    async unlockStory(ctx) {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized("You must be logged in.");
      const id = authUser.id;

      const { storyId } = ctx.request.body || {};
      if (!storyId) {
        return ctx.badRequest("storyId is required");
      }

      const [stories, userWithWallet, gameConfig] = await Promise.all([
        strapi.documents("api::story.story").findMany({
          filters: buildStoryFilter(storyId),
          limit: 1,
        }),
        strapi.documents("plugin::users-permissions.user").findOne({
          documentId: authUser.documentId,
          populate: ["wallet"],
        }) as Promise<any>,
        strapi.documents("api::game-config.game-config").findFirst({}) as Promise<any>,
      ]);

      const story = stories?.[0];
      if (!story) return ctx.notFound("Story not found");

      const userWallet = userWithWallet?.wallet;
      if (!userWallet) return ctx.badRequest("User has no wallet");

      const unlockPrice = Math.max(0, Number(gameConfig?.storyUnlockPrice ?? 500));

      try {
        const txResult = await strapi.db.transaction(async ({ trx }) => {
          const lockedWallet = await trx("wallets").where("id", userWallet.id).forUpdate().first();
          if (!lockedWallet) throw new HttpError(400, "User has no wallet");

          const existingProgresses = await strapi
            .documents("api::player-story-progress.player-story-progress")
            .findMany({
              filters: {
                user: { id },
                story: buildStoryFilter(storyId),
              },
              limit: 1,
            });

          if ((existingProgresses as any[]).length > 0) {
            throw new HttpError(400, "This story is already unlocked");
          }

          const currentCoins = Number(lockedWallet.coins || 0);
          if (currentCoins < unlockPrice) {
            throw new HttpError(400, "Insufficient coins to unlock this story");
          }

          const newCoins = currentCoins - unlockPrice;
          await strapi.documents("api::wallet.wallet").update({
            documentId: userWallet.documentId,
            data: { coins: newCoins },
          });

          const newProgress = await strapi
            .documents("api::player-story-progress.player-story-progress")
            .create({
              data: {
                user: id,
                story: story.documentId || story.id,
                progressStatus: "in_progress",
                completedSteps: [],
                claimedRewards: [],
              } as any,
            });

          return { newCoins, newProgress };
        });

        return {
          success: true,
          message: "Story unlocked successfully",
          coins: txResult.newCoins,
          progress: txResult.newProgress,
        };
      } catch (err: any) {
        if (err instanceof HttpError) return ctx.badRequest(err.message);
        console.error("Error in unlockStory:", err);
        return ctx.internalServerError("Failed to unlock story");
      }
    },

    async saveStepProgress(ctx) {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized("You must be logged in.");
      const userId = authUser.id;

      const { storyId, stepId, currentSituationId, historyEntry, variables } =
        ctx.request.body || {};

      if (!storyId || !stepId || !currentSituationId) {
        return ctx.badRequest("storyId, stepId and currentSituationId are required");
      }

      const progresses = (await strapi
        .documents("api::player-story-progress.player-story-progress")
        .findMany({
          filters: {
            user: { id: userId },
            story: buildStoryFilter(storyId),
          },
          limit: 1,
        })) as any[];

      const progress = progresses?.[0];
      if (!progress) {
        return ctx.badRequest(
          `Story progress not found for story explicitly. StoryId provided: ${storyId}. Must unlock story first.`,
        );
      }

      try {
        // Validate Choice conditions if this is a choice
        let coinCostToDeduct = 0;
        if (historyEntry && historyEntry.action === "choice") {
          const stories = (await strapi.documents("api::story.story").findMany({
            filters: buildStoryFilter(storyId),
            populate: {
              steps: {
                populate: {
                  situations: {
                    on: {
                      "story.situation-choice": {
                        populate: {
                          options: {
                            populate: ["conditions"],
                          },
                        },
                      },
                    },
                  },
                },
              },
            } as any,
            limit: 1,
          })) as any[];

          const story = stories?.[0];
          if (!story) return ctx.notFound("Story not found");

          const step = (story.steps || []).find(
            (s: any) => String(s.id) === String(stepId) || String(s.documentId) === String(stepId),
          );
          if (!step) return ctx.notFound("Step not found");

          const choiceSituation = (step.situations || []).find(
            (s: any) =>
              s.situationId === historyEntry.situationId &&
              s.__component === "story.situation-choice",
          );

          if (choiceSituation) {
            const option = (choiceSituation.options || []).find(
              (o: any) => o.nextSituationId === historyEntry.result,
            );
            if (option && Array.isArray(option.conditions)) {
              for (const condition of option.conditions) {
                if (condition.type === "hasCoin") {
                  const cost = parseInt(condition.value, 10);
                  if (!Number.isFinite(cost) || cost < 0) {
                    return ctx.badRequest("Invalid story choice coin condition");
                  }
                  coinCostToDeduct += cost;
                }
              }
            }
          }
        }

        const updatedProgress = await strapi.db.transaction(async ({ trx }) => {
          await trx("player_story_progresses").where("id", progress.id).forUpdate().first();

          if (coinCostToDeduct > 0) {
            const wallets = (await strapi.documents("api::wallet.wallet").findMany({
              filters: { user: { id: userId } },
              limit: 1,
            })) as any[];
            const wallet = wallets?.[0];
            if (!wallet) throw new HttpError(400, "Condition not met: Wallet not found");

            const lockedWallet = await trx("wallets").where("id", wallet.id).forUpdate().first();
            const currentCoins = Number(lockedWallet?.coins || 0);
            if (currentCoins < coinCostToDeduct) {
              throw new HttpError(400, "Condition not met: Not enough coins");
            }
            await strapi.documents("api::wallet.wallet").update({
              documentId: wallet.documentId,
              data: { coins: currentCoins - coinCostToDeduct },
            });
          }

          const fresh = (await strapi
            .documents("api::player-story-progress.player-story-progress")
            .findOne({ documentId: progress.documentId })) as any;

          let stepHistory = Array.isArray(fresh?.stepHistory) ? [...fresh.stepHistory] : [];
          const currentVariables = fresh?.variables || {};
          const safeVariables =
            variables && typeof variables === "object" && !Array.isArray(variables) ? variables : {};
          const newVariables = { ...currentVariables, ...safeVariables };

          if (historyEntry) {
            const exists = stepHistory.find(
              (h: any) =>
                h.situationId === historyEntry.situationId && h.action === historyEntry.action,
            );
            if (!exists) {
              stepHistory.push(historyEntry);
            }
            if (historyEntry.action === "start") {
              stepHistory = [];
            }
          }

          return strapi.documents("api::player-story-progress.player-story-progress").update({
            documentId: progress.documentId,
            data: {
              currentStep: stepId,
              currentSituationId,
              stepHistory,
              variables: newVariables,
            } as any,
          });
        });

        return { progress: updatedProgress };
      } catch (err: any) {
        if (err instanceof HttpError) return ctx.badRequest(err.message);
        console.error("Error in saveStepProgress:", err);
        return ctx.internalServerError("Failed to save step progress");
      }
    },

    async resetProgress(ctx) {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized("You must be logged in.");
      const userId = authUser.id;

      const { storyId } = ctx.request.body || {};
      if (!storyId) {
        return ctx.badRequest("storyId is required");
      }

      const progresses = (await strapi
        .documents("api::player-story-progress.player-story-progress")
        .findMany({
          filters: {
            user: { id: userId },
            story: buildStoryFilter(storyId),
          },
          limit: 1,
        })) as any[];

      if (progresses.length === 0) {
        return ctx.notFound(`No progress found for story: ${storyId}`);
      }

      const progress = progresses[0];

      // Note: claimedRewards is intentionally preserved across resets to prevent reward farming
      const updatedProgress = await strapi
        .documents("api::player-story-progress.player-story-progress")
        .update({
          documentId: progress.documentId,
          data: {
            completedSteps: [],
            currentStep: null,
            currentSituationId: null,
            stepHistory: [],
            variables: {},
            progressStatus: "in_progress",
          } as any,
        });

      return { success: true, progress: updatedProgress };
    },
  }),
);
