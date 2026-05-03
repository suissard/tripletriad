import { SkillHandler, SkillContext } from './types';

/**
 * Skill: Sniper
 * Permet d'attaquer à travers les cases vides.
 */
const handler: SkillHandler = {
  id: 'sniper',
  name: 'Sniper',
  description: 'Attaque à distance en traversant les cases vides.',

  /**
   * Retourne true pour indiquer que cette carte peut attaquer
   * au-delà des cases vides adjacentes.
   */
  extendsAttackRange(ctx: any) {
    return true;
  }
};

export default handler;
