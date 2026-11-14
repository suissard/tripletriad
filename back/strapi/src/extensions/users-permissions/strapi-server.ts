
import { z } from 'zod';

const updateMeSchema = z.object({
  username: z.string().trim().min(2).max(32).optional(),
  avatar_card: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
  defaultCardFrame: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
  defaultCardBack: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
});

function sanitizeUser(user: any) {
  if (!user) return user;
  const copy = { ...user };
  delete copy.password;
  delete copy.resetPasswordToken;
  delete copy.confirmationToken;
  delete copy.provider;
  return copy;
}

export default (plugin: any) => {
  const coreMe = plugin.controllers.user.me;

  plugin.controllers.user.me = async (ctx: any) => {
    await coreMe(ctx);

    const baseUser = ctx.body;
    if (!baseUser || !baseUser.id) return;

    const userDocId = baseUser.documentId || baseUser.id;

    const populatedUser = (await strapi.documents('plugin::users-permissions.user').findOne({
      documentId: userDocId,
      populate: {
        role: true,
        wallet: true,
        avatar_card: {
          populate: {
            image: true,
          },
        },
        unlockedCardFrames: true,
        unlockedCardBacks: true,
        defaultCardFrame: true,
        defaultCardBack: true,
        playerStoryProgresses: true,
      },
    })) as any;

    try {
      const gameConfigs = await strapi.documents('api::game-config.game-config').findMany({
        populate: ['defaultCardFrame', 'defaultCardBack'],
        limit: 1,
      });
      const config = (gameConfigs as any)?.[0];
      const globalDefaultFrame = config?.defaultCardFrame;
      const globalDefaultBack = config?.defaultCardBack;

      if (populatedUser) {
        if (globalDefaultFrame) {
          if (!populatedUser.unlockedCardFrames) populatedUser.unlockedCardFrames = [];
          const alreadyHasFrame = populatedUser.unlockedCardFrames.some(
            (f: any) => f.id === globalDefaultFrame.id || f.documentId === globalDefaultFrame.documentId,
          );
          if (!alreadyHasFrame) populatedUser.unlockedCardFrames.push(globalDefaultFrame);
        }

        if (globalDefaultBack) {
          if (!populatedUser.unlockedCardBacks) populatedUser.unlockedCardBacks = [];
          const alreadyHasBack = populatedUser.unlockedCardBacks.some(
            (b: any) => b.id === globalDefaultBack.id || b.documentId === globalDefaultBack.documentId,
          );
          if (!alreadyHasBack) populatedUser.unlockedCardBacks.push(globalDefaultBack);
        }
      }
    } catch (err) {
      console.error('Error injecting global defaults:', err);
    }

    ctx.body = sanitizeUser(populatedUser);
  };

  plugin.controllers.user.updateMe = async (ctx: any) => {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }

    const parsed = updateMeSchema.safeParse(ctx.request.body || {});
    if (!parsed.success) {
      return ctx.badRequest('Données de profil invalides.', parsed.error.flatten());
    }

    const { username, avatar_card, defaultCardFrame, defaultCardBack } = parsed.data;

    try {
      const fullUser = (await strapi.documents('plugin::users-permissions.user').findOne({
        documentId: user.documentId,
        populate: ['unlockedCardFrames', 'unlockedCardBacks'],
      })) as any;

      const gameConfigs = await strapi.documents('api::game-config.game-config').findMany({
        populate: ['defaultCardFrame', 'defaultCardBack'],
        limit: 1,
      });
      const config = (gameConfigs as any)?.[0];

      const updateData: Record<string, any> = {};

      if (username !== undefined) {
        updateData.username = username;
      }

      if (avatar_card !== undefined) {
        const cardFilter =
          typeof avatar_card === 'number' || /^\d+$/.test(String(avatar_card))
            ? { id: Number(avatar_card) }
            : { documentId: String(avatar_card) };
        const owned = await strapi.documents('api::user-card.user-card').findMany({
          filters: { user: { id: user.id }, card: cardFilter },
          limit: 1,
        });
        if (!owned || owned.length === 0) {
          return ctx.forbidden("Vous ne possédez pas cette carte pour l'utiliser comme avatar.");
        }
        updateData.avatar_card = avatar_card;
      }

      if (defaultCardFrame !== undefined) {
        const unlockedFrames = [...(fullUser?.unlockedCardFrames || [])];
        if (config?.defaultCardFrame) unlockedFrames.push(config.defaultCardFrame);
        const hasFrame = unlockedFrames.some(
          (f: any) => String(f.id) === String(defaultCardFrame) || String(f.documentId) === String(defaultCardFrame),
        );
        if (!hasFrame) {
          return ctx.forbidden("Vous n'avez pas débloqué ce cadre de carte.");
        }
        updateData.defaultCardFrame = defaultCardFrame;
      }

      if (defaultCardBack !== undefined) {
        const unlockedBacks = [...(fullUser?.unlockedCardBacks || [])];
        if (config?.defaultCardBack) unlockedBacks.push(config.defaultCardBack);
        const hasBack = unlockedBacks.some(
          (b: any) => String(b.id) === String(defaultCardBack) || String(b.documentId) === String(defaultCardBack),
        );
        if (!hasBack) {
          return ctx.forbidden("Vous n'avez pas débloqué ce dos de carte.");
        }
        updateData.defaultCardBack = defaultCardBack;
      }

      const updatedUser = await strapi.documents('plugin::users-permissions.user').update({
        documentId: user.documentId,
        data: updateData,
      });

      ctx.body = sanitizeUser(updatedUser);
    } catch (error: any) {
      ctx.badRequest(error.message);
    }
  };

  // Prepend the route to ensure it's matched before any wildcards
  plugin.routes['content-api'].routes.unshift({
    method: 'PUT',
    path: '/users/profile/update',
    handler: 'user.updateMe',
    config: {
      prefix: '',
    },
  });

  return plugin;
};
