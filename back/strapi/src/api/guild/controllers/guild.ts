// @ts-nocheck
import { factories } from "@strapi/strapi";
import { z } from "zod";

const guildSchema = z.object({
  name: z.string().trim().min(2).max(50),
  description: z.string().trim().max(500).optional().nullable(),
});

function sanitizeMember(u: any) {
  if (!u) return null;
  return {
    id: u.id,
    documentId: u.documentId,
    username: u.username,
    avatar_card: u.avatar_card || null,
  };
}

function sanitizeGuild(guild: any) {
  if (!guild) return guild;
  return {
    id: guild.id,
    documentId: guild.documentId,
    name: guild.name,
    description: guild.description,
    createdAt: guild.createdAt,
    updatedAt: guild.updatedAt,
    owner: guild.owner ? sanitizeMember(guild.owner) : undefined,
    moderators: Array.isArray(guild.moderators) ? guild.moderators.map(sanitizeMember) : undefined,
    members: Array.isArray(guild.members) ? guild.members.map(sanitizeMember) : undefined,
  };
}

export default factories.createCoreController("api::guild.guild" as any, ({ strapi }: { strapi: any }) => ({
  async find(ctx) {
    const authUser = ctx.state.user;
    if (!authUser) return ctx.unauthorized();

    const query = { ...(ctx.query || {}) } as any;
    const page = Math.max(1, parseInt(query.pagination?.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(query.pagination?.pageSize, 10) || 25));

    const [guilds, total] = await Promise.all([
      strapi.documents("api::guild.guild").findMany({
        filters: query.filters || {},
        populate: ["owner", "members"],
        sort: query.sort || "createdAt:desc",
        page,
        pageSize,
      }),
      strapi.documents("api::guild.guild").count({ filters: query.filters || {} }),
    ]);

    return {
      data: guilds.map(sanitizeGuild),
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount: Math.max(1, Math.ceil(total / pageSize)),
          total,
        },
      },
    };
  },

  async findOne(ctx) {
    const authUser = ctx.state.user;
    if (!authUser) return ctx.unauthorized();

    const { id: documentId } = ctx.params;
    const guild = await strapi.documents("api::guild.guild").findOne({
      documentId,
      populate: ["owner", "moderators", "members"],
    });

    if (!guild) return ctx.notFound("Guild not found");
    return { data: sanitizeGuild(guild) };
  },

  async create(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const parsed = guildSchema.safeParse(ctx.request.body?.data || {});
      if (!parsed.success) {
        return ctx.badRequest("Invalid guild payload.", parsed.error.flatten());
      }

      const users = await strapi.documents("plugin::users-permissions.user").findMany({
        filters: { id: authUser.id },
        limit: 1,
      });
      const user = users[0];
      if (!user) return ctx.notFound("User record not found");

      const created = await strapi.documents("api::guild.guild").create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description || "",
          owner: user.documentId,
          members: { connect: [user.documentId] },
        },
        populate: ["owner", "members"],
      });

      return { data: sanitizeGuild(created) };
    } catch (err) {
      strapi.log.error("[Guild] Error in create:", err);
      ctx.throw(500, err.message);
    }
  },

  async join(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const users = await strapi.documents("plugin::users-permissions.user").findMany({
        filters: { id: authUser.id },
        limit: 1,
      });
      const user = users[0];
      if (!user) return ctx.notFound("User record not found");

      const { id: documentId } = ctx.params;
      const guild = await strapi.documents("api::guild.guild").findOne({
        documentId,
        populate: ["members"],
      });

      if (!guild) return ctx.notFound("Guild not found");

      const isAlreadyMember = guild.members?.some(
        (member: any) => member.documentId === user.documentId || member.id === user.id,
      );
      if (isAlreadyMember) {
        return ctx.badRequest("You are already a member of this guild");
      }

      const updatedGuild = await strapi.documents("api::guild.guild").update({
        documentId,
        data: {
          members: { connect: [user.documentId] },
        },
      });

      return { data: sanitizeGuild(updatedGuild), message: "Successfully joined the guild" };
    } catch (err) {
      strapi.log.error("[Guild] Error in join:", err);
      ctx.throw(500, err.message);
    }
  },

  async leave(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const users = await strapi.documents("plugin::users-permissions.user").findMany({
        filters: { id: authUser.id },
        limit: 1,
      });
      const user = users[0];
      if (!user) return ctx.notFound("User record not found");

      const { id: documentId } = ctx.params;
      const guild = await strapi.documents("api::guild.guild").findOne({
        documentId,
        populate: ["owner"],
      });
      if (!guild) return ctx.notFound("Guild not found");

      if (guild.owner?.id === user.id || guild.owner?.documentId === user.documentId) {
        return ctx.badRequest("Le propriétaire ne peut pas quitter la guilde sans la supprimer.");
      }

      const updatedGuild = await strapi.documents("api::guild.guild").update({
        documentId,
        data: {
          members: { disconnect: [user.documentId] },
          moderators: { disconnect: [user.documentId] },
        },
      });

      return { data: sanitizeGuild(updatedGuild), message: "Successfully left the guild" };
    } catch (err) {
      strapi.log.error("[Guild] Error in leave:", err);
      ctx.throw(500, err.message);
    }
  },

  async getMeGuilds(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const users = await strapi.documents("plugin::users-permissions.user").findMany({
        filters: { id: authUser.id },
        limit: 1,
      });
      const user = users[0];
      if (!user) return ctx.notFound("User record not found");

      const userGuilds = await strapi.documents("api::guild.guild").findMany({
        filters: {
          members: { documentId: user.documentId },
        },
        populate: ["members", "owner", "moderators"],
        limit: 50,
      });

      return { data: userGuilds.map(sanitizeGuild) };
    } catch (err) {
      strapi.log.error("[Guild] Error in getMeGuilds:", err);
      ctx.throw(500, err.message);
    }
  },

  async getGuildData(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const { id: documentId } = ctx.params;
      const guild = await strapi.documents("api::guild.guild").findOne({
        documentId,
        populate: {
          members: { fields: ["id", "documentId", "username"], populate: ["avatar_card.image"] },
          owner: { fields: ["id", "documentId", "username"], populate: ["avatar_card.image"] },
          moderators: { fields: ["id", "documentId", "username"], populate: ["avatar_card.image"] },
        },
      });

      if (!guild) return ctx.notFound("Guild not found");

      const isMember = guild.members?.some((m: any) => m.id === authUser.id);
      const isPublic = ["global", "général", "general"].includes(guild.name?.toLowerCase());

      if (!isMember && !isPublic) {
        return ctx.forbidden("Not a member of this guild");
      }

      const messages = await strapi.documents("api::chat-message.chat-message").findMany({
        filters: { guild: guild.id },
        sort: "createdAt:desc",
        limit: 50,
        populate: {
          sender: { fields: ["id", "documentId", "username"], populate: ["avatar_card.image"] },
        },
      });

      const sanitizedMessages = messages
        .map((m: any) => ({
          id: m.id,
          documentId: m.documentId,
          content: m.content,
          createdAt: m.createdAt,
          sender: sanitizeMember(m.sender),
        }))
        .reverse();

      return {
        data: {
          ...sanitizeGuild(guild),
          messages: sanitizedMessages,
        },
      };
    } catch (err) {
      strapi.log.error("[Guild] Error in getGuildData:", err);
      ctx.throw(500, err.message);
    }
  },

  async kick(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const { id: documentId } = ctx.params;
      const { memberDocId } = ctx.request.body || {};
      if (!memberDocId) return ctx.badRequest("Member documentId is required");

      const guild = await strapi.documents("api::guild.guild").findOne({
        documentId,
        populate: ["owner", "moderators"],
      });

      if (!guild) return ctx.notFound("Guild not found");

      const isOwner = guild.owner?.id === authUser.id;
      const isModerator = guild.moderators?.some((m: any) => m.id === authUser.id);

      if (!isOwner && !isModerator) return ctx.forbidden("Only owners and moderators can kick members");
      if (guild.owner?.documentId === memberDocId) {
        return ctx.forbidden("Cannot kick the guild owner");
      }
      if (isModerator && !isOwner && guild.moderators?.some((m: any) => m.documentId === memberDocId)) {
        return ctx.forbidden("Moderators cannot kick other moderators");
      }

      await strapi.documents("api::guild.guild").update({
        documentId,
        data: {
          members: { disconnect: [memberDocId] },
          moderators: { disconnect: [memberDocId] },
        },
      });

      return { message: "Member kicked successfully" };
    } catch (err) {
      strapi.log.error("[Guild] Error in kick:", err);
      ctx.throw(500, err.message);
    }
  },

  async promote(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const { id: documentId } = ctx.params;
      const { memberDocId } = ctx.request.body || {};
      if (!memberDocId) return ctx.badRequest("Member documentId is required");

      const guild = await strapi.documents("api::guild.guild").findOne({
        documentId,
        populate: ["owner", "members"],
      });

      if (!guild) return ctx.notFound("Guild not found");
      if (guild.owner?.id !== authUser.id) return ctx.forbidden("Only the owner can promote members");
      if (!guild.members?.some((m: any) => m.documentId === memberDocId)) {
        return ctx.badRequest("User is not a member of this guild");
      }

      await strapi.documents("api::guild.guild").update({
        documentId,
        data: {
          moderators: { connect: [memberDocId] },
        },
      });

      return { message: "Member promoted to moderator" };
    } catch (err) {
      strapi.log.error("[Guild] Error in promote:", err);
      ctx.throw(500, err.message);
    }
  },

  async demote(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const { id: documentId } = ctx.params;
      const { memberDocId } = ctx.request.body || {};
      if (!memberDocId) return ctx.badRequest("Member documentId is required");

      const guild = await strapi.documents("api::guild.guild").findOne({
        documentId,
        populate: ["owner"],
      });

      if (!guild) return ctx.notFound("Guild not found");
      if (guild.owner?.id !== authUser.id) return ctx.forbidden("Only the owner can demote moderators");

      await strapi.documents("api::guild.guild").update({
        documentId,
        data: {
          moderators: { disconnect: [memberDocId] },
        },
      });

      return { message: "Moderator demoted to member" };
    } catch (err) {
      strapi.log.error("[Guild] Error in demote:", err);
      ctx.throw(500, err.message);
    }
  },

  async addMember(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const { id: documentId } = ctx.params;
      const { username } = ctx.request.body || {};
      if (!username) return ctx.badRequest("Username is required");

      const guild = await strapi.documents("api::guild.guild").findOne({
        documentId,
        populate: ["owner", "moderators", "members"],
      });

      if (!guild) return ctx.notFound("Guild not found");

      const isOwner = guild.owner?.id === authUser.id;
      const isModerator = guild.moderators?.some((m: any) => m.id === authUser.id);
      if (!isOwner && !isModerator) return ctx.forbidden("Only owners and moderators can add members");

      const users = await strapi.documents("plugin::users-permissions.user").findMany({
        filters: { username },
        limit: 1,
      });

      const targetUser = users[0];
      if (!targetUser) return ctx.notFound("User not found");

      const isAlreadyMember = guild.members?.some((m: any) => m.documentId === targetUser.documentId);
      if (isAlreadyMember) return ctx.badRequest("User is already a member of this guild");

      await strapi.documents("api::guild.guild").update({
        documentId,
        data: {
          members: { connect: [targetUser.documentId] },
        },
      });

      return { message: "Member added successfully" };
    } catch (err) {
      strapi.log.error("[Guild] Error in addMember:", err);
      ctx.throw(500, err.message);
    }
  },

  async update(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const { id: documentId } = ctx.params;
      const guild = await strapi.documents("api::guild.guild").findOne({
        documentId,
        populate: ["owner"],
      });

      if (!guild) return ctx.notFound("Guild not found");
      if (guild.owner?.id !== authUser.id) return ctx.forbidden("Only the owner can update guild settings");

      const parsed = guildSchema.partial().safeParse(ctx.request.body?.data || {});
      if (!parsed.success) {
        return ctx.badRequest("Invalid guild update payload.", parsed.error.flatten());
      }

      const updated = await strapi.documents("api::guild.guild").update({
        documentId,
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        },
      });

      return { data: sanitizeGuild(updated) };
    } catch (err) {
      strapi.log.error("[Guild] Error in update:", err);
      ctx.throw(500, err.message);
    }
  },

  async delete(ctx) {
    try {
      const authUser = ctx.state.user;
      if (!authUser) return ctx.unauthorized();

      const { id: documentId } = ctx.params;
      const guild = await strapi.documents("api::guild.guild").findOne({
        documentId,
        populate: ["owner"],
      });

      if (!guild) return ctx.notFound("Guild not found");
      if (guild.owner?.id !== authUser.id) return ctx.forbidden("Only the owner can delete the guild");

      await strapi.documents("api::guild.guild").delete({ documentId });
      return { data: sanitizeGuild(guild) };
    } catch (err) {
      strapi.log.error("[Guild] Error in delete:", err);
      ctx.throw(500, err.message);
    }
  },
}));
