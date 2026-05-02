// @ts-nocheck
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::guild.guild' as any, ({ strapi }: { strapi: any }) => ({
  async create(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      // Ensure we have the user's documentId
      const users = await strapi.documents('plugin::users-permissions.user').findMany({
        filters: { id: authUser.id },
        limit: 1
      });
      const user = users[0];
      if (!user) return ctx.notFound('User record not found');

      // Initialize data if not present
      if (!ctx.request.body.data) {
        ctx.request.body.data = {};
      }

      // Set the owner
      ctx.request.body.data.owner = user.documentId;
      
      // Also add the owner to members automatically
      if (!ctx.request.body.data.members) {
        ctx.request.body.data.members = { connect: [user.documentId] };
      } else if (typeof ctx.request.body.data.members === 'object' && ctx.request.body.data.members.connect) {
        if (!ctx.request.body.data.members.connect.includes(user.documentId)) {
          ctx.request.body.data.members.connect.push(user.documentId);
        }
      } else if (Array.isArray(ctx.request.body.data.members)) {
        if (!ctx.request.body.data.members.includes(user.documentId)) {
          ctx.request.body.data.members.push(user.documentId);
        }
      } else {
        // Fallback or override if it's some other format
        ctx.request.body.data.members = { connect: [user.documentId] };
      }

      // Call the default core create controller
      const response = await super.create(ctx);
      return response;
    } catch (err) {
      strapi.log.error('[Guild] Error in create:', err);
      ctx.throw(500, err.message);
    }
  },

  async join(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      // Ensure we have the user's documentId
      const users = await strapi.documents('plugin::users-permissions.user').findMany({
        filters: { id: authUser.id },
        limit: 1
      });
      const user = users[0];
      if (!user) return ctx.notFound('User record not found');

      const { id: documentId } = ctx.params;
      strapi.log.info(`[Guild] User ${user.username} (${user.documentId}) joining guild ${documentId}`);

      // Check if guild exists
      const guild = await strapi.documents('api::guild.guild').findOne({
        documentId,
        populate: ['members', 'owner', 'moderators']
      });

      if (!guild) return ctx.notFound('Guild not found');

      // Check if already a member
      const isAlreadyMember = guild.members?.some((member: any) => 
        member.documentId === user.documentId
      );
      
      if (isAlreadyMember) {
        return ctx.badRequest('You are already a member of this guild');
      }

      // Add member using 'connect' - The Strapi 5 way for relations
      const updatedGuild = await strapi.documents('api::guild.guild').update({
        documentId,
        data: {
          members: {
            connect: [user.documentId]
          }
        }
      });

      return { data: updatedGuild, message: 'Successfully joined the guild' };
    } catch (err) {
      strapi.log.error('[Guild] Error in join:', err);
      ctx.throw(500, err.message);
    }
  },

  async leave(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const users = await strapi.documents('plugin::users-permissions.user').findMany({
        filters: { id: authUser.id },
        limit: 1
      });
      const user = users[0];
      if (!user) return ctx.notFound('User record not found');

      const { id: documentId } = ctx.params;

      const updatedGuild = await strapi.documents('api::guild.guild').update({
        documentId,
        data: {
          members: {
            disconnect: [user.documentId]
          }
        }
      });

      return { data: updatedGuild, message: 'Successfully left the guild' };
    } catch (err) {
      strapi.log.error('[Guild] Error in leave:', err);
      ctx.throw(500, err.message);
    }
  },
  async getMeGuilds(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      // Ensure we have the user's documentId
      const users = await strapi.documents('plugin::users-permissions.user').findMany({
        filters: { id: authUser.id },
        limit: 1
      });
      const user = users[0];
      if (!user) return ctx.notFound('User record not found');

      // Find all guilds where this user is a member
      const userGuilds = await strapi.documents('api::guild.guild').findMany({
        filters: {
          members: { documentId: user.documentId }
        },
        populate: ['members']
      });

      return { data: userGuilds };
    } catch (err) {
      strapi.log.error('[Guild] Error in getMeGuilds:', err);
      ctx.throw(500, err.message);
    }
  },

  async getGuildData(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const { id: documentId } = ctx.params;
      strapi.log.info(`[Guild] getGuildData - user: ${authUser.username}, guild: ${documentId}`);

      const guild = await strapi.documents('api::guild.guild').findOne({
        documentId,
        populate: ['members', 'members.avatar_card.image', 'owner', 'owner.avatar_card.image', 'moderators', 'moderators.avatar_card.image']
      });

      if (!guild) return ctx.notFound('Guild not found');

      // Check membership
      const isMember = guild.members?.some((m: any) => m.id === authUser.id);
      const isPublic = ['global', 'général', 'general'].includes(guild.name?.toLowerCase());

      if (!isMember && !isPublic) {
        strapi.log.warn(`[Guild] User ${authUser.username} tried to access guild data for ${guild.name} without being a member.`);
        return ctx.forbidden('Not a member of this guild');
      }

      const messages = await strapi.documents('api::chat-message.chat-message').findMany({
        filters: { guild: guild.id },
        sort: 'createdAt:desc',
        limit: 50,
        populate: ['sender', 'sender.avatar_card.image']
      });

      // Sanitize members and messages
      const sanitizedMembers = guild.members?.map((m: any) => ({
        id: m.id,
        documentId: m.documentId,
        username: m.username,
        avatar_card: m.avatar_card
      }));

      const sanitizedMessages = messages.map((m: any) => ({
        id: m.id,
        documentId: m.documentId,
        content: m.content,
        createdAt: m.createdAt,
        sender: m.sender ? {
          id: m.sender.id,
          documentId: m.sender.documentId,
          username: m.sender.username,
          avatar_card: m.sender.avatar_card
        } : null
      })).reverse();

      return {
        data: {
          ...guild,
          members: sanitizedMembers,
          messages: sanitizedMessages
        }
      };
    } catch (err) {
      strapi.log.error('[Guild] Error in getGuildData:', err);
      ctx.throw(500, err.message);
    }
  }
}));
