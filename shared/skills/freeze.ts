import type { SkillHandler } from './types';
import { EFFECT_TYPES } from './constants';

/**
 * Skill: Freeze (Gel)
 * Effet : Bloque la propagation de combo des attaquants adjacents.
 */
const handler: SkillHandler = {
  id: 'freeze',
  name: 'Gel',
  description: 'Bloque la propagation combo des attaquants adjacents.',
  effectType: EFFECT_TYPES.NEGATIVE,

  /**
   * Retourne true si cette carte empêche un attaquant adjacent
   * de propager son combo.
   */
  blocksCombo(ctx: any) {
    ctx.alerts.push('FREEZE!');
    return true;
  }
};

export default handler;
