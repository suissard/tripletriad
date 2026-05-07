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

    // Only add id filter if it's a valid number
    const numericId = Number(identifier);
    if (!isNaN(numericId)) {
      filters.$or.push({ id: numericId });
    }

    // Find user by username or documentId
    // @ts-ignore
    const users = await strapi.documents("plugin::users-permissions.user").findMany({
      filters,
      populate: ["avatar_card.image", "guilds"],
      limit: 1,
    });

    const targetUser = users[0];
    if (!targetUser) {
      return ctx.notFound("Player not found.");
    }

    // 1. Calculate Card Stats
    // @ts-ignore
    const userCards = await strapi.documents("api::user-card.user-card").findMany({
      filters: { user: { id: targetUser.id } },
      fields: ["quantity"],
    });

    const totalCards = userCards.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);
    const uniqueCards = userCards.length;

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
