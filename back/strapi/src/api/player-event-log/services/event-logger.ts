import { assignQuestsToUser } from '../../player-quest/services/quest-assignment';

export const logPlayerEvent = async (strapi, eventData) => {
  const { userId, eventType, relatedCardId, relatedElement, value = 1 } = eventData;

  if (!userId) return;

  // 1. Log the event
  await strapi.entityService.create('api::player-event-log.player-event-log', {
    data: {
      user: userId,
      eventType,
      relatedCard: relatedCardId || null,
      relatedElement: relatedElement || null,
      value,
      timestamp: new Date().toISOString()
    }
  });

  // 2. Process active quests
  const now = new Date();
  const activeQuests = await strapi.entityService.findMany('api::player-quest.player-quest', {
    filters: {
      user: userId,
      status: 'active',
      startsAt: { $lte: now.toISOString() }, // Ensure quest has started
      expiresAt: { $gte: now.toISOString() }  // Ensure quest has not expired
    },
    populate: ['quest_template']
  });

  for (const quest of activeQuests) {
    if (!quest.quest_template) continue;

    const template = quest.quest_template;
    let progressMade = false;
    let amount = value;

    if (template.type === 'play_games' && eventType === 'play_game') {
      progressMade = true;
    } else if (template.code.startsWith('PLAY_GAMES') && eventType === 'play_game') {
      progressMade = true;
    } else if (template.code.startsWith('WIN_GAMES') && eventType === 'win_game') {
      progressMade = true;
    } else if (template.code.startsWith('OPEN_BOOSTER') && eventType === 'open_booster') {
      progressMade = true;
    } else if (template.code.startsWith('CAPTURE_CARDS') && eventType === 'capture_card') {
      progressMade = true;
    } else if (template.code.startsWith('PLAY_CARDS') && eventType === 'play_card') {
      progressMade = true;
    } else if (template.code.startsWith('PLAY_ELEMENT') && eventType === 'play_card_element') {
      // Check if element matches
      // Format is PLAY_ELEMENT_EAU_DAILY
      const templateElement = template.code.split('_')[2];
      if (templateElement === relatedElement.toUpperCase()) {
        progressMade = true;
      }
    }

    if (progressMade) {
      const newProgress = Math.min(quest.progress + amount, template.target);
      const isCompleted = newProgress >= template.target;

      await strapi.entityService.update('api::player-quest.player-quest', quest.id, {
        data: {
          progress: newProgress,
          status: isCompleted ? 'completed' : 'active'
        }
      });

      if (isCompleted) {
        // Grant rewards
        const userWallet = await strapi.entityService.findMany('api::wallet.wallet', {
          filters: { user: userId }
        });

        if (userWallet && userWallet.length > 0) {
          const wallet = userWallet[0];
          await strapi.entityService.update('api::wallet.wallet', wallet.id, {
            data: {
              coins: wallet.coins + (template.rewardCoins || 0),
              gems: wallet.gems + (template.rewardGems || 0)
            }
          });
        }

        // Assign a new quest to replace this one (starts in 22h)
        await assignQuestsToUser(strapi, userId, false);
      }
    }
  }
};
