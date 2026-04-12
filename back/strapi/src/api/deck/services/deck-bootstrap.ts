import fs from "fs";
import path from "path";

export async function bootstrapDecks(strapi: any) {
  try {
    const decksDir = path.join(strapi.dirs.app.src, "shared", "data", "decks");

    let deckFiles = [];
    if (fs.existsSync(decksDir)) {
      deckFiles = fs
        .readdirSync(decksDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => path.join(decksDir, f));
    }

    if (deckFiles.length === 0) {
      console.log("⚠️ No deck files found, skipping deck bootstrap.");
      return;
    }

    console.log(`🚀 Starting deck bootstrap for ${deckFiles.length} files...`);

    // Get all valid card IDs to filter out invalid ones from JSON
    const allCards = await strapi.entityService.findMany("api::card.card", {
      fields: ["id"],
    });
    const validCardIds = new Set(allCards.map((c: any) => c.id));

    for (const filePath of deckFiles) {
      try {
        const deckData = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (!deckData.name) {
          console.warn(`  ⚠️ Skipping file ${filePath}: missing name`);
          continue;
        }

        // Ensure cardIds array exists and filter out IDs that don't exist in the database
        let deckCardIds = Array.isArray(deckData.cardIds)
          ? deckData.cardIds
          : [];
        deckCardIds = deckCardIds.filter((id: number) => validCardIds.has(id));

        // Ensure exactly 15 cards. If less, fill with random valid cards
        const fallbackCards = Array.from(validCardIds);
        while (deckCardIds.length < 15 && fallbackCards.length > 0) {
          const randomIndex = Math.floor(Math.random() * fallbackCards.length);
          deckCardIds.push(fallbackCards[randomIndex]);
        }
        // Slice to max 15
        deckCardIds = deckCardIds.slice(0, 15);

        const existingDecks = await strapi.entityService.findMany(
          "api::deck.deck",
          {
            filters: { name: deckData.name },
          },
        );

        if (existingDecks.length > 0) {
          const deck = existingDecks[0];
          console.log(
            `  🔄 Updating deck: "${deckData.name}" (ID: ${deck.id})`,
          );

          await strapi.entityService.update("api::deck.deck", deck.id, {
            data: {
              cardIds: deckCardIds,
            },
          });
        } else {
          // Check if admin user exists to assign the deck to
          const adminUsers = await strapi.entityService.findMany(
            "admin::user",
            { limit: 1 },
          );

          const deck = await strapi.entityService.create("api::deck.deck", {
            data: {
              name: deckData.name,
              cardIds: deckCardIds,
              // Decks often require a user in business logic, we'll try to just leave it empty if relations aren't strictly required
            },
          });
          console.log(`  🆕 Created deck: "${deckData.name}" (ID: ${deck.id})`);
        }
      } catch (err: any) {
        console.error(`  ❌ Failed to process file ${filePath}:`, err.message);
      }
    }
    console.log("✅ Deck bootstrap completed successfully.");
  } catch (error: any) {
    console.error("❌ Fatal error in deck bootstrap:", error);
  }
}
