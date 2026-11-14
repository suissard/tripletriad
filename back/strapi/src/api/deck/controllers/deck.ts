import { factories } from "@strapi/strapi";
import { z } from "zod";

const deckPayloadSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  cover: z.coerce.number().int().min(0).optional().nullable(),
  cards: z.array(z.union([z.number().int().positive(), z.string().min(1)])).optional(),
  cardFrame: z.union([z.number().int().positive(), z.string().min(1)]).optional().nullable(),
  cardBack: z.union([z.number().int().positive(), z.string().min(1)]).optional().nullable(),
  user: z.any().optional(),
});

function isAdminUser(user: any): boolean {
  return user?.role?.type === "admin" || user?.role?.name === "Admin";
}

async function validateDeckOwnership(strapi: any, user: any, data: z.infer<typeof deckPayloadSchema>) {
  const gameConfig = (await strapi.documents("api::game-config.game-config").findFirst({
    populate: ["defaultCardFrame", "defaultCardBack"],
  })) as any;

  const cardsPerDeck = gameConfig?.cardsPerDeck ?? 15;
  if (Array.isArray(data.cards)) {
    if (data.cards.length > cardsPerDeck) {
      return `Un deck ne peut pas contenir plus de ${cardsPerDeck} cartes.`;
    }

    if (data.cards.length > 0) {
      const userCards = (await strapi.documents("api::user-card.user-card").findMany({
        filters: { user: { id: user.id } },
        populate: { card: { fields: ["id", "documentId"] } },
        limit: 2000,
      })) as any[];

      const ownedQtyByKey = new Map<string, number>();
      for (const uc of userCards) {
        if (!uc.card) continue;
        const qty = Number(uc.quantity || 0);
        if (uc.card.id) {
          const k = String(uc.card.id);
          ownedQtyByKey.set(k, (ownedQtyByKey.get(k) || 0) + qty);
        }
        if (uc.card.documentId) {
          const k = String(uc.card.documentId);
          ownedQtyByKey.set(k, (ownedQtyByKey.get(k) || 0) + qty);
        }
      }

      const requestedCounts = new Map<string, number>();
      for (const cid of data.cards) {
        const key = String(cid);
        requestedCounts.set(key, (requestedCounts.get(key) || 0) + 1);
      }

      const playableLimit = gameConfig?.playableLimit ?? 2;
      for (const [key, count] of requestedCounts.entries()) {
        const owned = ownedQtyByKey.get(key) || 0;
        if (owned < count) {
          return "Vous ne possédez pas toutes les cartes sélectionnées dans ce deck.";
        }
        if (count > playableLimit) {
          return `Vous ne pouvez pas mettre plus de ${playableLimit} exemplaires d'une même carte.`;
        }
      }
    }
  }

  if (data.cardFrame || data.cardBack) {
    const fullUser = (await strapi.documents("plugin::users-permissions.user").findOne({
      documentId: user.documentId,
      populate: ["unlockedCardFrames", "unlockedCardBacks"],
    })) as any;

    if (data.cardFrame) {
      const unlockedFrames = [...(fullUser?.unlockedCardFrames || [])];
      if (gameConfig?.defaultCardFrame) unlockedFrames.push(gameConfig.defaultCardFrame);
      const hasFrame = unlockedFrames.some(
        (f: any) => String(f.id) === String(data.cardFrame) || String(f.documentId) === String(data.cardFrame),
      );
      if (!hasFrame) {
        return "Vous n'avez pas débloqué ce cadre de carte.";
      }
    }

    if (data.cardBack) {
      const unlockedBacks = [...(fullUser?.unlockedCardBacks || [])];
      if (gameConfig?.defaultCardBack) unlockedBacks.push(gameConfig.defaultCardBack);
      const hasBack = unlockedBacks.some(
        (b: any) => String(b.id) === String(data.cardBack) || String(b.documentId) === String(data.cardBack),
      );
      if (!hasBack) {
        return "Vous n'avez pas débloqué ce dos de carte.";
      }
    }
  }

  return null;
}

