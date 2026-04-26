/**
 * friendship controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::friendship.friendship', ({ strapi }) => ({

  async getMyFriendships(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }

    const friendships = await strapi.entityService.findMany('api::friendship.friendship', {
      filters: {
        $or: [
          { requester: user.id },
          { receiver: user.id }
        ]
      },
      populate: ['requester', 'receiver', 'blockedBy']
    });

    // Sanitize user info to avoid sending passwords, etc.
    const sanitizedFriendships = friendships.map(f => {
      const sanitized = { ...f };
      if (sanitized.requester) {
        sanitized.requester = { id: f.requester.id, username: f.requester.username };
      }
      if (sanitized.receiver) {
        sanitized.receiver = { id: f.receiver.id, username: f.receiver.username };
      }
      if (sanitized.blockedBy) {
        sanitized.blockedBy = { id: f.blockedBy.id, username: f.blockedBy.username };
      }
      return sanitized;
    });

    return { data: sanitizedFriendships };
  },

  async sendRequest(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }

    const { identifier } = ctx.request.body; // can be username, email, or id

    if (!identifier) {
      return ctx.badRequest('Identifier is required (username, email, or id).');
    }

    // Find the target user
    let targetUsers = await strapi.entityService.findMany('plugin::users-permissions.user', {
      filters: {
        $or: [
          { username: identifier },
          { email: identifier },
          { id: isNaN(identifier) ? null : identifier }
        ]
      },
      limit: 1
    });

    if (!targetUsers || targetUsers.length === 0) {
      return ctx.notFound('User not found.');
    }

    const targetUser = targetUsers[0];

    if (targetUser.id === user.id) {
      return ctx.badRequest('You cannot send a friend request to yourself.');
    }

    // Check if a friendship already exists between the two
    const existingFriendships = await strapi.entityService.findMany('api::friendship.friendship', {
      filters: {
        $or: [
          { requester: user.id, receiver: targetUser.id },
          { requester: targetUser.id, receiver: user.id }
        ]
      }
    });

    if (existingFriendships.length > 0) {
      const existing = existingFriendships[0];

      if (existing.status === 'blocked') {
         return ctx.badRequest('Cannot send friend request.'); // Generic message for blocked
      }

      if (existing.status === 'accepted') {
        return ctx.badRequest('You are already friends.');
      }

      if (existing.status === 'pending') {
        return ctx.badRequest('A friend request already exists between you two.');
      }

      if (existing.status === 'rejected') {
        // If rejected, check if 24 hours have passed
        const rejectedAt = new Date(existing.updatedAt).getTime();
        const now = new Date().getTime();
        const hoursPassed = (now - rejectedAt) / (1000 * 60 * 60);

        if (hoursPassed < 24) {
          return ctx.badRequest(`Cannot send a new request yet. Please wait ${Math.ceil(24 - hoursPassed)} hours.`);
        }

        // Update the existing rejected friendship to pending
        const updated = await strapi.entityService.update('api::friendship.friendship', existing.id, {
          data: {
            requester: user.id, // Update requester in case roles reversed
            receiver: targetUser.id,
            status: 'pending'
          }
        });

        return { data: updated, message: 'Friend request sent.' };
      }
    }

    // Create new friend request
    const newRequest = await strapi.entityService.create('api::friendship.friendship', {
      data: {
        requester: user.id,
        receiver: targetUser.id,
        status: 'pending'
      }
    });

    return { data: newRequest, message: 'Friend request sent.' };
  },

  async acceptRequest(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { id } = ctx.params;

    const friendship = await strapi.entityService.findOne('api::friendship.friendship', id, {
      populate: ['receiver']
    });

    if (!friendship) return ctx.notFound('Friend request not found.');

    if (friendship.receiver.id !== user.id) {
      return ctx.forbidden('You can only accept requests sent to you.');
    }

    if (friendship.status !== 'pending') {
      return ctx.badRequest(`Cannot accept a request with status: ${friendship.status}`);
    }

    const updated = await strapi.entityService.update('api::friendship.friendship', id, {
      data: {
        status: 'accepted'
      }
    });

    return { data: updated, message: 'Friend request accepted.' };
  },

  async rejectRequest(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { id } = ctx.params;

    const friendship = await strapi.entityService.findOne('api::friendship.friendship', id, {
      populate: ['receiver']
    });

    if (!friendship) return ctx.notFound('Friend request not found.');

    if (friendship.receiver.id !== user.id) {
      return ctx.forbidden('You can only reject requests sent to you.');
    }

    if (friendship.status !== 'pending') {
      return ctx.badRequest(`Cannot reject a request with status: ${friendship.status}`);
    }

    const updated = await strapi.entityService.update('api::friendship.friendship', id, {
      data: {
        status: 'rejected'
      }
    });

    return { data: updated, message: 'Friend request rejected.' };
  },

  async removeFriend(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { id } = ctx.params;

    const friendship = await strapi.entityService.findOne('api::friendship.friendship', id, {
      populate: ['requester', 'receiver']
    });

    if (!friendship) return ctx.notFound('Friendship not found.');

    if (friendship.requester.id !== user.id && friendship.receiver.id !== user.id) {
      return ctx.forbidden('You can only remove your own friendships.');
    }

    // We allow removing pending or accepted friendships (cancelling request or removing friend)
    // If it's blocked, maybe we don't let them delete the record so the block persists.
    if (friendship.status === 'blocked') {
      return ctx.badRequest('Cannot remove a blocked friendship record directly. Unblock first.');
    }

    await strapi.entityService.delete('api::friendship.friendship', id);

    return { message: 'Friendship removed.' };
  },

  async blockUser(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { targetUserId } = ctx.request.body;

    if (!targetUserId) return ctx.badRequest('targetUserId is required.');

    if (targetUserId === user.id) return ctx.badRequest('You cannot block yourself.');

    // Find existing
    const existingFriendships = await strapi.entityService.findMany('api::friendship.friendship', {
      filters: {
        $or: [
          { requester: user.id, receiver: targetUserId },
          { requester: targetUserId, receiver: user.id }
        ]
      }
    });

    if (existingFriendships.length > 0) {
      const existing = existingFriendships[0];
      const updated = await strapi.entityService.update('api::friendship.friendship', existing.id, {
        data: {
          status: 'blocked',
          blockedBy: user.id
        }
      });
      return { data: updated, message: 'User blocked.' };
    }

    // Create block record
    const newBlock = await strapi.entityService.create('api::friendship.friendship', {
      data: {
        requester: user.id,
        receiver: targetUserId,
        status: 'blocked',
        blockedBy: user.id
      }
    });

    return { data: newBlock, message: 'User blocked.' };
  }
}));
