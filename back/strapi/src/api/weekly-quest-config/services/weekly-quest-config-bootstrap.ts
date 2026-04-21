import { Core } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';

export async function bootstrapWeeklyQuestConfig(strapi: Core.Strapi) {
  console.log('🌱 Checking WeeklyQuest Config bootstrap...');

  // Path inside the container
  const configPath = path.join(process.cwd(), 'src', 'shared', 'data', 'weekly-quest-config.json');

  if (!fs.existsSync(configPath)) {
    console.log('ℹ️  No weekly-quest-config.json found in shared data, skipping.');
    return;
  }

  try {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    const existing = await strapi.entityService.findMany('api::weekly-quest-config.weekly-quest-config');

    if (!existing || (Array.isArray(existing) && existing.length === 0)) {
      await strapi.entityService.create('api::weekly-quest-config.weekly-quest-config', {
        data: {
            ...configData,
            publishedAt: new Date(),
        },
      });
      console.log('✅ WeeklyQuest Config created from shared data.');
    } else {
      const id = Array.isArray(existing) ? (existing[0] as any).id : (existing as any).id;
      
      await strapi.entityService.update('api::weekly-quest-config.weekly-quest-config', id, {
        data: configData,
      });
      console.log('✅ WeeklyQuest Config updated from shared data.');
    }
  } catch (err) {
    console.error('❌ Error bootstrapping WeeklyQuest Config:', err);
  }
}
