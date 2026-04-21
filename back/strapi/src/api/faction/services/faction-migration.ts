import { Core } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';

/**
 * Migrates cards by reading the offline cards.json source
 * and associating Strapi cards with the new dynamic Faction entities.
 */
export async function migrateCardsToFactions(strapi: Core.Strapi) {
  const cardsPath = path.join(process.cwd(), 'src/shared/data/cards.json');
  
  if (!fs.existsSync(cardsPath)) {
    console.log(`ℹ️ Migration cards-to-factions: File ${cardsPath} not found. Skipping.`);
    return;
  }

  console.log('🚀 Starting card-to-faction migration from JSON source...');

  let cardsData;
  try {
    const rawData = fs.readFileSync(cardsPath, 'utf-8');
    cardsData = JSON.parse(rawData);
  } catch (err) {
    console.error('❌ Failed to read or parse cards.json:', err);
    return;
  }

  // 1. Fetch all new factions to build a name -> ID map
  const factions = await strapi.entityService.findMany('api::faction.faction');
  const factionMap = new Map();
  factions.forEach((f: any) => {
    // Normalization: old JSON used names like "neutre" or "Hégémonie Martienne"
    factionMap.set(f.name.toLowerCase(), f.id);
  });

  console.log(`📊 Processing ${cardsData.length} cards from JSON...`);

  let migratedCount = 0;
  let alreadySetCount = 0;
  let errorCount = 0;

  for (const cardInfo of cardsData) {
    if (!cardInfo.faction) continue;

    const oldFactionName = cardInfo.faction.toLowerCase();
    const factionId = factionMap.get(oldFactionName);

    if (factionId) {
      try {
        // Find card in Strapi by its ID (from JSON)
        const strapiCard: any = await strapi.entityService.findOne('api::card.card', cardInfo.id, {
          populate: ['faction']
        } as any);

        if (strapiCard) {
          if (!strapiCard.faction) {
            await strapi.entityService.update('api::card.card', strapiCard.id, {
              data: {
                faction: factionId
              }
            } as any);
            migratedCount++;
          } else {
            alreadySetCount++;
          }
        }
      } catch (err) {
        errorCount++;
      }
    }
  }

  console.log(`✅ Migration summary:
    - ${migratedCount} cards associated
    - ${alreadySetCount} cards already had a faction
    - ${errorCount} errors or missing cards in DB
  `);
}
