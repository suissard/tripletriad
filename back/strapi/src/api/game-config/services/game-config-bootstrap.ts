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

    // Ensure defaultCardFrame is set if frames exist
    const config = (await strapi.entityService.findMany('api::game-config.game-config', {
      populate: ['defaultCardFrame']
    })) as any;
    
    if (config && !config.defaultCardFrame) {
      const frames = await strapi.entityService.findMany('api::card-frame.card-frame');
      if (frames && (frames as any).length > 0) {
        await strapi.entityService.update('api::game-config.game-config', config.id, {
          data: {
            defaultCardFrame: (frames as any)[0].id
          }
        } as any);
        console.log(`✅ Default Card Frame set to: ${(frames as any)[0].name}`);
      }
    }
    // Ensure defaultCardBack is set if backs exist
    const configWithBack = (await strapi.entityService.findMany('api::game-config.game-config', {
      populate: ['defaultCardBack']
    })) as any;

    if (configWithBack && !configWithBack.defaultCardBack) {
      const backs = await strapi.entityService.findMany('api::card-back.card-back');
      if (backs && (backs as any).length > 0) {
        await strapi.entityService.update('api::game-config.game-config', configWithBack.id, {
          data: {
            defaultCardBack: (backs as any)[0].id
          }
        } as any);
        console.log(`✅ Default Card Back set to: ${(backs as any)[0].name}`);
      }
    }
  } catch (err) {
    console.error('❌ Error bootstrapping Game Config:', err);
  }
}
