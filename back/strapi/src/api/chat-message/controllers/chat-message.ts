// @ts-nocheck
import { factories } from "@strapi/strapi";
import { z } from "zod";

const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "Message content cannot be empty").max(1000, "Message too long"),
  receiverId: z.union([z.number().int().positive(), z.string().trim().min(1)]).optional(),
  guildId: z.union([z.number().int().positive(), z.string().trim().min(1)]).optional(),
});

async function resolveGuild(strapi: any, guildId: string | number) {
  const isNumeric = typeof guildId === "number" || /^\d+$/.test(String(guildId));
  const guilds = await strapi.documents("api::guild.guild").findMany({
    filters: isNumeric ? { id: Number(guildId) } : { documentId: String(guildId) },
    populate: ["members"],
    limit: 1,
  });
  return guilds?.[0] || null;
}

async function resolveUser(strapi: any, targetUserId: string | number) {
  const isNumeric = typeof targetUserId === "number" || /^\d+$/.test(String(targetUserId));
  const users = await strapi.documents("plugin::users-permissions.user").findMany({
    filters: isNumeric ? { id: Number(targetUserId) } : { documentId: String(targetUserId) },
    limit: 1,
  });
  return users?.[0] || null;
}

export default factories.createCoreController("api::chat-message.chat-message", ({ strapi }) => ({
  async getMessages(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const users = await strapi.documents("plugin::users-permissions.user").findMany({
        filters: { id: authUser.id },
        limit: 1,
      });
      const user = users[0];
      if (!user) return ctx.notFound("User record not found");

      const { targetUserId, guildId } = ctx.query;
      const page = Math.max(1, parseInt(ctx.query.page as string, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(ctx.query.pageSize as string, 10) || 50));

      if (!targetUserId && !guildId) {
        return ctx.badRequest("Must provide targetUserId or guildId");
      }

      let filters: any = {};

      if (guildId) {
        const guild = await resolveGuild(strapi, guildId as string);
        if (!guild) return ctx.notFound("Guild not found");

        filters = { guild: guild.id };
        const isMember = guild.members?.some(
          (m: any) => (m.documentId && m.documentId === user.documentId) || m.id === user.id,
        );
        const isPublicGuild = ["global", "général", "general"].includes(guild.name?.toLowerCase());

        if (!isMember && !isPublicGuild) {
          return ctx.forbidden("Not a member of this guild");
        }
      } else if (targetUserId) {
        const targetUser = await resolveUser(strapi, targetUserId as string);
        if (!targetUser) return ctx.notFound("Target user not found");

        filters = {
          $or: [
            { sender: { documentId: user.documentId }, receiver: { documentId: targetUser.documentId } },
            { sender: { documentId: targetUser.documentId }, receiver: { documentId: user.documentId } },
          ],
        };
      }

      const messages = await strapi.documents("api::chat-message.chat-message").findMany({
        filters,
        sort: "createdAt:desc",
        limit: pageSize,
        start: (page - 1) * pageSize,
        populate: {
          sender: { fields: ["id", "documentId", "username"], populate: ["avatar_card.image"] },
        },
      });

      const total = await strapi.db.query("api::chat-message.chat-message").count({ where: filters });

      const sanitized = messages
        .map((m: any) => ({
          ...m,
          sender: m.sender
            ? {
                id: m.sender.id,
                username: m.sender.username,
                documentId: m.sender.documentId,
                avatar_card: m.sender.avatar_card,
              }
            : null,
        }))
        .reverse();

      return {
        data: sanitized,
        meta: {
          pagination: {
            page,
            pageSize,
            pageCount: Math.max(1, Math.ceil(total / pageSize)),
            total,
          },
        },
      };
    } catch (error) {
      strapi.log.error("[ChatMessage] Error in getMessages:", error);
      ctx.throw(500, error.message);
    }
  },

  async sendMessage(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const users = await strapi.documents("plugin::users-permissions.user").findMany({
        filters: { id: authUser.id },
        populate: ["avatar_card.image"],
        limit: 1,
      });
      const user = users[0];
      if (!user) return ctx.notFound("User record not found");

      const parsed = sendMessageSchema.safeParse(ctx.request.body || {});
      if (!parsed.success) {
        return ctx.badRequest("Invalid message payload.", parsed.error.flatten());
      }

      const { content, receiverId, guildId } = parsed.data;
      if (!receiverId && !guildId) {
        return ctx.badRequest("Content and either receiverId or guildId are required");
      }

      const data: any = {
        content,
        sender: user.documentId,
      };
      let emitRoom = null;

      if (guildId) {
        const guild = await resolveGuild(strapi, guildId);
        if (!guild) return ctx.notFound("Guild not found");

        const isMember = guild.members?.some(
          (m: any) => (m.documentId && m.documentId === user.documentId) || m.id === user.id,
        );
        const isPublicGuild = ["global", "général", "general"].includes(guild.name?.toLowerCase());

        if (!isMember && !isPublicGuild) {
          return ctx.forbidden("Not a member of this guild");
        }

        data.guild = guild.documentId;
        emitRoom = `guild_${guild.documentId}`;
      } else {
        const targetUser = await resolveUser(strapi, receiverId!);
        if (!targetUser) return ctx.notFound("Receiver not found");

        // Block check on DMs
        const blocked = await strapi.documents("api::friendship.friendship").findMany({
          filters: {
            status: "blocked",
            $or: [
              { requester: { id: user.id }, receiver: { id: targetUser.id } },
              { requester: { id: targetUser.id }, receiver: { id: user.id } },
            ],
          },
          limit: 1,
        });
        if (blocked.length > 0) {
          return ctx.forbidden("Impossible d'envoyer un message à cet utilisateur.");
        }

        data.receiver = targetUser.documentId;
        const ids = [user.documentId, targetUser.documentId].sort();
        emitRoom = `dm_${ids[0]}_${ids[1]}`;
      }

      const newMessage = await strapi.documents("api::chat-message.chat-message").create({
        data,
        status: "published",
        populate: ["sender"],
      });

      const sanitizedMessage: any = {
        ...newMessage,
        sender: {
          id: user.id,
          username: user.username,
          documentId: user.documentId,
          avatar_card: user.avatar_card,
        },
      };

      if (guildId) {
        sanitizedMessage.guild = { documentId: data.guild };
      } else {
        sanitizedMessage.receiver = { documentId: data.receiver };
      }

      if (strapi.io && emitRoom) {
        strapi.io.to(emitRoom).emit("new-chat-message", sanitizedMessage);
      }

      return { data: sanitizedMessage };
    } catch (error) {
      strapi.log.error("[ChatMessage] Error in sendMessage:", error);
      ctx.throw(500, error.message);
    }
  },
}));
