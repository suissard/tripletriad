export default {
  async getProfile(ctx: any) {
    const { identifier } = ctx.params;
    const requester = ctx.state.user;

    if (!identifier) {
      return ctx.badRequest("Identifier is required.");
    }

    // Build filters carefully to avoid undefined bindings
    const filters: any = {
      $or: [
        { username: identifier },
        { documentId: identifier }
      ],
    };

    if (/^\d+$/.test(identifier)) {
      filters.$or.push({ id: Number(identifier) });
    }

    // Find user by username or documentId
    const users = await strapi.documents("plugin::users-permissions.user").findMany({
      filters,
      populate: ["avatar_card.image", "guilds"],
      limit: 1,
    });

    const targetUser = users[0] as any;
    if (!targetUser) {
      return ctx.notFound("Player not found.");
    }

    // 1. Calculate Card Stats via SQL aggregation
    const knex = strapi.db.connection;
    const statsRow: any = await knex("user_cards as uc")
      .join("user_cards_user_lnk as lnk", "uc.id", "lnk.user_card_id")
      .where("lnk.user_id", targetUser.id)
      .select(
        knex.raw("COALESCE(SUM(uc.quantity), 0) as total_cards"),
        knex.raw("COUNT(uc.id) as unique_cards"),
      )
      .first();

    const totalCards = Number(statsRow?.total_cards || 0);
    const uniqueCards = Number(statsRow?.unique_cards || 0);

    // 2. Calculate Ancienneté (Days since creation)
    const createdAt = new Date(targetUser.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 3. Friendship Status (if requester is logged in)
    let friendshipStatus = null;
    let friendshipId = null;
    let isRequester = false;

    if (requester && requester.id !== targetUser.id) {
      // @ts-ignore
      const friendships = await strapi.documents("api::friendship.friendship").findMany({
        filters: {
          $or: [
            { requester: { id: Number(requester.id) }, receiver: { id: Number(targetUser.id) } },
            { requester: { id: Number(targetUser.id) }, receiver: { id: Number(requester.id) } },
          ],
        },
        populate: ["requester"],
        limit: 1,
      });

      if (friendships.length > 0) {
        const f = friendships[0];
        friendshipStatus = f.status;
        friendshipId = f.documentId;
        isRequester = f.requester?.id === requester.id;
      }
    }

    // 4. Guild info
    const activeGuild = targetUser.guilds?.[0] || null;

    return {
      data: {
        id: targetUser.id,
        documentId: targetUser.documentId,
        username: targetUser.username,
        avatar: targetUser.avatar_card?.image?.url || null,
        createdAt: targetUser.createdAt,
        daysActive: diffDays,
        stats: {
          totalCards,
          uniqueCards,
        },
        guilds: targetUser.guilds?.map((g: any) => ({
          id: g.id,
          documentId: g.documentId,
          name: g.name
        })) || [],
        friendship: requester ? {
          status: friendshipStatus,
          documentId: friendshipId,
          isMe: requester.id === targetUser.id,
          isRequester
        } : null
      },
    };
  },
};
