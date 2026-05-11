import type { SkillHandler } from './types';
import { EFFECT_TYPES } from './constants';

/**
 * Skill: Sniper
 * Effet : Permet d'attaquer à travers les cases vides (attaque à distance).
 */
const handler: SkillHandler = {
  id: 'sniper',
  name: 'Sniper',
  description: 'Attaque à distance en traversant les cases vides.',
  effectType: EFFECT_TYPES.NEGATIVE,

  /**
   * Retourne true pour indiquer que cette carte peut attaquer
   * au-delà des cases vides adjacentes.
   */
  extendsAttackRange(ctx: any) {
    return true;
  }
};

export default handler;
