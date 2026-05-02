export default {
  routes: [
    {
      method: 'GET',
      path: '/guilds',
      handler: 'guild.find',
      config: { policies: [] }
    },
    {
      method: 'GET',
      path: '/guilds/me',
      handler: 'guild.getMeGuilds',
      config: { policies: [] }
    },
    {
      method: 'GET',
      path: '/guilds/:id',
      handler: 'guild.findOne',
      config: { policies: [] }
    },
    {
      method: 'POST',
      path: '/guilds',
      handler: 'guild.create',
      config: { policies: [] }
    },
    {
      method: 'POST',
      path: '/guilds/:id/join',
      handler: 'guild.join',
      config: { policies: [] }
    },
    {
      method: 'POST',
      path: '/guilds/:id/leave',
      handler: 'guild.leave',
      config: { policies: [] }
    },
    {
      method: 'GET',
      path: '/guilds/:id/data',
      handler: 'guild.getGuildData',
      config: { policies: [] }
    }
  ]
};
