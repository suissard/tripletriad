const path = require('path');
const strapiFactory = require('@strapi/strapi');

async function fixQuests() {
  const APP_PATH = path.join(__dirname, 'back', 'strapi');
  
  console.log('🚀 Initializing Strapi to fix quest statuses...');
  const app = await strapiFactory.createStrapi({ distDir: path.join(APP_PATH, 'dist') }).load();

  try {
    const quests = await app.db.query('api::player-quest.player-quest').findMany({
      where: { status: 'in_progress' }
    });

    console.log(`🔍 Found ${quests.length} quests with 'in_progress' status.`);

    if (quests.length > 0) {
      const { count } = await app.db.query('api::player-quest.player-quest').updateMany({
        where: { status: 'in_progress' },
        data: { status: 'active' }
      });
      console.log(`✅ Updated ${count} quests to 'active'.`);
    } else {
      console.log('✅ No quests needed fixing.');
    }
  } catch (err) {
    console.error('❌ Error fixing quests:', err);
  } finally {
    process.exit(0);
  }
}

fixQuests();
