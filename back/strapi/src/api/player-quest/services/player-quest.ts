import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::player-quest.player-quest', ({ strapi }) => ({
  async updateQuestProgress(userId: number, type: string, action: string, amount: number = 1) {
    try {
      // Find active quests for the user of the specific type
      const activeQuests = await strapi.entityService.findMany('api::player-quest.player-quest', {
        filters: {
          user: userId as any,
          status: 'in_progress' as any,
        },
        populate: ['quest_template'] as any
      }) as any[];

      // Update progress for matching quests
      for (const quest of activeQuests) {
        if (!quest.quest_template) continue;

        // Match the quest type
        if (quest.quest_template.type !== type) continue;

        // This is a simple implementation. In a real game, you would match the specific action.
        // For example, if action is "win_game" and the quest is "win 3 games"

        const newProgress = Math.min(quest.progress + amount, quest.quest_template.target);
        const newStatus = newProgress >= quest.quest_template.target ? 'completed' : 'in_progress';

        await strapi.entityService.update('api::player-quest.player-quest', quest.id, {
          data: {
            progress: newProgress,
            status: newStatus as any
          }
        });
      }
    } catch (err) {
      strapi.log.error('Error updating quest progress:', err);
    }
  },

  async getActiveQuests(userId: number) {
    return strapi.entityService.findMany('api::player-quest.player-quest', {
      filters: {
        user: userId as any,
        status: {
          $in: ['in_progress', 'completed'] as any // Include completed but not yet claimed
        }
      },
      populate: ['quest_template'] as any
    });
  },

  async claimQuestReward(userId: number, questId: number) {
    const quest = await strapi.entityService.findOne('api::player-quest.player-quest', questId, {
      populate: ['quest_template', 'user'] as any
    }) as any;

    if (!quest) {
      throw new Error('Quest not found');
    }

    if (quest.user.id !== userId) {
      throw new Error('Unauthorized');
    }

    if (quest.status !== 'completed') {
      throw new Error('Quest not completed or already claimed');
    }

    // Award reward to user
    const reward = quest.quest_template.reward;
    const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId) as any;

    await strapi.entityService.update('plugin::users-permissions.user', userId, {
      data: {
        coins: user.coins + reward
      }
    });

    // Mark quest as claimed
    return strapi.entityService.update('api::player-quest.player-quest', questId, {
      data: {
        status: 'claimed' as any
      }
    });
  },

  async assignDailyQuests(userId: number) {
    // This could be run via a cron job or when a user logs in for the first time in a day
    // Simple implementation: randomly pick 3 daily quests
    const dailyTemplates = await strapi.entityService.findMany('api::quest-template.quest-template', {
      filters: {
        type: 'daily' as any
      }
    }) as any[];

    if (dailyTemplates.length === 0) return;

    // Shuffle and pick 3
    const shuffled = dailyTemplates.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    for (const t of selected) {
      await strapi.entityService.create('api::player-quest.player-quest', {
        data: {
          user: userId as any,
          quest_template: t.id as any,
          progress: 0,
          status: 'in_progress' as any
        } as any
      });
    }
  }
}));
