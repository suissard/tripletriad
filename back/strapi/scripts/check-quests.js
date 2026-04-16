
const { createCoreService } = require('@strapi/strapi').factories;
const { ensureUserHasWelcomeQuest } = require('../src/api/player-quest/services/quest-assignment');

async function checkAndFixQuests() {
  const users = await strapi.entityService.findMany('plugin::users-permissions.user');
  console.log(`Found ${users.length} users.`);
  
  for (const user of users) {
    // Attempt rescue
    await ensureUserHasWelcomeQuest(strapi, user.id);

    const quests = await strapi.entityService.findMany('api::player-quest.player-quest', {
      filters: { user: user.id },
      populate: ['quest_template']
    });
    console.log(`User ${user.username} (ID: ${user.id}) has ${quests.length} quests.`);
    quests.forEach(q => {
      console.log(`  - [${q.status}] ${q.quest_template?.code || 'No Code'} (Progress: ${q.progress})`);
    });
  }
}

module.exports = checkAndFixQuests;
