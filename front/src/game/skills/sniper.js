/**
 * Skill: Sniper
 * Permet d'attaquer à travers les cases vides.
 */
export default {
  id: 'sniper',
  name: 'Sniper',
  description: 'Attaque à distance en traversant les cases vides.',

  /**
   * Retourne true pour indiquer que cette carte peut attaquer
   * au-delà des cases vides adjacentes.
   */
  extendsAttackRange(ctx) {
    return true;
  }
};
