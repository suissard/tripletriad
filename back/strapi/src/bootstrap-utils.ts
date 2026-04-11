import { Core } from '@strapi/strapi';

export async function runFullBootstrap(strapi: Core.Strapi) {
  console.log('🚀 Starting manual bootstrap sequence...');

  // A. Setup Admin Role in Users-Permissions
  let adminRoles = await strapi.entityService.findMany('plugin::users-permissions.role', {
    filters: { type: 'admin' },
  });

  if (!adminRoles || adminRoles.length === 0) {
    adminRoles = await strapi.entityService.findMany('plugin::users-permissions.role', {
      filters: { name: 'Admin' },
    });
  }

  let boAdminRole = adminRoles[0];

  if (!boAdminRole) {
    boAdminRole = await strapi.entityService.create('plugin::users-permissions.role', {
      data: {
        name: 'Admin',
        description: 'Role for back-office administrators.',
        type: 'admin',
      }
    });
    console.log('✅ Admin Role created for back-office users.');
  }

  if (boAdminRole) {
    const permissionsService = strapi.plugin('users-permissions').service('users-permissions');
    const allPermissions = await permissionsService.getActions();
    
    const adminActions = [];

    for (const sectionKey of Object.keys(allPermissions)) {
      const section = allPermissions[sectionKey];
      if (section.controllers) {
        for (const controllerKey of Object.keys(section.controllers)) {
          const controller = section.controllers[controllerKey];
          for (const actionKey of Object.keys(controller)) {
            adminActions.push(`${sectionKey}.${controllerKey}.${actionKey}`);
          }
        }
      }
    }

    console.log(`Setting up ${adminActions.length} permissions for Admin role...`);

    for (const action of adminActions) {
      const existingPermission = await strapi.entityService.findMany('plugin::users-permissions.permission', {
        filters: { action, role: { id: boAdminRole.id } }
      });

      if (existingPermission.length === 0) {
        await strapi.entityService.create('plugin::users-permissions.permission', {
          data: { action, role: boAdminRole.id }
        });
      }
    }
    console.log('✅ Admin Role permissions updated.');
  }

  // 1. Setup Permissions for Authenticated and Public roles
  const roles = await strapi.entityService.findMany('plugin::users-permissions.role', {
    filters: { type: 'authenticated' },
  });

  const authRole = roles[0];

  if (authRole) {
    const actions = [
      'plugin::users-permissions.user.updateMe',
      'api::user-card.user-card.disenchant',
      'api::user-card.user-card.craft',
      'api::user-card.user-card.massDisenchant',
      'api::booster.booster.openBooster',
      'api::card.card.find',
      'api::card.card.findOne',
      'api::foil-effect.foil-effect.find',
      'api::foil-effect.foil-effect.findOne',
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
      'api::story.story.find',
      'api::story.story.findOne',
      'api::player-story-progress.player-story-progress.find',
      'api::player-story-progress.player-story-progress.findOne',
      'api::player-story-progress.player-story-progress.claimStepReward',
      'api::player-story-progress.player-story-progress.unlockStory',
      'api::player-story-progress.player-story-progress.saveStepProgress',
      'api::player-event-log.player-event-log.trackEvent',
      'api::game-config.game-config.find',
      'api::board-background.board-background.find',
      'api::board-background.board-background.findOne',
    ];

    for (const action of actions) {
      const existingPermission = await strapi.entityService.findMany('plugin::users-permissions.permission', {
        filters: { action, role: { id: authRole.id } }
      });

      if (existingPermission.length === 0) {
        await strapi.entityService.create('plugin::users-permissions.permission', {
          data: { action, role: authRole.id }
        });
      }
    }
    console.log('✅ Authenticated Role permissions updated.');
  }

  const publicRoles = await strapi.entityService.findMany('plugin::users-permissions.role', {
    filters: { type: 'public' },
  });

  const publicRole = publicRoles[0];

  if (publicRole) {
    const publicActions = [
      'api::game-config.game-config.find',
      'api::board-background.board-background.find',
      'api::board-background.board-background.findOne',
    ];

    for (const action of publicActions) {
      const existingPermission = await strapi.entityService.findMany('plugin::users-permissions.permission', {
        filters: { action, role: { id: publicRole.id } }
      });

      if (existingPermission.length === 0) {
        await strapi.entityService.create('plugin::users-permissions.permission', {
          data: { action, role: publicRole.id }
        });
      }
    }
    console.log('✅ Public Role permissions updated.');
  }

  // 2. Setup Quests
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

  // 3. Decks & Stories
  try {
    const { bootstrapDecks } = require('./api/deck/services/deck-bootstrap');
    await bootstrapDecks(strapi);
    console.log('✅ Decks bootstrapped.');
  } catch (err) {
    console.error('❌ Error bootstrapping decks:', err);
  }

  try {
    const { bootstrapStories } = require('./api/story/services/story-bootstrap');
    await bootstrapStories(strapi);
    console.log('✅ Stories bootstrapped.');
  } catch (err) {
    console.error('❌ Error bootstrapping stories:', err);
  }

  // 4. Backfill existing users
  const allUsers = await strapi.entityService.findMany('plugin::users-permissions.user');
  const { assignQuestsToUser } = require('./api/player-quest/services/quest-assignment');
  if (allUsers) {
    for (const user of (allUsers as any[])) {
      await assignQuestsToUser(strapi, user.id, true);
    }
  }
  console.log('✅ Backfilled quests for existing users.');

  console.log('✨ Manual bootstrap complete.');
}
