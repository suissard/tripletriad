import { SkillHandler, SkillContext } from './types';

/**
 * Skill: Freeze (Gel)
 * Bloque la propagation de combo des attaquants adjacents.
 */
const handler: SkillHandler = {
  id: 'freeze',
  name: 'Gel',
  description: 'Bloque la propagation combo des attaquants adjacents.',

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
