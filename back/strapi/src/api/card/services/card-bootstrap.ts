import fs from 'fs';
import path from 'path';

export async function bootstrapCards(strapi: any) {
  try {
    const cardsFilePath = path.join(strapi.dirs.app.src, 'shared', 'data', 'cards.json');

    if (fs.existsSync(cardsFilePath)) {
      const cardsData = JSON.parse(fs.readFileSync(cardsFilePath, 'utf8'));
      const cardsCount = await strapi.entityService.count('api::card.card');

      if (cardsCount < cardsData.length) {
        console.log(`🔄 DB has ${cardsCount} cards, shared/cards.json has ${cardsData.length}. Re-seeding...`);
        // Use db.query to delete all
        await strapi.db.query('api::card.card').deleteMany({});

        for (const c of cardsData) {
          // Map level to rarity
          let rarity = 'Common';
          if (c.level <= 2) rarity = 'Common';
          else if (c.level <= 4) rarity = 'Uncommon';
          else if (c.level <= 6) rarity = 'Rare';
          else if (c.level <= 8) rarity = 'Epic';
          else rarity = 'Legendary';

          await strapi.entityService.create('api::card.card', {
            data: {
              name: c.name,
              description: c.description,
              level: c.level,
              element: c.element || 'None',
              elements: Array.isArray(c.elements) ? c.elements : [c.element || 'None'],
              faction: c.faction || 'neutre',
              topValue: String(c.topValue),
              rightValue: String(c.rightValue),
              bottomValue: String(c.bottomValue),
              leftValue: String(c.leftValue),
              rarity: rarity
            }
          });
        }
        console.log(`✅ ${cardsData.length} cards seeded from shared database.`);
      }
    } else {
      console.error('❌ cards.json not found at', cardsFilePath);
    }
  } catch (err) {
    console.error('❌ Error seeding cards:', err);
  }
}
