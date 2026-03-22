
export default (plugin: any) => {
  plugin.controllers.user.updateMe = async (ctx: any) => {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }
    const { username, avatar_card } = ctx.request.body;
    
    try {
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: { 
          ...(username ? { username } : {}),
          ...(avatar_card ? { avatar_card } : {})
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
