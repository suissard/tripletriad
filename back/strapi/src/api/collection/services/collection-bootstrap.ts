import { Core } from '@strapi/strapi';
import fs from "fs";
import path from "path";

export async function bootstrapCollections(strapi: Core.Strapi) {
  console.log('📦 Bootstrapping collections...');

  const uniqueNames = new Set<string>();
  uniqueNames.add('base');
  uniqueNames.add('starter');

  // 1. Scan cards.json for collection codes
  const cardsFilePath = path.join(
    strapi.dirs.app.src,
    "shared",
    "data",
    "cards.json",
  );

  if (fs.existsSync(cardsFilePath)) {
    const cardsData = JSON.parse(fs.readFileSync(cardsFilePath, "utf8"));
    for (const c of cardsData) {
      if (c.collectionName) uniqueNames.add(c.collectionName);
      if (Array.isArray(c.collectionNames)) {
        c.collectionNames.forEach(n => uniqueNames.add(n));
      }
    }
  }

  // 2. Ensure each exists as a Collection entity
  for (const name of uniqueNames) {
    const existing = await strapi.entityService.findMany('api::collection.collection', {
      filters: { code: name },
    });

    if (existing.length === 0) {
      await strapi.entityService.create('api::collection.collection', {
        data: {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          code: name,
          isActive: true,
          boosterCostMultiplier: 1.0,
          premiumBoosterCostMultiplier: 1.0,
        },
      });
      console.log(`✅ Collection "${name}" created.`);
    }
  }
}
