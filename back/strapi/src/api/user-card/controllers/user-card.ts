import { factories } from "@strapi/strapi";
import { GameEngine } from "../../../shared/GameEngine";

export default factories.createCoreController(
  "api::user-card.user-card",
  ({ strapi }: { strapi: any }) => ({
    async find(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");

      const { query } = ctx as any;

      // Extract and normalize pagination
      const page = parseInt(query.pagination?.page) || 1;
      const pageSize = parseInt(query.pagination?.pageSize) || 100;

      // Force filter by user
      const filters = {
        ...((query.filters as any) || {}),
        user: { id: user.id },
      };

      const results = await strapi.documents("api::user-card.user-card").findMany({
        filters,
        populate: query.populate,
        sort: query.sort,
        page,
        pageSize,
      });

      return results; // documents.findMany already returns { data, meta }
    },

    async disenchant(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized("You must be logged in.");

        const { cardId } = ctx.request.body;
        if (!cardId) return ctx.badRequest("cardId is required.");

        const gameConfigs = await strapi.documents("api::game-config.game-config").findMany();
        const gameConfig = Array.isArray(gameConfigs)
          ? gameConfigs[0]
          : gameConfigs;

        const craftingRatios = gameConfig?.craftingRatios || {
          common: { disenchant: 10, craft: 40 },
          uncommon: { disenchant: 20, craft: 80 },
          rare: { disenchant: 50, craft: 200 },
          epic: { disenchant: 100, craft: 400 },
          legendary: { disenchant: 400, craft: 1600 },
        };

        // Find card by documentId or numeric id
        let card = null;
        if (isNaN(cardId)) {
          card = await strapi.documents("api::card.card").findOne({
            documentId: cardId,
            status: 'published'
          });
        } else {
          const cards = await strapi.documents("api::card.card").findMany({
            filters: { id: cardId },
            limit: 1
          });
          card = cards[0];
        }

        if (!card) return ctx.notFound("Card not found.");

        const cardLevel = GameEngine.calculateCardLevel({
          top: card.topValue,
          right: card.rightValue,
          bottom: card.bottomValue,
          left: card.leftValue,
        });

        let rarity = "common";
        if (cardLevel <= 2) rarity = "common";
        else if (cardLevel <= 4) rarity = "uncommon";
        else if (cardLevel <= 6) rarity = "rare";
        else if (cardLevel <= 8) rarity = "epic";
        else rarity = "legendary";

        const dustGained = craftingRatios[rarity]?.disenchant || 10;

        const userCards = await strapi.documents("api::user-card.user-card").findMany({
          filters: { 
            user: { id: user.id }, 
            card: { 
              $or: [
                { id: isNaN(cardId) ? undefined : cardId },
                { documentId: isNaN(cardId) ? cardId : undefined }
              ]
            } 
          },
        });

        const userCard = userCards[0];
        if (!userCard || userCard.quantity <= 0)
          return ctx.badRequest("You do not own this card.");

        const updatedQuantity = userCard.quantity - 1;
        if (updatedQuantity === 0) {
          await strapi.documents("api::user-card.user-card").delete({
            documentId: userCard.documentId
          });
        } else {
          await strapi.documents("api::user-card.user-card").update({
            documentId: userCard.documentId,
            data: { quantity: updatedQuantity },
          });
        }

        // Find or create the wallet for this user
        const wallets = await strapi.documents("api::wallet.wallet").findMany({
          filters: { user: { id: user.id } },
        });

        let wallet = wallets[0];
        if (!wallet) {
          wallet = await strapi.documents("api::wallet.wallet").create({
            data: { user: user.id, coins: 0, gems: 0, dust: 0 },
          });
        }

        const newDust = (wallet.dust || 0) + dustGained;
        await strapi.documents("api::wallet.wallet").update({
          documentId: wallet.documentId,
          data: { dust: newDust },
        });


        return ctx.send({
          message: "Disenchanted successfully",
          dustGained,
          newDustTotal: newDust,
          newQuantity: updatedQuantity,
        });
      } catch (err) {
        console.error(err);
        return ctx.internalServerError(
          "An error occurred during disenchanting.",
        );
      }
    },

    async craft(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized("You must be logged in.");

        const { cardId } = ctx.request.body;
        if (!cardId) return ctx.badRequest("cardId is required.");

        const gameConfigs = await strapi.documents("api::game-config.game-config").findMany();
        const gameConfig = Array.isArray(gameConfigs)
          ? gameConfigs[0]
          : gameConfigs;

        const craftingRatios = gameConfig?.craftingRatios || {
          common: { disenchant: 10, craft: 40 },
          uncommon: { disenchant: 20, craft: 80 },
          rare: { disenchant: 50, craft: 200 },
          epic: { disenchant: 100, craft: 400 },
          legendary: { disenchant: 400, craft: 1600 },
        };

        let card = null;
        if (isNaN(cardId)) {
          card = await strapi.documents("api::card.card").findOne({
            documentId: cardId
          });
        } else {
          const cards = await strapi.documents("api::card.card").findMany({
            filters: { id: cardId },
            limit: 1
          });
          card = cards[0];
        }
        
        if (!card) return ctx.notFound("Card not found.");

        const cardLevel = GameEngine.calculateCardLevel({
          top: card.topValue,
          right: card.rightValue,
          bottom: card.bottomValue,
          left: card.leftValue,
        });

        let rarity = "common";
        if (cardLevel <= 2) rarity = "common";
        else if (cardLevel <= 4) rarity = "uncommon";
        else if (cardLevel <= 6) rarity = "rare";
        else if (cardLevel <= 8) rarity = "epic";
        else rarity = "legendary";

        const dustCost = craftingRatios[rarity]?.craft || 40;

        // Find or create the wallet for this user
        const wallets = await strapi.documents("api::wallet.wallet").findMany({
          filters: { user: { id: user.id } },
        });

        let wallet = wallets[0];
        if (!wallet) {
          wallet = await strapi.documents("api::wallet.wallet").create({
            data: { user: user.id, coins: 0, gems: 0, dust: 0 },
          });
        }

        const currentDust = wallet.dust || 0;

        if (currentDust < dustCost) return ctx.badRequest("Not enough dust.");

        const newDust = currentDust - dustCost;
        await strapi.documents("api::wallet.wallet").update({
          documentId: wallet.documentId,
          data: { dust: newDust },
        });


        const userCards = await strapi.documents("api::user-card.user-card").findMany({
          filters: { 
            user: { id: user.id }, 
            card: {
              $or: isNaN(cardId) 
                ? [{ documentId: cardId }]
                : [{ id: Number(cardId) }]
            }
          },
        });

        let updatedQuantity = 1;
        const userCard = userCards[0];
        if (!userCard) {
          await strapi.documents("api::user-card.user-card").create({
            data: { user: user.id, card: card.documentId || card.id, quantity: 1 },
          });
        } else {
          updatedQuantity = userCard.quantity + 1;
          await strapi.documents("api::user-card.user-card").update({
            documentId: userCard.documentId,
            data: { quantity: updatedQuantity },
          });
        }

        return ctx.send({
          message: "Crafted successfully",
          dustCost,
          newDustTotal: newDust,
          newQuantity: updatedQuantity,
        });
      } catch (err) {
        console.error(err);
        return ctx.internalServerError("An error occurred during crafting.");
      }
    },

    async massDisenchant(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized("You must be logged in.");

        const gameConfigs = await strapi.documents("api::game-config.game-config").findMany();
        const gameConfig = Array.isArray(gameConfigs)
          ? gameConfigs[0]
          : gameConfigs;

        const playableLimit = gameConfig?.playableLimit || 2;
        const craftingRatios = gameConfig?.craftingRatios || {
          common: { disenchant: 10, craft: 40 },
          uncommon: { disenchant: 20, craft: 80 },
          rare: { disenchant: 50, craft: 200 },
          epic: { disenchant: 100, craft: 400 },
          legendary: { disenchant: 400, craft: 1600 },
        };

        const userCards = await strapi.documents("api::user-card.user-card").findMany({
          filters: { user: { id: user.id }, quantity: { $gt: playableLimit } },
          populate: ["card"],
        });

        if (!userCards || userCards.length === 0) {
          return ctx.send({
            message: "No surplus cards to disenchant",
            totalDustGained: 0,
            cardsDestroyed: 0,
          });
        }

        let totalDustGained = 0;
        let cardsDestroyed = 0;

        for (const userCard of userCards) {
          const surplusQuantity = userCard.quantity - playableLimit;
          if (surplusQuantity <= 0) continue;

          const cardData = (userCard as any).card;
          if (!cardData) {
            console.warn(
              `UserCard ${userCard.id} has no related card data. Skipping.`,
            );
            continue;
          }

          const cardLevel = GameEngine.calculateCardLevel({
            top: cardData.topValue,
            right: cardData.rightValue,
            bottom: cardData.bottomValue,
            left: cardData.leftValue,
          });

          let rarity = "common";
          if (cardLevel <= 2) rarity = "common";
          else if (cardLevel <= 4) rarity = "uncommon";
          else if (cardLevel <= 6) rarity = "rare";
          else if (cardLevel <= 8) rarity = "epic";
          else rarity = "legendary";

          const dustPerCard = craftingRatios[rarity]?.disenchant || 10;

          totalDustGained += dustPerCard * surplusQuantity;
          cardsDestroyed += surplusQuantity;

          await strapi.documents("api::user-card.user-card").update({
            documentId: userCard.documentId,
            data: { quantity: playableLimit },
          });
        }

        // Find or create the wallet for this user
        const wallets = await strapi.documents("api::wallet.wallet").findMany({
          filters: { user: { id: user.id } },
        });

        let wallet = wallets[0];
        if (!wallet) {
          wallet = await strapi.documents("api::wallet.wallet").create({
            data: { user: user.id, coins: 0, gems: 0, dust: 0 },
          });
        }

        const newDust = (wallet.dust || 0) + totalDustGained;

        await strapi.documents("api::wallet.wallet").update({
          documentId: wallet.documentId,
          data: { dust: newDust },
        });


        return ctx.send({
          message: "Mass disenchant successful",
          totalDustGained,
          newDustTotal: newDust,
          cardsDestroyed,
          totalCardsDisenchanted: cardsDestroyed,
        });
      } catch (err) {
        console.error(err);
        return ctx.internalServerError(
          "An error occurred during mass disenchanting.",
        );
      }
    },
    async updateVariant(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized("You must be logged in.");

        const { id } = ctx.params; // This is a documentId from the frontend
        const { variantIndex } = ctx.request.body;

        if (variantIndex === undefined || typeof variantIndex !== "number") {
          return ctx.badRequest("variantIndex is required and must be a number.");
        }

        const userCards = await strapi.documents("api::user-card.user-card").findMany({
          filters: { documentId: id, user: { id: user.id } },
          limit: 1,
        });

        const userCard = userCards?.[0];
        if (!userCard) {
          return ctx.notFound("User card not found or does not belong to you.");
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
        return ctx.internalServerError(
          "An error occurred while updating the variant."
        );
      }
    },

    async addDevCurrencies(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized("You must be logged in.");

        const { coins, gems, dust } = ctx.request.body;

        // Find the wallet for this user
        const wallets = await strapi.documents("api::wallet.wallet").findMany({
          filters: { user: { id: user.id } },
        });

        let wallet = wallets[0];
        if (!wallet) {
          // Create wallet if it doesn't exist for some reason
          wallet = await strapi.documents("api::wallet.wallet").create({
            data: { user: user.id, coins: 0, gems: 0, dust: 0 },
          });
        }

        const updateData: any = {};
        if (typeof coins === "number")
          updateData.coins = (wallet.coins || 0) + coins;
        if (typeof gems === "number")
          updateData.gems = (wallet.gems || 0) + gems;
        if (typeof dust === "number")
          updateData.dust = (wallet.dust || 0) + dust;

        const updatedWallet = await strapi.documents("api::wallet.wallet").update({
          documentId: wallet.documentId,
          data: updateData,
        });

        return ctx.send({
          message: "Currencies added successfully",
          coins: updatedWallet.coins,
          gems: updatedWallet.gems,
          dust: updatedWallet.dust,
        });
      } catch (err) {
        console.error(err);
        return ctx.internalServerError(
          "An error occurred while adding currencies.",
        );
      }
    },
  }),
);
