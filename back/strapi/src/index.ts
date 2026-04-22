// import type { Core } from '@strapi/strapi';
import { initSocketIO } from './socketio';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // 1. Conditional Auto-Bootstrap
    if (process.env.STRAPI_AUTO_INIT === 'true') {
      const { runFullBootstrap } = require('./bootstrap-utils');
      await runFullBootstrap(strapi);
    } else {
      console.log('ℹ️  Skipping automatic Strapi bootstrap (STRAPI_AUTO_INIT !== true).');
    }

    // 2. Lifecycle hooks (always registered, logic inside can be conditional)
    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],
      async afterCreate(event) {
        const { result } = event;

        try {
          const { assignQuestsToUser, ensureUserHasWelcomeQuest } = require('./api/player-quest/services/quest-assignment');

          // 4a. Assign Welcome Quest if missing
          await ensureUserHasWelcomeQuest(strapi, result.id);

          // Assign remaining max quests immediately for new users
          await assignQuestsToUser(strapi, result.id, true);

          // 4b. Give starter collection cards
          const starterCards = await strapi.entityService.findMany('api::card.card', {
            filters: { collection: { code: 'starter' } },
            limit: 200
          });

          if (starterCards && (starterCards as any[]).length > 0) {
            for (const card of (starterCards as any[])) {
              await strapi.entityService.create('api::user-card.user-card', {
                data: {
                  user: result.id,
                  card: card.id,
                  quantity: 1,
                  isPremium: false
                }
              });
            }
            console.log(`✅ ${ (starterCards as any[]).length} starter cards given to user ${result.username}`);
          } else {
            console.warn('⚠️ No starter cards found (collection.code=starter). Falling back to 5 weakest cards.');
            const fallbackCards = await strapi.entityService.findMany('api::card.card', {
              limit: 5,
              sort: { level: 'asc' }
            });
            if (fallbackCards && (fallbackCards as any[]).length > 0) {
              for (const card of (fallbackCards as any[])) {
                await strapi.entityService.create('api::user-card.user-card', {
                  data: {
                    user: result.id,
                    card: card.id,
                    quantity: 1,
                    isPremium: false
                  }
                });
              }
            }
          }

          // 4c. Create Wallet with starter boosters (10 classic + 1 premium)
          await strapi.entityService.create('api::wallet.wallet', {
            data: {
              user: result.id,
              coins: 100, // Starting coins
              gems: 0,
              dust: 0,
              boosters: [
                { collection: 'base', isPremium: false, quantity: 10 },
                { collection: 'base', isPremium: true, quantity: 1 }
              ]
            }
          });
          console.log(`✅ Wallet created with starter boosters for user ${result.username}`);
        } catch (error) {
          console.error('Error in afterCreate User lifecycle hook:', error);
        }
      }
    });

    // 3. Initialize Socket.IO relay server (attaches to Strapi's httpServer)
    initSocketIO(strapi);
  },
};
