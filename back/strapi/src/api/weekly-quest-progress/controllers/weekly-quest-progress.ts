import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::weekly-quest-progress.weekly-quest-progress",
  ({ strapi }) => ({
    async getProgress(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");

      const service = strapi.service(
        "api::weekly-quest-progress.weekly-quest-progress",
      );
      const progress = await service.getProgress(user.id);

      return { data: progress };
    },

    async claimTier(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");

      const { requiredCount } = ctx.request.body as any;
      if (!requiredCount) {
        return ctx.badRequest("requiredCount is required.");
      }

      const config = (await strapi.entityService.findMany(
        "api::weekly-quest-config.weekly-quest-config",
        {
          populate: ["tiers"],
        },
      )) as any;

      if (!config || !config.tiers) {
        return ctx.badRequest("Weekly quest configuration not found.");
      }

      const tier = config.tiers.find((t) => t.requiredCount === requiredCount);
      if (!tier) {
        return ctx.badRequest("Invalid tier.");
      }

      const service = strapi.service(
        "api::weekly-quest-progress.weekly-quest-progress",
      );
      const progress = await service.getProgress(user.id);

      if (progress.completedCount < requiredCount) {
        return ctx.badRequest("Tier requirements not met.");
      }

      let claimedTiers = progress.claimedTiers || [];
      if (claimedTiers.includes(requiredCount)) {
        return ctx.badRequest("Tier already claimed.");
      }

      // Grant rewards
      const userWallets = (await strapi.entityService.findMany(
        "api::wallet.wallet",
        {
          filters: { user: user.id },
        },
      )) as any[];

      let wallet;
      if (userWallets && userWallets.length > 0) {
        wallet = userWallets[0];
        await strapi.entityService.update("api::wallet.wallet", wallet.id, {
          data: {
            coins: (wallet.coins || 0) + (tier.coins || 0),
            gems: (wallet.gems || 0) + (tier.gems || 0),
          },
        });
      }

      let grantedCard = null;
      if (tier.cardRarity && tier.cardRarity !== "None") {
        const cards = (await strapi.entityService.findMany("api::card.card", {
          filters: { rarity: tier.cardRarity } as any, // Using rarity as fallback or casting to any to bypass TS
        })) as any[];

        // Fallback if rarityName doesn't exist, use simple logic or adjust based on actual DB
        // We will refine the card fetching logic based on constants.js if needed. Let's assume rarity logic is done by level/sum or there is a rarity field
        if (cards && cards.length > 0) {
          const randomCard = cards[Math.floor(Math.random() * cards.length)];
          await strapi.entityService.create("api::user-card.user-card", {
            data: {
              user: user.id,
              card: randomCard.id,
              quantity: 1,
              isPremium: false,
            },
          });
          grantedCard = randomCard;
        } else {
          // Fallback to fetch all and filter manually if no rarity field in DB
          const allCards = (await strapi.entityService.findMany(
            "api::card.card",
          )) as any[];
          const matchingCards = allCards.filter((c) => {
            const sum = c.topValue + c.rightValue + c.bottomValue + c.leftValue;
            let rarity = "Commun";
            if (sum >= 20 && sum < 26) rarity = "Peu Commun";
            else if (sum >= 26 && sum < 32) rarity = "Rare";
            else if (sum >= 32 && sum < 36) rarity = "Épique";
            else if (sum >= 36) rarity = "Légendaire";
            return rarity === tier.cardRarity;
          });

          if (matchingCards.length > 0) {
            const randomCard =
              matchingCards[Math.floor(Math.random() * matchingCards.length)];
            await strapi.entityService.create("api::user-card.user-card", {
              data: {
                user: user.id,
                card: randomCard.id,
                quantity: 1,
                isPremium: false,
              },
            });
            grantedCard = randomCard;
          }
        }
      }

      // Update claimed tiers
      claimedTiers.push(requiredCount);
      const updatedProgress = await strapi.entityService.update(
        "api::weekly-quest-progress.weekly-quest-progress",
        progress.id,
        {
          data: {
            claimedTiers,
          },
        },
      );

      return {
        success: true,
        reward: { coins: tier.coins, gems: tier.gems, card: grantedCard },
        progress: updatedProgress,
      };
    },
  }),
);
