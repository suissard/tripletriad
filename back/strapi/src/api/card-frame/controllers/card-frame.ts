/**
 * card-frame controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::card-frame.card-frame",
  ({ strapi }) => ({
    async buy(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) {
          return ctx.unauthorized("You must be logged in to buy a frame.");
        }

        const { frameId, currency = "gems" } = ctx.request.body;
        if (!frameId || (currency !== "gems" && currency !== "coins")) {
          return ctx.badRequest("Invalid request parameters.");
        }

        // Fetch frame
        const frame = await strapi.entityService.findOne("api::card-frame.card-frame", frameId);
        if (!frame) {
          return ctx.notFound("Frame not found.");
        }

        const cost = currency === "gems" ? ((frame as any).priceGems || 250) : ((frame as any).priceCoins || 2500);

        // Fetch user with wallet and unlocked frames
        const populatedUser = (await strapi.entityService.findOne(
          "plugin::users-permissions.user",
          user.id,
          { populate: ["wallet", "unlockedCardFrames"] }
        )) as any;

        // Check if it's the global default frame (free for everyone)
        const gameConfigs = await strapi.entityService.findMany('api::game-config.game-config', {
          populate: ['defaultCardFrame']
        });
        const globalDefaultFrame = (gameConfigs as any)?.[0]?.defaultCardFrame;
        
        if (globalDefaultFrame && (frame.id === globalDefaultFrame.id || (frame as any).documentId === globalDefaultFrame.documentId)) {
           return ctx.badRequest("This frame is already available for free as the global default.");
        }

        if (populatedUser?.unlockedCardFrames?.some(f => f.id === frame.id || f.documentId === (frame as any).documentId)) {
          return ctx.badRequest("You already own this frame.");
        }

        const wallet = populatedUser?.wallet;
        if (!wallet) {
          return ctx.badRequest("Wallet not found.");
        }

        if (wallet[currency] < cost) {
          return ctx.badRequest(`Not enough ${currency} to buy this frame. Cost: ${cost} ${currency}.`);
        }

        // Deduct currency
        await strapi.entityService.update("api::wallet.wallet", wallet.id, {
          data: {
            [currency]: wallet[currency] - cost
          }
        });

        // Add frame to unlocked frames
        // In Strapi 5, for relations, it's safer to map to IDs or documentIds
        const currentFrameIds = (populatedUser.unlockedCardFrames || []).map(f => f.id);
        
        await strapi.entityService.update("plugin::users-permissions.user", user.id, {
          data: {
            unlockedCardFrames: [...currentFrameIds, frame.id]
          } as any
        });

        return {
          success: true,
          message: "Frame purchased successfully.",
          wallet: {
            ...wallet,
            [currency]: wallet[currency] - cost
          }
        };
      } catch (err) {
        console.error("Error buying frame:", err);
        return ctx.internalServerError("An error occurred while buying the frame.");
      }
    }
  })
);
