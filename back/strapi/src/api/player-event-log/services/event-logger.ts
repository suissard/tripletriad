import { assignQuestsToUser } from "../../player-quest/services/quest-assignment";

export const logPlayerEvent = async (strapi, eventData) => {
  const {
    userId,
    eventType,
    relatedCardId,
    relatedElement,
    value = 1,
  } = eventData;

  if (!userId) return;

  // 1. Log the event
  await strapi.documents("api::player-event-log.player-event-log").create({
    data: {
      user: { id: userId },
      eventType,
      relatedCard: relatedCardId || null,
      relatedElement: relatedElement || null,
      value,
      timestamp: new Date().toISOString(),
    },
  });

  console.log(`[QuestService] Event: ${eventType}, User: ${userId}`);

  // 1. Proactive Quest Renewal (Cleanup + Gap filling)
  try {
    await assignQuestsToUser(strapi, userId, true);
  } catch (err) {
    console.error("[QuestService] Renewal error:", err);
  }

  // 2. Process current active quests
  const now = new Date();
  const nowISO = now.toISOString();
  const activeQuests = await strapi.documents("api::player-quest.player-quest").findMany({
    filters: {
      user: { id: userId },
      status: "active",
      $and: [
        {
          $or: [
            { startsAt: { $null: true } },
            { startsAt: { $lte: nowISO } },
          ],
        },
        { expiresAt: { $gte: nowISO } },
      ],
    },
    populate: ["quest_template"],
  });

  if (activeQuests.length === 0) {
    console.log(`[QuestService] No active/valid quests for User ${userId}.`);
    return;
  }

  for (const quest of activeQuests) {
    if (!quest.quest_template) continue;

    const template = quest.quest_template;
    let progressMade = false;
    let amount = value;

    console.log(
      `[QuestService] Progressing quest: ${template.code} (${quest.progress}/${template.target})`,
    );

    if (template.type === "play_games" && eventType === "play_game") {
      progressMade = true;
    } else if (
      template.code.startsWith("PLAY_GAMES") &&
      eventType === "play_game"
    ) {
      progressMade = true;
    } else if (
      template.code.startsWith("WIN_GAMES") &&
      eventType === "win_game"
    ) {
      progressMade = true;
    } else if (
      template.code.startsWith("OPEN_BOOSTER") &&
      eventType === "open_booster"
    ) {
      progressMade = true;
    } else if (
      template.code.startsWith("CAPTURE_CARDS") &&
      eventType === "capture_card"
    ) {
      progressMade = true;
    } else if (
      template.code.startsWith("PLAY_CARDS") &&
      eventType === "play_card"
    ) {
      progressMade = true;
    } else if (
      template.code.startsWith("PLAY_ELEMENT") &&
      eventType === "play_card_element"
    ) {
      // Check if element matches (Support multi-word element names like LONGUE_PORTEE)
      // Format is PLAY_ELEMENT_LONGUE_PORTEE_DAILY
      const templateElement = template.code
        .replace("PLAY_ELEMENT_", "")
        .replace(/_(DAILY|48H|WEEKLY)$/, "");

      if (templateElement === (relatedElement || "").toUpperCase()) {
        progressMade = true;
      }
    } else if (
      template.code.startsWith("PLAY_FACTION") &&
      eventType === "play_card_faction"
    ) {
      // Check if faction matches
      // Format is PLAY_FACTION_HEGEMONIE_MARTIENNE_DAILY
      const normalize = (str: string) =>
        str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-0]/g, "_")
          .replace(/_+/g, "_")
          .toUpperCase();
      const eventFactionNormalized = normalize(relatedElement || "");
      const templateFaction = template.code
        .replace("PLAY_FACTION_", "")
        .replace(/_(DAILY|48H|WEEKLY)$/, "");

      if (templateFaction === eventFactionNormalized) {
        progressMade = true;
      }
    }

    if (progressMade) {
      const newProgress = Math.min(quest.progress + amount, template.target);
      const isCompleted = newProgress >= template.target;

      await strapi.documents("api::player-quest.player-quest").update({
        documentId: quest.documentId,
        data: {
          progress: newProgress,
          status: isCompleted ? "completed" : "active",
        },
      });

      if (isCompleted) {
        // Assign a new quest to replace this one (starts in 22h)
        await assignQuestsToUser(strapi, userId, false);
      }
    }
  }
};
