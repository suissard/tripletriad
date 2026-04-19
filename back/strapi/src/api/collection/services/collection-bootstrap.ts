import { Core } from '@strapi/strapi';

export async function bootstrapCollections(strapi: Core.Strapi) {
  console.log('📦 Bootstrapping collections...');

  // 1. Get all unique collection codes
  // We check for 'base' by default. We don't rely on the deprecated collectionName anymore.
  const uniqueNames = new Set<string>();
  uniqueNames.add('base');

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
