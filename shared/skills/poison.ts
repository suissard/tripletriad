import type { SkillHandler } from './types';
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

    const attackerHasWard = attackerCell.data.skills &&
      attackerCell.data.skills.some(s => s.type === 'ward');

    if (attackerHasWard) {
      alerts.push('WARD!');
      attackerCell.data.skills = attackerCell.data.skills.filter(s => s.type !== 'ward');
      captures.push({ ...attackerCell.data, event: 'ward_triggered_poison' });
    } else {
      let attackerHp = (attackerCell.data.hp !== undefined
        ? attackerCell.data.hp
        : (attackerCell.data.defaultHp || 3)) - skill.value;

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
