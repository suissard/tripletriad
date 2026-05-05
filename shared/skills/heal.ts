
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

  onEnterPlay(ctx: SkillContext) {
    const { skill } = ctx;
    
    // Valeurs par défaut : alliés adjacents
    const skillWithDefault = {
      ...skill,
      filter: skill.filter || 'allies',
      patterns: skill.patterns && skill.patterns.length > 0 ? skill.patterns : [{ value: 'adjacent' }]
    };

    const targets = getTargetCells({ ...ctx, skill: skillWithDefault });

    for (const target of targets) {
      const { x, y, cell } = target;
      if (cell && cell.data) {
        let oldHp = cell.data.hp !== undefined ? cell.data.hp : (cell.data.defaultHp || 3);
        let hp = oldHp + skill.value;
        cell.data.hp = hp;
        console.log(`[Skill:Heal] Card "${cell.data.name}" at (${x},${y}) healed: ${oldHp} -> ${hp}`);
      }
    }
  }
};

export default handler;
