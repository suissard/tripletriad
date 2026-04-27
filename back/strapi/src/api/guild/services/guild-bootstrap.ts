export async function bootstrapGuild(strapi: any) {
  try {
    const globalGuilds = await strapi.entityService.findMany('api::guild.guild', {
      filters: { name: 'Global' }
    });

    if (globalGuilds.length === 0) {
      strapi.log.info('⚙️  Bootstrapping Global Guild...');
      await strapi.entityService.create('api::guild.guild', {
        data: {
          name: 'Global',
          description: 'The general chat channel for all players'
        }
      });
    }
  } catch (error) {
    strapi.log.error('❌ Failed to bootstrap guild:', error);
  }
}
