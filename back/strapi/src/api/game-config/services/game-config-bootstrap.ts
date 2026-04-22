import { Core } from '@strapi/strapi';

export async function bootstrapGameConfig(strapi: Core.Strapi) {
  console.log('🌱 Checking Game Config bootstrap...');

  try {
    const existing = await strapi.entityService.findMany('api::game-config.game-config');

    if (!existing || (Array.isArray(existing) && existing.length === 0)) {
      await strapi.entityService.create('api::game-config.game-config', {
        data: {
          cardsPerDeck: 15,
          maxDecksPerUser: 5,
          turnTimeSeconds: 60,
          maxQuestsPerUser: 5,
          playableLimit: 2,
          defaultBoosterCost: 100,
          defaultPremiumBoosterCost: 50,
          probCommon: 39,
          probUncommon: 30,
          probRare: 20,
          probEpic: 10,
          probLegendary: 1,
          probPremium: 5,
          colorPrimary: "#FFBF00",
          colorSecondary: "#0033ff",
          colorAccent: "#FFFF00",
          uiButtonHole: 30,
          uiButtonSpeed: 1.0,
          uiButtonOpacity: 0.25,
          craftingRatios: {
            common: { disenchant: 10, craft: 40 },
            uncommon: { disenchant: 20, craft: 80 },
            rare: { disenchant: 50, craft: 200 },
            epic: { disenchant: 100, craft: 400 },
            legendary: { disenchant: 400, craft: 1600 },
          },
          storyUnlockPrice: 500,
          publishedAt: new Date(),
        },
      });
      console.log('✅ Game Config created with default values.');
    } else {
      console.log('ℹ️ Game Config already exists.');
    }
  } catch (err) {
    console.error('❌ Error bootstrapping Game Config:', err);
  }
}
