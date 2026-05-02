/**
 * Service to handle assigning random quests to users
 */

export const assignQuestsToUser = async (strapi, userId, immediate = false) => {
  const now = new Date();
  const nowISO = now.toISOString();

  // 1. Cleanup: Delete expired quests for this user
  try {
    // In Strapi 5, we can use documents().delete() with filters for deleteMany like behavior if supported,
    // or stick with db.query for bulk operations if documents service doesn't support filters in delete.
    // Actually, documents().delete() usually takes a documentId. 
    // Let's use documents().findMany() then loop delete or use db.query which is fine for bulk internal ops.
    const expiredQuests = await strapi.documents("api::player-quest.player-quest").findMany({
      filters: {
        user: { id: userId },
        expiresAt: { $lt: nowISO },
      },
      fields: ["documentId"],
    });

    for (const quest of expiredQuests) {
      await strapi.documents("api::player-quest.player-quest").delete({
        documentId: quest.documentId,
      });
    }

    if (expiredQuests.length > 0) {
      console.log(
        `[QuestService] Deleted ${expiredQuests.length} expired quests for user ${userId}`,
      );
    }
  } catch (err) {
    console.error("Error deleting expired quests:", err);
  }

  // 1. Get user and their active/pending/valid quests
  const userQuests = await strapi.documents("api::player-quest.player-quest").findMany({
    filters: {
      user: { id: userId },
      status: "active",
      expiresAt: { $gte: nowISO }, // Only count quests that are not expired
    },
    populate: ["quest_template"],
  });

  // 2. Get game config for max quests
  let maxQuests = 5;
  try {
    const configs = await strapi.documents("api::game-config.game-config").findMany();
    const config = configs[0];
    if (config && config.maxQuestsPerUser) {
      maxQuests = config.maxQuestsPerUser;
    }
  } catch (err) {
    console.error("Error fetching game config for max quests:", err);
  }

  const questsNeeded = maxQuests - userQuests.length;

  if (questsNeeded <= 0) {
    return; // User has enough quests
  }

  // 3. Get all quest templates EXCEPT welcome quest
  const allTemplates = await strapi.documents("api::quest-template.quest-template").findMany({
    filters: {
      code: { $ne: "WELCOME_QUEST" },
    },
  });

  if (allTemplates.length === 0) return;

  // 4. Assign random quests
  const activeQuestTemplateIds = userQuests
    .map((q) => q.quest_template?.documentId || q.quest_template?.id)
    .filter((id) => id);
  
  let availableTemplates = allTemplates.filter(
    (t) => !activeQuestTemplateIds.includes(t.documentId) && !activeQuestTemplateIds.includes(t.id),
  );

  for (let i = 0; i < questsNeeded; i++) {
    if (availableTemplates.length === 0) {
      // If we run out of unique templates, allow duplicates (or reset available pool)
      availableTemplates = [...allTemplates];
    }

    const randomIndex = Math.floor(Math.random() * availableTemplates.length);
    const selectedTemplate = availableTemplates.splice(randomIndex, 1)[0];

    const now = new Date();

    // If immediate is true, starts now. Otherwise, starts in 22 hours
    const startsAt = immediate
      ? now
      : new Date(now.getTime() + 22 * 60 * 60 * 1000);

    // Calculate expiration based on type
    let expiresAt;
    const type = selectedTemplate.type || 'daily';

    if (type === 'weekly') {
      // Weekly quests are from Monday to Sunday. 
      // We set expiration to the Sunday of the week it starts at 23:59:59 UTC.
      const d = new Date(startsAt);
      const day = d.getUTCDay(); // 0 (Sun) to 6 (Sat)
      const daysToSunday = day === 0 ? 0 : 7 - day;
      d.setUTCDate(d.getUTCDate() + daysToSunday);
      d.setUTCHours(23, 59, 59, 999);
      expiresAt = d;
    } else {
      // Daily quests (and others) end at midnight UTC of the start day
      const d = new Date(startsAt);
      d.setUTCHours(23, 59, 59, 999);
      expiresAt = d;
    }

    await strapi.documents("api::player-quest.player-quest").create({
      data: {
        user: { id: userId },
        quest_template: selectedTemplate.documentId || selectedTemplate.id,
        progress: 0,
        status: "active",
        startsAt: startsAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });
  }
};

/**
 * Ensures a user has a Welcome Quest assigned if it exists and hasn't been given yet
 */
export const ensureUserHasWelcomeQuest = async (strapi, userId) => {
  try {
    // 1. Check if user already has it
    const existing = await strapi.documents("api::player-quest.player-quest").findMany({
      filters: {
        user: { id: userId },
        quest_template: { code: 'WELCOME_QUEST' }
      }
    });

    if (existing && existing.length > 0) return; // Already assigned

    // 2. Find template
    const templates = await strapi.documents("api::quest-template.quest-template").findMany({
      filters: { code: 'WELCOME_QUEST' }
    });

    if (templates && templates.length > 0) {
      await strapi.documents("api::player-quest.player-quest").create({
        data: {
          user: { id: userId },
          quest_template: templates[0].documentId || templates[0].id,
          progress: 0,
          status: 'active',
          startsAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() // 10 years
        }
      });
      console.log(`[QuestAssignment] Assigned missing Welcome Quest to user ${userId}`);
    }
  } catch (err) {
    console.error(`[QuestAssignment] Error ensuring Welcome Quest for user ${userId}:`, err);
  }
};
