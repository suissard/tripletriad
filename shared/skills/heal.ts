import type { SkillHandler, SkillContext } from './types';
import { getTargetCells } from './helpers.js';
import { 
  EFFECT_TYPES, 
  SKILL_TRIGGERS, 
  SKILL_PATTERNS,
  SKILL_FILTERS 
} from './constants';

/**
 * Skill: Heal (Soin)
 * Effet : Rend des points de vie (HP) aux cartes ciblées.
 * 
 * Trigger variable : par défaut onEnterPlay, mais configurable dans Strapi
 */
const handler: SkillHandler = {
  id: 'heal',
  name: 'Soin',
  description: 'Soigne les cartes ciblées (trigger variable).',
  effectType: EFFECT_TYPES.POSITIVE,
  defaultTrigger: SKILL_TRIGGERS.ON_ENTER_PLAY,

  execute(ctx: SkillContext) {
    const { skill } = ctx;
    
    // Valeurs par défaut : alliés adjacents
    const skillWithDefault = {
      ...skill,
      filter: skill.filter || SKILL_FILTERS.ALLIES,
      patterns: skill.patterns && skill.patterns.length > 0 ? skill.patterns : [{ value: SKILL_PATTERNS.ADJACENT }]
    };

    const targets = getTargetCells({ ...ctx, skill: skillWithDefault });

    for (const target of targets) {
      const { x, y, cell } = target;
      if (cell && cell.data) {
        let oldHp = cell.data.hp !== undefined ? cell.data.hp : (cell.data.defaultHp || 3);
        let hp = oldHp + skill.value;
        cell.data.hp = hp;
        console.log(`[Skill:Heal] Card "${cell.data.name}" at (${x},${y}) healed: ${oldHp} -> ${hp} (trigger: ${skill.trigger || 'default'})`);
      }
    }
  }
};

export default handler;
