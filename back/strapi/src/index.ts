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
        'api::wallet.wallet.getMe',
        'api::player-event-log.player-event-log.trackEvent',
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
          title: 'Bienvenue dans Terra Nullius !',
          description: 'Jouez votre première partie pour gagner des récompenses.',
          rewardCoins: 500,
          rewardGems: 500,
          type: 'play_games',
          target: 1,
        }
      });
      console.log('✅ Default Welcome Quest Template created.');
    }

    const { generateQuestTemplates } = require('./api/quest-template/services/quest-template-generator');
    await generateQuestTemplates(strapi);
    console.log('✅ Quest templates generated.');

    // 3. Setup Default Cards from shared/data/cards.json
    try {
      const path = require('path');
      const fs = require('fs');
      const cardsFilePath = path.join(strapi.dirs.app.src, 'shared', 'data', 'cards.json');
      
      if (fs.existsSync(cardsFilePath)) {
        const cardsData = JSON.parse(fs.readFileSync(cardsFilePath, 'utf8'));
        const cardsCount = await strapi.entityService.count('api::card.card');

        if (cardsCount < cardsData.length) {
          console.log(`🔄 DB has ${cardsCount} cards, shared/cards.json has ${cardsData.length}. Re-seeding...`);
          // Use db.query to delete all
          await strapi.db.query('api::card.card').deleteMany({});

          for (const c of cardsData) {
            // Map level to rarity
            let rarity = 'Common';
            if (c.level <= 2) rarity = 'Common';
            else if (c.level <= 4) rarity = 'Uncommon';
            else if (c.level <= 6) rarity = 'Rare';
            else if (c.level <= 8) rarity = 'Epic';
            else rarity = 'Legendary';

            await strapi.entityService.create('api::card.card', { 
              data: {
                name: c.name,
                description: c.description,
                level: c.level,
                element: c.element || 'None',
                topValue: String(c.topValue),
                rightValue: String(c.rightValue),
                bottomValue: String(c.bottomValue),
                leftValue: String(c.leftValue),
                rarity: rarity
              }
            });
          }
          console.log(`✅ ${cardsData.length} cards seeded from shared database.`);
        }
      } else {
        console.error('❌ cards.json not found at', cardsFilePath);
      }
    } catch (err) {
      console.error('❌ Error seeding cards:', err);
    }

    // 3.5. Backfill existing users to ensure they have enough active/pending quests
    // 3.5. Backfill existing users to ensure they have enough active/pending quests
    const allUsers = await strapi.entityService.findMany('plugin::users-permissions.user');
    const { assignQuestsToUser } = require('./api/player-quest/services/quest-assignment');
    if (allUsers) {
      for (const user of allUsers) {
        await assignQuestsToUser(strapi, user.id, true);
      }
    }
    console.log('✅ Backfilled quests for existing users.');

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
                startsAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() // 10 years from now
              }
            });
          }

          // Assign remaining max quests immediately for new users
          const { assignQuestsToUser } = require('./api/player-quest/services/quest-assignment');
          await assignQuestsToUser(strapi, result.id, true);

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
