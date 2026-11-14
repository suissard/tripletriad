// import type { Core } from '@strapi/strapi';
import { initSocketIO } from './socketio';
import { runFullBootstrap, syncPermissions } from './bootstrap-utils';
import { assignQuestsToUser, ensureUserHasWelcomeQuest } from './api/player-quest/services/quest-assignment';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }) {
    // 1. Always sync API permissions from permissions.json; run full seed only if STRAPI_AUTO_INIT=true
    if (process.env.STRAPI_AUTO_INIT === 'true') {
      await runFullBootstrap(strapi);
    } else {
      await syncPermissions(strapi);
      console.log('ℹ️  Synced permissions (skipped full seed because STRAPI_AUTO_INIT !== true).');
    }

    // 2. Lifecycle hooks
    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],
      async afterCreate(event) {
        const { result } = event;

        try {
          await ensureUserHasWelcomeQuest(strapi, result.id);
          await assignQuestsToUser(strapi, result.id, true);

          // Give starter collection cards
          let starterCards = await strapi.documents('api::card.card').findMany({
            filters: { collections: { code: 'starter' } },
            limit: 200,
          });

          if (!starterCards || starterCards.length === 0) {
            console.warn('⚠️ No starter cards found (collection.code=starter). Falling back to 5 weakest cards.');
            starterCards = await strapi.documents('api::card.card').findMany({
              limit: 5,
              sort: { level: 'asc' },
            });
          }

          if (starterCards && starterCards.length > 0) {
            await Promise.all(
              starterCards.map((card: any) =>
                strapi.documents('api::user-card.user-card').create({
                  data: {
                    user: result.id,
                    card: card.documentId || card.id,
                    quantity: 1,
                    isPremium: false,
                  },
                }),
              ),
            );
            console.log(`✅ ${starterCards.length} starter cards given to user ${result.username}`);
          }

          // Create Wallet with starter boosters (10 classic + 1 premium)
          await strapi.documents('api::wallet.wallet').create({
            data: {
              user: result.id,
              coins: 100,
              gems: 0,
              dust: 0,
              boosters: [
                { collection: 'base', isPremium: false, quantity: 10 },
                { collection: 'base', isPremium: true, quantity: 1 },
              ],
            },
          });
          console.log(`✅ Wallet created with starter boosters for user ${result.username}`);
        } catch (error) {
          console.error('Error in afterCreate User lifecycle hook:', error);
        }
      },
    });

    // 3. Initialize Socket.IO relay server (attaches to Strapi's httpServer)
    initSocketIO(strapi);
  },
};
