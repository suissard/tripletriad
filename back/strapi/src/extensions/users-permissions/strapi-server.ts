
export default (plugin: any) => {
  const coreMe = plugin.controllers.user.me;

  plugin.controllers.user.me = async (ctx: any) => {
    // 1) Laisse le controller core s'occuper de la vérification et renvoyer le body de base
    await coreMe(ctx);
    
    const baseUser = ctx.body;
    if (!baseUser || !baseUser.id) return;

    // 2) Récupère l'utilisateur avec toutes les relations demandées par le front
    const populatedUser = (await strapi.entityService.findOne('plugin::users-permissions.user', baseUser.id, {
      populate: {
        role: true,
        wallet: true,
        avatar_card: {
          populate: ['image']
        },
        unlockedCardFrames: true,
        defaultCardFrame: true,
        storyProgresses: true
      }
    })) as any;

    // 2b) Récupère le cadre par défaut global depuis la GameConfig
    try {
      const gameConfigs = await strapi.entityService.findMany('api::game-config.game-config', {
        populate: ['defaultCardFrame']
      });
      const globalDefaultFrame = (gameConfigs as any)?.[0]?.defaultCardFrame;
      
      if (globalDefaultFrame && populatedUser) {
        if (!populatedUser.unlockedCardFrames) populatedUser.unlockedCardFrames = [];
        const alreadyHasIt = populatedUser.unlockedCardFrames.some((f: any) => 
          f.id === globalDefaultFrame.id || f.documentId === globalDefaultFrame.documentId
        );
        if (!alreadyHasIt) {
          populatedUser.unlockedCardFrames.push(globalDefaultFrame);
        }
      }
    } catch (err) {
      console.error('Error injecting global default frame:', err);
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
    const { username, avatar_card, defaultCardFrame } = ctx.request.body;
    
    try {
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: { 
          ...(username ? { username } : {}),
          ...(avatar_card ? { avatar_card } : {}),
          ...(defaultCardFrame ? { defaultCardFrame } : {})
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
