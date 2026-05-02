/**
 * card-back controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::card-back.card-back",
  ({ strapi }: { strapi: any }) => ({
    async buy(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) {
          return ctx.unauthorized("You must be logged in to buy a card back.");
        }

        const { backId, currency = "gems" } = ctx.request.body;
        console.log(`[CardBack Buy] User ${user.id} attempting to buy ${backId} with ${currency}`);

        if (!backId || (currency !== "gems" && currency !== "coins")) {
          return ctx.badRequest("Invalid request parameters.");
        }

        // Fetch card back using documentId or ID
        let cardBack = await strapi.documents("api::card-back.card-back").findOne({
          documentId: isNaN(backId) ? backId : undefined,
        }) || (!isNaN(backId) ? await strapi.documents("api::card-back.card-back").findMany({ filters: { id: backId }, limit: 1 }).then(r => r[0]) : null);

        if (!cardBack) {
          return ctx.notFound("Card back not found.");
        }

        const cost = currency === "gems" ? ((cardBack as any).priceGems || 250) : ((cardBack as any).priceCoins || 2500);

        // Fetch user with wallet and unlocked card backs
        const populatedUser = (await strapi.documents("plugin::users-permissions.user").findOne({
          documentId: user.documentId || (await strapi.documents("plugin::users-permissions.user").findMany({ filters: { id: user.id }, limit: 1 }).then(r => r[0]?.documentId)),
          populate: ["wallet", "unlockedCardBacks"]
        })) as any;

        // Check if it's the global default (free for everyone)
        const gameConfigs = await strapi.documents('api::game-config.game-config').findMany({
          populate: ['defaultCardBack']
        });
        const globalDefaultBack = (gameConfigs as any)?.[0]?.defaultCardBack;
        
        const isGlobalDefault = globalDefaultBack && (
          cardBack.id === globalDefaultBack.id || 
          (cardBack as any).documentId === globalDefaultBack.documentId
        );

        if (isGlobalDefault) {
           return ctx.badRequest("This card back is already available for free as the global default.");
        }

        const alreadyOwned = populatedUser?.unlockedCardBacks?.some(b => 
          b.id === cardBack.id || 
          b.documentId === (cardBack as any).documentId
        );

        if (alreadyOwned) {
          return ctx.badRequest("You already own this card back.");
        }

        const wallet = populatedUser?.wallet;
        if (!wallet) {
          return ctx.badRequest("Wallet not found.");
        }

        if (wallet[currency] < cost) {
          return ctx.badRequest(`Not enough ${currency} to buy this card back. Cost: ${cost} ${currency}. Current: ${wallet[currency]}`);
        }

        // Deduct currency
        await strapi.documents("api::wallet.wallet").update({
          documentId: wallet.documentId,
          data: {
            [currency]: wallet[currency] - cost
          }
        });

        // Add to unlocked card backs
        const currentBackIds = (populatedUser.unlockedCardBacks || []).map(b => b.documentId || b.id);
        
        await strapi.documents("plugin::users-permissions.user").update({
          documentId: populatedUser.documentId,
          data: {
            unlockedCardBacks: [...currentBackIds, cardBack.documentId || cardBack.id]
          } as any
        });

        return {
          success: true,
          message: "Card back purchased successfully.",
          wallet: {
            ...wallet,
            [currency]: wallet[currency] - cost
          }
        };
      } catch (err) {
        console.error("Error buying card back:", err);
        return ctx.internalServerError("An error occurred while buying the card back.");
      }
    }
  })
);
