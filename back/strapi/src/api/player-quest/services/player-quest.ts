/**
 * player-quest service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::player-quest.player-quest', ({ strapi }) => ({
  async generateDailyQuests(userId: number, timezone: string = 'UTC') {
    const now = new Date();

    // Create a date corresponding to midnight tomorrow in the specified timezone
    // Using Intl.DateTimeFormat to get the parts in that timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });

    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || now.getUTCFullYear().toString(), 10);
    const month = parseInt(parts.find(p => p.type === 'month')?.value || (now.getUTCMonth() + 1).toString(), 10);
    const day = parseInt(parts.find(p => p.type === 'day')?.value || now.getUTCDate().toString(), 10);

    // Create an ISO string representing tomorrow midnight in UTC,
    // then we will find the timezone offset to convert this back to UTC time
    const expiresAtStr = `${year}-${month.toString().padStart(2, '0')}-${(day + 1).toString().padStart(2, '0')}T00:00:00.000`;

    // Convert to target timezone date
    // A quick hack without date-fns-tz to get the true UTC date
    // Create string like "YYYY-MM-DD"
    const nextDayStr = `${year}-${month.toString().padStart(2, '0')}-${(day + 1).toString().padStart(2, '0')}`;

    // This finds the timestamp of tomorrow midnight in given timezone
    const getMidnightInTimezone = (dateStr: string, tz: string) => {
      // Just an approximation using the timezone string, since it's tricky in pure JS
      // In a real app we'd use moment-timezone or date-fns-tz
      // Let's create a UTC date and just set it to end of day.
      const d = new Date(dateStr);
      // To keep it simple and avoid bugs with timezones, let's just do an approximation
      // if timezone isn't parsable or we lack tz libraries.
      return d;
    };

    let trueUtcExpiresAt;
    try {
        const dateString = new Date().toLocaleString("en-US", { timeZone: timezone });
        const localDate = new Date(dateString);
        localDate.setDate(localDate.getDate() + 1);
        localDate.setHours(0, 0, 0, 0);

        // Find difference between local and target timezone
        const diff = new Date().getTime() - new Date(new Date().toLocaleString('en-US', { timeZone: timezone })).getTime();
        trueUtcExpiresAt = new Date(localDate.getTime() + diff);
    } catch (e) {
        // Fallback
        trueUtcExpiresAt = new Date(now);
        trueUtcExpiresAt.setUTCDate(trueUtcExpiresAt.getUTCDate() + 1);
        trueUtcExpiresAt.setUTCHours(0, 0, 0, 0);
    }

    // 2. Check if active daily quests exist for this user today
    const existingQuests = await strapi.entityService.findMany('api::player-quest.player-quest', {
      filters: {
        user: { id: userId },
        status: 'active',
        expiresAt: {
          $gte: now.toISOString()
        }
      },
      populate: ['template']
    });

    const activeDailyQuests = existingQuests.filter((q: any) => q.template?.type === 'daily');

    if (activeDailyQuests.length >= 3) {
      return activeDailyQuests;
    }

    // 3. Get daily quest templates
    let templates = await strapi.entityService.findMany('api::quest-template.quest-template', {
      filters: {
        type: 'daily'
      }
    });

    // 4. Fallback: Create mock templates if none exist
    if (!templates || templates.length === 0) {
      const defaultTemplates = [
        { title: 'Win 3 Matches', description: 'Win 3 matches against any opponent.', target: 3, reward: 150, type: 'daily' as const },
        { title: 'Play 5 Matches', description: 'Play 5 matches.', target: 5, reward: 100, type: 'daily' as const },
        { title: 'Defeat a Boss', description: 'Win a match against a boss.', target: 1, reward: 200, type: 'daily' as const },
        { title: 'Collect 10 Cards', description: 'Get 10 new cards.', target: 10, reward: 50, type: 'daily' as const },
      ];

      for (const t of defaultTemplates) {
        await strapi.entityService.create('api::quest-template.quest-template', {
          data: t
        });
      }

      templates = await strapi.entityService.findMany('api::quest-template.quest-template', {
        filters: { type: 'daily' }
      });
    }

    // 5. Select 3 random templates
    const shuffled = templates.sort(() => 0.5 - Math.random());
    // Only take the number needed to reach 3
    const needed = 3 - activeDailyQuests.length;
    const selectedTemplates = shuffled.slice(0, needed);

    // 6. Create PlayerQuests
    const createdQuests = [];
    for (const template of selectedTemplates) {
      const q = await strapi.entityService.create('api::player-quest.player-quest', {
        data: {
          user: userId,
          template: template.id,
          progress: 0,
          status: 'active',
          expiresAt: trueUtcExpiresAt.toISOString()
        },
        populate: ['template']
      });
      createdQuests.push(q);
    }

    return [...activeDailyQuests, ...createdQuests];
  }
}));
