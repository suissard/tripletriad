// @ts-nocheck
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::chat-message.chat-message', ({ strapi }) => ({
  async getMessages(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      // Fetch the full user from Document Service to ensure we have documentId
      const users = await strapi.documents('plugin::users-permissions.user').findMany({
        filters: { id: authUser.id },
        limit: 1
      });
      const user = users[0];
      if (!user) return ctx.notFound('User record not found');

      const { targetUserId, guildId, page = 1, pageSize = 50 } = ctx.query;
      strapi.log.info(`[ChatMessage] getMessages - user: ${user.username} (${user.documentId}), guildId: ${guildId}, targetUserId: ${targetUserId}`);

      if (!targetUserId && !guildId) {
        return ctx.badRequest('Must provide targetUserId or guildId');
      }

      let filters = {};

      if (guildId) {
        // Fetching guild messages
        // Support both numeric ID and documentId string
        const guildFilter = typeof guildId === 'string' && guildId.length > 10 
          ? { documentId: guildId } 
          : { id: guildId };

        const guild = await strapi.documents('api::guild.guild').findOne({ 
          ...guildFilter,
          populate: ['members'] 
        });
        
        if (!guild) return ctx.notFound('Guild not found');
        
        // Canonical ID for the filter to avoid SQL type errors
        filters = { guild: guild.id };
        
        // Check membership
        const isMember = guild.members?.some(m => 
          (m.documentId && m.documentId === user.documentId) || 
          (m.id === user.id)
        );
        
        // Allow access if member OR if it's the Global/Général guild
        const isPublicGuild = ['global', 'général', 'general'].includes(guild.name?.toLowerCase());
        
        if (!isMember && !isPublicGuild) {
           strapi.log.warn(`[ChatMessage] User ${user.username} (${user.documentId}) is not a member of guild ${guild.name} (${guild.documentId})`);
           return ctx.forbidden('Not a member of this guild');
        }
      } else if (targetUserId) {
        // Fetching DM messages
        // Support both numeric ID and documentId string for the target user
        const targetUserFilter = typeof targetUserId === 'string' && targetUserId.length > 10 
          ? { documentId: targetUserId } 
          : { id: targetUserId };
        
        const targetUsers = await strapi.documents('plugin::users-permissions.user').findMany({
          filters: targetUserFilter,
          limit: 1
        });
        
        const targetUser = targetUsers[0];
        if (!targetUser) return ctx.notFound('Target user not found');

        filters = {
          $or: [
            { sender: { documentId: user.documentId }, receiver: { documentId: targetUser.documentId } },
            { sender: { documentId: targetUser.documentId }, receiver: { documentId: user.documentId } }
          ]
        };
      }

      const messages = await strapi.documents('api::chat-message.chat-message').findMany({
        filters,
        sort: 'createdAt:desc',
        limit: Number(pageSize),
        start: (Number(page) - 1) * Number(pageSize),
        populate: ['sender', 'sender.avatar_card.image']
      });

      // Fix for Strapi 5: documentService does not have a .count() method. 
      // Use strapi.db.query instead.
      const total = await strapi.db.query('api::chat-message.chat-message').count({ where: filters });

      // Sanitize
      const sanitized = messages.map(m => ({
        ...m,
        sender: m.sender ? { 
          id: m.sender.id, 
          username: m.sender.username, 
          documentId: m.sender.documentId,
          avatar_card: m.sender.avatar_card
        } : null
      })).reverse();

      return {
        data: sanitized,
        meta: {
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            pageCount: Math.ceil(total / Number(pageSize)),
            total
          }
        }
      };
    } catch (error) {
      strapi.log.error('[ChatMessage] Error in getMessages:', error);
      ctx.throw(500, error.message);
    }
  },

  async sendMessage(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const users = await strapi.documents('plugin::users-permissions.user').findMany({
        filters: { id: authUser.id },
        populate: ['avatar_card.image'],
        limit: 1
      });
      const user = users[0];
      if (!user) return ctx.notFound('User record not found');

      const { content, receiverId, guildId } = ctx.request.body;
      strapi.log.info(`[ChatMessage] sendMessage - user: ${user.username} (${user.documentId}), guildId: ${guildId}, receiverId: ${receiverId}`);

      if (!content || (!receiverId && !guildId)) {
        return ctx.badRequest('Content and either receiverId or guildId are required');
      }

      let data = {
        content,
        sender: user.documentId,
      };

      let emitRoom = null;

      if (guildId) {
        // Support both numeric ID and documentId string
        const guildFilter = typeof guildId === 'string' && guildId.length > 10 
          ? { documentId: guildId } 
          : { id: guildId };

        const guild = await strapi.documents('api::guild.guild').findOne({ 
          ...guildFilter,
          populate: ['members'] 
        });
        if (!guild) return ctx.notFound('Guild not found');
        
        const isMember = guild.members?.some(m => 
          (m.documentId && m.documentId === user.documentId) || 
          (m.id === user.id)
        );
        
        const isPublicGuild = ['global', 'général', 'general'].includes(guild.name?.toLowerCase());

        if (!isMember && !isPublicGuild) {
          strapi.log.warn(`[ChatMessage] User ${user.username} tried to send message to guild ${guild.name} without being a member.`);
          return ctx.forbidden('Not a member of this guild');
        }

        data.guild = guild.documentId;
        emitRoom = `guild_${guild.documentId}`;
      } else {
        // Support both numeric ID and documentId string for receiver
        const targetUserFilter = typeof receiverId === 'string' && receiverId.length > 10 
          ? { documentId: receiverId } 
          : { id: receiverId };

        const targetUsers = await strapi.documents('plugin::users-permissions.user').findMany({
            filters: targetUserFilter,
            limit: 1
        });
        const targetUser = targetUsers[0];
        if (!targetUser) return ctx.notFound('Receiver not found');

        data.receiver = targetUser.documentId;

        const ids = [user.documentId, targetUser.documentId].sort();
        emitRoom = `dm_${ids[0]}_${ids[1]}`;
      }

      const newMessage = await strapi.documents('api::chat-message.chat-message').create({
        data,
        status: 'published',
        populate: ['sender']
      });

      const sanitizedMessage: any = {
        ...newMessage,
        sender: { 
          id: user.id, 
          username: user.username, 
          documentId: user.documentId,
          avatar_card: user.avatar_card
        }
      };

      if (guildId) {
        sanitizedMessage.guild = { documentId: data.guild };
      } else {
        sanitizedMessage.receiver = { documentId: data.receiver };
      }

      if (strapi.io) {
        strapi.io.to(emitRoom).emit('new-chat-message', sanitizedMessage);
      }

      return { data: sanitizedMessage };
    } catch (error) {
      strapi.log.error('[ChatMessage] Error in sendMessage:', error);
      ctx.throw(500, error.message);
    }
  }
}));
