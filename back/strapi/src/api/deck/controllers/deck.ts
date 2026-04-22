import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::deck.deck",
  ({ strapi }) => ({
    async find(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");

      // Check if user is admin
      const isAdmin = (user as any).role?.type === 'admin' || (user as any).role?.name === 'Admin';

      // If admin, they might want to see all decks if they specify a user filter, 
      // or just see everything. For now, let's keep the "find my decks" logic for regular users
      // but allow admins to see everything if they don't filter.
      if (isAdmin) {
        return await super.find(ctx);
      }

      const result = await strapi.documents("api::deck.deck").findMany({
        filters: { user: { id: user.id } },
        populate: ["cards"],
      });

      return { data: result };
    },

    async create(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized("You must be logged in.");

        const isAdmin = (user as any).role?.type === 'admin' || (user as any).role?.name === 'Admin';

        if (!isAdmin) {
          // 1. Check max decks limit
          const gameConfig = await strapi.db.query("api::game-config.game-config").findOne({});
          const maxDecks = (gameConfig as any)?.maxDecksPerUser ?? 5;

          const userDecksCount = await strapi.db.query("api::deck.deck").count({
            where: { user: { id: user.id } }
          });

          if (userDecksCount >= maxDecks) {
            return ctx.badRequest(`Vous avez atteint la limite de ${maxDecks} decks.`);
          }
        }

        // 2. Prepare data
        const { data } = ctx.request.body;
        const deckData = {
          ...data,
          user: isAdmin ? (data.user || user.id) : user.id
        };

        // Use Document Service for CREATE but handle user manually if needed?
        // Actually, if super.create failed, let's use db.query which is the most reliable
        const deck = await strapi.db.query("api::deck.deck").create({
          data: deckData
        });

        return { data: deck };
      } catch (err: any) {
        strapi.log.error("Error in deck.create:", err);
        return ctx.badRequest(err.message || "Erreur lors de la création du deck.");
      }
    },

    async update(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized("You must be logged in.");

        const { id } = ctx.params; 
        const isAdmin = (user as any).role?.type === 'admin' || (user as any).role?.name === 'Admin';

        // 1. Find existing deck
        const deck = await strapi.db.query("api::deck.deck").findOne({
          where: { documentId: id },
          populate: ["user"]
        }) as any;
        
        if (!deck) return ctx.notFound();

        // 2. Verify ownership if not admin
        if (!isAdmin) {
          if (deck.user?.id !== user.id) {
            return ctx.forbidden("Vous ne pouvez modifier que vos propres decks.");
          }
        }

        // 3. Update
        const { data } = ctx.request.body;
        const updateData = { ...data };
        if (!isAdmin) delete updateData.user;

        const updatedDeck = await strapi.db.query("api::deck.deck").update({
          where: { id: deck.id },
          data: updateData
        });

        return { data: updatedDeck };
      } catch (err: any) {
        strapi.log.error("Error in deck.update:", err);
        return ctx.badRequest(err.message || "Erreur lors de la mise à jour du deck.");
      }
    },

    async delete(ctx) {
      try {
        const user = ctx.state.user;
        if (!user) return ctx.unauthorized("You must be logged in.");

        const { id } = ctx.params;
        const isAdmin = (user as any).role?.type === 'admin' || (user as any).role?.name === 'Admin';

        // 1. Find existing
        const deck = await strapi.db.query("api::deck.deck").findOne({
          where: { documentId: id },
          populate: ["user"]
        }) as any;
        
        if (!deck) return ctx.notFound();

        // 2. Verify ownership if not admin
        if (!isAdmin) {
          if (deck.user?.id !== user.id) {
            return ctx.forbidden("Vous ne pouvez supprimer que vos propres decks.");
          }
        }

        // 3. Delete
        await strapi.db.query("api::deck.deck").delete({
          where: { id: deck.id }
        });

        return { data: deck };
      } catch (err: any) {
        strapi.log.error("Error in deck.delete:", err);
        return ctx.badRequest(err.message || "Erreur lors de la suppression du deck.");
      }
    }
  }),
);
