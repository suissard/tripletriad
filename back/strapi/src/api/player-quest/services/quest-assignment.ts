/**
 * Service to handle assigning random quests to users
 */

export const assignQuestsToUser = async (strapi, userId, immediate = false) => {
  // 1. Get user and their active/pending quests
  const userQuests = await strapi.entityService.findMany('api::player-quest.player-quest', {
    filters: {
      user: userId,
      status: 'active' // pending are also marked as active but have startsAt > now
    },
    populate: ['quest_template']
  });

  // 2. Get game config for max quests
  let maxQuests = 5;
  try {
    const config = await strapi.entityService.findMany('api::game-config.game-config');
    if (config && config.maxQuestsPerUser) {
      maxQuests = config.maxQuestsPerUser;
    }
  } catch (err) {
    console.error('Error fetching game config for max quests:', err);
  }

  const questsNeeded = maxQuests - userQuests.length;

  if (questsNeeded <= 0) {
    return; // User has enough quests
  }

  // 3. Get all quest templates EXCEPT welcome quest
  const allTemplates = await strapi.entityService.findMany('api::quest-template.quest-template', {
    filters: {
      code: { $ne: 'WELCOME_QUEST' }
    }
  });

  if (allTemplates.length === 0) return;

  // 4. Assign random quests
  const activeQuestTemplateIds = userQuests.map(q => q.quest_template?.id).filter(id => id);
  let availableTemplates = allTemplates.filter(t => !activeQuestTemplateIds.includes(t.id));

  for (let i = 0; i < questsNeeded; i++) {
    if (availableTemplates.length === 0) {
      // If we run out of unique templates, allow duplicates (or reset available pool)
      availableTemplates = [...allTemplates];
    }

    const randomIndex = Math.floor(Math.random() * availableTemplates.length);
    const selectedTemplate = availableTemplates.splice(randomIndex, 1)[0];

    const now = new Date();

    // If immediate is true, starts now. Otherwise, starts in 22 hours
    const startsAt = immediate ? now : new Date(now.getTime() + 22 * 60 * 60 * 1000);

    // Determine expiration based on quest type (daily = 24h, 48h = 48h, weekly = 7d)
    // We infer duration from the code suffix or type
    let durationHours = 24;
    if (selectedTemplate.code.endsWith('_48H')) {
      durationHours = 48;
    } else if (selectedTemplate.code.endsWith('_WEEKLY') || selectedTemplate.type === 'weekly') {
      durationHours = 24 * 7;
    }

    const expiresAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

    await strapi.entityService.create('api::player-quest.player-quest', {
      data: {
        user: userId,
        quest_template: selectedTemplate.id,
        progress: 0,
        status: 'active',
        startsAt: startsAt.toISOString(),
        expiresAt: expiresAt.toISOString()
      }
    });
  }
};
