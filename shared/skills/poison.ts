import type { SkillHandler } from './types';
import { getEffectiveHp, consumeWard } from './helpers.js';
import { 
  EFFECT_TYPES, 
  SKILL_TRIGGERS 
} from './constants';

/**
 * Skill: Poison
 * Trigger variable : par défaut onCaptured, configurable dans Strapi.
 */
const handler: SkillHandler = {
  id: 'poison',
  name: 'Poison',
  description: 'Inflige des dégâts à l\'attaquant lors de la capture (trigger variable).',
  effectType: EFFECT_TYPES.NEGATIVE,
  defaultTrigger: SKILL_TRIGGERS.ON_CAPTURED,

  execute(ctx: any) {
    const { board, skill, alerts, captures, dyingCards, attackerX, attackerY } = ctx;
    const attackerCell = board[attackerY]?.[attackerX];
    if (!attackerCell) return;

    alerts.push('POISON!');

    if (consumeWard(attackerCell.data)) {
      alerts.push('WARD!');
      captures.push({ ...attackerCell.data, event: 'ward_triggered_poison' });
    } else {
      let attackerHp = getEffectiveHp(attackerCell.data) - skill.value;

      attackerCell.data.hp = attackerHp;

      if (attackerHp <= 0) {
        dyingCards.push({ x: attackerX, y: attackerY, cell: attackerCell });
        board[attackerY][attackerX] = null;
        captures.push({ ...attackerCell.data, dead: true, event: 'poison_death' });
      } else {
        captures.push({ ...attackerCell.data, event: 'poison_damage' });
      }
    }
  }
};

export default handler;
