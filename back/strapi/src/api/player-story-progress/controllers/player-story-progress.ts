import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::player-story-progress.player-story-progress",
  ({ strapi }) => ({
    async claimStepReward(ctx) {
      const { id: userId } = ctx.state.user;
      const { storyId, stepId, situationId } = ctx.request.body;

      if (!storyId || !stepId) {
        return ctx.badRequest("storyId and stepId are required");
      }

      const stories = await strapi.entityService.findMany(
        "api::story.story",
        {
          filters: { 
            $or: [
              { id: { $eq: !isNaN(Number(storyId)) ? Number(storyId) : -1 } },
              { documentId: { $eq: storyId } }
            ]
          },
          populate: {
            steps: {
              populate: {
                situations: {
                  on: {
                    'story.situation-reward': {
                      populate: { rewardCards: { populate: ['image'] } }
                    }
                  }
                },
              },
            },
          } as any,
        },
      );

      const story = stories.length > 0 ? stories[0] : null;

      if (!story) return ctx.notFound("Story not found");
      const step = (story as any).steps.find(
        (s: any) => s.id === Number(stepId) || s.documentId === stepId,
      );
      if (!step) return ctx.notFound("Step not found in this story");

      // Find progress
      const progresses = (await strapi.entityService.findMany(
        "api::player-story-progress.player-story-progress",
        {
          filters: { 
            user: userId, 
            story: {
              $or: [
                { id: { $eq: !isNaN(Number(storyId)) ? Number(storyId) : -1 } },
                { documentId: { $eq: storyId } }
              ]
            }
          },
        },
      )) as any;

      if (progresses.length === 0) {
        return ctx.badRequest(`Story progress not found for claim. StoryId: ${storyId}`);
      }
      const progress = progresses[0];

      const completedSteps = Array.isArray(progress.completedSteps)
        ? progress.completedSteps
        : [];
      let stepHistory = Array.isArray(progress.stepHistory)
        ? progress.stepHistory
        : [];

      let rewardedCard = null;
      let coinsRewarded = 0;

      // Check if it's an entire step completion or just a situation reward
      if (!situationId) {
        // Legacy or Full Step Completion
        const isStepAlreadyCompleted = completedSteps.some((id: any) => 
          String(id) === String(stepId) || 
          (step && (String(id) === String(step.id) || String(id) === String(step.documentId)))
        );
        
        if (isStepAlreadyCompleted) {
          return ctx.badRequest("Step already completed");
        }
        const updatedSteps = [...completedSteps, stepId];
        let newStatus = progress.progressStatus;
        if (updatedSteps.length >= (story as any).steps.length) {
          newStatus = "completed";
        }

        const updatedProgress = await strapi.entityService.update(
          "api::player-story-progress.player-story-progress",
          progress.id,
          {
            data: {
              completedSteps: updatedSteps,
              progressStatus: newStatus,
              currentStep: null,
              currentSituationId: null,
              stepHistory: [],
            },
          },
        );
        return { progress: updatedProgress };
      } else {
        // It's a specific reward situation
        const rewardSituation = step.situations?.find(
          (s: any) =>
            s.situationId === situationId &&
            s.__component === "story.situation-reward",
        );
        if (!rewardSituation)
          return ctx.badRequest("Reward situation not found");

        // Check if already claimed in history
        const alreadyClaimed = stepHistory.some(
          (h) => h.situationId === situationId && h.action === "claim_reward",
        );
        if (alreadyClaimed) {
          return ctx.badRequest("Reward already claimed");
        }

        const stepRewardCards = rewardSituation.rewardCards || [];
        const rewardCoins = rewardSituation.rewardCoins || 0;

        if (rewardCoins !== 0) {
          let userDetails = await strapi.entityService.findOne(
            "plugin::users-permissions.user",
            userId,
            {
              populate: ["wallet"],
            },
          ) as any;

          let wallet = userDetails.wallet;
          if (!wallet) {
            // Lazy create wallet if missing
            wallet = await strapi.entityService.create('api::wallet.wallet', {
              data: { user: userId, coins: 100, gems: 0, dust: 0 }
            });
            console.log(`Created missing wallet for user ${userId}`);
          }

          await strapi.entityService.update(
            "api::wallet.wallet",
            wallet.id,
            {
              data: { coins: wallet.coins + rewardCoins },
            },
          );
          coinsRewarded = rewardCoins;
        }

        if (stepRewardCards.length > 0) {
          const randomCard =
            stepRewardCards[Math.floor(Math.random() * stepRewardCards.length)];

          // Give card to user
          const existingUserCards = (await strapi.entityService.findMany(
            "api::user-card.user-card",
            {
              filters: { user: userId, card: randomCard.id, isPremium: false },
            },
          )) as any;

          if (existingUserCards.length > 0) {
            await strapi.entityService.update(
              "api::user-card.user-card",
              existingUserCards[0].id,
              {
                data: { quantity: existingUserCards[0].quantity + 1 },
              },
            );
          } else {
            await strapi.entityService.create("api::user-card.user-card", {
              data: {
                user: userId,
                card: randomCard.id,
                quantity: 1,
                isPremium: false,
              },
            });
          }
          rewardedCard = randomCard;
        }

        stepHistory.push({
          situationId,
          action: "claim_reward",
          timestamp: new Date().toISOString(),
        });

        const updatedProgress = await strapi.entityService.update(
          "api::player-story-progress.player-story-progress",
          progress.id,
          {
            data: { stepHistory },
          },
        );

        return {
          progress: updatedProgress,
          reward: rewardedCard,
          coins: coinsRewarded,
        };
      }
    },

    async unlockStory(ctx) {
      const { id } = ctx.state.user;
      const { storyId } = ctx.request.body;

      if (!storyId) {
        return ctx.badRequest("storyId is required");
      }

      // Get current user data
      const user = await strapi.entityService.findOne(
        "plugin::users-permissions.user",
        id,
        {
          populate: ["wallet"],
        },
      );

      if (!user) {
        return ctx.notFound("User not found");
      }

      // Check if progress already exists for this story
      const existingProgresses = await strapi.entityService.findMany(
        "api::player-story-progress.player-story-progress",
        {
          filters: { 
            user: id, 
            story: {
              $or: [
                { id: { $eq: !isNaN(Number(storyId)) ? Number(storyId) : -1 } },
                { documentId: { $eq: storyId } }
              ]
            }
          },
        },
      );
      
      const existingProgress = (existingProgresses as any).length > 0 ? existingProgresses[0] : null;

      if (existingProgress) {
        return ctx.badRequest("This story is already unlocked");
      }

      // Get the unlock price from game-config
      const gameConfig = (await strapi.entityService.findMany(
        "api::game-config.game-config",
      )) as any;
      const config = Array.isArray(gameConfig) ? gameConfig[0] : gameConfig;
      const unlockPrice = config?.storyUnlockPrice ?? 500;

      // Check if user has enough coins in their wallet
      const userWallet = (user as any).wallet;
      if (!userWallet) {
        return ctx.badRequest("User has no wallet");
      }

      if (userWallet.coins < unlockPrice) {
        return ctx.badRequest("Insufficient coins to unlock this story");
      }

      // Deduct coins
      const newCoins = userWallet.coins - unlockPrice;
      await strapi.entityService.update("api::wallet.wallet", userWallet.id, {
        data: {
          coins: newCoins,
        },
      });

      // Create story progress
      const newProgress = await strapi.entityService.create(
        "api::player-story-progress.player-story-progress",
        {
          data: {
            user: id,
            story: storyId,
            progressStatus: "in_progress",
            completedSteps: [],
          },
        },
      );

      return {
        success: true,
        message: "Story unlocked successfully",
        coins: newCoins,
        progress: newProgress,
      };
    },
    async saveStepProgress(ctx) {
      const { id: userId } = ctx.state.user;
      const { storyId, stepId, currentSituationId, historyEntry, variables } =
        ctx.request.body;

      if (!storyId || !stepId || !currentSituationId) {
        return ctx.badRequest(
          "storyId, stepId and currentSituationId are required",
        );
      }

      // Ensure story progress exists
      const progresses = (await strapi.entityService.findMany(
        "api::player-story-progress.player-story-progress",
        {
          filters: { 
            user: userId, 
            story: {
              $or: [
                { id: { $eq: !isNaN(Number(storyId)) ? Number(storyId) : -1 } },
                { documentId: { $eq: storyId } }
              ]
            }
          },
        },
      )) as any;

      let progress = progresses.length > 0 ? progresses[0] : null;

      if (!progress) {
        return ctx.badRequest(
          `Story progress not found for story explicitly. StoryId provided: ${storyId}. Must unlock story first.`
        );
      }

      // Validate Choice conditions if this is a choice
      if (historyEntry && historyEntry.action === "choice") {
        const stories = (await strapi.entityService.findMany(
          "api::story.story",
          {
            filters: { 
              $or: [
                { id: { $eq: !isNaN(Number(storyId)) ? Number(storyId) : -1 } },
                { documentId: { $eq: storyId } }
              ]
            },
            populate: {
              steps: {
                populate: {
                  situations: {
                    on: {
                      'story.situation-choice': {
                        populate: {
                          options: {
                            populate: ['conditions']
                          }
                        }
                      }
                    }
                  }
                }
              }
            } as any,
          },
        )) as any;

        const story = stories.length > 0 ? stories[0] : null;

        if (!story) return ctx.notFound("Story not found");

        const step = story.steps.find(
          (s: any) => s.id === Number(stepId) || s.documentId === stepId,
        );
        if (!step) return ctx.notFound("Step not found");

        const choiceSituation = step.situations.find(
          (s: any) =>
            s.situationId === historyEntry.situationId &&
            s.__component === "story.situation-choice",
        );

        if (choiceSituation) {
          const option = choiceSituation.options.find(
            (o: any) => o.nextSituationId === historyEntry.result,
          );
          if (option && option.conditions && option.conditions.length > 0) {
            for (const condition of option.conditions) {
              if (condition.type === "hasCoin") {
                const cost = parseInt(condition.value, 10);
                const userDetails = await strapi.entityService.findOne(
                  "plugin::users-permissions.user",
                  userId,
                  {
                    populate: ["wallet"],
                  },
                ) as any;

                let wallet = userDetails.wallet;
                if (!wallet) {
                  wallet = await strapi.entityService.create("api::wallet.wallet", {
                    data: { user: userId, coins: 100, gems: 0, dust: 0 },
                  });
                }

                if (wallet.coins < cost) {
                  return ctx.badRequest("Condition not met: Not enough coins");
                }
                // Deduct cost
                await strapi.entityService.update(
                  "api::wallet.wallet",
                  wallet.id,
                  {
                    data: { coins: wallet.coins - cost },
                  },
                );
              }
            }
          }
        }
      }

      let stepHistory = progress.stepHistory || [];
      const currentVariables = progress.variables || {};
      const newVariables = { ...currentVariables, ...(variables || {}) };

      if (historyEntry) {
        // Don't duplicate the same action for choices/battles
        const exists = stepHistory.find(
          (h: any) =>
            h.situationId === historyEntry.situationId &&
            h.action === historyEntry.action,
        );
        if (!exists) {
          stepHistory.push(historyEntry);
        }
      }

      // Reset history if starting a new step or restarting
      if (historyEntry && historyEntry.action === "start") {
        stepHistory = [];
      }

      const updatedProgress = await strapi.entityService.update(
        "api::player-story-progress.player-story-progress",
        progress.id,
        {
          data: {
            currentStep: stepId,
            currentSituationId: currentSituationId,
            stepHistory: stepHistory,
            variables: newVariables,
          },
        },
      );

      return { progress: updatedProgress };
    },

    async resetProgress(ctx) {
      const { id: userId } = ctx.state.user;
      const { storyId } = ctx.request.body;

      if (!storyId) {
        return ctx.badRequest("storyId is required");
      }

      const progresses = (await strapi.entityService.findMany(
        "api::player-story-progress.player-story-progress",
        {
          filters: { 
            user: userId, 
            story: {
              $or: [
                { id: { $eq: !isNaN(Number(storyId)) ? Number(storyId) : -1 } },
                { documentId: { $eq: storyId } }
              ]
            }
          },
        },
      )) as any;

      if (progresses.length === 0) {
        return ctx.notFound(`No progress found for story: ${storyId}`);
      }

      const progress = progresses[0];

      const updatedProgress = await strapi.entityService.update(
        "api::player-story-progress.player-story-progress",
        progress.id,
        {
          data: {
            completedSteps: [],
            currentStep: null,
            currentSituationId: null,
            stepHistory: [],
            variables: {},
            progressStatus: "in_progress",
          },
        },
      );

      return { success: true, progress: updatedProgress };
    },
  }),
);
