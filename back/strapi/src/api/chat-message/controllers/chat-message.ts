// @ts-nocheck
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::chat-message.chat-message', ({ strapi }) => ({
  async getMessages(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { targetUserId, guildId, page = 1, pageSize = 50 } = ctx.query;

    if (!targetUserId && !guildId) {
      return ctx.badRequest('Must provide targetUserId or guildId');
    }

    let filters = {};

    if (guildId) {
      // Fetching guild messages
      filters = { guild: guildId };
      // Optional: check if user is in guild
      const guild = await strapi.entityService.findOne('api::guild.guild', guildId as string, { populate: ['members'] });
      if (!guild) return ctx.notFound('Guild not found');
      const isMember = guild.members?.some(m => m.id === user.id);
      if (!isMember && guild.name !== 'Global') {
         return ctx.forbidden('Not a member of this guild');
      }
    } else if (targetUserId) {
      // Fetching DM messages
      filters = {
        $or: [
          { sender: user.id, receiver: targetUserId },
          { sender: targetUserId, receiver: user.id }
        ]
      };
    }

    const [messages, count] = await Promise.all([
      strapi.entityService.findMany('api::chat-message.chat-message', {
        filters,
        sort: { createdAt: 'desc' },
        start: (Number(page) - 1) * Number(pageSize),
        limit: Number(pageSize),
        populate: ['sender']
      }),
      strapi.entityService.count('api::chat-message.chat-message', { filters })
    ]);

    // Sanitize
    const sanitized = messages.map(m => ({
      ...m,
      sender: m.sender ? { id: m.sender.id, username: m.sender.username } : null
    })).reverse(); // Return in chronological order (oldest first in the slice)

    return {
      data: sanitized,
      meta: {
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          pageCount: Math.ceil(count / Number(pageSize)),
          total: count
        }
      }
    };
  },

  async sendMessage(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { content, receiverId, guildId } = ctx.request.body;

    if (!content || (!receiverId && !guildId)) {
      return ctx.badRequest('Content and either receiverId or guildId are required');
    }

    let data = {
      content,
      sender: user.id,
    };

    let emitRoom = null;

    if (guildId) {
      // Validate guild
      const guild = await strapi.entityService.findOne('api::guild.guild', guildId, { populate: ['members'] });
      if (!guild) return ctx.notFound('Guild not found');
      const isMember = guild.members?.some(m => m.id === user.id);
      if (!isMember && guild.name !== 'Global') return ctx.forbidden('Not a member of this guild');

      data.guild = guildId;
      emitRoom = `guild_${guildId}`;
    } else {
      // Validate receiver (check if blocked, maybe friends only? For now just send)
      const targetUser = await strapi.entityService.findOne('plugin::users-permissions.user', receiverId);
      if (!targetUser) return ctx.notFound('Receiver not found');

      data.receiver = receiverId;

      // Determine the DM room (always sorted by ID to match both users)
      const smallerId = Math.min(user.id, receiverId);
      const largerId = Math.max(user.id, receiverId);
      emitRoom = `dm_${smallerId}_${largerId}`;
    }

    const newMessage = await strapi.entityService.create('api::chat-message.chat-message', {
      data,
      populate: ['sender']
    });

    const sanitizedMessage = {
      ...newMessage,
      sender: { id: user.id, username: user.username }
    };

    // Real-time emission using Socket.IO attached to strapi
    if ((strapi as any).io) {
      (strapi as any).io.to(emitRoom).emit('new-chat-message', sanitizedMessage);
    }

    return { data: sanitizedMessage };
  }
}));
