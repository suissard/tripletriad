export const elements = ['eau', 'radiation', 'reseau', 'spore', 'furtif', 'longue_portee', 'faille_dimensionnelle', 'hacking', 'obsidienne'];

export const generateQuestTemplates = async (strapi) => {
  const durations = [
    { name: 'daily', days: 1, multiplier: 1, typeEnum: 'daily' },
    { name: '48h', days: 2, multiplier: 2, typeEnum: 'daily' },
    { name: 'weekly', days: 7, multiplier: 7, typeEnum: 'weekly' }
  ];

  const baseQuests = [
    { codePrefix: 'PLAY_GAMES', title: 'Jouer {x} partie(s)', desc: 'Jouez des parties de Triple Triad', baseTarget: 5, eventType: 'play_game' },
    { codePrefix: 'WIN_GAMES', title: 'Gagner {x} partie(s)', desc: 'Gagnez des parties de Triple Triad', baseTarget: 3, eventType: 'win_game' },
    { codePrefix: 'OPEN_BOOSTER', title: 'Ouvrir {x} booster(s)', desc: 'Ouvrez des boosters pour obtenir de nouvelles cartes', baseTarget: 1, eventType: 'open_booster' },
    { codePrefix: 'CAPTURE_CARDS', title: 'Capturer {x} carte(s)', desc: 'Capturez les cartes de votre adversaire pendant une partie', baseTarget: 8, eventType: 'capture_card' },
    { codePrefix: 'PLAY_CARDS', title: 'Jouer {x} carte(s)', desc: 'Placez des cartes sur le plateau de jeu', baseTarget: 15, eventType: 'play_card' }
  ];

  const elementBaseQuest = { codePrefix: 'PLAY_ELEMENT', title: 'Jouer {x} carte(s) {element}', desc: 'Placez des cartes de l\'élément {element} sur le plateau', baseTarget: 8, eventType: 'play_card_element' };

  for (const duration of durations) {
    // Generate base quests
    for (const base of baseQuests) {
      const code = `${base.codePrefix}_${duration.name.toUpperCase()}`;
      const target = base.baseTarget * duration.multiplier;
      const rewardCoins = 100 * duration.multiplier;

      const existing = await strapi.entityService.findMany('api::quest-template.quest-template', {
        filters: { code }
      });

      if (existing.length === 0) {
        await strapi.entityService.create('api::quest-template.quest-template', {
          data: {
            code,
            title: base.title.replace('{x}', target.toString()),
            description: base.desc,
            target,
            rewardCoins,
            type: duration.typeEnum
          }
        });
      }
    }

    // Generate element quests
    for (const element of elements) {
      const code = `${elementBaseQuest.codePrefix}_${element.toUpperCase()}_${duration.name.toUpperCase()}`;
      const target = elementBaseQuest.baseTarget * duration.multiplier;
      const rewardCoins = 100 * duration.multiplier;

      const existing = await strapi.entityService.findMany('api::quest-template.quest-template', {
        filters: { code }
      });

      if (existing.length === 0) {
        await strapi.entityService.create('api::quest-template.quest-template', {
          data: {
            code,
            title: elementBaseQuest.title.replace('{x}', target.toString()).replace('{element}', element.replace('_', ' ')),
            description: elementBaseQuest.desc.replace('{element}', element.replace('_', ' ')),
            target,
            rewardCoins,
            type: duration.typeEnum
          }
        });
      }
    }
  }
};
