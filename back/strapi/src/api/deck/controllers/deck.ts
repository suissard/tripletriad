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
        populate: ["cards", "cardFrame"],
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
          const gameConfig = await strapi.documents("api::game-config.game-config").findFirst({});
          const maxDecks = (gameConfig as any)?.maxDecksPerUser ?? 5;

          const userDecks = await strapi.documents("api::deck.deck").findMany({
            filters: { user: { id: user.id } },
            fields: ['id']
          });

          if (userDecks.length >= maxDecks) {
            return ctx.badRequest(`Vous avez atteint la limite de ${maxDecks} decks.`);
          }
        }

        // 2. Prepare data
        const { data } = ctx.request.body;
        const deckData = {
          ...data,
          user: isAdmin ? (data.user || user.id) : user.id
        };

        const deck = await strapi.documents("api::deck.deck").create({
          data: deckData,
          populate: ["cards", "cardFrame"]
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

        // 1. Find existing deck to check ownership
        const deck = await strapi.documents("api::deck.deck").findOne({
          documentId: id,
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

        const updatedDeck = await strapi.documents("api::deck.deck").update({
          documentId: id,
          data: updateData,
          populate: ["cards", "cardFrame"]
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
        const deck = await strapi.documents("api::deck.deck").findOne({
          documentId: id,
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
        await strapi.documents("api::deck.deck").delete({
          documentId: id
        });

        return { data: deck };
      } catch (err: any) {
        strapi.log.error("Error in deck.delete:", err);
        return ctx.badRequest(err.message || "Erreur lors de la suppression du deck.");
      }
    }
  }),
);
