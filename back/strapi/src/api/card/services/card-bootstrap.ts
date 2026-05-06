import fs from "fs";
import path from "path";

export async function bootstrapCards(strapi: any) {
  try {
    const cardsFilePath = path.join(
      strapi.dirs.app.src,
      "shared",
      "data",
      "cards.json",
    );

    const skillComponentPath = path.join(
      strapi.dirs.app.src,
      "components",
      "game",
      "skill.json",
    );

    let availableSkills: string[] = [];
    if (fs.existsSync(skillComponentPath)) {
      const skillSchema = JSON.parse(fs.readFileSync(skillComponentPath, "utf8"));
      availableSkills = skillSchema.attributes?.type?.enum || [];
    }

    if (fs.existsSync(cardsFilePath)) {
      const cardsData = JSON.parse(fs.readFileSync(cardsFilePath, "utf8"));
      
      console.log(`🔄 Syncing ${cardsData.length} cards from cards.json...`);

      // Pre-fetch all existing cards to build a name map
      const existingCards = await strapi.documents("api::card.card").findMany({
        fields: ["name", "documentId"],
        limit: -1
      });
      const cardMap = new Map(existingCards.map((c: any) => [c.name, c.documentId]));

      // Pre-fetch all collections
      const allCollections = await strapi.documents("api::collection.collection").findMany({
        fields: ["code", "documentId"],
        limit: -1
      });
      const collectionMap = new Map(allCollections.map((c: any) => [c.code, c.documentId]));

      // Pre-fetch all factions
      const allFactions = await strapi.documents("api::faction.faction").findMany({
        fields: ["name", "code", "documentId"],
        limit: -1
      });

      // Pre-fetch all files to speed up lookups
      const allFiles = await strapi.db.query("plugin::upload.file").findMany();
      console.log(`📂 Found ${allFiles.length} files in media library.`);

      let created = 0;
      let updated = 0;

      for (const c of cardsData) {
        // Extract level from description
        let extractedLevel = 1;
        const levelMatch = c.description?.match(/niveau (\d+)/i);
        if (levelMatch) {
          extractedLevel = parseInt(levelMatch[1], 10);
        } else if (c.level) {
          extractedLevel = c.level;
        }

        // Map level to rarity (Fallback)
        let rarity = c.rarity || "Common";
        if (!c.rarity) {
          if (extractedLevel <= 2) rarity = "Common";
          else if (extractedLevel <= 4) rarity = "Uncommon";
          else if (extractedLevel <= 6) rarity = "Rare";
          else if (extractedLevel <= 8) rarity = "Epic";
          else rarity = "Legendary";
        }

        // Map collection(s)
        const collectionNames = Array.isArray(c.collectionNames)
          ? c.collectionNames
          : [c.collectionName || "base"];

        const collectionDocumentIds = collectionNames
          .map(code => collectionMap.get(code))
          .filter(id => !!id);

        // Map faction
        const factionName = (c.faction || "neutre").toLowerCase();
        const faction = allFactions.find(f => 
          f.name.toLowerCase().includes(factionName) || 
          f.code.toLowerCase().includes(factionName)
        );

        // Find image in media library
        let imageId = null;
        const imageUrl = c.imageUrl || c.image;
        if (imageUrl) {
          const fileName = imageUrl.split("/").pop(); // e.g. 001-neu-refugie-des-confins.png
          const fileNameWithoutExt = fileName.split(".").shift(); // e.g. 001-neu-refugie-des-confins
          const searchPattern = fileNameWithoutExt.replace(/-/g, "_");

          const matchingFile = allFiles.find(
            (f) =>
              f.name.includes(fileNameWithoutExt) ||
              f.hash.includes(searchPattern) ||
              f.name.includes(searchPattern),
          );

          if (matchingFile) {
            imageId = matchingFile.id;
          }
        }

        // Skills logic
        const skills: any[] = [];
        if (Array.isArray(c.skills) && c.skills.length > 0) {
          for (const s of c.skills) {
            // Basic mapping from JSON to component
            skills.push({
              type: s.type,
              value: s.value,
              trigger: s.trigger || (s.type === "death" ? "onDeath" : "onEnterPlay"),
              filter: s.target === "adjacent_enemy" ? "enemies" : (s.filter || "none"),
              range: s.range || 1,
            });
          }
        } else if (availableSkills.length > 0) {
          const skillCount = Math.random() < 0.25 ? 2 : 1;
          const shuffled = [...availableSkills].sort(() => 0.5 - Math.random());
          const selectedTypes = shuffled.slice(0, skillCount);
          
          for (const type of selectedTypes) {
            skills.push({
              type,
              value: Math.floor(Math.random() * 3) + 1,
              trigger: "onEnterPlay"
            });
          }
        }

        const cardData = {
          name: c.name,
          description: c.description,
          level: extractedLevel,
          element: c.element || "None",
          elements: Array.isArray(c.elements)
            ? c.elements
            : [c.element || "None"],
          faction: faction ? faction.documentId : null,
          topValue: String(c.topValue),
          rightValue: String(c.rightValue),
          bottomValue: String(c.bottomValue),
          leftValue: String(c.leftValue),
          rarity: rarity,
          collections: collectionDocumentIds,
          defaultHp: c.hp || 3,
          prompt: c.prompt || null,
          image: imageId,
          skills: skills,
          status: "published",
        };

        const existingDocumentId = cardMap.get(c.name);

        if (existingDocumentId) {
          await strapi.documents("api::card.card").update({
            documentId: existingDocumentId,
            data: cardData,
          });
          updated++;
        } else {
          await strapi.documents("api::card.card").create({
            data: cardData,
          });
          created++;
        }
      }
      console.log(
        `✅ Cards sync complete: ${created} created, ${updated} updated.`,
      );

    } else {
      console.error("❌ cards.json not found at", cardsFilePath);
    }
  } catch (err) {
    console.error("❌ Error seeding cards:", err);
  }
}
