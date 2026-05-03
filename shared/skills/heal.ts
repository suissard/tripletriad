import { SkillHandler, SkillContext } from './types';

/**
 * Skill: Heal (Soin)
 * Soigne les cartes adjacentes au placement.
 */
import { getTargetCells } from './helpers.js';

const handler: SkillHandler = {
  id: 'heal',
  name: 'Soin',
  description: 'Soigne les cartes ciblées au placement.',

  onEnterPlay(ctx: any) {
    const { skill } = ctx;
    const targets = getTargetCells(ctx);

    for (const target of targets) {
      const { cell } = target;
      if (cell) {
        let hp = cell.data.hp !== undefined ? cell.data.hp : (cell.data.defaultHp || 3);
        hp += skill.value;
        cell.data = { ...cell.data, hp };
      }
    }
  }
};

export default handler;
