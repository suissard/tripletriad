/**
 * player-event-log controller
 */

import { factories } from '@strapi/strapi'
import { logPlayerEvent } from '../services/event-logger';

export default factories.createCoreController('api::player-event-log.player-event-log' as any, ({ strapi }) => ({
  async trackEvent(ctx) {
    try {
      const { user } = ctx.state;
      if (!user) return ctx.unauthorized();

      const { eventType, relatedCardId, relatedElement, value } = ctx.request.body;

      if (!eventType) return ctx.badRequest('eventType is required');

      await logPlayerEvent(strapi, {
        userId: user.id,
        eventType,
        relatedCardId,
        relatedElement,
        value
      });

      return ctx.send({ success: true });
    } catch (err) {
      console.error('Error in trackEvent:', err);
      return ctx.internalServerError('Failed to track event');
    }
  }
}));
