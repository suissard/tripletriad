
export default (plugin: any) => {
  const coreMe = plugin.controllers.user.me;

  plugin.controllers.user.me = async (ctx: any) => {
    // 1) Laisse le controller core s'occuper de la vérification et renvoyer le body de base
    await coreMe(ctx);
    
    const baseUser = ctx.body;
    if (!baseUser || !baseUser.id) return;

    // 2) Récupère l'utilisateur avec toutes les relations demandées par le front
    // En Strapi 5, on privilégie l'usage de documentId si disponible
    const userDocId = baseUser.documentId || baseUser.id;
    
    const populatedUser = (await strapi.documents('plugin::users-permissions.user').findOne({
      documentId: userDocId,
      populate: {
        role: true,
        wallet: true,
        avatar_card: {
          populate: {
            image: true
          }
        },
        unlockedCardFrames: true,
        unlockedCardBacks: true,
        defaultCardFrame: true,
        defaultCardBack: true,
        playerStoryProgresses: true
      }
    })) as any;

    // 2b) Récupère les défauts globaux depuis la GameConfig
    try {
      const gameConfigs = await strapi.entityService.findMany('api::game-config.game-config', {
        populate: ['defaultCardFrame', 'defaultCardBack']
      });
      const config = (gameConfigs as any)?.[0];
      const globalDefaultFrame = config?.defaultCardFrame;
      const globalDefaultBack = config?.defaultCardBack;
      
      if (populatedUser) {
        if (globalDefaultFrame) {
          if (!populatedUser.unlockedCardFrames) populatedUser.unlockedCardFrames = [];
          const alreadyHasFrame = populatedUser.unlockedCardFrames.some((f: any) => 
            f.id === globalDefaultFrame.id || f.documentId === globalDefaultFrame.documentId
          );
          if (!alreadyHasFrame) populatedUser.unlockedCardFrames.push(globalDefaultFrame);
        }

        if (globalDefaultBack) {
          if (!populatedUser.unlockedCardBacks) populatedUser.unlockedCardBacks = [];
          const alreadyHasBack = populatedUser.unlockedCardBacks.some((b: any) => 
            b.id === globalDefaultBack.id || b.documentId === globalDefaultBack.documentId
          );
          if (!alreadyHasBack) populatedUser.unlockedCardBacks.push(globalDefaultBack);
        }
      }
    } catch (err) {
      console.error('Error injecting global defaults:', err);
    }

    // 3) Clean up sensitive fields manually since `sanitize.contentAPI` is undefined in Strapi 5 utils
    if (populatedUser) {
      delete populatedUser.password;
      delete populatedUser.resetPasswordToken;
      delete populatedUser.confirmationToken;
    }

    ctx.body = populatedUser;
  };

  plugin.controllers.user.updateMe = async (ctx: any) => {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }
    const { username, avatar_card, defaultCardFrame, defaultCardBack } = ctx.request.body;
    
    try {
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: { 
          ...(username ? { username } : {}),
          ...(avatar_card ? { avatar_card } : {}),
          ...(defaultCardFrame ? { defaultCardFrame } : {}),
          ...(defaultCardBack ? { defaultCardBack } : {})
        },
      });
      
      ctx.body = updatedUser;
    } catch (error) {
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
