// import type { Core } from '@strapi/strapi';

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
    // 1. Setup Permissions
    const roles = await strapi.entityService.findMany('plugin::users-permissions.role', {
      filters: { type: 'authenticated' },
    });

    const authRole = roles[0];

    if (authRole) {
      const actions = [
        // Custom
        'api::user-card.user-card.disenchant',
        'api::user-card.user-card.craft',
        'api::user-card.user-card.massDisenchant',
        'api::booster.booster.openBooster',
        // Standard Find/FindOne
        'api::card.card.find',
        'api::card.card.findOne',
        'api::deck.deck.find',
        'api::deck.deck.findOne',
        'api::deck.deck.create',
        'api::deck.deck.update',
        'api::deck.deck.delete',
        'api::player-quest.player-quest.find',
        'api::quest-template.quest-template.find',
        'api::shop.shop.find',
        'api::user-card.user-card.find',
        'api::wallet.wallet.find',
      ];

      for (const action of actions) {
        const existingPermission = await strapi.entityService.findMany('plugin::users-permissions.permission', {
          filters: { action, role: authRole.id }
        });

        if (existingPermission.length === 0) {
          await strapi.entityService.create('plugin::users-permissions.permission', {
            data: { action, role: authRole.id }
          });
        }
      }
    }

    // 2. Setup Default Generous Quest Template
    const templates = await strapi.entityService.findMany('api::quest-template.quest-template', {
      filters: { code: 'WELCOME_QUEST' }
    });

    if (templates.length === 0) {
      await strapi.entityService.create('api::quest-template.quest-template', {
        data: {
          code: 'WELCOME_QUEST',
          title: 'Bienvenue dans Triple Triad !',
          description: 'Jouez votre première partie pour gagner des récompenses.',
          rewardCoins: 500,
          rewardGems: 500,
          type: 'play_games',
          target: 1,
        }
      });
      console.log('✅ Default Welcome Quest Template created.');
    }

    // 3. Setup Default Cards if missing (just a few to get started)
    const cardsCount = await strapi.entityService.count('api::card.card');
    if (cardsCount === 0) {
      const defaultCards = [
        { name: 'Goblin', level: 1, element: 'None', topValue: '2', rightValue: '1', bottomValue: '1', leftValue: '2', rarity: 'Common' },
        { name: 'Slime', level: 1, element: 'None', topValue: '1', rightValue: '2', bottomValue: '2', leftValue: '1', rarity: 'Common' },
        { name: 'Bat', level: 1, element: 'None', topValue: '2', rightValue: '2', bottomValue: '1', leftValue: '1', rarity: 'Common' },
        { name: 'Skeleton', level: 1, element: 'None', topValue: '1', rightValue: '1', bottomValue: '2', leftValue: '2', rarity: 'Common' },
        { name: 'Wolf', level: 1, element: 'None', topValue: '2', rightValue: '1', bottomValue: '2', leftValue: '1', rarity: 'Common' },
      ];

      for (const c of defaultCards) {
        await strapi.entityService.create('api::card.card', { data: c });
      }
      console.log('✅ Default Cards created.');
    }

    // 4. Hook on User creation to give starting deck & quest
    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],
      async afterCreate(event) {
        const { result } = event;

        try {
          // 4a. Assign Welcome Quest
          const welcomeTemplate = await strapi.entityService.findMany('api::quest-template.quest-template', {
            filters: { code: 'WELCOME_QUEST' }
          });

          if (welcomeTemplate && welcomeTemplate.length > 0) {
            await strapi.entityService.create('api::player-quest.player-quest', {
              data: {
                user: result.id,
                quest_template: welcomeTemplate[0].id,
                progress: 0,
                status: 'active',
                expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() // 10 years from now
              }
            });
          }

          // 4b. Give starting cards
          const baseCards = await strapi.entityService.findMany('api::card.card', {
            limit: 5,
            sort: { level: 'asc' }
          });

          if (baseCards && baseCards.length > 0) {
            for (const card of baseCards) {
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
        } catch (error) {
          console.error('Error in afterCreate User lifecycle hook:', error);
        }
      }
    });
  },
};
