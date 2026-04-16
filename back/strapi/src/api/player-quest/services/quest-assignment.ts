/**
 * Service to handle assigning random quests to users
 */

export const assignQuestsToUser = async (strapi, userId, immediate = false) => {
  const now = new Date();
  const nowISO = now.toISOString();

  // 1. Cleanup: Delete expired quests for this user
  try {
    const deletedCount = await strapi.db
      .query("api::player-quest.player-quest")
      .deleteMany({
        where: {
          user: userId,
          expiresAt: { $lt: nowISO },
        },
      });
    if (deletedCount.count > 0) {
      console.log(
        `[QuestService] Deleted ${deletedCount.count} expired quests for user ${userId}`,
      );
    }
  } catch (err) {
    console.error("Error deleting expired quests:", err);
  }

  // 1. Get user and their active/pending/valid quests
  const userQuests = await strapi.entityService.findMany(
    "api::player-quest.player-quest",
    {
      filters: {
        user: userId,
        status: "active",
        expiresAt: { $gte: nowISO }, // Only count quests that are not expired
      },
      populate: ["quest_template"],
    },
  );

  // 2. Get game config for max quests
  let maxQuests = 5;
  try {
    const config = await strapi.entityService.findMany(
      "api::game-config.game-config",
    );
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
  const allTemplates = await strapi.entityService.findMany(
    "api::quest-template.quest-template",
    {
      filters: {
        code: { $ne: "WELCOME_QUEST" },
      },
    },
  );

  if (allTemplates.length === 0) return;

  // 4. Assign random quests
  const activeQuestTemplateIds = userQuests
    .map((q) => q.quest_template?.id)
    .filter((id) => id);
  let availableTemplates = allTemplates.filter(
    (t) => !activeQuestTemplateIds.includes(t.id),
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

    // Duration is always 24h for quests now
    let durationHours = 24;

    const expiresAt = new Date(
      startsAt.getTime() + durationHours * 60 * 60 * 1000,
    );

    await strapi.entityService.create("api::player-quest.player-quest", {
      data: {
        user: userId,
        quest_template: selectedTemplate.id,
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
    const existing = await strapi.entityService.findMany("api::player-quest.player-quest", {
      filters: {
        user: userId,
        quest_template: { code: 'WELCOME_QUEST' }
      }
    });

    if (existing && existing.length > 0) return; // Already assigned

    // 2. Find template
    const templates = await strapi.entityService.findMany("api::quest-template.quest-template", {
      filters: { code: 'WELCOME_QUEST' }
    });

    if (templates && templates.length > 0) {
      await strapi.entityService.create("api::player-quest.player-quest", {
        data: {
          user: userId,
          quest_template: templates[0].id,
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
