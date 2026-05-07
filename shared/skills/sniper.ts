import { SkillHandler, SkillContext } from './types';

/**
 * Skill: Sniper
 * Effet : Permet d'attaquer à travers les cases vides (attaque à distance).
 * 
 * Exemple Strapi :
 * {
 *   "type": "sniper",
 *   "trigger": "passive"
 * }
 */
const handler: SkillHandler = {
  id: 'sniper',
  name: 'Sniper',
  description: 'Attaque à distance en traversant les cases vides.',
  effectType: 'negative',

  /**
   * Retourne true pour indiquer que cette carte peut attaquer
   * au-delà des cases vides adjacentes.
   */
  extendsAttackRange(ctx: any) {
    return true;
  }
};

export default handler;
