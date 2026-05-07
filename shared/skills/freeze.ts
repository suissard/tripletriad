import { SkillHandler, SkillContext } from './types';

/**
 * Skill: Freeze (Gel)
 * Effet : Bloque la propagation de combo des attaquants adjacents. Un contre passif essentiel.
 * 
 * Exemple Strapi :
 * {
 *   "type": "freeze",
 *   "trigger": "passive"
 * }
 */
const handler: SkillHandler = {
  id: 'freeze',
  name: 'Gel',
  description: 'Bloque la propagation combo des attaquants adjacents.',
  effectType: 'negative',

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
