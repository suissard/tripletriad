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
      method: 'POST',
      path: '/guilds/:id/kick',
      handler: 'guild.kick',
      config: { policies: [] }
    },
    {
      method: 'POST',
      path: '/guilds/:id/promote',
      handler: 'guild.promote',
      config: { policies: [] }
    },
    {
      method: 'POST',
      path: '/guilds/:id/demote',
      handler: 'guild.demote',
      config: { policies: [] }
    },
    {
      method: 'PUT',
      path: '/guilds/:id',
      handler: 'guild.update',
      config: { policies: [] }
    },
    {
      method: 'DELETE',
      path: '/guilds/:id',
      handler: 'guild.delete',
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