export default factories.createCoreController("api::deck.deck", ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized("You must be logged in.");

    if (isAdminUser(user)) {
      return await super.find(ctx);
    }

    const result = await strapi.documents("api::deck.deck").findMany({
      filters: { user: { id: user.id } },
      populate: ["cards", "cardFrame", "cardBack"],
      limit: 100,
    });

    return { data: result };
  },

  async findOne(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized("You must be logged in.");

    const { id } = ctx.params;
    const deck = (await strapi.documents("api::deck.deck").findOne({
      documentId: id,
      populate: ["user", "cards", "cardFrame", "cardBack"],
    })) as any;

    if (!deck) return ctx.notFound("Deck not found.");
    if (!isAdminUser(user) && deck.user?.id !== user.id) {
      return ctx.forbidden("Accès refusé à ce deck.");
    }

    return { data: deck };
  },

  async create(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("You must be logged in.");

      const isAdmin = isAdminUser(user);
      const parsed = deckPayloadSchema.safeParse(ctx.request.body?.data || {});
      if (!parsed.success) {
        return ctx.badRequest("Données de deck invalides.", parsed.error.flatten());
      }

      if (!isAdmin) {
        const gameConfig = (await strapi.documents("api::game-config.game-config").findFirst({})) as any;
        const maxDecks = gameConfig?.maxDecksPerUser ?? 5;

        const userDecks = await strapi.documents("api::deck.deck").findMany({
          filters: { user: { id: user.id } },
          fields: ["id"],
          limit: maxDecks + 1,
        });

        if (userDecks.length >= maxDecks) {
          return ctx.badRequest(`Vous avez atteint la limite de ${maxDecks} decks.`);
        }

        const validationError = await validateDeckOwnership(strapi, user, parsed.data);
        if (validationError) {
          return ctx.forbidden(validationError);
        }
      }

      const { name, cover, cards, cardFrame, cardBack, user: requestedUser } = parsed.data;
      const deckData: any = {
        name: name || "My Deck",
        ...(cover !== undefined ? { cover } : {}),
        ...(cards !== undefined ? { cards } : {}),
        ...(cardFrame !== undefined ? { cardFrame } : {}),
        ...(cardBack !== undefined ? { cardBack } : {}),
        user: isAdmin ? (requestedUser || user.id) : user.id,
      };

      const deck = await strapi.documents("api::deck.deck").create({
        data: deckData,
        populate: ["cards", "cardFrame", "cardBack"],
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
      const isAdmin = isAdminUser(user);

      const deck = (await strapi.documents("api::deck.deck").findOne({
        documentId: id,
        populate: ["user"],
      })) as any;

      if (!deck) return ctx.notFound();
      if (!isAdmin && deck.user?.id !== user.id) {
        return ctx.forbidden("Vous ne pouvez modifier que vos propres decks.");
      }

      const parsed = deckPayloadSchema.safeParse(ctx.request.body?.data || {});
      if (!parsed.success) {
        return ctx.badRequest("Données de deck invalides.", parsed.error.flatten());
      }

      if (!isAdmin) {
        const validationError = await validateDeckOwnership(strapi, user, parsed.data);
        if (validationError) {
          return ctx.forbidden(validationError);
        }
      }

      const { name, cover, cards, cardFrame, cardBack } = parsed.data;
      const updateData: any = {
        ...(name !== undefined ? { name } : {}),
        ...(cover !== undefined ? { cover } : {}),
        ...(cards !== undefined ? { cards } : {}),
        ...(cardFrame !== undefined ? { cardFrame } : {}),
        ...(cardBack !== undefined ? { cardBack } : {}),
      };

      const updatedDeck = await strapi.documents("api::deck.deck").update({
        documentId: id,
        data: updateData,
        populate: ["cards", "cardFrame", "cardBack"],
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
      const isAdmin = isAdminUser(user);

      const deck = (await strapi.documents("api::deck.deck").findOne({
        documentId: id,
        populate: ["user"],
      })) as any;

      if (!deck) return ctx.notFound();
      if (!isAdmin && deck.user?.id !== user.id) {
        return ctx.forbidden("Vous ne pouvez supprimer que vos propres decks.");
      }

      await strapi.documents("api::deck.deck").delete({ documentId: id });
      return { data: deck };
    } catch (err: any) {
      strapi.log.error("Error in deck.delete:", err);
      return ctx.badRequest(err.message || "Erreur lors de la suppression du deck.");
    }
  },
}));
